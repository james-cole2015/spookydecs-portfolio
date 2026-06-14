/**
 * useAuth — thin, typed wrapper over the `window.SpookyAuth` CDN global.
 * Synchronous; no provider needed. Reusable playbook artifact.
 */
import { useMemo } from 'react';
import type { SpookyTokenClaims, SpookyRole } from '../types/spooky-globals';

export interface UseAuth {
  buildHeaders: (extra?: Record<string, string>) => Record<string, string>;
  hasMinRole: (required: SpookyRole) => boolean;
  /** True if the token's `custom:env` claim matches the current host's environment. */
  hasEnvAccess: () => boolean;
  /** Like hasEnvAccess(), but clears the cookie and redirects to login on mismatch. */
  enforceEnvAccess: () => boolean;
  redirectToLogin: () => Promise<void>;
  claims: SpookyTokenClaims | null;
}

export function useAuth(): UseAuth {
  return useMemo(() => {
    const auth = window.SpookyAuth;
    return {
      buildHeaders: (extra?: Record<string, string>) => auth.buildHeaders(extra),
      hasMinRole: (required: SpookyRole) => auth.hasMinRole(required),
      hasEnvAccess: () => auth.hasEnvAccess(),
      enforceEnvAccess: () => auth.enforceEnvAccess(),
      redirectToLogin: () => auth.redirectToLogin(),
      claims: auth.getTokenClaims(),
    };
  }, []);
}
