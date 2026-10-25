/** Start/end/day-counter helpers for a deployment (#643). Dates are date-only, local-calendar. */

const MS_PER_DAY = 86_400_000;

/** YYYY-MM-DD -> local midnight (avoids the UTC shift `new Date('YYYY-MM-DD')` causes). */
export function parseLocalDate(ymd?: string | null): Date | null {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  const [y, m, d] = ymd.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.getMonth() === m - 1 ? date : null;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function formatYmd(ymd?: string | null): string | null {
  const d = parseLocalDate(ymd);
  return d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null;
}

export interface DeploymentSpan {
  /** Inclusive day count from start to end (or today while the deployment is still in setup). */
  days: number;
  /** True once the deployment is completed — the counter has stopped. */
  finished: boolean;
}

/**
 * The end of the span is `setup_completed_at` (set when the deployment is completed);
 * until then the counter runs to `now`. Returns null when there is no start date.
 */
export function deploymentSpan(
  startDate?: string | null,
  setupCompletedAt?: string | null,
  now: Date = new Date(),
): DeploymentSpan | null {
  const start = parseLocalDate(startDate);
  if (!start) return null;
  const completed = setupCompletedAt ? new Date(setupCompletedAt) : null;
  const finished = !!completed && !Number.isNaN(completed.getTime());
  const end = startOfDay(finished ? (completed as Date) : now);
  const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / MS_PER_DAY) + 1);
  return { days, finished };
}

export function spanLabel(span: DeploymentSpan): string {
  return span.finished ? `Ran ${span.days} day${span.days === 1 ? '' : 's'}` : `Day ${span.days}`;
}

/** Edit-time guard mirroring the API: start cannot be after the completion day. */
export function startAfterEnd(startDate: string, setupCompletedAt?: string | null): boolean {
  const start = parseLocalDate(startDate);
  if (!start || !setupCompletedAt) return false;
  const end = new Date(setupCompletedAt);
  return !Number.isNaN(end.getTime()) && start.getTime() > startOfDay(end).getTime();
}
