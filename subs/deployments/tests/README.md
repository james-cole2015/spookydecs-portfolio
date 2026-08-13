# Deployments — Pre-Season Test Design

Purpose: prove the deployments sub still works **before** the Halloween and Christmas
setup weekends, when a broken lifecycle costs a day of physical work in the yard.

Run the gate twice a year:

| When | Command |
|---|---|
| ~2 weeks before Halloween setup | `node tests/preseason/lifecycle.e2e.mjs --season Halloween` |
| ~2 weeks before Christmas setup | `node tests/preseason/lifecycle.e2e.mjs --season Christmas` |

---

## 1. What actually breaks (risk model)

The deployments sub is not a CRUD app — it is a **state machine spanning 6 Lambdas and
2 DynamoDB tables**, and every transition is a guarded write. That is where the risk is,
so that is what the gate tests.

**Deployment status machine**

```
pre-deployment ──create_session──▶ active_setup ──POST /complete──▶ completed
                                                                        │
                                              ┌─────teardown/start──────┘
                                              ▼
                                     active_teardown ──teardown/complete──▶ archived
```

**Item status machine** (written by deployments *directly into the items table* —
no EventBridge, so a broken IAM policy shows up as a silent 500, not a queued retry)

```
Packed/Stored ──POST /stage──▶ Staged ──connection|placement──▶ PreDeployment
                                                                     │
                              ┌───────────POST /complete─────────────┘
                              ▼
                          Deployed ──teardown/item──▶ TearDown
```

Ranked pre-season risks:

1. **A guard rejects a legal transition** (e.g. `teardown/start` demands `completed`) —
   the flow dead-ends mid-setup with a 400 and no UI recovery path.
2. **A cross-table item write fails** — deployments holds *attribute-scoped* cross-domain
   IAM grants on `sd_items_records_*`/`sd_storage_records_*`. An IAM drift means items
   never leave `Staged` and nothing can be connected.
