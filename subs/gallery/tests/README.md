# Gallery — Tests

Playwright end-to-end suite for the public gallery. It is **read-only** (the suite fails if any non-GET request reaches an API stage), needs
**no credentials**, and is data-driven, so it can be pointed at a deployed site.

```bash
npm install && npx playwright install chromium   # one-time
npm run test:e2e:gallery                          # local dev server -> dev API
E2E_GALLERY_URL=https://<gallery host> npm run test:e2e:gallery   # deployed read-only smoke
```

| Path | What |
|------|------|
| `e2e/gallery-lifecycle.spec.ts` | Sections load from the public API, tabs, routing |
| `e2e/gallery-filters.spec.ts` | Season / year / tag filters, lightbox, bad-section API contract |

Full guide (design, coverage, failure diagnosis, run log, known gaps): `docs-spookydecs/sub_tests/gallery.md`.
