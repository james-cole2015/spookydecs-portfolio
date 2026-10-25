# Inspector — Tests

Playwright end-to-end suite for the inspector sub. It drives the real UI against the **dev** API stage and cleans up after itself
(marker + sweep; nothing is left behind).

```bash
npm install && npx playwright install chromium   # one-time
npm run test:e2e:inspector
```

| Path | What |
|------|------|
| `e2e/` | Specs, fixtures, programmatic Cognito auth (`global-setup.ts`), the markdown reporter |
| `shared/` | Sentinel fixture: create / find / sweep throwaway records |

Shared helpers used by every suite live in `subs/_e2e/shared/`.

Full guide (design, coverage, failure diagnosis, run log, known gaps): `docs-spookydecs/sub_tests/inspector.md`.
