/**
 * Workbench API client — typed port of the vanilla js/api.js.
 *
 * Read-only: one call, GET /workbench/summary?year=. Dependencies (the resolved
 * API endpoint + auth helpers) are injected by the caller, which sources them
 * from `useConfig()` / `useAuth()` — keeping this module framework-agnostic while
 * preserving the vanilla 401 -> redirectToLogin behavior and the `result.data`
 * unwrap.
 */
import type { SeasonalSummary } from '../types/workbench';

export interface WorkbenchApiDeps {
  /** Resolved API base (from useConfig().API_ENDPOINT). */
  apiEndpoint: string;
  /** Auth header builder (from useAuth().buildHeaders). */
  buildHeaders: (extra?: Record<string, string>) => Record<string, string>;
  /** 401 handler (from useAuth().redirectToLogin). */
  redirectToLogin: () => Promise<void> | void;
}

const EMPTY_SUMMARY: SeasonalSummary = {
  off_season: {},
  halloween: {},
  christmas: {},
};

/**
 * Returns the seasonal summary grouped by work bucket for the given year.
 * Shape: { off_season, halloween, christmas }, each with ideas / inspections /
 * repairs / maintenance_tasks (+ completed).
 */
export async function getSeasonalSummary(
  year: number,
  { apiEndpoint, buildHeaders, redirectToLogin }: WorkbenchApiDeps,
): Promise<SeasonalSummary> {
  const response = await fetch(`${apiEndpoint}/workbench/summary?year=${year}`, {
    headers: buildHeaders(),
  });

  if (response.status === 401) {
    await redirectToLogin();
    // The redirect navigates away; this return only satisfies the type.
    return EMPTY_SUMMARY;
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || error.message || `API Error: ${response.status}`);
  }

  const result = await response.json();
  return (result.data ?? result) as SeasonalSummary;
}
