/**
 * AuthGate — boot-time render gate for authenticated subs.
 *
 * Supersedes the per-sub env guards (admin's EnvGuard, the inline guards in
 * audit/tracker). Those only ran enforceEnvAccess(), which lets an unauthenticated
 * visitor straight through (hasEnvAccess() returns true when no token is present) —
 * so the protected shell painted before the API's 401 fired (#513). AuthGate adds
 * the missing no-token branch and blocks render until the decision resolves, so the
 * landing/shell never flashes for an unauthenticated or wrong-env visitor.
 *
 * The decision is made synchronously in a useState initializer (mirrors admin's
 * old EnvGuard), so children never mount before it resolves — block, not
 * paint-then-redirect. Runs under useAuth (per #322) so the migration checker stays
 * green; must be placed inside ConfigProvider so AUTH_URL is warm for
 * redirectToLogin().
 *
 * Scope: authenticated subs only. Public subs (gallery, landing, demo entrance)
 * render unauthenticated by design and must NOT be wrapped.
 */
import { useState, type ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import { LoadingState } from './Layout';

export function AuthGate({ children }: { children: ReactNode }) {
  const { claims, enforceEnvAccess, redirectToLogin } = useAuth();
  const [allowed] = useState(() => {
    const host = window.location.hostname;
    // Local dev convenience — no cookie/env claim on localhost.
    if (host === 'localhost' || host === '127.0.0.1') return true;
    // No token at all → bounce to login (prod is edge-gated; this covers dev/demo).
    if (!claims) {
      redirectToLogin();
      return false;
    }
    // Token present → enforce the env claim; clears cookie + redirects on mismatch.
    return enforceEnvAccess();
  });

  // Never render the protected shell while a redirect is in flight.
  if (!allowed) return <LoadingState label="Redirecting…" />;
  return <>{children}</>;
}
