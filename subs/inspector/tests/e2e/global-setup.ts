import { chromium } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { fetchIdToken } from '../../../_e2e/shared/auth.mjs';
import { loadEnvLocal } from '../../../_e2e/shared/env.mjs';

const here = dirname(fileURLToPath(import.meta.url));
export const STORAGE_STATE_PATH = resolve(here, '.auth/dev.json');

/**
 * Programmatic auth (mirrors subs/deployments/tests/e2e/global-setup.ts, #554) — no
 * UI login form is driven and no manual cookie paste is needed. Logs into Cognito the
 * same way vite.config.ts's autoAuthPlugin does, then seeds a storageState with the
 * real `spookydecs_auth` cookie the app reads via window.SpookyAuth.buildHeaders().
 */
export default async function globalSetup() {
  const fileEnv = loadEnvLocal();
  const username = process.env.COGNITO_USERNAME || fileEnv.COGNITO_USERNAME;
  const password = process.env.COGNITO_PASSWORD || fileEnv.COGNITO_PASSWORD;

  const idToken = await fetchIdToken({ username, password });
  console.log('[e2e auth] Token acquired');

  const browser = await chromium.launch();
  const context = await browser.newContext();
  await context.addCookies([
    { name: 'spookydecs_auth', value: idToken, domain: 'localhost', path: '/' },
  ]);
  await context.storageState({ path: STORAGE_STATE_PATH });
  await browser.close();
}
