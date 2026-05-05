<!--
  TRANSITION DOCUMENT — INSTRUCTIONS FOR THE INCOMING CHAT
  =========================================================
  REPLACE all content below this header block when updating this file.
  Do NOT append to prior content unless explicitly told to.

  When you read this file as a new chat, do the following IN ORDER:

  1. READ MEMORY — load `/Users/brookshouck/.claude/projects/-Users-brookshouck-GitHub-spookydecs/memory/MEMORY.md`
     and any relevant memory files it references (branch workflow, feedback, project context).

  2. READ THE ISSUE — understand the problem, goal, and any constraints described below.

  3. STATE YOUR UNDERSTANDING — before writing any code or making any changes, summarize:
     - What the problem is
     - What you intend to do to fix it
     - Any assumptions you are making
     Ask the user to confirm or correct before proceeding.

  4. CHECK REFERENCE DOCS — read the relevant subdomain doc in `app_docs/sub_docs/` for the
     area you'll be working in. If none exists, say so.

  5. CHECK DESIGN ALIGNMENT — if the task involves any UI changes, read `docs/design.md` and
     confirm your approach is consistent with it before implementing.

  6. ASK BEFORE CODING — if anything is ambiguous or underspecified, ask clarifying questions
     now. Do not start implementation until the user confirms the plan.

  7. FOLLOW BRANCH WORKFLOW — per the project's branch model, work on a per-issue branch.
     Do not commit directly to main.
-->

---Good, I have everything I need now. Writing up the full plan.

---

## Plan: Haddonfield — #203 + #209

### Blockers
None. #31 is fully complete. `agent_notes`, `resolution_path`, `requires_confirmation` already exist in the violation schema (`sd_violations_consumer.py` v1.1).

---

## Issue #203 — Inspector Gadget Phase 3

### Files to create / modify

| File | Action |
|------|--------|
| `lambdas-spookydecs/handlers/inspector/sd_inspector_gadget.py` | Create |
| `lambdas-spookydecs/handlers/inspector/sd_inspector_gadget_tools.py` | Create |
| `artifacts/haddonfield/provision_inspector_gadget.py` | Create |
| `lambdas-spookydecs/.github/workflows/deploy-sqs-handlers.yml` | Modify — add IG entry |
| `app_docs/reference_docs/cross_sub_sync.md` | Modify — add IG row to Section 4 routing map |

---

### 203#1 — Build sd_inspector_gadget.py + sd_inspector_gadget_tools.py

**`sd_inspector_gadget.py`** — two responsibilities: SQS outer shell + agentic loop.

Outer shell mirrors `sd_violations_consumer.py`:
- Iterate `event['Records']`, return `batchItemFailures` on any exception
- Extract `violation_id` and `env` from `detail.data`; select table via `VIOLATIONS_TABLE_{DEV|PROD}` env var (same `detail.env` pattern as every other consumer)
- Call `_run_agent()`, then `_write_annotations()` with the result

Agentic loop is a direct copy of `sd_iris_handler._run_agent()` — same Bedrock `invoke_model`, same `tool_use` / `end_turn` iteration, same `MAX_ITERATIONS = 10`. Key differences from Iris:
- Input is a violation ID + env, not a user `messages` array — the initial user message is constructed from the event detail
- Output is a structured annotation dict extracted from Claude's final message (not a free-text response)
- `execute_tool(name, input, api_endpoint, env)` gets an extra `env` param so tools can select the right stage
- Gets `API_ENDPOINT` from SSM via `/spookydecs/config/{env}/API_ENDPOINT` (same as Iris)
- Gets `MODEL_ID` and `BEDROCK_REGION` from Lambda env vars

`_write_annotations()` does a DDB `update_item` on the violations table — sets `agent_notes`, `resolution_path`, `requires_confirmation`, `updated_at`. No `status` changes, no `resolved_by`, nothing else.

**System prompt** instructs Claude: you are Inspector Gadget, a read-only enrichment agent. You receive a violation ID. Use your tools to gather all available context. Conclude your analysis by outputting a JSON block with exactly three fields: `agent_notes` (string — human-readable recommendation for the operator), `resolution_path` (snake_case action identifier, e.g. `suggest_packing_location`), `requires_confirmation` (bool — true if the action is high-risk or irreversible).