3. **Both deploy paths must work.** Powered props go through `CONNECTION-`; static props
   (`male_ends==0 && female_ends==0 && !power_inlet`) go through `PLACEMENT-` (#457).
   `end_session` must **union** both into `zone.items_deployed` — if the union regresses,
   every gravestone silently fails to deploy and teardown can't find them.
4. **Both staging paths must work.** Tote staging *and* loose non-packable staging
   (#460, `item_ids` with no `tote_id`). Large & Oversized props live in no storage unit.
5. **Season filtering.** `build_season_filter` decides which items are even stageable.
   Wrong season filter = an empty staging screen on setup day.

## 2. Test layers

| Layer | Tool | Runs against | Speed | Catches |
|---|---|---|---|---|
| **L1 unit** | vitest | nothing (pure) | ms | season/year validation, ID generation, status labels |
| **L2 contract** | vitest + fetch stub | nothing (stubbed) | ms | role gating, 401→login, query-param building, error unwrapping |
| **L3 lifecycle E2E** | zero-dep Node harness | live `dev` stage | ~30s | the state machine, IAM, cross-table writes, both deploy paths |

**L3 is the pre-season gate.** L1/L2 are cheap regression nets for CI; they cannot catch
any of the five risks above, because every one of them lives in a Lambda or an IAM policy.
Don't mistake a green unit suite for season readiness.

Also worth noting: there is currently **no test infrastructure anywhere in the Portfolio
repo** (no vitest, no playwright, no `*.test.*`). The lambdas repo has pytest under
`handlers/items/tests/`. L3 is written zero-dependency on purpose so it runs today with
no `npm install` and no buy-in to a framework.

## 3. Isolation strategy

The hard problem: this sub mutates **real, shared item records**. A careless E2E run
leaves the yard inventory in `TearDown` a week before setup.

Three rules the harness enforces:

1. **Sentinel year.** `DEPLOYMENT_CONFIG.MAX_YEAR` is 2030 and real deployments are
   current-year, so the harness uses **year 2030** (`DEP-HAL-2030` / `DEP-CHR-2030`).
   It can never collide with a live deployment, and the create handler's 409 guard
   ("Deployment already exists for this season and year") protects the real one.
2. **Minimum blast radius.** It stages exactly **one tote** and **one loose non-packable
   item**, and it picks them from the live `GET /stage` response rather than hardcoding IDs.
3. **Restore, always.** Every item the run touches is recorded with its *original* status
   and `PATCH /items/{id}`-restored in a `finally` block — including on failure. Teardown
   leaves items in `TearDown`, not their original status, so restore is not optional.
   `--keep` skips cleanup for debugging; use it knowingly.

**Never run this against `prod`.** The harness refuses unless `--stage dev|demo`, and
requires `--force-prod` plus a matching season/year to even consider it.

## 4. Phase matrix (L3)

Ordering is load-bearing — the negative gates only assert correctly from the right state.

| # | Phase | Asserts |
|---|---|---|
| 0 | Preflight | token valid, `GET /deployments` 200, sentinel not left over from a prior run |
| 1 | Create | 201, `status: pre-deployment`, exactly **3 zones** (FY/BY/SY), `total_zones: 3` |
| 2 | Duplicate guard | second POST → **409** |
| 3 | Input validation | `year` as string → 400; missing `zones` → 400; bad season code handled |
| 4 | Stage discovery | `GET /stage` returns `totes` + `non_packable_items`, season-matched |
| 5 | Stage tote | POST `{tote_id}` → tote `Staged`, contained items `Staged` |
| 6 | Stage loose | POST `{item_ids}` → item `Staged` (the #460 path) |
| 7 | Session open | POST `/sessions` → deployment flips **pre-deployment → active_setup** |
| 8 | Session exclusivity | second POST `/sessions` → **409** (one active session per deployment) |
| 9 | Connection path | POST `/connections` → item **Staged → PreDeployment** |
| 10 | Placement path | POST `/placements` → static prop **Staged → PreDeployment** (#457) |
| 11 | Port reuse guard | reuse same `from_port` → 400 |
| 12 | Complete gate | POST `/complete` **while session open** → 409 |
| 13 | End session | PUT `/sessions/{sid}` → `zone.items_deployed` **unions connection + placement** |
| 14 | Complete | POST `/complete` → `completed`, all items **Deployed** |
| 15 | Teardown order | `/teardown/complete` before items torn down → 400 (`still_deployed`) |
| 16 | Teardown items | `/teardown/item` → **Deployed → TearDown** |
| 17 | Archive | `/teardown/complete` → `archived` |
| 18 | Historical | `GET /historical` includes it; `GET /historical/{id}` returns detail |
| 19 | Cleanup | items restored to original status; sentinel deployment deleted |

Phases 12 and 15 are the two most valuable in the whole suite — they are the guards that,
when they regress, strand a real deployment mid-flow with no UI escape.

## 5. Running it

```bash
# token: copy the `spookydecs_auth` cookie value from devtools on deployments-dev
export SD_TOKEN='eyJ...'

node tests/preseason/lifecycle.e2e.mjs --season Halloween          # full gate, dev
node tests/preseason/lifecycle.e2e.mjs --season Christmas --verbose
node tests/preseason/lifecycle.e2e.mjs --season Halloween --keep   # leave state for inspection
node tests/preseason/lifecycle.e2e.mjs --season Halloween --cleanup-only   # undo a --keep run
```

Exit `0` = season-ready. Non-zero = do not start setup weekend.

## 6. Findings from writing this

Two reference-doc drifts surfaced while deriving the contract; `docs-spookydecs/sub_docs/deployments.md`
should be corrected (worth a tracker issue):

- **§6 DDB schema is wrong.** It documents `PK`/`SK` with `DEPLOY#{id}` / `ZONE#{zone}`.
  The live table actually keys on **`deployment_id` + `deployment_item_id`**, with values
  `METADATA`, `ZONE-FY`, `SESSION-{uuid}`, `CONNECTION-{uuid}`, `PLACEMENT-{uuid}`,
  `STAGING-{item_id}`. Same §6 lists statuses as `Planning|Active|Complete|TearDown|Archived`;
  the handlers use `pre-deployment|active_setup|completed|active_teardown|archived`.
- **§9 says teardown-complete "deletes the active record and creates an archived record."**
  It does not — `handle_complete` only flips `status` to `archived` in place, and the
  historical handler queries a `status = 'archived'` index over the same table.
