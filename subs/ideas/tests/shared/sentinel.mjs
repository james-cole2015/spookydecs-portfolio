/**
 * Sentinel idea fixture (#623) — marker+sweep (idea IDs are server-generated). Every sentinel
 * idea carries SENTINEL_MARKER in its title; sweep cascade-deletes them (also removes linked
 * costs/photos). Idea titles allow up to 150 chars (FormPage maxLength).
 */
export { makeApiClient } from '../../../storage/tests/shared/sentinel.mjs';
import { sweepItemsAndIdeas } from '../../../_e2e/shared/entities.mjs';

export const SENTINEL_MARKER = 'E2E IDEAS SENTINEL - safe to delete';

export function sentinelName(label) {
  return `${SENTINEL_MARKER} ${label} ${Date.now()}`;
}

export async function findSentinels(api) {
  const res = await api('GET', '/ideas');
  const ideas = Array.isArray(res.body) ? res.body : res.data?.ideas || res.body?.ideas || res.data || [];
  return ideas.filter((i) => String(i.title ?? '').includes(SENTINEL_MARKER));
}

const asList = (res, key) => {
  const d = res.data ?? res.body?.data ?? res.body;
  return Array.isArray(d) ? d : d?.[key] || [];
};

export async function findSentinelAcquisitions(api) {
  return asList(await api('GET', '/acquisitions'), 'acquisitions').filter((a) => String(a.title ?? '').includes(SENTINEL_MARKER));
}

export async function findSentinelCosts(api) {
  return asList(await api('GET', '/finance/costs'), 'costs').filter((c) => String(c.item_name ?? '').includes(SENTINEL_MARKER));
}

/**
 * Costs (acq-buy-* rows carry the acquisition title), acquisitions, then items and ideas (idea cascade also removes
 * linked costs, incl. acq-build-*). Returns the number of records removed.
 */
export async function sweepSentinels(api) {
  const costs = await findSentinelCosts(api);
  for (const c of costs) await api('DELETE', `/finance/costs/${c.cost_id}/delete`);
  const acqs = await findSentinelAcquisitions(api);
  for (const a of acqs) await api('DELETE', `/acquisitions/${a.acquisition_id}`);
  return costs.length + acqs.length + (await sweepItemsAndIdeas(api, SENTINEL_MARKER));
}
