/**
 * Run Validation: panel-started suite runs (#679). Pure TypeScript (no React, no window globals) so it runs under
 * vitest in node. Holds the run/result types, status colours, polling cadence and display helpers.
 *
 * The runner is dev only: `resolveEnvironment` + `isRunnerAvailable` decide whether the controls render at all.
 */

export type RunStatus = 'queued' | 'running' | 'passed' | 'failed' | 'errored';
export type TestStatus = 'passed' | 'failed' | 'skipped';
export type Suite = 'e2e' | 'unit';

export interface TestResult {
  title: string;
  status: TestStatus;
  durationMs: number;
  /** First line only, truncated server-side. */
  error?: string;
}

export interface SubResult {
  sub: string;
  suite: Suite;
  tests: TestResult[];
  passed: number;
  failed: number;
  skipped: number;
  total: number;
  /** true when the suite never produced a report (build error, not a test failure). */
  errored?: boolean;
  error?: string;
}

export interface RunSummary {
  run_id: string;
  status: RunStatus;
  requested_by: string;
  subs: string[];
  suites: Suite[];
  started_at: string;
  finished_at?: string;
}

export interface RunDetail extends RunSummary {
  results: SubResult[];
}

export const TERMINAL_STATUSES: RunStatus[] = ['passed', 'failed', 'errored'];
export const isTerminal = (status: RunStatus): boolean => TERMINAL_STATUSES.includes(status);

export const RUN_STATUS_COLOR: Record<RunStatus, 'default' | 'primary' | 'success' | 'danger' | 'warning'> = {
  queued: 'default',
  running: 'primary',
  passed: 'success',
  failed: 'danger',
  errored: 'warning',
};
export const TEST_STATUS_COLOR: Record<TestStatus, 'success' | 'danger' | 'default'> = {
  passed: 'success',
  failed: 'danger',
  skipped: 'default',
};

export const FAST_POLL_MS = 5000;
export const SLOW_POLL_MS = 10000;
export const SLOW_POLL_AFTER_MS = 2 * 60 * 1000;

/** Poll every 5s, backing off to 10s once a run has been going for two minutes. */
export const pollDelayMs = (elapsedMs: number): number => (elapsedMs >= SLOW_POLL_AFTER_MS ? SLOW_POLL_MS : FAST_POLL_MS);

export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return '-';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const totalSeconds = Math.round(ms / 1000);
  if (totalSeconds < 60) return `${(ms / 1000).toFixed(1)}s`;
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}m ${String(s).padStart(2, '0')}s`;
}

/** Wall-clock duration of a run; a run still going is measured up to `now`. */
export function runDurationMs(startedAt: string, finishedAt: string | undefined, now: number = Date.now()): number {
  const start = Date.parse(startedAt);
  const end = finishedAt ? Date.parse(finishedAt) : now;
  return Number.isNaN(start) || Number.isNaN(end) ? NaN : end - start;
}

/** "all (10)" when a run covered every sub, otherwise the sub names. */
export function subsLabel(subs: string[], totalSubs: number): string {
  return subs.length >= totalSubs ? `all (${subs.length})` : subs.join(', ');
}

const SUITE_ORDER: Suite[] = ['e2e', 'unit'];
export const SUITE_LABEL: Record<Suite, string> = { e2e: 'Browser checks', unit: 'Lambda unit suites' };

/** Stable display order: by sub, browser suite before unit suite. */
export function sortResults(results: SubResult[]): SubResult[] {
  return [...results].sort((a, b) => a.sub.localeCompare(b.sub) || SUITE_ORDER.indexOf(a.suite) - SUITE_ORDER.indexOf(b.suite));
}

export interface Totals {
  passed: number;
  failed: number;
  skipped: number;
  total: number;
  errored: number;
}
export function totals(results: SubResult[]): Totals {
  return results.reduce<Totals>(
    (t, r) => ({
      passed: t.passed + (r.passed || 0),
      failed: t.failed + (r.failed || 0),
      skipped: t.skipped + (r.skipped || 0),
      total: t.total + (r.total || 0),
      errored: t.errored + (r.errored ? 1 : 0),
    }),
    { passed: 0, failed: 0, skipped: 0, total: 0, errored: 0 },
  );
}

/** The token's custom:env claim wins; otherwise infer from the hostname (dev sites are dev-*). */
export function resolveEnvironment(claim: unknown, hostname: string): string {
  if (claim) return String(claim);
  return hostname.startsWith('dev-') ? 'dev' : 'prod';
}

/** Controls render only on dev and never in demo. The server enforces the same rule independently. */
export function isRunnerAvailable(environment: string, isDemo: boolean): boolean {
  return !isDemo && environment === 'dev';
}

/** Latest run (history is newest first) that included `sub`. */
export function latestRunFor(runs: RunSummary[], sub: string): RunSummary | undefined {
  return runs.find((r) => r.subs.includes(sub));
}
