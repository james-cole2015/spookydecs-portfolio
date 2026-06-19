/**
 * Violation prev/next navigation context — persisted in sessionStorage so the
 * ViolationDetail page can offer Prev/Next within the list the user came from
 * (matches the vanilla `inspectorViolationNavContext`).
 */
import type { Violation, ViolationStatus } from '../config/inspectorConfig';

const KEY = 'inspectorViolationNavContext';

export interface NavContext {
  violationIds: string[];
  tab: ViolationStatus;
  ruleId: string;
}

export function setNavContext(violations: Violation[], tab: ViolationStatus, ruleId: string): void {
  const ctx: NavContext = { violationIds: violations.map((v) => v.violation_id), tab, ruleId };
  sessionStorage.setItem(KEY, JSON.stringify(ctx));
}

export function getNavContext(violationId: string): NavContext | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const ctx = JSON.parse(raw) as NavContext;
    if (ctx.violationIds && ctx.violationIds.includes(violationId)) return ctx;
  } catch {
    /* ignore parse errors */
  }
  return null;
}
