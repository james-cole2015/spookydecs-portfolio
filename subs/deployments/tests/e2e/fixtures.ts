import { test as base } from '@playwright/test';
import {
  makeApiClient,
  deleteSentinel,
  createLedger,
  sentinelDeploymentId,
} from '../shared/sentinel.mjs';
import { fetchIdToken } from '../shared/auth.mjs';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../../../..');

function loadEnvLocal(): Record<string, string> {
  const path = resolve(repoRoot, '.env.local');
  if (!existsSync(path)) return {};
  const env: Record<string, string> = {};
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return env;
}

export const SEASON = 'Halloween';
export const STAGE = 'dev';

type DeploymentFixture = {
  deploymentId: string;
  api: ReturnType<typeof makeApiClient>;
  /** The spec calls rememberTote/rememberItem as it discovers what it's about to
   *  mutate via the browser, exactly like lifecycle.e2e.mjs's phases do before
   *  each stage/connect/place — cleanup can only restore what was remembered. */
  ledger: ReturnType<typeof createLedger>;
};

/**
 * Fixture setup/cleanup (#554 AC4), reusing the exact sentinel restore/delete logic
 * from the API pre-season gate (tests/preseason/lifecycle.e2e.mjs, tests/shared/
 * sentinel.mjs) rather than re-deriving it for the browser-driven flow.
 *
 * Unlike the API gate, this fixture does NOT create the sentinel deployment itself —
 * the spec drives BuilderPage's create form through the browser (AC3's first phase,
 * the one step the API gate can't observe rendering correctly). Pre-creating it here
 * would make BuilderPage's own "redirect to zones if a deployment already exists"
 * effect fire before the form ever renders. The fixture only computes the
 * deterministic sentinel id, clears any leftover sentinel before the run (preflight,
 * mirrors lifecycle.e2e.mjs phase 0), and restores/deletes whatever the spec created
 * afterward — including when the test throws, since Playwright always runs fixture
 * teardown.
 */
export const test = base.extend<{}, { deployment: DeploymentFixture }>({
  deployment: [
    async ({}, use) => {
      const fileEnv = loadEnvLocal();
      const token = await fetchIdToken({
        username: process.env.COGNITO_USERNAME || fileEnv.COGNITO_USERNAME,
        password: process.env.COGNITO_PASSWORD || fileEnv.COGNITO_PASSWORD,
      });
      const api = makeApiClient({ token, stage: STAGE });
      const deploymentId = sentinelDeploymentId(SEASON);
      const ledger = createLedger();

      await deleteSentinel(api, deploymentId, STAGE); // preflight — no-ops (404) if none exists

      await use({ deploymentId, api, ledger });

      // Teardown always runs, even if the test above threw (AC4 — verified deliberately
      // per docs-spookydecs/sub_tests/deployments.md's e2e section).
      const { restored, total, failed } = await ledger.restoreAll(api, STAGE);
      if (failed.length) {
        console.warn(`[e2e cleanup] restore failed for: ${failed.join(', ')}`);
      } else {
        console.log(`[e2e cleanup] records restored: ${restored}/${total}`);
      }
      const deleted = await deleteSentinel(api, deploymentId, STAGE);
      console.log(`[e2e cleanup] sentinel ${deploymentId}: ${deleted ? 'deleted' : 'DELETE FAILED'}`);
    },
    { scope: 'worker' },
  ],
});

export { expect } from '@playwright/test';
export { sentinelDeploymentId };
