/**
 * Programmatic Cognito login — shared by the Playwright e2e suite (tests/e2e/global-setup.ts).
 * Copied from subs/deployments/tests/shared/auth.mjs (#554) per the pattern this sub's
 * suite mirrors (#589) — kept per-sub rather than cross-sub-imported so each suite stays
 * self-contained. Zero dependencies — Node 18+ (native fetch).
 */

export const AUTH_URL = 'https://miinu7boec.execute-api.us-east-2.amazonaws.com/dev/auth';

/**
 * POSTs {username, password} to the public /auth route and returns the idToken.
 * No SECRET_HASH is needed client-side — the Lambda computes it server-side.
 *
 * @param {{ username?: string, password?: string, authUrl?: string }} opts
 * @returns {Promise<string>} idToken
 */
export async function fetchIdToken({ username, password, authUrl = AUTH_URL } = {}) {
  if (!username || !password) {
    throw new Error(
      'fetchIdToken requires username/password (set COGNITO_USERNAME/COGNITO_PASSWORD in .env.local).'
    );
  }
  const res = await fetch(authUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Cognito auth failed (${res.status}): ${text.slice(0, 200)}`);
  }
  const data = await res.json();
  if (!data.idToken) throw new Error('Cognito auth response had no idToken');
  return data.idToken;
}
