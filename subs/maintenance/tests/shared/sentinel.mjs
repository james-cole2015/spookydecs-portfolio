/**
 * Sentinel fixture for the maintenance suite (#623). Maintenance records hang off an item, so the
 * sentinel is a throwaway ITEM carrying SENTINEL_MARKER in short_name (marker+sweep — IDs are
 * server-generated). Cascade-deleting the item also removes its maintenance records, so the sweep
 * only has to delete marked items.
 */
export { makeApiClient } from '../../../storage/tests/shared/sentinel.mjs';

export const SENTINEL_MARKER = 'E2E MAINT SENTINEL - safe to delete';

/** List endpoints return the array directly under `data` (or under a named key on older shapes). */
export function asList(res, key) {
  const d = res.data ?? res.body?.data ?? res.body;
  if (Array.isArray(d)) return d;
  return d?.[key] || res.body?.[key] || [];
}

export function sentinelName(label) {
  return `${SENTINEL_MARKER} ${label} ${Date.now()}`;
}

export async function findSentinelItems(api) {
  const res = await api('GET', '/items');
  const items = res.data?.items || res.body?.items || [];
  return items.filter((i) => String(i.short_name ?? '').includes(SENTINEL_MARKER) || String(i.id ?? '').includes(SENTINEL_MARKER.split(' - ')[0].replace(/ /g, '_')));
}

/** Creates a plain tote-packed Static Prop (validators.py needs stakes + tethers) and returns its record. */
export async function createSentinelItem(api, label = 'item') {
  const name = sentinelName(label);
  const res = await api('POST', '/items', {
    type: 'Decoration', category: 'Static Prop', shortName: name, season: 'Halloween', status: 'Ready',
    stakes: '4', tethers: '2', packable: true, singlePacked: false,
  });
  if (res.status >= 300) throw new Error(`create sentinel item failed (${res.status}): ${JSON.stringify(res.body).slice(0, 300)}`);
  const found = (await findSentinelItems(api)).find((i) => i.short_name === name);
  if (!found) throw new Error('sentinel item not found after create');
  return found;
}

/** Creates a maintenance record on a sentinel item through the API (UI creation is covered by the lifecycle spec). */
export async function createSentinelRecord(api, itemId, overrides = {}) {
  const res = await api('POST', '/admin/maintenance-records', {
    item_id: itemId, record_type: 'maintenance', category: 'cleaning', status: 'scheduled',
    title: sentinelName('record'), description: '', performed_by: 'e2e-suite', materials_used: [],
    cost_record_ids: [], total_cost: 0, attachments: { before_photos: [], after_photos: [], documentation: [] },
    ...overrides,
  });
  if (res.status >= 300) throw new Error(`create sentinel record failed (${res.status}): ${JSON.stringify(res.body).slice(0, 300)}`);
  return res.data?.record ?? res.data ?? res.body;
}

export async function findSentinelSchedules(api) {
  const res = await api('GET', '/admin/maintenance-schedules');
  return asList(res, 'schedules').filter((t) => String(t.title ?? '').includes(SENTINEL_MARKER));
}

export async function findSentinelCosts(api) {
  return asList(await api('GET', '/finance/costs'), 'costs').filter((c) => String(c.item_name ?? '').includes(SENTINEL_MARKER));
}

/** Costs, then items (cascade removes their records), then any leftover marked templates. */
export async function sweepSentinels(api) {
  const costs = await findSentinelCosts(api);
  for (const c of costs) await api('DELETE', `/finance/costs/${c.cost_id}/delete`);
  const items = await findSentinelItems(api);
  for (const item of items) await api('DELETE', `/items/${encodeURIComponent(item.id)}/cascade`);
  const schedules = await findSentinelSchedules(api);
  for (const t of schedules) await api('DELETE', `/admin/maintenance-schedules/${t.schedule_id}`);
  return costs.length + items.length + schedules.length;
}
