/**
 * useResumablePoll — elapsed-time, two-phase-backoff polling for a long-running
 * backend job (#572, generalized from the pattern #396 built for EnrichmentPanel).
 *
 * Elapsed time is computed from a `startedAt` timestamp on every tick, not an
 * in-memory counter, so a remount mid-flight resumes in the correct phase
 * instead of restarting the cadence from zero. Runs a fast cadence for the
 * first `fastPhaseMs`, then a sparser `slowIntervalMs` cadence out to
 * `ceilingMs`. Past the ceiling, automatic polling stops and `pastCeiling`
 * flips true — callers render a manual "Check now" affordance wired to the
 * returned `checkNow`/`checkingNow` instead of a dead end.
 *
 *   const poll = useResumablePoll({
 *     fastIntervalMs: 4000, fastPhaseMs: 2 * 60 * 1000,
 *     slowIntervalMs: 20 * 1000, ceilingMs: 930 * 1000,
 *     checkNow: async () => {
 *       const refreshed = await getThing(id);
 *       setThing(refreshed);
 *       return refreshed.status !== 'in_progress'; // true = terminal, stop polling
 *     },
 *   });
 *   useEffect(() => {
 *     if (initial?.status === 'in_progress' && initial.started_at) poll.startPolling(initial.started_at);
 *     return poll.stopPolling;
 *   }, [initial?.status, initial?.started_at]);
 */
import { useCallback, useRef, useState } from 'react';

export interface ResumablePollConfig {
  fastIntervalMs: number;
  fastPhaseMs: number;
  slowIntervalMs: number;
  ceilingMs: number;
  /** Perform one fresh check; return true once the job has reached a terminal
   *  state (stops polling). The caller updates its own state inside this. */
  checkNow: () => Promise<boolean>;
}

export interface UseResumablePoll {
  /** True once elapsed time has crossed the ceiling and automatic polling has stopped. */
  pastCeiling: boolean;
  /** True while a manual checkNow() call is in flight. */
  checkingNow: boolean;
  /** Start (or restart) polling from the given ISO/Date-parseable started_at. */
  startPolling: (startedAt: string) => void;
  stopPolling: () => void;
  /** Manual re-check — clears pastCeiling if the job turns out to be terminal. */
  checkNow: () => Promise<void>;
}

export function useResumablePoll(config: ResumablePollConfig): UseResumablePoll {
  const [pastCeiling, setPastCeiling] = useState(false);
  const [checkingNow, setCheckingNow] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const configRef = useRef(config);
  configRef.current = config;

  const stopPolling = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const startPolling = useCallback(
    (startedAt: string) => {
      stopPolling();
      setPastCeiling(false);
      const startedMs = new Date(startedAt).getTime();

      const tick = async () => {
        const { fastIntervalMs, fastPhaseMs, slowIntervalMs, ceilingMs } = configRef.current;
        const elapsed = Date.now() - startedMs;
        if (elapsed >= ceilingMs) {
          stopPolling();
          setPastCeiling(true);
          return;
        }
        const done = await configRef.current.checkNow();
        if (done) {
          stopPolling();
          return;
        }
        const interval = elapsed < fastPhaseMs ? fastIntervalMs : slowIntervalMs;
        timeoutRef.current = setTimeout(tick, interval);
      };

      timeoutRef.current = setTimeout(tick, configRef.current.fastIntervalMs);
    },
    [stopPolling],
  );

  const checkNow = useCallback(async () => {
    setCheckingNow(true);
    try {
      const done = await configRef.current.checkNow();
      if (done) setPastCeiling(false);
    } finally {
      setCheckingNow(false);
    }
  }, []);

  return { pastCeiling, checkingNow, startPolling, stopPolling, checkNow };
}
