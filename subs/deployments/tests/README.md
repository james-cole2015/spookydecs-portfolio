# Deployments — Tests

**Pre-season lifecycle gate.** Drives a deployment through its entire state machine against a
live API stage — create → stage → declare → connect → complete → teardown → archive —
asserting every guarded transition (including the server's port-reuse, target-dedupe, `to_port`
and cross-zone guards), then restores everything it touched. Sessions were retired in #638.

Run it ~2 weeks before each setup weekend:

```bash
export SD_TOKEN='<spookydecs_auth cookie value>'
node tests/preseason/lifecycle.e2e.mjs --season Halloween   # or Christmas
```

The run uses a sentinel deployment (`DEP-HAL-2030` / `DEP-CHR-2030`) and **deletes any existing record
with that id first**. If someone is using 2030 as a test deployment, pass `--year 2029` (any year in
2023..2030) so the run uses its own sentinel instead.

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
| `preseason/lifecycle.e2e.mjs` | The API gate — zero dependencies, Node 18+ |
| `e2e/` | The Playwright browser gate — builder → staging → declare + connect → complete → teardown |
| `shared/sentinel.mjs` | Fixture logic shared by both gates (auth is the shared `subs/_e2e/shared/auth.mjs`, #623) |
| `unit/*.test.ts` | vitest specs: config/validation, graph derivation + layout, authoring/port rules, per-zone scoping and visual tiers. Run with `npx vitest run --dir subs/deployments/tests/unit` |

📖 **Full guide — design, coverage, outputs, failure diagnosis, run log, known gaps:**
`docs-spookydecs/sub_tests/deployments.md`

Test *documentation* lives in the docs repo by standard (`docs-spookydecs/sub_tests/README.md`):
code-coupled material ships with the code, while run results and environment specifics stay in
the private repo. Read the guide before interpreting a failure — the failure reference is what
turns a red run into a diagnosis.
