/**
 * Sentinel fixture for the finance suite (#623) — marker+sweep (cost ids are server-generated). Every sentinel cost
 * carries SENTINEL_MARKER in item_name (or pack_name); upstream items/ideas come from _e2e/shared/entities.mjs with
 * the same marker. Sweep order: costs first (DELETE /finance/costs/{id}/delete), then items/ideas via cascade.
 */
export { makeApiClient } from '../../../storage/tests/shared/sentinel.mjs';
export { createSentinelItem, createSentinelIdea } from '../../../_e2e/shared/entities.mjs';
import { sweepItemsAndIdeas } from '../../../_e2e/shared/entities.mjs';

export const SENTINEL_MARKER = 'E2E FINANCE SENTINEL - safe to delete';

export const sentinelName = (label) => `${SENTINEL_MARKER} ${label} ${Date.now()}`;

const asList = (res) => {
  const d = res.data ?? res.body?.data ?? res.body;
  return Array.isArray(d) ? d : d?.costs || [];
};

const isMarked = (c) => `${c.item_name ?? ''} ${c.pack_name ?? ''}`.includes(SENTINEL_MARKER);

export async function findSentinelCosts(api) {
  return asList(await api('GET', '/finance/costs')).filter(isMarked);
}

export async function sweepSentinels(api) {
  const costs = await findSentinelCosts(api);
  for (const c of costs) await api('DELETE', `/finance/costs/${c.cost_id}/delete`);
  return costs.length + (await sweepItemsAndIdeas(api, SENTINEL_MARKER));
}
