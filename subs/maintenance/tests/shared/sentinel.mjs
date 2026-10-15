/**
 * Sentinel fixture for the maintenance suite (#623). Maintenance records hang off an item, so the
 * sentinel is a throwaway ITEM carrying SENTINEL_MARKER in short_name (marker+sweep — IDs are
 * server-generated). Cascade-deleting the item also removes its maintenance records, so the sweep
 * only has to delete marked items.
 */
export { makeApiClient } from '../../../storage/tests/shared/sentinel.mjs';

export const SENTINEL_MARKER = 'E2E MAINT SENTINEL - safe to delete';

export function sentinelName(label) {
  return `${SENTINEL_MARKER} ${label} ${Date.now()}`;
}

export async function findSentinelItems(api) {
  const res = await api('GET', '/items');
  const items = res.data?.items || res.body?.items || [];
  return items.filter((i) => String(i.short_name ?? '').includes(SENTINEL_MARKER));
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

export async function sweepSentinels(api) {
  const items = await findSentinelItems(api);
  for (const item of items) await api('DELETE', `/items/${item.id}/cascade`);
  return items.length;
}
