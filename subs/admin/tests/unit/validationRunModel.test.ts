import { describe, expect, it } from 'vitest';
import {
  formatDuration,
  isRunnerAvailable,
  isTerminal,
  latestRunFor,
  pollDelayMs,
  resolveEnvironment,
  runDurationMs,
  sortResults,
  subsLabel,
  totals,
  type RunSummary,
  type SubResult,
} from '../../src/lib/validationRunModel';

const sr = (sub: string, suite: 'e2e' | 'unit', passed: number, failed = 0, errored = false): SubResult => ({
  sub, suite, tests: [], passed, failed, skipped: 0, total: passed + failed, ...(errored ? { errored } : {}),
});

describe('validationRunModel', () => {
  it('knows terminal statuses', () => {
    expect(['passed', 'failed', 'errored'].every((s) => isTerminal(s as never))).toBe(true);
    expect(isTerminal('queued')).toBe(false);
    expect(isTerminal('running')).toBe(false);
  });

  it('backs off polling after two minutes', () => {
    expect(pollDelayMs(0)).toBe(5000);
    expect(pollDelayMs(119_999)).toBe(5000);
    expect(pollDelayMs(120_000)).toBe(10000);
  });

  it('formats durations', () => {
    expect(formatDuration(250)).toBe('250ms');
    expect(formatDuration(1200)).toBe('1.2s');
    expect(formatDuration(125_000)).toBe('2m 05s');
    expect(formatDuration(NaN)).toBe('-');
  });

  it('measures run duration, open-ended runs up to now', () => {
    expect(runDurationMs('2026-10-25T16:00:00Z', '2026-10-25T16:02:05Z')).toBe(125_000);
    expect(runDurationMs('2026-10-25T16:00:00Z', undefined, Date.parse('2026-10-25T16:01:00Z'))).toBe(60_000);
    expect(runDurationMs('garbage', undefined)).toBeNaN();
  });

  it('labels all-sub runs', () => {
    expect(subsLabel(['a', 'b'], 2)).toBe('all (2)');
    expect(subsLabel(['gallery'], 10)).toBe('gallery');
  });

  it('sorts by sub then browser before unit', () => {
    const out = sortResults([sr('items', 'unit', 1), sr('gallery', 'unit', 1), sr('gallery', 'e2e', 1)]);
    expect(out.map((r) => `${r.sub}/${r.suite}`)).toEqual(['gallery/e2e', 'gallery/unit', 'items/unit']);
  });

  it('sums totals and counts errored suites', () => {
    expect(totals([sr('a', 'e2e', 3, 1), sr('b', 'unit', 2, 0, true)])).toEqual({ passed: 5, failed: 1, skipped: 0, total: 6, errored: 1 });
  });

  it('is available on dev only, never in demo', () => {
    expect(isRunnerAvailable('dev', false)).toBe(true);
    expect(isRunnerAvailable('prod', false)).toBe(false);
    expect(isRunnerAvailable('demo', false)).toBe(false);
    expect(isRunnerAvailable('dev', true)).toBe(false);
  });

  it('resolves the environment from the claim, else the hostname', () => {
    expect(resolveEnvironment('dev', 'admin.spookydecs.com')).toBe('dev');
    expect(resolveEnvironment(undefined, 'dev-admin.spookydecs.com')).toBe('dev');
    expect(resolveEnvironment(undefined, 'admin.spookydecs.com')).toBe('prod');
    expect(resolveEnvironment(undefined, 'localhost')).toBe('dev');
    expect(resolveEnvironment('prod', 'localhost')).toBe('prod');
  });

  it('finds the latest run that included a sub', () => {
    const run = (id: string, subs: string[]): RunSummary => ({ run_id: id, status: 'passed', requested_by: 'x', subs, suites: ['e2e'], started_at: '' });
    expect(latestRunFor([run('1', ['items']), run('2', ['gallery', 'items'])], 'gallery')?.run_id).toBe('2');
    expect(latestRunFor([run('1', ['items'])], 'gallery')).toBeUndefined();
  });
});
