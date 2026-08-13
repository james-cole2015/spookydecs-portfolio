# Deployments Pre-Season Gate — Operator Guide

**Status: executed against dev 2026-08-13. Both seasons pass.** Halloween 19/19;
Christmas 17/19 + 2 N/A (no Christmas non-packable inventory exists). Full results in §5.
The first run found four defects — three in the harness, one real infrastructure gap
(§5.2). §4 remains a *diagnostic reference* — what a failure would mean — except where
marked "observed".

Companion docs: [`README.md`](./README.md) is the test *design* (risk model, layering,
isolation strategy). This file is the *operator* guide — what it does, what it prints,
and how to read a failure.

---

## 1. What the test does

`preseason/lifecycle.e2e.mjs` drives one complete deployment through its entire
lifecycle against a live API stage, asserting every guarded state transition along the
way, then restores everything it touched.

It exists because the deployments sub is not a CRUD app. It is a **state machine spanning
6 Lambdas and 2 DynamoDB tables**, where every transition is a guarded write and the item
status writes go *directly* into the items table (no EventBridge, so a broken IAM policy
surfaces as a silent 500, not a queued retry).

Two machines are exercised end to end:

```
DEPLOYMENT
  pre-deployment ──create_session──▶ active_setup ──POST /complete──▶ completed
                                                                          │
                                                 ┌───teardown/start───────┘
                                                 ▼
                                        active_teardown ──teardown/complete──▶ archived

ITEM
  Packed/Stored ──POST /stage──▶ Staged ──connection│placement──▶ PreDeployment
                                                                       │
                                    ┌────────POST /complete────────────┘
                                    ▼
                                Deployed ──teardown/item──▶ TearDown
```

### Safety model

The harness mutates **real, shared item records**. Three protections:

| Protection | Mechanism |
|---|---|
| Can't collide with a real deployment | Sentinel **year 2030** (`DEP-HAL-2030` / `DEP-CHR-2030`) — inside `MAX_YEAR`, never a live season |
| Can't touch prod | Refuses `--stage prod` without `--force-prod` |
| Can't strand inventory | Every touched item's original status is snapshotted, then `PATCH`-restored in a `finally` block — **including on failure and on crash** |

Restore is not optional: teardown legitimately leaves items in `TearDown`, not their
original status. Blast radius is deliberately one tote plus one loose non-packable prop,
both discovered from the live `GET /stage` response rather than hardcoded.

### Running it

```bash
# token: the `spookydecs_auth` cookie value from devtools on deployments-dev
export SD_TOKEN='eyJ...'

node tests/preseason/lifecycle.e2e.mjs --season Halloween
node tests/preseason/lifecycle.e2e.mjs --season Christmas --verbose
node tests/preseason/lifecycle.e2e.mjs --season Halloween --keep          # leave state for inspection
node tests/preseason/lifecycle.e2e.mjs --season Halloween --cleanup-only  # undo a --keep run
```

| Flag | Effect |
|---|---|
| `--season` | **Required.** `Halloween` or `Christmas` |
| `--stage` | `dev` (default), `demo`, `prod` (blocked) |
| `--verbose` / `-v` | Log every HTTP call and status |
| `--keep` | Skip cleanup — leaves the sentinel and mutated items in place, prints the restore ledger |
| `--cleanup-only` | Run only the restore + delete, no phases |
| `--force-prod` | Required to even consider `--stage prod` |

Run it **~2 weeks before each setup weekend** — far enough out that a red result leaves
time to fix the backend.

---

## 2. The 19 phases

Ordering is load-bearing. The negative gates only assert correctly from the right state —
phase 12 must run *while a session is open*, phase 15 *while items are still Deployed*.

