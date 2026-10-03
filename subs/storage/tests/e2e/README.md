# Storage — Playwright E2E (#589)

Second browser-driven suite in the Portfolio repo, copying the pattern
`subs/deployments/tests/e2e/` established (#554): render the real UI and drive it —
create → pack → status transitions → unpack → delete.

## Run it

```bash
npm install                         # pulls @playwright/test at the repo root
npx playwright install chromium     # one-time browser download (skip if already done)
npm run test:e2e:storage
```

Needs `COGNITO_USERNAME`/`COGNITO_PASSWORD` in the repo-root `.env.local` (already there
for local dev — see `subs/storage/vite.config.ts`), and network access to the dev API
(`miinu7boec.execute-api.us-east-2.amazonaws.com/dev`) for both the fixture cleanup and
the item lookup.

No manual cookie paste, no UI login form driven — `global-setup.ts` logs into Cognito
the same way the dev server's `autoAuthPlugin` does and seeds a `storageState` with the
real `spookydecs_auth` cookie the app reads.

Every run writes `reports/report.md` — a per-step pass/fail table + duration. Ephemeral,
like `test-results/`: gitignored, regenerated each run — copy anything worth keeping into
`docs-spookydecs/sub_tests/storage.md` by hand, same as the deployments convention.

## How it's built

| Piece | File | Purpose |
|---|---|---|
| Auth | `../shared/auth.mjs` | `fetchIdToken()` — POSTs to the Cognito `/auth` route, zero deps (copy of deployments' version — kept per-sub rather than cross-sub-imported) |
| Auth wiring | `global-setup.ts` | Seeds a `storageState` cookie once per run; the spec loads it via `test.use()` |
| Sentinel data | `../shared/sentinel.mjs` | Marker-based find/sweep/delete for sentinel storage units, plus `pickPackableItem()` to find a real item eligible for packing |
| Fixture lifecycle | `fixtures.ts` | Worker-scoped `storage` fixture: preflight sweep → hand off `{ api, marker }` → sweep again on teardown, even on failure |
| The flow | `storage-lifecycle.spec.ts` | One sequential test, `test.step()` per phase |

## The ID-generation divergence from deployments (read this before copying the pattern)

Deployments' sentinel deployment ID is **deterministic and client-chosen**
(`DEP-{HAL|CHR}-2030` — a fixed sentinel year no real season ever uses), so its fixture
can compute the ID up front and preflight-delete-by-known-ID before the spec even runs.

Storage unit IDs are **server-generated and sequential**
(`STOR-{TYPE}-{SEASON}-{N}`, e.g. `STOR-TOTE-HAL-014`) — the next `N` depends on how many
units already exist for that type/season, so there is no ID to predict or preflight-delete
by. Instead:

1. Every sentinel tote is created through the UI with a **name-field marker**
   (`SENTINEL_MARKER` in `../shared/sentinel.mjs`, currently `E2E SENTINEL - safe to
   delete` — no brackets/colons, since Short Name validation only allows letters,
   digits, spaces, `-`, `_`, and parens) baked into its Short Name.
2. `sweepSentinels(api)` — called on **both** fixture preflight and teardown — lists
   every storage unit (`GET /storage`), filters for the marker, and deletes each match.
   This is what "no known ID" is traded for: instead of one deterministic delete, cleanup
   is "find everything that looks like leftover sentinel debris and remove it," which is
   strictly more robust against interrupted prior runs (a stale sentinel from a crash last
   week is swept exactly the same as one from ten seconds ago).
3. Because `DELETE /storage/{id}` 400s on a non-empty unit
   (`sd_storage_handler.py::delete_storage`), `sweepSentinels` unpacks a matched unit's
   contents first. Removing an item fires the same `Item.Unpacked` event the UI's own
   "Remove" button does — so **sweeping is also the item cleanup**. Unlike deployments,
   this suite carries no snapshot/restore ledger for the real item it packs: the flow's
   own "unpack" step (or, on a crash, the sweep) is a full round trip back to the item's
   original `is_stored: false` state. There is also a real `DELETE /storage/{id}` route
   on every stage, so — unlike deployments — no DynamoDB CLI fallback is needed anywhere
   in this suite.

**For the next sub to copy:** if your sub's IDs are server-generated, use the marker +
sweep pattern here, not deployments' deterministic-ID preflight-delete. If your sub's
flow mutates a real record that a crash could leave stranded outside of what the sweep
itself touches, add a deployments-style ledger back in — don't assume the sweep always
covers it for free the way it happens to here.

## `data-testid` conventions used here

Same rationale as deployments: HeroUI renders mostly by visible text, which duplicates
between a trigger and its `ConfirmDialog` (e.g. "Mark as Packed" appears on both the
button and the dialog's confirm button). Every `ConfirmDialog` in `DetailPage.tsx` now
passes `confirmTestId` for exactly this reason — see the shared `ConfirmDialog`
(`@spookydecs/ui`) which already accepted this prop from the deployments work.

| Test ID | Where |
|---|---|
| `create-type-tote` | `CreateWizardPage` — Tote type card |
| `create-review-submit` | `CreateWizardPage` — step 2 → 3 "Review" button |
| `create-submit` | `CreateWizardPage` — final "Create Storage Unit" button |
| `item-picker-{itemId}` | `ItemPicker` — per-item checkbox row |
| `pack-tote-save` | `PackWizardPage` (tote flow) — "Save" button |
| `mark-packed-btn` / `confirm-mark-packed` | `DetailPage` — trigger / dialog confirm |
| `mark-stored-btn` / `confirm-mark-stored` | `DetailPage` — trigger / dialog confirm |
| `content-item-{itemId}` | `DetailPage` — a contents row |
| `remove-item-{itemId}` / `confirm-remove-item` | `DetailPage` — trigger / dialog confirm |
| `delete-btn` / `confirm-delete` | `DetailPage` — trigger / dialog confirm |

## CI posture

**Manual-only for now**, matching deployments' own posture.
