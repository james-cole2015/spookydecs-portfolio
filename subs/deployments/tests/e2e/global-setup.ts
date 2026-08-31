import { chromium } from '@playwright/test';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { fetchIdToken } from '../shared/auth.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../../../..');
export const STORAGE_STATE_PATH = resolve(here, '.auth/dev.json');

/** Tiny KEY=VALUE parser — avoids adding a dotenv dependency for one file. */
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

/**
 * Programmatic auth (#554 AC2) — no UI login form is driven and no manual cookie
 * paste is needed. Logs into Cognito the same way vite.config.ts's autoAuthPlugin
 * does, then seeds a storageState with the real `spookydecs_auth` cookie the app
 * reads via window.SpookyAuth.buildHeaders(). Every spec loads this storageState.
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