| # | Phase | What it asserts |
|---|---|---|
| 0 | Preflight | Token valid, `GET /deployments` 200, no leftover sentinel (auto-removed) |
| 1 | Create | 201, `status: pre-deployment`, exactly 3 zones FY/BY/SY, all `not_started` |
| 2 | Duplicate guard | Second create → **409** |
| 3 | Input validation | `year` as string → 400; missing `zones` → 400; missing `season` → 400 |
| 4 | Stage discovery | `/stage` returns all 4 arrays; no off-season records leak through the filter |
| 5 | Stage tote | `tote_id` alone → 400; `POST {tote_id, item_ids}` → tote **Staged**, selected contents **Staged**, unselected untouched |
| 6 | Stage loose (#460) | `POST {item_ids}` with no `tote_id` → item **Staged**, appears in `staged_non_packable` |
| 7 | Session open | `POST /sessions` → deployment flips **pre-deployment → active_setup** |
| 8 | Session exclusivity | Second session in another zone → **409** |
| 9 | Connection path | `POST /connections` → **`to_item_id`** (the item plugged in) **Staged → PreDeployment** |
| 10 | Placement path (#457) | `POST /placements` → static prop **Staged → PreDeployment** |
| 11 | Port reuse guard | Same `from_port` again → 400 |
| 12 | **Complete gate** | `POST /complete` while session open → **409** |
| 13 | End session | `zone.items_deployed` **unions** connection + placement |
| 14 | Complete | → `completed`, every deployed item → **Deployed** |
| 15 | **Teardown ordering** | `teardown/start` → `active_teardown`; premature `teardown/complete` → **400** with `still_deployed` list |
| 16 | Teardown items | `teardown/item` → **Deployed → TearDown**; repeat → 400 |
| 17 | Archive | `teardown/complete` → **archived**, `teardown_completed_at` set |
| 18 | Historical | Appears in `GET /historical`; detail readable |
| 19 | Cleanup | Items + totes restored to original status, sentinel deleted (via DDB — no API route) |

**Phases 12 and 15 are the highest-value assertions in the suite.** They are the guards
that, when they regress, strand a live deployment mid-flow with no UI escape hatch.

### Phases marked `critical`

0, 1, 4, 5, 7, 13, 14, 15, 16, 17. A failure here aborts the remaining phases — the state
machine cannot proceed from a broken transition, so downstream results would be noise.
**Cleanup still runs.** Non-critical failures (2, 3, 6, 8–12, 18) are recorded and the run
continues.

---

## 3. Outputs

### Console

Per-phase lines as the run proceeds:

```
  Deployments pre-season gate
  season Halloween  ·  stage dev  ·  sentinel DEP-HAL-2030

   0  PASS  Preflight — auth valid, no leftover sentinel (412ms)
   1  PASS  Create — 201, pre-deployment, exactly 3 zones (388ms)
   2  PASS  Duplicate guard — second create returns 409 (201ms)
  ...
  12  FAIL  Complete gate — blocked while a session is open (233ms)
            complete with active session: expected HTTP 409, got 200
  ...

  Cleanup
    items restored: 7/7
    sentinel DEP-HAL-2030: deleted

  Summary
    17 passed  1 failed  1 skipped

  NOT SEASON-READY — do not start setup weekend.
    12. Complete gate — blocked while a session is open: expected HTTP 409, got 200
```

Green `PASS` / red `FAIL` / dim `SKIP`, each with elapsed ms. Failure lines carry the
assertion message: what was expected, what came back, and a truncated response body.

### Exit codes

| Code | Meaning | Action |
|---|---|---|
| **0** | All phases passed (N/A phases do not fail the run) | Season-ready. Proceed with setup. |
| **1** | One or more phases failed | **Do not start setup weekend.** Diagnose via §4. |
| **2** | Harness never started, or crashed | Config/environment problem — not a product failure. See §4.0. |

A fourth outcome, **N/A**, prints yellow and exits 0: the phase could not run because no
inventory fixture exists for it, and that gap is a known, dated entry in `FIXTURE_EXEMPT`.
It is always printed so the gap stays visible. See §5.4.

### Cleanup output — read this every time

```
  Cleanup
    items restored: 7/7
    sentinel DEP-HAL-2030: deleted
```

If either line is red, **hand-fix before walking away**:

- `RESTORE FAILED — fix these by hand: DEC-XXX (HTTP 403)` — those items are stranded in
  whatever status the run left them (likely `TearDown`). `PATCH /items/{id}` them back.
- `sentinel DEP-HAL-2030: DELETE FAILED` — the sentinel record remains. Phase 0 of the next
  run will try to remove it automatically, but `--cleanup-only` is the direct fix.

With `--keep`, cleanup is skipped and the restore ledger is printed as JSON so you can
inspect state and restore later.

---

## 4. Failure reference

**No live run has happened, so nothing below has been observed.** This is a diagnostic
map: if phase *N* fails, here is what it most likely means and where to look.

### 4.0 Exit code 2 — harness never ran

| Message | Cause |
|---|---|
| `--season must be Halloween or Christmas` | Missing/misspelled `--season` |
| `SD_TOKEN is not set` | No token exported |
| `Refusing to run against prod` | `--stage prod` without `--force-prod` — working as intended |
| `Harness crashed: ...` | Bug in the harness or an unreachable endpoint |

None of these say anything about season readiness.

### 4.1 Phase failures

| Phase | Failure | Most likely cause | Where to look |
|---|---|---|---|
| 0 | `GET /deployments` ≠ 200 | Expired token, or API stage down | Refresh cookie; check API GW stage |
| 0 | Leftover sentinel won't delete | Prior `--keep` run; DELETE needs **admin** role | Token's role claim |
| 1 | Zone count ≠ 3 | `TOTAL_ZONES` regression — **immutable at 3** | `sd_deployments_handler.py` create |
| 1 | Wrong initial status | Default changed from `pre-deployment` | Same handler, metadata block |
| 2 | Not 409 | **Duplicate guard broken — this protects the real deployment.** Treat as urgent | `get_item` existence check |
| 3 | Not 400 | Input validation loosened | Handler validation block |
| 4 | Off-season records leaked | `build_season_filter` regression → **wrong props offered on setup day** | `sd_deployments_stage_handler.py` |
| 4 | `no stageable totes` | Fixture gap, not a bug — dev has no Packed/Stored tote for the season | Seed a tote |
| 5 | Tote staged but contents not | Cross-table write failing — likely `sd_deployments_storage_cross_domain` IAM | `iam/deployments/`, CloudWatch logs |
| 6 | `no idle non-packable items` | **Fixture gap — the #460 path is unverified.** Seed a `packable: false` prop | items table |
| 6 | Staged but absent from `staged_non_packable` | The #469 season/status split regressed | stage handler split logic |
| 7 | Status stays `pre-deployment` | `create_session` metadata transition broken → deployment looks unstarted all season | `sd_deployments_item_handler.py:351` |
| 8 | Not 409 | Session exclusivity lost → concurrent sessions corrupt `items_deployed` | `find_any_active_session` |
| 9 | Item not `PreDeployment` | Cross-domain item write failing — `sd_deployments_cross_domain` IAM | IAM + CloudWatch |
| 9 | `no staged item with female_ends > 0` | Fixture gap — connection path unverified | Seed a powered item |
| 10 | Prop not `PreDeployment` | **#457 placement path broken — every static prop is undeployable** | `create_placement` |
| 11 | Not 400 | Port-collision guard lost → double-booked outlets in the yard | `is_active_connection` |
| **12** | **Not 409** | **Complete gate broken — a deployment can be completed mid-session, losing that session's work** | `find_any_active_session` in complete handler |
| **13** | **Placement absent from `items_deployed`** | **The #457 union regressed — static props silently fail to deploy and teardown can't find them** | `end_session` union logic |
| 13 | Connection absent | `end_session` rebuild from active connections broken | Same |
| 14 | Items not `Deployed` | Bulk item write failing — IAM or batch size | `sd_deployments_complete_handler.py` |
| **15** | **Premature complete not 400** | **Teardown can complete with items still Deployed — inventory permanently wrong** | `handle_complete` batch check |
| 15 | `teardown/start` ≠ 200 | Status guard rejecting `completed` → **teardown cannot start at all** | `handle_start` |
| 16 | Item not `TearDown` | Per-item transition broken → items stuck `Deployed` after takedown | `handle_item` |
| 17 | Not `archived` | Archive transition broken | `handle_complete` |
| 18 | Missing from `/historical` | `status = 'archived'` index query regressed → **season history invisible** | `sd_deployments_historical_handler.py` |

### 4.2 Triage priority

If multiple phases fail, fix in this order — each blocks the ones below it:

1. **0, 1** — nothing else can run
2. **15, 16, 17** — teardown broken means inventory never returns to a correct state
3. **12, 13** — the guards that strand a live deployment
4. **5, 9, 14** — cross-table item writes (usually one IAM root cause)
5. **6, 10** — static-prop paths (#457/#460)
6. Everything else

---

## 5. Run log

Keep these entries — a phase that fails two seasons running is a design problem, not a
regression.

| Date | Season | Stage | Result | Failed | Notes |
|---|---|---|---|---|---|
| 2026-08-13 | Halloween | dev | **PASS 19/19** | — | Green after harness fixes §5.2 |
| 2026-08-13 | Christmas | dev | **PASS 17/19 + 2 N/A** | — | Phases 6, 10 N/A — no Christmas non-packable inventory |
| 2026-08-13 | Halloween | dev | FAIL 5/19 | 5 | First-ever run. Harness bug: `/stage` contract |
| 2026-08-13 | Halloween | dev | FAIL 12/19 | 9, 13 | Harness bug: asserted on wrong end of the connection |

Total wall time per run: ~22s. Phase 5 dominates (~8s) — it verifies every unselected
tote item was left alone.

### 5.1 Verdict

**Both seasons are green on dev.** The deployment state machine, both staging paths, both
deploy paths, all five guarded transitions, and the archive/historical flow work as
intended. Nothing blocks Halloween or Christmas setup.

### 5.2 What the first run found

Four defects. **Three were bugs in the test, not the product** — worth recording, because
each came from a wrong assumption about the API that the reference doc did not correct.

| # | Defect | Verdict |
|---|---|---|
| 1 | Phase 5 sent `{tote_id}` alone → 400 `item_ids is required` | **Harness bug.** `POST /stage` is a *partial* staging API: `tote_id` picks the tote, `item_ids` picks which contents to stage. Neither the doc nor the frontend client made this obvious. Phase 5 now asserts the 400 *and* that unselected items are left alone. |
| 2 | `GET /items/{tote_id}` → 404 when snapshotting a tote | **Harness bug.** Totes are **storage** records; there is no read-by-id storage route here. Tote state now reads from `sd_storage_records_*` directly. |
| 3 | Phase 9 asserted `from_item_id` → `PreDeployment`; it stayed `Staged` | **Harness bug.** `create_connection` advances **`to_item_id`** — the item being plugged in — not the power source. Phase 13 failed as a knock-on. |
| 4 | `DELETE /deployments/{id}` → 403 SigV4 parse error | **Real infrastructure gap — see §5.3.** |

Also observed: `PATCH /items/{id}` with `null` does **not** remove an attribute, so
`staged_deployment_id` cannot be cleared through the API. Harmless — it is audit-only and
no longer read (#469) — so restore now sets `status` only.

### 5.3 Real finding: `PUT` and `DELETE /deployments/{id}` do not exist

`/deployments/{deployment_id}` (resource `muvqou`) exposes only **`GET, OPTIONS`** on the
dev API. The 403 is API Gateway trying to parse the Bearer token as a SigV4 credential
because no matching method exists.

Consequences:

- `updateDeployment()` and `deleteDeployment()` in
  [`src/api/deploymentsApi.ts`](../src/api/deploymentsApi.ts) are **dead code**. Any UI path
  reaching them gets an opaque API Gateway 403, not a usable error.
- `sd_deployments_handler.py` *implements* both operations — the handler code is fine, the
  API Gateway methods were never created.
- The reference doc §4 lists both routes as live. They are not.

Not season-blocking (neither is on the setup critical path), but it should be either wired
up or removed from the client. The harness works around it by deleting sentinel rows
straight from DynamoDB, and will self-heal if the route is ever added.

### 5.4 The two Christmas N/A phases

Phases 6 and 10 cannot run for Christmas: a direct table scan confirms dev holds **4
non-packable Halloween static props and zero Christmas ones** (the only other non-packables
are the three shared receptacles, excluded by `class_type != Receptacle`). This is real
inventory, not a seeding oversight or a season-filter bug.

They are therefore recorded as **N/A** via `FIXTURE_EXEMPT` in the harness rather than
failing every Christmas run forever. The same code path is fully covered by the Halloween
run. **If Christmas ever acquires an oversized prop, delete its `FIXTURE_EXEMPT` entry** so
the phases run for real.

### 5.5 Environment left clean

Verified after both runs:

```
DEP-HAL-2030 rows: 0
DEP-CHR-2030 rows: 0
items not in a resting status (Staged/PreDeployment/TearDown): 0
```

The one manual cleanup was after the *first* failed run, before the DDB fallback existed:
tote `STOR-SELF-HAL-002` → `Stored`, item `DEC-AMT-FIERY_REAPER-015` → `Packed`, and five
sentinel rows removed by hand. Cleanup is fully automatic now (39/39 records restored on
the Halloween run, 38/38 on Christmas).

---

## 6. Known gaps

- **Fixture dependency.** Phases 5, 6, 9 and 10 need real inventory: a Packed tote with
  contents, a staged item with `female_ends > 0`, a second staged item to plug into it, and
  a `packable: false` static prop. Missing fixtures fail loudly rather than skipping —
  except where an entry in `FIXTURE_EXEMPT` records that the inventory genuinely has none
  (§5.4). Review those entries each season; a stale exemption silently hides a real gap.
- **Requires the AWS CLI.** Two operations have no REST route: reading/restoring tote
  status (storage table) and deleting the sentinel deployment (§5.3). Both go through
  `aws dynamodb`, so the runner needs credentials for the target account.
- **No UI coverage.** This is an API-level gate. It proves the backend state machine works;
  it does not prove the React pages render or wire correctly. A Playwright layer over the
  builder → staging → session flow would close that, and is not written.
- **Photo attachment untested.** `PATCH /connections/{cid}/photos` and the dual-mode
  placement PATCH are not exercised.
- **Single-zone.** The run uses FY only. Multi-zone session sequencing is not covered.

---

## 7. Doc drift found while writing this

Deriving the contract from handler source surfaced two errors in
`docs-spookydecs/sub_docs/deployments.md`. Both would mislead anyone writing against
this sub — not filed anywhere yet:

- **§6 schema is wrong.** It documents `PK`/`SK` as `DEPLOY#{id}` / `ZONE#{zone}`. The live
  table keys on **`deployment_id` + `deployment_item_id`**, with values `METADATA`,
  `ZONE-FY`, `SESSION-{uuid}`, `CONNECTION-{uuid}`, `PLACEMENT-{uuid}`, `STAGING-{item_id}`.
  The same section lists statuses as `Planning|Active|Complete|TearDown|Archived`; the
  handlers use `pre-deployment|active_setup|completed|active_teardown|archived`.
- **§9 claims teardown-complete "deletes the active record and creates an archived record."**
  It does not — `handle_complete` only flips `status` to `archived` in place, and the
  historical handler queries a `status = 'archived'` index over that same record.
