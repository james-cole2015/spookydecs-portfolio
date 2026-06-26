/**
 * Demo-reset clock.
 *
 * The demo environment is wiped and reseeded every week by `sd_demo_reset`
 * (EventBridge `cron(0 3 ? * SUN *)` = Sunday 03:00 UTC). The landing page
 * surfaces this as a "floor collapse" countdown — truthful, not decorative:
 * it's the real event that erases a visitor's sandbox. Keep this in sync with
 * the cron if the schedule ever changes.
 */

const RESET_HOUR_UTC = 3; // 03:00 UTC
const SUNDAY = 0; // Date.getUTCDay()

/** The next Sunday 03:00 UTC strictly after `now`. */
export function nextDemoReset(now: Date = new Date()): Date {
  const next = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), RESET_HOUR_UTC, 0, 0, 0),
  );
  const daysUntilSunday = (SUNDAY - next.getUTCDay() + 7) % 7;
  next.setUTCDate(next.getUTCDate() + daysUntilSunday);
  // If we've already passed this week's reset instant, roll to next week.
  if (next.getTime() <= now.getTime()) {
    next.setUTCDate(next.getUTCDate() + 7);
  }
  return next;
}

/** Milliseconds until the next reset. */
export function msUntilReset(now: Date = new Date()): number {
  return Math.max(0, nextDemoReset(now).getTime() - now.getTime());
}

/** Compact human countdown, e.g. "3d 14h" or (under a day) "14h 22m" or "8m". */
export function formatCountdown(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}