**`sd_inspector_gadget_tools.py`** — mirrors `iris_tools.py` structure:
- `TOOL_DEFINITIONS` list (7 tools)
- `execute_tool(name, input, api_endpoint, env)` router
- Individual `_tool_name()` executors

---

### 203#2 — Provision SQS + EventBridge

Script `artifacts/haddonfield/provision_inspector_gadget.py`, following `cross_sub_sync.md` Section 11 **in order**:

1. Create `sd-inspector-gadget-dev` and `sd-inspector-gadget-prod` SQS standard queues
2. Apply SQS resource policy to each queue — grants `events.amazonaws.com` permission to `sqs:SendMessage`, with `ArnLike` condition scoped to `spookydecs-events-{stage}` event bus (the condition is required per the doc — don't omit it)
3. Create EventBridge rule targeting each new queue for `Violation.Detected` — per cross_sub_sync.md Section 9, IG gets its own dedicated queues, not a share of the existing `sd-inspector-violations-{stage}` queue
4. Create/update Lambda execution role with:
   - `sqs:ReceiveMessage`, `sqs:DeleteMessage`, `sqs:GetQueueAttributes` on IG queues
   - `dynamodb:GetItem` on items, maintenance, violations, and audit tables (dev + prod)
   - `dynamodb:UpdateItem` on violations tables (dev + prod — annotation writes)
   - `bedrock:InvokeModel`
   - `ssm:GetParameter` scoped to `/spookydecs/config/*`
5. Create SQS ESM: `sd-inspector-gadget-dev` → `sd_inspector_gadget` Lambda (prod ESM at deploy time)
6. Add to `deploy-sqs-handlers.yml` (see deployment section below)
7. Update `cross_sub_sync.md` Section 4 — new row: `spookydecs.inspector` | `Violation.Detected` | Inspector handlers | `sd-inspector-gadget-{stage}` | `sd_inspector_gadget` | `inspector_violations` (`agent_notes`, `resolution_path`, `requires_confirmation`)

---

### 203#3 — Context-gathering tools (all read-only)

**Auth note:** IG has no user auth headers to forward. For items/maintenance/violations, using direct DDB boto3 reads avoids the Cognito auth problem entirely and is consistent with how other consumers work. For audit endpoints, the IAM execution role handles it via SigV4. This is a pragmatic deviation from "tools are HTTP clients" for the non-audit tools — worth confirming before implementation.

| Tool | Implementation |
|------|---------------|
| `get_violation` | `dynamodb.Table(violations_table).get_item(Key={'violation_id': id})` |
| `get_item` | `dynamodb.Table(items_table).get_item(Key={'id': item_id})` |
| `get_maintenance_history` | `dynamodb.Table(maint_table).query(IndexName='item_id-index', ...)` |
| `get_images` | `GET /admin/images?record_id={item_id}` — HTTP, auth TBD |
| `get_storage_record` | `GET /storage/{storage_unit_id}` — `storage_unit_id` from item's `packing_data.tote_id`; HTTP, auth TBD |
| `get_violation_history` | `GET /audit/violation/{entityId}/history?environment={env}` — IAM auth (SigV4) |

Env vars needed on the Lambda: `VIOLATIONS_TABLE_DEV`, `VIOLATIONS_TABLE_PROD`, `ITEMS_TABLE_DEV`, `ITEMS_TABLE_PROD`, `MAINT_TABLE_DEV`, `MAINT_TABLE_PROD` (same naming pattern as other consumers).

---

### 203#4 — Wire get_item_change_history

`GET /audit/inventory/{entityId}/history?environment={env}` — unblocked, audit API is live on both stages. IAM auth via SigV4 signing from IG's execution role (same as `get_violation_history`).

---

### 203#5 — Annotation writes

`_write_annotations()` does a targeted `update_item` — only sets the three annotation fields plus `updated_at`. Uses conditional attribute names if needed to avoid reserved word conflicts. Idempotent — safe to re-process if the SQS message retries.

---

### 203#6 — Deploy + validate

1. Create `sd_inspector_gadget` Lambda in AWS (Python 3.12), attach execution role + `spookydecs-python-utils` layer
2. Set all env vars (`VIOLATIONS_TABLE_DEV/PROD`, `ITEMS_TABLE_DEV/PROD`, `MAINT_TABLE_DEV/PROD`, `BEDROCK_REGION`, `MODEL_ID`)
3. Run `provision_inspector_gadget.py --stage dev`
4. Merge to main → `deploy-sqs-handlers.yml` deploys
5. Trigger a real violation in dev; verify IG invokes within seconds and `agent_notes`/`resolution_path`/`requires_confirmation` appear on the violation record
6. Manually review 20+ records for recommendation quality before enabling prod

---

### Deployment workflow

`deploy-sqs-handlers.yml` is the correct home per `cross_sub_sync.md` Section 7. IG needs two files packaged together, so the packaging step deviates from the standard single-file `zip -j`:

```bash
zip -j sd_inspector_gadget.zip \
  handlers/inspector/sd_inspector_gadget.py \
  handlers/inspector/sd_inspector_gadget_tools.py
```

All other steps (layer attachment, publish version) are identical to the existing consumer pattern.

---

---

## Issue #209 — Inspector Frontend

### Files to modify (all in `Portfolio/subs/inspector/`)

| File | Change |
|------|--------|
| `js/pages/violation-detail.js` | Add IG Analysis section; add confirmation status indicators |
| `js/components/ViolationsTable.js` | Add IG indicator badge to table rows |
| `js/components/ViolationDetailModal.js` | Add `agent_notes` display if present |
| `css/violation-detail.css` | Add `.violation-ig-card` and badge styles |

---

### 209#1 — Add agent_notes + resolution_path to detail view

In `violation-detail.js` → `renderViolationContent()`, insert an "Inspector Gadget Analysis" card between the Issue Description card and the Notes card. Only renders when `agent_notes` is present:

```html
${currentViolation.agent_notes ? `
    <div class="violation-ig-card">
        <h3>Inspector Gadget Analysis</h3>
        <p class="ig-notes">${sanitizeHtml(currentViolation.agent_notes)}</p>
        ${currentViolation.resolution_path ? `
            <div class="ig-resolution-path">
                <span class="ig-label">Recommended action:</span>
                <span class="ig-badge">${sanitizeHtml(currentViolation.resolution_path)}</span>
            </div>
        ` : ''}
    </div>
` : ''}
```

In `ViolationsTable.js` → `renderViolationRow()`, add a small "IG" pill in the Status column when `agent_notes` is present — gives operators a quick visual that IG has already analyzed the violation.

In `ViolationDetailModal.js` → `renderContent()`, add `agent_notes` as a read-only field below the Issue section (lighter treatment — no resolution_path badge needed in the modal).

---

### 209#2 — requires_confirmation + awaiting_confirmation indicators

In `violation-detail.js`, add alongside the existing severity/status badges in the page header:

```html
${currentViolation.requires_confirmation ? `
    <span class="badge badge-warning">Requires Confirmation</span>
` : ''}
${currentViolation.awaiting_confirmation ? `
    <span class="badge badge-info">Awaiting Confirmation</span>
` : ''}
```

---

### 209#3 + 209#4 — Resolve button + confirmation flow

These reference the Resolver Agent (Phase 4 / #204), which is not in scope for haddonfield. **Recommendation:** scaffold the "Resolve" button in the actions card — visible but disabled — with `title="Resolver Agent coming in Phase 4"`. This wires the visual affordance without requiring backend behavior that doesn't exist yet. 209#4 (confirmation flow) is a stub — no implementation needed this cycle.

---

### 209#5 — Inspector sub documentation

Update `subs/inspector/documentation/SCHEMA.md` — add the five IG fields (`agent_notes`, `resolution_path`, `requires_confirmation`, `awaiting_confirmation`, `confirmation_requested_at`) with descriptions. Note which are Phase 3 (read-only annotation) vs Phase 4+ (active confirmation flow).

---

## Sequencing

Build #203 first and validate annotations are landing in DDB before touching the frontend — you need real `agent_notes` data to verify the #209 rendering is correct.

---

Does this look right? Any adjustments before we start the branch?