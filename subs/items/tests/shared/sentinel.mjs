/**
 * Sentinel item fixture (#623) — marker+sweep, the model storage uses for server-generated IDs.
 * Item IDs are server-generated, so every sentinel item carries SENTINEL_MARKER in short_name.
 * Preflight and teardown both call sweepSentinels(): cascade-delete every marked item, then
 * delete any marked Self storage unit (the async Item.PackingRequested consumer names it
 * "{short_name} (Box)", so the marker propagates). Self units reject content edits, so the item
 * must be deleted first; a Self unit that still refuses deletion is reported, not swallowed.
 */
export { makeApiClient } from '../../../storage/tests/shared/sentinel.mjs';

export const SENTINEL_MARKER = 'E2E ITEMS SENTINEL - safe to delete';

export function sentinelName(label) {
  return `${SENTINEL_MARKER} ${label} ${Date.now()}`;
}

const isMarked = (o) => String(o?.short_name ?? o?.name ?? '').includes(SENTINEL_MARKER);

export async function findSentinelItems(api) {
  const res = await api('GET', '/items');
  const items = res.data?.items || res.body?.items || [];
  return items.filter(isMarked);
}

export async function findSentinelUnits(api) {
  const res = await api('GET', '/storage');
  const units = res.data?.storage_units || res.body?.storage_units || [];
  return units.filter(isMarked);
}

/** @returns {Promise<{items:number, units:number, stuckUnits:string[]}>} */
export async function sweepSentinels(api) {
  const items = await findSentinelItems(api);
  for (const item of items) await api('DELETE', `/items/${encodeURIComponent(item.id)}/cascade`);
  const stuckUnits = [];
  const units = await findSentinelUnits(api);
  for (const unit of units) {
    const res = await api('DELETE', `/storage/${unit.id}`);
    if (res.status !== 200 && res.status !== 404) stuckUnits.push(unit.id);
  }
  return { items: items.length, units: units.length - stuckUnits.length, stuckUnits };
}
