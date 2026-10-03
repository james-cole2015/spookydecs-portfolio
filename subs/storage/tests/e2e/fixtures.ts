import { test as base } from '@playwright/test';
import { makeApiClient, sweepSentinels, pickPackableItem, sentinelName, SENTINEL_MARKER } from '../shared/sentinel.mjs';
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
export const LOCATION = 'Shed';
export const SIZE = 'Medium';
export const STAGE = 'dev';

type StorageFixture = {
  api: ReturnType<typeof makeApiClient>;
  marker: string;
};

/**
 * Fixture setup/cleanup (#589), following the shape of subs/deployments/tests/e2e/
 * fixtures.ts (#554) but adapted for storage's server-generated (not deterministic)
 * IDs: rather than compute-and-preflight-delete-by-known-ID, the fixture sweeps every
 * storage unit carrying SENTINEL_MARKER before and after the run (see
 * ../shared/sentinel.mjs for why the sweep alone — no separate item ledger — is
 * enough to also reset the one real item the spec packs and unpacks).
 *
 * Like deployments' BuilderPage, CreateWizardPage must render its own create form —
 * the fixture does not pre-create the sentinel tote, only cleans up around it.
 */
export const test = base.extend<{}, { storage: StorageFixture }>({
  storage: [
    async ({}, use) => {
      const fileEnv = loadEnvLocal();
      const token = await fetchIdToken({
        username: process.env.COGNITO_USERNAME || fileEnv.COGNITO_USERNAME,
        password: process.env.COGNITO_PASSWORD || fileEnv.COGNITO_PASSWORD,
      });
      const api = makeApiClient({ token, stage: STAGE });

      const preflightSwept = await sweepSentinels(api); // no-ops if none exist
      if (preflightSwept) console.log(`[e2e cleanup] preflight swept ${preflightSwept} leftover sentinel unit(s)`);

      await use({ api, marker: SENTINEL_MARKER });

      // Teardown always runs, even if the test above threw — this sweep is the
      // entire cleanup story (deleting a sentinel unit unpacks its contents first).
      const swept = await sweepSentinels(api);
      console.log(`[e2e cleanup] sentinel sweep: ${swept} unit(s) removed`);
    },
    { scope: 'worker' },
  ],
});

export { expect } from '@playwright/test';
export { sentinelName, pickPackableItem };
