import { test as base } from '@playwright/test';
import { makeApiClient, sweepSentinels, SENTINEL_MARKER } from '../shared/sentinel.mjs';
import { fetchIdToken } from '../../../_e2e/shared/auth.mjs';
import { loadEnvLocal } from '../../../_e2e/shared/env.mjs';

export const STAGE = 'dev';

type AdminFixture = { api: ReturnType<typeof makeApiClient>; marker: string };

/** Marker+sweep around the run (see ../shared/sentinel.mjs); teardown runs even if the test threw. */
export const test = base.extend<{}, { admin: AdminFixture }>({
  admin: [
    async ({}, use) => {
      const fileEnv = loadEnvLocal();
      const token = await fetchIdToken({
        username: process.env.COGNITO_USERNAME || fileEnv.COGNITO_USERNAME,
        password: process.env.COGNITO_PASSWORD || fileEnv.COGNITO_PASSWORD,
      });
      const api = makeApiClient({ token, stage: STAGE });

      const pre = await sweepSentinels(api);
      if (pre) console.log(`[e2e cleanup] preflight swept ${pre} leftover sentinel(s)`);
      await use({ api, marker: SENTINEL_MARKER });
      const post = await sweepSentinels(api);
      console.log(`[e2e cleanup] swept ${post} sentinel(s)`);
    },
    { scope: 'worker' },
  ],
});

export { expect } from '@playwright/test';
export { createSentinelItem, createSentinelIdea, SENTINEL_MARKER } from '../shared/sentinel.mjs';
