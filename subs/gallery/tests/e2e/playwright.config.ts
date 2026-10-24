import { defineConfig } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

// Gallery's Playwright suite (#623). The gallery is public and read-only, so there is no
// global-setup/auth and no sentinel fixture. Default target is the local dev server (which
// talks to the dev API stage). Set E2E_GALLERY_URL to smoke-test a deployed site instead
// (e.g. https://gallery.spookydecs.com for the prod read-only smoke) — no dev server is
// started in that case, and the spec asserts it issues zero non-GET API requests.
const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../../../..');
const remote = process.env.E2E_GALLERY_URL;

export default defineConfig({
  testDir: here,
  testMatch: '*.spec.ts',
  timeout: 60_000,
  retries: 0,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: remote || 'http://localhost:3000',
    viewport: { width: 1280, height: 1000 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  ...(remote
    ? {}
    : {
        webServer: {
          command: 'npm run dev -w spookydecs-gallery',
          cwd: repoRoot,
          url: 'http://localhost:3000',
          reuseExistingServer: !process.env.CI,
          timeout: 60_000,
        },
      }),
});
