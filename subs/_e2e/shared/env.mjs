/**
 * Repo-root `.env.local` reader for the e2e suites — shared by every sub's
 * global-setup.ts / fixtures.ts (promoted from per-sub copies in #623).
 * Tiny KEY=VALUE parser — avoids adding a dotenv dependency.
 */
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
/** Repo root (subs/_e2e/shared → ../../..). */
export const REPO_ROOT = resolve(here, '../../..');

/** @returns {Record<string, string>} parsed `.env.local`, or `{}` if absent. */
export function loadEnvLocal() {
  const path = resolve(REPO_ROOT, '.env.local');
  if (!existsSync(path)) return {};
  const env = {};
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return env;
}
