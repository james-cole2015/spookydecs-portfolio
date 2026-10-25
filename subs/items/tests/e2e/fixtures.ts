import { test as base } from '@playwright/test';
import { makeApiClient, sweepSentinels, sentinelName, SENTINEL_MARKER } from '../shared/sentinel.mjs';
import { fetchIdToken } from '../../../_e2e/shared/auth.mjs';
import { loadEnvLocal } from '../../../_e2e/shared/env.mjs';

export const SEASON = 'Halloween';
export const STAGE = 'dev';

type ItemsFixture = { api: ReturnType<typeof makeApiClient>; marker: string };

/** Marker+sweep around the run (see ../shared/sentinel.mjs); teardown runs even if the test threw. */
export const test = base.extend<{}, { items: ItemsFixture }>({
  items: [
    async ({}, use) => {
      const fileEnv = loadEnvLocal();
      const token = await fetchIdToken({
        username: process.env.COGNITO_USERNAME || fileEnv.COGNITO_USERNAME,
        password: process.env.COGNITO_PASSWORD || fileEnv.COGNITO_PASSWORD,
      });
      const api = makeApiClient({ token, stage: STAGE });

      const pre = await sweepSentinels(api);
      if (pre.items || pre.units) console.log(`[e2e cleanup] preflight swept ${pre.items} item(s), ${pre.units} unit(s)`);

      await use({ api, marker: SENTINEL_MARKER });

      const post = await sweepSentinels(api);
      console.log(`[e2e cleanup] swept ${post.items} item(s), ${post.units} unit(s)`);
      if (post.stuckUnits.length) {
        console.warn(`[e2e cleanup] WARNING: Self unit(s) left on dev (API cannot delete them), remove manually: ${post.stuckUnits.join(', ')}`);
      }
    },
    { scope: 'worker' },
  ],
});

export { expect } from '@playwright/test';
export { sentinelName };
