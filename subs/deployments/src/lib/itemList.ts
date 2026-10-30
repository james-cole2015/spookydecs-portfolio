/**
 * Items & Photos derivation (#689) — graph input → one row per deployed item.
 *
 * Runs over live graph data (item status filtered to PreDeployment/Deployed) and over the frozen
 * `graph_snapshot` (no status filter: teardown rewrites item statuses, but the snapshot is the
 * record of what was deployed).
 */
import { ITEM_CLASS_BUCKETS, LIVE_ITEM_STATUSES } from '../config/deploymentsConfig';
import type { GraphInput } from './graphDerivation';

export interface ItemRow {
  id: string;
  name: string;
  classType: string;
  /** Class chip key, or null for items outside the four chips (cords, plugs, …). */
  bucket: string | null;
  zone: string;
  photoIds: string[];
}

/** Wiring and lights are not things to photograph, so they are never listed. */
const EXCLUDED_CLASS_TYPES = ['Cord', 'Plug', 'String Light', 'Spot Light'];

export function classBucket(classType?: string): string | null {
  return ITEM_CLASS_BUCKETS.find((b) => b.classTypes.includes(classType || ''))?.key ?? null;
}

/**
 * Cords, plugs and lights are excluded. An item is listed when it has an active placement or an inbound active connection — the same
 * "deployed set" rule CompletePage uses. Photos come from the declaration and inbound connections.
 */
export function deriveItemList(input: GraphInput, opts: { applyStatusFilter: boolean }): ItemRow[] {
  const roots = new Set(Object.values(input.zones).flatMap((z) => z.receptacle_ids));
  const placements = input.placements.filter((p) => (p.placement_type ?? 'deployment') === 'deployment');
  const connections = input.connections.filter((c) => (c.connection_type ?? 'deployment') === 'deployment');

  const rows = new Map<string, ItemRow>();
  const touch = (itemId: string, zone: string, photoIds: string[] = []) => {
    if (roots.has(itemId)) return;
    const item = input.items[itemId];
    if (EXCLUDED_CLASS_TYPES.includes(item?.class_type || '')) return;
    if (opts.applyStatusFilter && !LIVE_ITEM_STATUSES.includes(item?.status || '')) return;
    const row =
      rows.get(itemId) ??
      ({
        id: itemId,
        name: item?.short_name || itemId,
        classType: item?.class_type || '',
        bucket: classBucket(item?.class_type),
        zone,
        photoIds: [],
      } satisfies ItemRow);
    for (const pid of photoIds) if (!row.photoIds.includes(pid)) row.photoIds.push(pid);
    rows.set(itemId, row);
  };
  // Placement zone wins over a connection's zone, so touch placements first.
  placements.forEach((p) => touch(p.item_id, p.zone_code, p.photo_ids));
  connections.forEach((c) => touch(c.to_item_id, c.zone_code || '', c.photo_ids));
  return [...rows.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function filterItems(rows: ItemRow[], zone: string, bucket: string | null): ItemRow[] {
  return rows.filter((r) => (zone === 'ALL' || r.zone === zone) && (!bucket || r.bucket === bucket));
}

/** Counts for the class chips under the active zone tab (so chip counts match the list). */
export function bucketCounts(rows: ItemRow[], zone: string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const r of rows) {
    if (zone !== 'ALL' && r.zone !== zone) continue;
    if (r.bucket) counts[r.bucket] = (counts[r.bucket] ?? 0) + 1;
  }
  return counts;
}
