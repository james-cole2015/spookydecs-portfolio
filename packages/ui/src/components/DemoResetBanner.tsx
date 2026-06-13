/**
 * DemoResetBanner — a live countdown to the next demo-environment wipe.
 *
 * The `sd_demo_reset` job runs every Sunday at 03:00 UTC (#262). In the demo
 * environment this banner surfaces the time remaining until that reset and ticks
 * down live; outside demo it renders nothing (returns null), so it is a zero-cost
 * include for every React sub that mounts <AppHeader>.
 */
import { useEffect, useState } from 'react';
import { Chip } from '@heroui/react';
import { TimerReset } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

/**
 * True only when running in the demo environment. Primary signal: demo subs are
 * served from `demo-{sub}.spookydecs.com`, so the hostname carries a `demo-`
 * prefix. Secondary (post-login) fall-through: the JWT `custom:env` claim.
 */
export function isDemoEnv(): boolean {
  if (typeof window !== 'undefined' && window.location.hostname.startsWith('demo-')) {
    return true;
  }
  try {
    return window.SpookyAuth?.getTokenClaims?.()?.['custom:env'] === 'demo';
  } catch {
    return false;
  }
}

/** The next Sunday 03:00 UTC strictly after `now`. Pure; UTC-only math. */
export function nextDemoReset(now: Date = new Date()): Date {
  const next = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 3, 0, 0, 0),
  );
  // Advance to the coming Sunday (UTC day 0).
  next.setUTCDate(next.getUTCDate() + ((7 - next.getUTCDay()) % 7));
  // If that instant has already passed (e.g. it is Sunday afternoon), jump a week.
  if (next.getTime() <= now.getTime()) {
    next.setUTCDate(next.getUTCDate() + 7);
  }
  return next;
}

function formatRemaining(ms: number): string {
  if (ms <= 0) return 'any moment';
  const totalMinutes = Math.floor(ms / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  return `${days}d ${hours}h ${minutes}m`;
}

export function DemoResetBanner() {
  // useAuth() is read unconditionally (hooks rules); the env check gates render.
  useAuth();
  const [remaining, setRemaining] = useState(() => nextDemoReset().getTime() - Date.now());

  useEffect(() => {
    if (!isDemoEnv()) return;
    const tick = () => setRemaining(nextDemoReset().getTime() - Date.now());
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  if (!isDemoEnv()) return null;

  return (
    <div className="flex w-full justify-center bg-warning-50 px-4 py-1.5 text-center">
      <Chip
        color="warning"
        variant="flat"
        size="sm"
        startContent={<TimerReset size={14} aria-hidden />}
      >
        Demo resets in {formatRemaining(remaining)}
      </Chip>
    </div>
  );
}
