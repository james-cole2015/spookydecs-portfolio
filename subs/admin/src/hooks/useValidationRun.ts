/**
 * Hooks for the Run Validation panel (#679).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { isDemoEnv, useAuth } from '@spookydecs/ui';
import { ValidationApiError, getRun, startRun } from '../api/validationApi';
import { isRunnerAvailable, isTerminal, pollDelayMs, resolveEnvironment, type RunDetail } from '../lib/validationRunModel';

/** true only on dev and never in demo (the backend enforces the same rule). */
export function useRunnerAvailable(): boolean {
  const auth = useAuth();
  return useMemo(
    () => isRunnerAvailable(resolveEnvironment(auth.claims?.['custom:env'], window.location.hostname), isDemoEnv()),
    [auth.claims],
  );
}

/**
 * Fetches a run and keeps polling until it reaches a terminal status (5s, then 10s after two minutes). Polling
 * stops on unmount or when `runId` changes. A failed poll is kept in `error` and retried on the next tick.
 */
export function useRunPolling(runId: string | null): { run: RunDetail | null; error: string | null } {
  const [run, setRun] = useState<RunDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setRun(null);
    setError(null);
    if (!runId) return undefined;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const startedAt = Date.now();

    const tick = async () => {
      try {
        const next = await getRun(runId);
        if (cancelled) return;
        setRun(next);
        setError(null);
        if (isTerminal(next.status)) return;
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Failed to load run');
      }
      timer = setTimeout(tick, pollDelayMs(Date.now() - startedAt));
    };
    void tick();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [runId]);

  return { run, error };
}

/**
 * Starts a run. A 409 (a run is already active) is surfaced as `conflictRunId` rather than an error so the page
 * can link to the active run.
 */
export function useStartRun(): {
  start: (subs: string[] | 'all') => Promise<string | null>;
  starting: boolean;
  conflictRunId: string | null;
  error: string | null;
} {
  const [starting, setStarting] = useState(false);
  const [conflictRunId, setConflictRunId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const start = useCallback(async (subs: string[] | 'all') => {
    setStarting(true);
    setConflictRunId(null);
    setError(null);
    try {
      return (await startRun(subs)).run_id;
    } catch (e) {
      if (e instanceof ValidationApiError && e.status === 409) {
        setConflictRunId(String(e.details?.active_run_id ?? '') || null);
        setError('A validation run is already in progress.');
      } else {
        setError(e instanceof Error ? e.message : 'Failed to start the run');
      }
      return null;
    } finally {
      setStarting(false);
    }
  }, []);

  return { start, starting, conflictRunId, error };
}
