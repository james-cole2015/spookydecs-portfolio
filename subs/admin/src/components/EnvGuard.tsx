/**
 * EnvGuard — preserves the vanilla admin boot guard (old js/app.js called
 * enforceEnvAccess() before init). admin is internal-staff only, so the token's
 * env claim is enforced before the app renders. On a mismatch enforceEnvAccess()
 * clears the cookie + redirects to login; we render nothing while that redirect
 * is in flight.
 *
 * Runs through the useAuth hook (per #322) so the migration checker stays green.
 * The check fires once, synchronously, at first render — before children mount —
 * via the useState initializer.
 */
import { useState, type ReactNode } from 'react';
import { useAuth } from '@spookydecs/ui';

export function EnvGuard({ children }: { children: ReactNode }) {
  const { enforceEnvAccess } = useAuth();
  const [allowed] = useState(() => enforceEnvAccess());
  if (!allowed) return null;
  return <>{children}</>;
}
