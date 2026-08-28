# Deployments — Playwright E2E (#554)

The first browser-driven test in the Portfolio repo. Complements the API-only pre-season
gate (`../preseason/lifecycle.e2e.mjs`) by actually rendering the deployments UI and
driving it: builder → staging → session (connect + place) → complete → teardown.

## Run it

```bash
npm install                         # pulls @playwright/test at the repo root
npx playwright install chromium     # one-time browser download
npm run test:e2e:deployments
```

Needs the same things the pre-season gate needs: `COGNITO_USERNAME`/`COGNITO_PASSWORD` in
the repo-root `.env.local` (already there for local dev — see `subs/deployments/vite.config.ts`),
and AWS CLI credentials (cleanup falls back to DynamoDB for the one gap the REST API has:
no `DELETE /deployments/{id}` route — see `../preseason/../README.md` §7 discussion).

No manual cookie paste, no UI login form driven — `global-setup.ts` logs into Cognito the
same way the dev server's `autoAuthPlugin` does and seeds a `storageState` with the real
`spookydecs_auth` cookie the app reads.

Every run writes `reports/report.md` — a per-step pass/fail table + duration, plus a
one-line pointer to any failure screenshot/trace. Ephemeral, like `test-results/`: gitignored,
regenerated each run, not the durable run log. Copy anything worth keeping into
`docs-spookydecs/sub_tests/deployments.md` §7 by hand, same as the API gate's convention.

## How it's built (the pattern to copy for the next sub)

| Piece | File | Purpose |
|---|---|---|
| Auth | `../shared/auth.mjs` | `fetchIdToken()` — POSTs to the Cognito `/auth` route, zero deps |
| Auth wiring | `global-setup.ts` | Seeds a `storageState` cookie once per run; every spec loads it via `test.use()` |
| Fixture data | `../shared/sentinel.mjs` | Sentinel deployment id, ledger (snapshot/restore), delete — extracted from the API gate |
| Fixture lifecycle | `fixtures.ts` | Worker-scoped `deployment` fixture: preflight cleanup → hand off `{ deploymentId, api, ledger }` → restore/delete on teardown, even on failure |
| The flow | `deployment-lifecycle.spec.ts` | One sequential test, `test.step()` per phase |

**Why one sequential test, not N independent ones:** each phase depends on state the
browser itself created in the previous phase (the deployment, the staged tote, the open
session). Splitting into independent tests would mean re-deriving that state per test —
more fixture code for no real isolation benefit, since the whole flow is inherently a
state machine.

**The ledger discipline:** `ledger.rememberTote()`/`ledger.rememberItem()` must be called
*before* the browser mutates something, exactly like the API gate's `remember()` calls.
Cleanup can only restore what was remembered — an unremembered mutation is a real gap
(see `docs-spookydecs/sub_tests/deployments.md`'s known-gaps section for what this run
currently does and doesn't cover).

## `data-testid` conventions used here

HeroUI components render mostly by visible text, which is often duplicated between a
trigger and its confirm dialog (e.g. "Stage Tote" appears on both). Where text alone is
ambiguous, a `data-testid` was added — see `docs-spookydecs/sub_tests/deployments.md` for
the full list and rationale. The shared `ConfirmDialog` (`@spookydecs/ui`) now accepts an
optional `confirmTestId` prop for exactly this reason; use it instead of adding a new
one-off pattern.

## CI posture

**Manual-only for now**, matching the API gate's own posture — see
`docs-spookydecs/sub_tests/deployments.md` for the reasoning and the CI fast-follow note.
