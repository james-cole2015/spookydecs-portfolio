# Deployments — Tests

**Pre-season lifecycle gate.** Drives a deployment through its entire state machine against a
live API stage — create → stage → session → connect + place → complete → teardown → archive —
asserting every guarded transition, then restores everything it touched.

Run it ~2 weeks before each setup weekend:

```bash
export SD_TOKEN='<spookydecs_auth cookie value>'
node tests/preseason/lifecycle.e2e.mjs --season Halloween   # or Christmas
```

Exit `0` = passing. Also needs AWS CLI credentials (two operations have no REST route).

**Browser E2E (#554)** — the first Playwright suite in the fleet. Drives the same flow
through an actual browser instead of the raw API:

```bash
npm install && npx playwright install chromium   # one-time
npm run test:e2e:deployments
```

See `e2e/README.md` for how it's built (auth, fixtures, the `data-testid` convention) —
that's also the pattern the next sub should copy.

| Path | What |
|------|------|
| `preseason/lifecycle.e2e.mjs` | The API gate — 19 phases, zero dependencies, Node 18+ |
| `e2e/` | The Playwright browser gate — builder → staging → session → complete → teardown |
| `shared/auth.mjs`, `shared/sentinel.mjs` | Auth + fixture logic shared by both gates |
| `unit/deploymentsConfig.test.ts` | vitest specs for config/validation. **Inert — no test runner installed yet.** |

📖 **Full guide — design, coverage, outputs, failure diagnosis, run log, known gaps:**
`docs-spookydecs/sub_tests/deployments.md`

Test *documentation* lives in the docs repo by standard (`docs-spookydecs/sub_tests/README.md`):
code-coupled material ships with the code, while run results and environment specifics stay in
the private repo. Read the guide before interpreting a failure — the failure reference is what
turns a red run into a diagnosis.
