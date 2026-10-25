/**
 * Sentinel fixture for the inspector suite (#623). Violations are produced by the real rule pipeline (run a rule →
 * Violation.Detected → consumer → DDB), so the fixture only seeds the thing that violates a rule — a sentinel Decoration
 * item with no primary photo (MISSING_PRIMARY_PHOTO) — and removes the violation records it caused.
 * Sweep order: violations for sentinel items (DELETE /admin/inspector/violations/{id}), then the items (cascade).
 */
export { makeApiClient } from '../../../storage/tests/shared/sentinel.mjs';
import { findSentinelItems, sweepItemsAndIdeas } from '../../../_e2e/shared/entities.mjs';

export const SENTINEL_MARKER = 'E2E INSPECTOR SENTINEL - safe to delete';
export const RULE_ID = 'MISSING_PRIMARY_PHOTO';

/** Every violation record (paged) for the given entity ids, optionally limited to one rule. */
export async function findViolationsFor(api, entityIds, ruleId = RULE_ID) {
  const wanted = new Set(entityIds);
  const found = [];
  let lastKey = null;
  do {
    const qs = new URLSearchParams({ limit: '100', rule_id: ruleId });
    if (lastKey) qs.set('lastKey', typeof lastKey === 'string' ? lastKey : JSON.stringify(lastKey));
    const res = await api('GET', `/admin/inspector/violations?${qs}`);
    const d = res.data ?? res.body?.data ?? {};
    for (const v of d.violations || []) if (wanted.has(v.entity_id)) found.push(v);
    lastKey = d.hasMore ? d.lastKey : null;
  } while (lastKey);
  return found;
}

export async function sweepSentinels(api) {
  const items = await findSentinelItems(api, SENTINEL_MARKER);
  const violations = items.length ? await findViolationsFor(api, items.map((i) => i.id)) : [];
  // DELETE /admin/inspector/violations/{id} is not wired in API Gateway (403), so these records cannot be removed through the
  // API; count only the ones that actually went, and warn about the rest so the leak is visible, not silent.
  let deleted = 0;
  for (const v of violations) {
    const res = await api('DELETE', `/admin/inspector/violations/${v.violation_id}`);
    if (res.status < 300) deleted++;
  }
  if (violations.length > deleted) console.warn(`[e2e cleanup] WARNING: ${violations.length - deleted} sentinel violation record(s) could not be deleted through the API`);
  return deleted + (await sweepItemsAndIdeas(api, SENTINEL_MARKER));
}
