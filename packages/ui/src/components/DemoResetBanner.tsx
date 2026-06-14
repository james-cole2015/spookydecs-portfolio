/**
 * DemoResetBanner — a live countdown to the next demo-environment wipe, styled as
 * a Dungeon Crawler Carl "floor collapse" System alarm.
 *
 * The `sd_demo_reset` job runs every Sunday at 03:00 UTC (#262). In the demo
 * environment this banner surfaces the time remaining until that reset and ticks
 * down live; outside demo it renders nothing (returns null), so it is a zero-cost
 * include for every React sub that mounts <AppHeader>.
 *
 * DCC theming (#354): the demo "floor" collapses on the reset cadence, so the
 * banner reads as a System collapse-warning klaxon — blood-red dungeon gradient,
 * pulsing siren, monospace countdown. Styling is inline + a runtime-injected
 * keyframe block so the package still ships no CSS file (#348) and renders
 * correctly regardless of the consuming sub's Tailwind content scanning.
 */
import { useEffect, useState } from 'react';
import { Siren } from 'lucide-react';
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
  const totalMinutes = Math.max(0, Math.floor(ms / 60000));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  return `${days} Days ${hours} Hours ${minutes} Minutes`;
}

/**
 * Inject the DCC alarm keyframes once (idempotent). Kept out of a CSS file so the
 * library build still emits no stylesheet (#348); inline `style` references them.
 */
const KEYFRAMES_ID = 'dcc-floor-collapse-keyframes';
function ensureKeyframes() {
  if (typeof document === 'undefined' || document.getElementById(KEYFRAMES_ID)) return;
  const el = document.createElement('style');
  el.id = KEYFRAMES_ID;
  el.textContent = `
@keyframes dcc-siren-pulse {
  0%, 100% { opacity: 1; transform: rotate(0deg) scale(1); }
  50%      { opacity: 0.6; transform: rotate(-8deg) scale(0.88); }
}
@keyframes dcc-collapse-glow {
  0%, 100% { box-shadow: inset 0 0 16px rgba(185, 28, 28, 0.45); }
  50%      { box-shadow: inset 0 0 34px rgba(239, 68, 68, 0.75); }
}`;
  document.head.appendChild(el);
}

export function DemoResetBanner() {
  // useAuth() is read unconditionally (hooks rules); the env check gates render.
  useAuth();
  const [remaining, setRemaining] = useState(() => nextDemoReset().getTime() - Date.now());

  useEffect(() => {
    if (!isDemoEnv()) return;
    ensureKeyframes();
    const tick = () => setRemaining(nextDemoReset().getTime() - Date.now());
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  if (!isDemoEnv()) return null;

  const imminent = remaining <= 60 * 60 * 1000; // final hour: faster klaxon
  const countdown = formatRemaining(remaining);

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.55rem',
        width: '100%',
        padding: '0.4rem 1rem',
        background:
          'linear-gradient(90deg, #1b0606 0%, #5b0f0f 28%, #7f1010 50%, #5b0f0f 72%, #1b0606 100%)',
        borderTop: '1px solid rgba(239, 68, 68, 0.55)',
        borderBottom: '1px solid rgba(239, 68, 68, 0.55)',
        color: '#fecaca',
        fontSize: '0.8rem',
        lineHeight: 1.2,
        letterSpacing: '0.05em',
        animation: 'dcc-collapse-glow 2.6s ease-in-out infinite',
      }}
    >
      <Siren
        size={15}
        aria-hidden
        style={{
          color: '#ef4444',
          flexShrink: 0,
          animation: `dcc-siren-pulse ${imminent ? '0.9s' : '1.5s'} ease-in-out infinite`,
        }}
      />
      <span style={{ fontWeight: 700 }}>
        <span
          style={{
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
            fontWeight: 800,
            color: '#ffffff',
            textShadow: '0 0 8px rgba(239, 68, 68, 0.8)',
          }}
        >
          {countdown}
        </span>{' '}
        to Level Collapse
      </span>
    </div>
  );
}
