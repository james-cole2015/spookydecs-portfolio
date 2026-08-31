import { defineConfig } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

// First Playwright suite in the fleet (#554) — see ../README.md and
// docs-spookydecs/sub_tests/deployments.md for the pattern other subs should copy.
const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../../../..');

export default defineConfig({
  testDir: here,
  testMatch: '*.spec.ts',
  timeout: 60_000,
  retries: 0,
  workers: 1, // the flow is sequential and stateful (single sentinel deployment) — never parallelize
  reporter: [
    ['list'],
    [resolve(here, 'md-reporter.mjs'), { outputFile: resolve(here, 'reports/report.md') }],
  ],
  globalSetup: resolve(here, 'global-setup.ts'),
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run dev -w spookydecs-deployments',
    cwd: repoRoot,
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
