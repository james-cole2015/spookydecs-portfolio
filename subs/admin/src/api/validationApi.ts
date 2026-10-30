/**
 * Run Validation API client (#679): start a suite run, list history, fetch one run.
 *
 * Framework-agnostic like adminApi.ts: reads `window.SpookyConfig`/`window.SpookyAuth` directly. Dev only; the
 * backend rejects any other environment.
 */
import type { RunDetail, RunSummary, Suite } from '../lib/validationRunModel';

const { buildHeaders, redirectToLogin } = window.SpookyAuth;

/** A non-2xx response. `details` carries server context, e.g. `{ active_run_id }` on a 409. */
export class ValidationApiError extends Error {
  status: number;
  details?: Record<string, unknown>;
  constructor(message: string, status: number, details?: Record<string, unknown>) {
    super(message);
    this.name = 'ValidationApiError';
    this.status = status;
    this.details = details;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const config = await window.SpookyConfig.get();
  const response = await fetch(`${config.API_ENDPOINT}/admin/validation${path}`, {
    ...init,
    headers: { ...buildHeaders(), ...(init?.body ? { 'Content-Type': 'application/json' } : {}) },
  });
  if (response.status === 401) {
    await redirectToLogin();
    throw new ValidationApiError('Session expired', 401);
  }
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.success === false) {
    throw new ValidationApiError(body.error || `Request failed: ${response.status}`, response.status, body.details);
  }
  return body.data as T;
}

/** Start a run. `subs` is a list of sub ids or 'all'. Rejects with status 409 if a run is already active. */
export function startRun(subs: string[] | 'all', suites: Suite[] = ['e2e', 'unit']): Promise<{ run_id: string; status: string }> {
  return request('/runs', { method: 'POST', body: JSON.stringify({ subs, suites }) });
}

export async function listRuns(): Promise<RunSummary[]> {
  return (await request<{ runs: RunSummary[] }>('/runs')).runs;
}

export function getRun(runId: string): Promise<RunDetail> {
  return request(`/runs/${encodeURIComponent(runId)}`);
}
