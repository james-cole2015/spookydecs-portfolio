# sd_inspector_executor — Inspector Executor Agent
## Architecture & Design Doc
*SpookyDecs · v1.0 · 2026-05-17*

> **Status:** Deployed to prod. Issue #204 (Phase 4).

---

## 1. Overview

`sd_inspector_executor` is the resolution agent in the SpookyDecs inspector pipeline. Where Inspector Gadget (IG) annotates violations with context and a concrete `staged_resolution` payload, the executor acts on them — writing the pre-staged values to the items table and marking the violation resolved.

The executor is the second Lambda in a two-stage pipeline:

```
IG annotates violation + writes staged_resolution → emits Violation.Annotated → executor receives → executes write → marks resolved
```

The executor is **not agentic** — no Bedrock, no LLM, no agentic loop. It is a thin, deterministic Lambda that reads `staged_resolution` from the violation record and executes the write directly. IG has already done the reasoning; the executor just carries it out.

The executor only resolves violations where:
- `requires_confirmation=False`
- `resolution_path` is one the executor knows how to handle
- `staged_resolution` is present and non-null
- Violation `status` is not already `resolved` or `dismissed`

High-risk violations (`requires_confirmation=True`) are surfaced in the inspector UI for human confirmation (Phase 5, #205).

---

## 2. Naming

**Executor** — reflects the design decision made in issue #204: thin, no agentic loop, no Bedrock. IG reasons; the executor executes. The original Penny design (agentic resolver with a Bedrock loop and its own tool set) was superseded when the staged_resolution pattern proved sufficient — IG's reasoning is captured in the violation record, not reproduced at resolution time.

Lambda function name: `sd_inspector_executor`
File: `lambdas-spookydecs/handlers/inspector/sd_inspector_executor.py`

---

## 3. High-Level Architecture

| Layer | Component |
|---|---|
| Trigger | SQS queue `sd-inspector-executor-{stage}` |
| Event source | EventBridge rule `sd-inspector-to-executor-{stage}` on bus `sd-events-{stage}` |
| Event type | `Violation.Annotated` (source: `spookydecs.inspector`) — fired by IG after writing annotations and staged_resolution |
| Lambda | `sd_inspector_executor.py` — pre-flight guard, resolution routing, DDB writes |
| LLM | None |
| Config | SSM `/spookydecs/vars/{env}/` — env from `detail.env`; keys: `VIOLATIONS_TABLE`, `TABLE_NAME` (items). No Lambda env vars. |
| Output | DDB `UpdateItem` on items table + `UpdateItem` on violations table |

### Event Flow

```
IG writes annotations + staged_resolution to VIOLATIONS_TABLE
  → IG emits Violation.Annotated to EventBridge sd-events-{stage}
  → SQS sd-inspector-executor-{stage}
  → sd_inspector_executor Lambda
      → pre-flight guard (skip if ineligible — see §5)
      → read violation from DDB (post-read checks)
      → route on resolution_path → execute write (see §6)
      → _mark_violation_resolved: status=resolved, resolved_by=agent:executor
```

### Why Violation.Annotated (not Violation.Detected)

The executor cannot subscribe to `Violation.Detected` — that event fires at detection time, before IG has run. The executor needs `staged_resolution` to already be written. IG emits `Violation.Annotated` only after `_write_annotations()` succeeds, guaranteeing the staged payload is present when the executor receives the event.

---

## 4. Config Pattern

Config follows the same SSM pattern as IG — no Lambda env vars. The executor reads `detail.env` from the event payload to select the correct environment, then fetches SSM params at startup:

| SSM key | Value |
|---|---|
| `VIOLATIONS_TABLE` | `sd_inspector_violations_{env}` |
| `TABLE_NAME` | `sd_items_records_{env}` (items table) |

Both dev and prod are handled by the same Lambda — `detail.env` drives table selection at runtime.

---

## 5. Pre-flight Guard

Two-phase guard: checks run before the DDB read (cheap), then additional checks run after reading the violation record (post-read).

### Phase 1 — Before DDB read

| Check | Skip condition | Reason |
|---|---|---|
| `requires_confirmation` | `True` | High-risk — awaits human confirmation in Phase 5 (#205) |
| `resolution_path` | Not in known path set | No action defined; executor has no fallback |
| `resolution_path` | `DEPLOYMENT_PACKING_CONFLICT` | IG routes this to `verify_item_status` but it is not auto-remediatable — choosing which conflicting state to clear requires human judgment |
| Rule | `REPAIR_CRITICAL` | Non-dismissible rule; always requires human sign-off |

### Phase 2 — After DDB read

| Check | Skip condition | Reason |
|---|---|---|
| `status` | `resolved` or `dismissed` | Already handled — idempotency guard |
| `agent_notes` | Absent | IG hasn't annotated; should not happen given Violation.Annotated trigger, but guard anyway |
| `staged_resolution` | Absent or null | IG downgrades auto-remediatable paths to `manual_review` when staged_resolution is null — executor should never receive this, but guard for safety |

All skips are clean exits — logged but not raised as errors. SQS does not retry skips.

---

## 6. Resolution Routing

The executor routes on `resolution_path` to one of two write functions.

| resolution_path | Write function | Notes |
|---|---|---|
| `suggest_packing_location` | `_update_item_packing_data` | Writes tote_id and/or tote_location from staged_resolution; packing_status via if_not_exists |
| `verify_item_status` | `_update_item_packing_data` | Same write function — both paths correct packing_data |
| `initialize_vendor_metadata` | `_initialize_vendor_metadata` | Two-step write — see §7.2 |

---

## 7. Write Functions

All writes go direct to DDB. Item writes in `sd_items_handler` have no EventBridge side effects (only `Item.Created` on POST publishes an event), so direct DDB writes are functionally equivalent without the auth complexity of Lambda→API Gateway calls.

### 7.1 `_update_item_packing_data`

Writes corrected packing fields from `staged_resolution`. Only writes keys that are present in `staged_resolution` — never overwrites fields absent from the payload. `packing_status` is written via `if_not_exists` to avoid overwriting a valid existing status.

**DDB gotchas discovered during dev validation:**
- Items table key is `id`, not `item_id`
- `value` is a DDB reserved keyword — requires `ExpressionAttributeNames` alias (`#val`)
- IG writes floats; DDB requires `Decimal` conversion before writes

### 7.2 `_initialize_vendor_metadata`

Two-step write for `vendor_metadata`:

1. **Step 1 — Guarantee the root map exists:** `SET vendor_metadata = if_not_exists(vendor_metadata, :empty_map)`. This ensures the map attribute is present before nested key writes attempt to traverse it.
2. **Step 2 — Write missing keys:** Each nested key (`cost`, `value`, `manufacturer`, `vendor_store`) written individually via `if_not_exists`. Never overwrites an existing value — safe defaults only (`cost: 0`, `value: 0`, `manufacturer: ""`, `vendor_store: ""`).

Known-value restoration is also supported: if `staged_resolution` carries specific field values (e.g., a prior cost recovered from the audit trail), those values are used instead of defaults.

### 7.3 `_mark_violation_resolved`

Always called as the final step, regardless of which write path ran.

| Field | Value |
|---|---|
| `status` | `resolved` |
| `resolved_by` | `agent:executor` |
| `resolution_result` | `success` |
| `resolution_attempted_at` | ISO timestamp |
| `updated_at` | ISO timestamp |

`ConditionExpression: #status <> :dismissed` — prevents the executor from ever touching a dismissed violation. `ConditionalCheckFailedException` is caught silently (not an error — violation was dismissed between pre-flight and resolution write).

---

## 8. Infrastructure

| Resource | Name |
|---|---|
| SQS queue (dev) | `sd-inspector-executor-dev` |
| SQS queue (prod) | `sd-inspector-executor-prod` |
| EventBridge rule (dev) | `sd-inspector-to-executor-dev` on `sd-events-dev` |
| EventBridge rule (prod) | `sd-inspector-to-executor-prod` on `sd-events-prod` |
| Deploy workflow | `deploy-sqs-handlers.yml` |

Provisioned via `artifacts/nostromo/provision_executor_infra.py`.

**SQS resource policy gotcha:** Must use `ArnEquals` on the **rule ARN**, not the bus ARN. Using the bus ARN causes silent delivery failures.

```
arn:aws:events:us-east-2:186543873814:rule/sd-events-{stage}/sd-inspector-to-executor-{stage}
```

---

## 9. Rule Auto-Remediation Table

Full rule-by-rule determination of what the executor can and cannot auto-resolve.

| Rule | Auto-remediate | Resolution path | Rationale |
|---|---|---|---|
| `PACKED_MISSING_LOCATION` | ✅ Yes | `suggest_packing_location` | IG provides specific tote_location from item data |
| `PACKED_MISSING_TOTE_ID` | ✅ Yes | `suggest_packing_location` | IG provides specific tote_id from item data |
| `MISSING_PACKING_DATA` | ✅ Yes | `suggest_packing_location` | IG recommends specific values; structure initialization |
| `MISSING_VENDOR_METADATA` | ✅ Yes | `initialize_vendor_metadata` | No value judgment — initialize structure with safe defaults |
| `MISSING_VENDOR_METADATA_FIELDS` | ✅ Yes | `initialize_vendor_metadata` | No value judgment — write missing keys with safe defaults |
| `DEPLOYMENT_PACKING_CONFLICT` | ❌ No | — | Choosing which state to clear requires human judgment; skipped even when resolution_path=verify_item_status |
| `MISSING_DEPLOYMENT_DATA` | ❌ No | — | Writing deployed:false could be wrong if item is actually deployed |
| `DUPLICATE_*` | ❌ No | — | Human must determine which record is canonical |
| `EMPTY_VENDOR_METADATA_VALUES` | ❌ No | — | Values exist but are blank — actual cost/manufacturer/value/vendor_store require human input |
| `MISSING_ACQUISITION_COST` | ❌ No | — | Financial record; required fields cannot be inferred |
| `MISSING_PRIMARY_PHOTO` | ❌ No | — | Executor cannot source or upload photos |
| `ORPHANED_*_PHOTO` | ❌ No | — | Photo deletion requires human confirmation |
| `REPAIR_CRITICAL` | ❌ No | — | Non-dismissible rule; always requires human sign-off |

---

## 10. Constraints & Decisions

| Decision | Detail |
|---|---|
| No agentic loop | IG's reasoning is captured in `staged_resolution` — no need to re-reason at execution time. Thin Lambda is faster, cheaper, and simpler to reason about. |
| `Violation.Annotated` trigger | Solves the race condition where the executor fires before IG has written annotations and `staged_resolution`. |
| Direct DDB writes | Item writes have no handler side effects. No auth complexity needed. |
| `ConditionExpression` on all violation writes | Prevents the executor from ever touching a dismissed violation, even under race conditions. |
| `ConditionalCheckFailedException` caught silently | Not an error — dismissal is a valid concurrent outcome. |
| `staged_resolution` as the write source | IG writes the exact values to use; executor does not invent or infer field values. |
| `if_not_exists` on all vendor_metadata keys | Safe defaults only — never overwrites existing data. |
