# Inspector Gadget (IG)
## Architecture & Implementation Guide
*SpookyDecs · v1.0 · 2026-05-14*

---

## 1. Overview

Inspector Gadget is an LLM-powered enrichment agent in the SpookyDecs inspector pipeline. When a violation is detected, IG gathers context from multiple data sources via an agentic loop (Bedrock, Claude) and writes three annotation fields back to the violation record:

- `agent_notes` — human-readable recommendation referencing specific context found
- `resolution_path` — snake_case action identifier indicating the recommended resolution type
- `requires_confirmation` — whether the recommended action requires human approval before execution

IG is **read-only**: it never modifies items, creates records, or resolves violations. It only annotates. Auto-execution is handled by Penny (Phase 4, #204).

> IG does not use the shared `rule_helper` or `lambda_utils` layers. It is a standalone Bedrock-backed agent packaged with `sd_inspector_gadget_tools.py`.

---

## 2. High-Level Architecture

| Layer | Component |
|---|---|
| Trigger | SQS queue `sd-inspector-gadget-{stage}` |
| Event source | EventBridge rule `sd-inspector-to-gadget-{stage}` on bus `sd-events-{stage}` |
| Event type | `Violation.Detected` (source: `spookydecs.inspector`) |
| Agent Lambda | `sd_inspector_gadget.py` — agentic loop, tool orchestration, DDB writes |
| Tools | `sd_inspector_gadget_tools.py` — 7 read-only context-gathering tools |
| LLM | Claude via AWS Bedrock (model + region read from SSM) |
| Config | SSM `/spookydecs/vars/{env}/` — no Lambda env vars |
| Output | DDB `UpdateItem` on `VIOLATIONS_TABLE` — annotation fields only |

### Event Flow

```
Violation detected (evaluator Lambda)
  → EventBridge Violation.Detected (sd-events-{stage})
  → SQS sd-inspector-gadget-{stage}
  → sd_inspector_gadget Lambda
      → skip if already annotated (skip-if-populated guard)
      → read env from detail.env → fetch SSM config
      → agentic loop (Bedrock + tools, MAX_ITERATIONS=10)
      → write agent_notes, resolution_path, requires_confirmation to VIOLATIONS_TABLE
      → [Phase 4] emit Violation.Annotated to EventBridge (pending — see §8)
```

### Agentic Loop

```
Violation.Detected event → get violation_id from detail.data
  → call Bedrock (Claude) with system prompt + tools
  → stop_reason == tool_use?
      ├── YES → execute tool → append tool_result → call Bedrock again
      └── NO  → parse annotation JSON from final text → write to DDB
```

---

## 3. Component Breakdown

### 3.1 sd_inspector_gadget.py

**Trigger:** SQS (`sd-inspector-gadget-{stage}`)
**Responsibilities:**
- Parse `Violation.Detected` event from SQS record body
- Read `env` from `detail.env` (must be present — used for all SSM lookups)
- Fetch config from SSM (API URL, Bedrock region, model ID, table names)
- Check skip-if-populated: if `agent_notes` already present on the violation, skip
- Run agentic loop via `_run_agent()`
- Write annotations to DDB via `_write_annotations()`
- Return SQS batch item failures on error (enables SQS retry)

**Key functions:**
| Function | Purpose |
|---|---|
| `lambda_handler` | SQS batch processor; handles failures per-record |
| `_run_agent` | Bedrock agentic loop; returns annotation dict |
| `_call_bedrock` | Single Bedrock `invoke_model` call |
| `_write_annotations` | DDB `UpdateItem` for the 3 annotation fields + `updated_at` |
| `_get_existing_notes` | Pre-flight check for skip-if-populated |
| `_parse_annotations` | Extracts JSON annotation block from Claude's final text response |

### 3.2 sd_inspector_gadget_tools.py

**Imported by:** `sd_inspector_gadget.py` (same zip package)
**Provides:** `TOOL_DEFINITIONS` (Bedrock tool schemas) + `execute_tool()` router

| Tool | Data source | Access pattern |
|---|---|---|
| `get_violation` | DDB `violations` table | `GetItem` by `violation_id` |
| `get_item` | DDB `items` table | `GetItem` by `id` |
| `get_maintenance_history` | DDB `maint` table | Query `item_id-created_at-index` GSI |
| `get_images` | HTTP `GET /admin/images?record_id={item_id}` | API Gateway |
| `get_storage_record` | HTTP `GET /storage/{storage_unit_id}` | API Gateway |
| `get_item_change_history` | DDB `audit` table | Query `entityId-timestamp-index` GSI; filter `entityTypeEnv = inventory#{env}` |
| `get_violation_history` | DDB `violations` table | Query `entity_id-index` GSI |

### 3.3 Claude on AWS Bedrock

| Setting | Value |
|---|---|
| Model | Read from SSM `MODEL_ID` per env |
| Region | Read from SSM `BEDROCK_REGION` per env |
| Max tokens | 4096 |
| Temperature | 0 (deterministic) |
| Tool choice | auto |
| Max iterations | 10 (`MAX_ITERATIONS`) |

### 3.4 SSM Configuration

All config is read from `/spookydecs/vars/{env}/` where `env` comes from `detail.env` in the event. Config is cached per cold start in `_ssm_cache`.

| SSM Key | Used for |
|---|---|
| `API_URL` | Base URL for HTTP tool calls (`get_images`, `get_storage_record`) |
| `BEDROCK_REGION` | Bedrock client region |
| `MODEL_ID` | Claude model ID |
| `VIOLATIONS_TABLE` | DDB violations table name |
| `TABLE_NAME` | DDB items table name |
| `MAINT_TABLE` | DDB maintenance table name |
| `AUDIT_TABLE` | DDB audit table name |

> **Critical:** If `detail.env` is missing or wrong, all SSM lookups fail. The event shape must include `detail.env`.

---

## 4. System Prompt

IG's system prompt grounds Claude as a **read-only enrichment agent**. The key behavioral contract:

1. Start with `get_violation` to understand the violation
2. Call `get_item` for the affected entity
3. Use remaining tools as relevant to the violation type
4. Reference **specific data found** — never give generic advice
5. Conclude with a structured JSON annotation block

### Required annotation output format

```json
{
    "agent_notes": "Human-readable recommendation referencing specific context found",
    "resolution_path": "snake_case_action_identifier",
    "requires_confirmation": false
}
```

The annotation block must be wrapped in a ` ```json ``` ` fenced block. `_parse_annotations()` uses regex to extract it. If parsing fails, it falls back to `resolution_path: manual_review` with `requires_confirmation: false`.

---

## 5. Resolution Path Taxonomy

IG writes one of these values to `resolution_path`. Penny (Phase 4) uses this to route auto-resolution.

> **Note on severity:** Severity is being removed from the violations schema (issue #231). It is replaced by `dismissible: boolean` on the rule record. The taxonomy below reflects the post-#231 world — severity is not a factor in Penny's routing logic.

| resolution_path | Meaning | Auto-resolvable by Penny? | Observed rules | Notes |
|---|---|---|---|---|
| `verify_item_status` | Item's recorded status doesn't match observed reality; needs verification and correction | **Yes** (conf=False, dismissible rule) | DEPLOYMENT_PACKING_CONFLICT, PACKED_MISSING_LOCATION, PACKED_MISSING_TOTE_ID | 47 violations in prod; 43 conf=False |
| `manual_review` | IG couldn't determine a specific resolution; requires human judgment | **No** | DUPLICATE_LIGHTS, EMPTY_VENDOR_METADATA_VALUES, MISSING_ACQUISITION_COST, MISSING_PRIMARY_PHOTO, ORPHANED_COST_PHOTO, PACKED_MISSING_TOTE_ID | 34 violations; Penny skips this path regardless of `requires_confirmation` |
| `update_missing_photo` | Item is missing a required photo | **No** | MISSING_PRIMARY_PHOTO | 16 violations; Penny cannot source photos autonomously |
| `suggest_packing_location` | Item needs a packing location assigned; IG found a specific recommendation | **Yes** (conf=False, dismissible rule) | MISSING_PACKING_DATA, PACKED_MISSING_LOCATION, PACKED_MISSING_TOTE_ID | 15 violations; 14 conf=False |
| `create_acquisition_cost_record` | Item has no cost record; one should be created | **No** | MISSING_ACQUISITION_COST | Requires real data (amount, vendor, date) the executor cannot infer; human must create the record |
| `schedule_maintenance` | Item needs a maintenance record created | **No** | *(REPAIR_CRITICAL retired)* | Reserved for future non-auto-remediable maintenance rules |
| `review_maintenance_history` | Maintenance history suggests a systemic issue requiring human review | **No** | *(REPAIR_CRITICAL retired)* | Informational; requires human decision |

### Paths Penny will never auto-resolve

- `manual_review` — no defined action; Penny skips regardless of `requires_confirmation`
- `update_missing_photo` — Penny cannot source or upload photos autonomously
- `create_acquisition_cost_record` — requires real cost data a human must supply
- `review_maintenance_history` — informational; requires human decision
- Any path where the rule has `dismissible=False` — non-dismissible rules always require confirmation (see §6)

---

## 6. `requires_confirmation` Rules

`requires_confirmation` signals whether the recommended action requires human approval before Penny executes it. IG writes this field; Penny reads it as the primary routing signal.

| Condition | Value | Rationale |
|---|---|---|
| Action is low-risk and reversible | `false` | Penny can auto-resolve |
| Action is high-risk or irreversible (retire item, delete record) | `true` | Penny sends confirmation request (Phase 5) |
| Rule has `dismissible=False` (post-#231) | **Must be `true`** | Non-dismissible rules represent policy violations that always require human sign-off |

### `dismissible` replaces severity as the confirmation gate (issue #231)

Prior to #231, `severity=Critical` was used to block auto-resolution. After #231 ships, `severity` is removed and replaced with `dismissible: boolean` on the rule. The behavioral contract becomes:

- **`dismissible=True` rule** → violation can be dismissed by a human; Penny can also auto-resolve if `requires_confirmation=False`
- **`dismissible=False` rule** → violation represents a policy that must be actively addressed; Penny must **always** treat as `requires_confirmation=True` regardless of what IG wrote

**Enforcement:** Once #231 ships, IG should be updated to check the rule's `dismissible` field before writing `requires_confirmation`. If `dismissible=False`, force `requires_confirmation=True`. Until then, Penny's pre-flight guard should perform this check itself using the rule record.

### Current known inconsistency (pre-#231)

Violations on the `REPAIR_CRITICAL` rule have `requires_confirmation=False` (written by IG for `schedule_maintenance` and `review_maintenance_history`). These rules will be non-dismissible once #231 ships. Penny's pre-flight must guard against auto-resolving these until the rule schema is updated.

---

## 7. Skip-if-Populated Logic

IG will not re-annotate a violation that already has `agent_notes` present.

- On `action=created` events: always runs the agentic loop
- On `action=updated` events (re-evaluations): reads the violation from DDB first; if `agent_notes` is already set, logs "Skipping: already annotated" and exits
- This prevents redundant Bedrock calls when evaluators re-queue violations on re-scan

**Edge case:** If `agent_notes` is manually cleared from a violation record, the next `updated` event will trigger re-annotation. This is acceptable behavior.

---

## 8. Violation.Annotated Event (Planned — Phase 4)

**Status: Not yet implemented.** This section documents the planned change.

After `_write_annotations()` succeeds, IG will publish a `Violation.Annotated` event to EventBridge. This event is the trigger for Penny (the Resolver Agent). It fires only after annotations are written, solving the race condition where both IG and Penny were wired to `Violation.Detected` and could fire concurrently.

### Planned event shape

```json
{
    "source": "spookydecs.inspector",
    "detail-type": "Violation.Annotated",
    "detail": {
        "env": "prod",
        "data": {
            "violation_id": "...",
            "entity_id": "...",
            "rule_id": "...",
            "resolution_path": "verify_item_status",
            "requires_confirmation": false,
            "action": "annotated"
        }
    }
}
```

> **Note:** `severity` is intentionally omitted — it is being removed from the schema (issue #231). `rule_id` is included so Penny can look up the rule's `dismissible` flag without an extra DDB read on the violation.

### Infrastructure required (task 204#6)

- EventBridge rule `sd-inspector-to-penny-{stage}` on bus `sd-events-{stage}`
- Pattern: `{ "source": ["spookydecs.inspector"], "detail-type": ["Violation.Annotated"] }`
- Target: SQS `sd-inspector-resolver-{stage}`
- Resource policy: **must use `ArnEquals` on the rule ARN** (not bus ARN) — same gotcha as the gadget queue

---

## 9. Infrastructure

| Resource | Name | Notes |
|---|---|---|
| SQS queue (dev) | `sd-inspector-gadget-dev` | Batch size 1 |
| SQS queue (prod) | `sd-inspector-gadget-prod` | Batch size 1 |
| ESM (dev) | UUID `43d79931-877f-4eb6-b6f5-1dea900e8a75` | `sd-inspector-gadget-dev` → `sd_inspector_gadget` |
| ESM (prod) | UUID `d32927cd-f162-4ce2-8de5-c74c2b0ba0e8` | `sd-inspector-gadget-prod` → `sd_inspector_gadget` |
| EventBridge rule (dev) | `sd-inspector-to-gadget-dev` on `sd-events-dev` | Routes `Violation.Detected` to gadget queue |
| EventBridge rule (prod) | `sd-inspector-to-gadget-prod` on `sd-events-prod` | Same pattern |
| SQS resource policy | `ArnEquals` on **rule ARN**, not bus ARN | See §9.1 |
| Deploy workflow | `deploy-sqs-handlers.yml` | Multi-file packaging: `sd_inspector_gadget.py` + `sd_inspector_gadget_tools.py` |

### 9.1 SQS Resource Policy Gotcha

The SQS queue's resource policy must use `ArnEquals` scoped to the specific EventBridge rule ARN:

```
arn:aws:events:us-east-2:186543873814:rule/sd-events-{stage}/sd-inspector-to-gadget-{stage}
```

Using the bus ARN (`arn:aws:events:us-east-2:.../event-bus/sd-events-{stage}`) causes **silent delivery failures** — EventBridge will not send to the queue and no error is surfaced. This was fixed during haddonfield (5/6 note on issue #203).

---

## 10. Constraints & Gotchas

| Constraint | Detail |
|---|---|
| `detail.env` is required | IG reads `env` from the event, not from Lambda env vars. Missing or wrong env causes all SSM lookups to fail. |
| No `lambda_utils` or `rule_helper` layers | IG is packaged standalone with `sd_inspector_gadget_tools.py`. Do not expect shared layer utilities. |
| Skip-if-populated is keyed on `agent_notes` | Not on `violation_id`. Cleared `agent_notes` triggers re-annotation on the next event. |
| `REPAIR_CRITICAL` violations have `requires_confirmation=False` | IG writes False for `schedule_maintenance` and `review_maintenance_history` on this rule. These will be non-dismissible once #231 ships. Penny must guard against auto-resolving these pre-#231. See §6. |
| `manual_review` and `update_missing_photo` are not auto-resolvable | Penny must skip these paths regardless of `requires_confirmation`. |
| SQS resource policy must use rule ARN | See §9.1. Bus ARN causes silent delivery failure. |
| Config is cached per cold start | SSM values are cached in `_ssm_cache`. Config changes require a cold start or Lambda redeploy to take effect. |
| `_parse_annotations` fallback | If Claude's output doesn't contain a valid JSON block, IG falls back to `resolution_path: manual_review, requires_confirmation: false`. Monitor for this in CloudWatch. |
