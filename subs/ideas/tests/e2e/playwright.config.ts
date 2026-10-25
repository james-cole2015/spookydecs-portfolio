import { defineConfig } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

// Ideas Playwright suite (#623), mirroring subs/deployments/tests/e2e/ (#554) —
// see ../README.md for the pattern and the sentinel-ID divergence.
const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../../../..');

export default defineConfig({
  testDir: here,
  testMatch: '*.spec.ts',
  timeout: 60_000,
  retries: 0,
  workers: 1, // the flow is sequential and stateful (sentinel ideas) — never parallelize
  reporter: [
    ['list'],
    [resolve(here, 'md-reporter.mjs'), { outputFile: resolve(here, 'reports/report.md') }],
  ],
  globalSetup: resolve(here, 'global-setup.ts'),
  use: {
    baseURL: 'http://localhost:3000',
    // Taller than Playwright's 1280x720 default — the create form's
    // choice (#590) pushes the Size select to the bottom edge at 720px, which made its
    // popover intermittently fail to stabilize when clicked.
    viewport: { width: 1280, height: 1000 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run dev -w spookydecs-ideas',
    cwd: repoRoot,
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
