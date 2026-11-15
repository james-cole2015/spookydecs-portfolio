/**
 * Holiday readiness runner (#680): a GET-only sweep of each sub's read routes using the admin's own session.
 *
 * Safety model: `createGetOnlyFetch` is the ONLY place in this module that touches the network. Callers pass a
 * path, never a method, body or init, and the path must be on an allowlist built from the registry. Results
 * carry route labels, HTTP status and timing only. Response bodies are parsed to check they are JSON and then
 * discarded, so no record data or error text can reach the UI, a record or this public repo.
 *
 * Pure TypeScript: no React and no window globals, so it runs under vitest in node.
 */
import type { ReadCheck } from '../config/validationRegistry';

export const REQUEST_TIMEOUT_MS = 15000;
export const CONCURRENCY = 4;

export type Outcome = 'pass' | 'warn' | 'fail' | 'skipped';
export type Hint = 'auth expired' | 'environment mismatch' | 'not found' | 'server error' | 'timeout' | 'network' | 'bad response';
export type Verdict = 'Ready' | 'Ready with warnings' | 'Not ready' | 'Session expired';

export interface RouteResult {
  subId: string;
  label: string;
  path: string;
  status: number | null;
  outcome: Outcome;
  ms: number;
  hint?: Hint;
}

export interface SubResult {
  subId: string;
  outcome: Outcome;
  routes: RouteResult[];
}

export interface ReadinessReport {
  verdict: Verdict;
  subs: SubResult[];
  counts: { passed: number; warned: number; failed: number; skipped: number; total: number };
  /** True when every executed route came back 403, i.e. the session is scoped to a different environment. */
  environmentMismatch: boolean;
}

export type GetOnlyFetch = (path: string, signal?: AbortSignal) => Promise<Response>;

export interface GetOnlyFetchOptions {
  baseUrl: string;
  headers: () => Record<string, string>;
  allowedPaths: ReadonlySet<string>;
  fetchImpl?: typeof fetch;
}

/**
 * Build the single fetch wrapper. The optional second argument is the caller's AbortSignal only. Any method
 * smuggled in through it is rejected before a request is made.
 */
export function createGetOnlyFetch(opts: GetOnlyFetchOptions) {
  const doFetch = opts.fetchImpl ?? ((...a: Parameters<typeof fetch>) => fetch(...a));
  return async (path: string, init?: { method?: string; signal?: AbortSignal }): Promise<Response> => {
    if (init?.method && init.method.toUpperCase() !== 'GET') throw new Error('readiness: non-GET blocked');
    if (!opts.allowedPaths.has(path)) throw new Error('readiness: path not allowed');
    const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
    const signal = init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
    return doFetch(`${opts.baseUrl}${path}`, { method: 'GET', headers: opts.headers(), redirect: 'error', credentials: 'omit', signal });
  };
}

function hintFor(status: number): Hint {
  if (status === 401) return 'auth expired';
  if (status === 403) return 'environment mismatch';
  if (status === 404) return 'not found';
  if (status >= 500) return 'server error';
  return 'bad response';
}

async function checkRoute(
  fetchGet: ReturnType<typeof createGetOnlyFetch>,
  subId: string,
  check: ReadCheck,
  signal?: AbortSignal,
): Promise<RouteResult> {
  const started = Date.now();
  const base = { subId, label: check.label, path: check.path };
  const fail = (status: number | null, hint: Hint): RouteResult => ({
    ...base,
    status,
    outcome: check.required ? 'fail' : 'warn',
    ms: Date.now() - started,
    hint,
  });
  try {
    const res = await fetchGet(check.path, { signal });
    if (res.status !== 200) return fail(res.status, hintFor(res.status));
    let ok = false;
    try {
      const body: unknown = await res.json();
      ok = body !== null && typeof body === 'object';
    } catch {
      ok = false;
    }
    if (!ok) return fail(200, 'bad response');
    return { ...base, status: 200, outcome: 'pass', ms: Date.now() - started };
  } catch (e) {
    const name = (e as { name?: string })?.name;
    return fail(null, name === 'TimeoutError' || name === 'AbortError' ? 'timeout' : 'network');
  }
}

export interface RunOptions {
  signal?: AbortSignal;
  onProgress?: (done: number, total: number) => void;
}

/** Run every sub's readChecks through `fetchGet`, at most CONCURRENCY at a time. */
export async function runReadiness(
  subs: { id: string; readChecks: ReadCheck[] }[],
  fetchGet: ReturnType<typeof createGetOnlyFetch>,
  opts: RunOptions = {},
): Promise<ReadinessReport> {
  const jobs = subs.flatMap((s) => s.readChecks.map((c) => ({ subId: s.id, check: c })));
  const results: RouteResult[] = new Array(jobs.length);
  let next = 0;
  let done = 0;
  let authAborted = false;

  const worker = async () => {
    while (next < jobs.length) {
      const i = next++;
      const { subId, check } = jobs[i];
      if (authAborted || opts.signal?.aborted) {
        results[i] = { subId, label: check.label, path: check.path, status: null, outcome: 'skipped', ms: 0 };
      } else {
        const r = await checkRoute(fetchGet, subId, check, opts.signal);
        if (r.status === 401) authAborted = true;
        results[i] = r;
      }
      opts.onProgress?.(++done, jobs.length);
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, jobs.length) }, worker));

  const subResults: SubResult[] = subs.map((s) => {
    const routes = results.filter((r) => r.subId === s.id);
    const outcome: Outcome = routes.some((r) => r.outcome === 'fail')
      ? 'fail'
      : routes.some((r) => r.outcome === 'warn')
        ? 'warn'
        : routes.length > 0 && routes.every((r) => r.outcome === 'skipped')
          ? 'skipped'
          : 'pass';
    return { subId: s.id, outcome, routes };
  });

  const count = (o: Outcome) => results.filter((r) => r.outcome === o).length;
  const counts = { passed: count('pass'), warned: count('warn'), failed: count('fail'), skipped: count('skipped'), total: results.length };
  const executed = results.filter((r) => r.outcome !== 'skipped');
  const verdict: Verdict = authAborted
    ? 'Session expired'
    : counts.failed > 0
      ? 'Not ready'
      : counts.warned > 0
        ? 'Ready with warnings'
        : 'Ready';
  return {
    verdict,
    subs: subResults,
    counts,
    environmentMismatch: executed.length > 0 && executed.every((r) => r.status === 403),
  };
}

/** Plain-text summary for pasting into sub_tests (labels and counts only). */
export function summarize(report: ReadinessReport, environment: string, when: string): string {
  const lines = [`Readiness ${environment} ${when}: ${report.verdict} (${report.counts.passed}/${report.counts.total} passed, ${report.counts.warned} warned, ${report.counts.failed} failed)`];
  for (const s of report.subs) {
    lines.push(`- ${s.subId}: ${s.outcome}`);
    for (const r of s.routes) if (r.outcome !== 'pass') lines.push(`    ${r.label}: ${r.outcome}${r.status ? ` ${r.status}` : ''}${r.hint ? ` (${r.hint})` : ''}`);
  }
  return lines.join('\n');
}
