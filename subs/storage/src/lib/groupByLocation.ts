import type { ItemRecord } from '../api/storageApi';
import type { Filters } from '@spookydecs/ui';
import STORAGE_CONFIG, { type StorageUnit } from '../config/storageConfig';
import { isNonPackableItem } from './nonPackable';

export interface LocationGroup {
  location: string;
  units: StorageUnit[];
  items: ItemRecord[];
  count: number;
}

const UNASSIGNED = 'Unassigned';

function sd(item: ItemRecord): Record<string, unknown> {
  return (item.storage_data as Record<string, unknown>) ?? {};
}

function itemLocation(item: ItemRecord): string {
  return (sd(item).location as string | undefined) || UNASSIGNED;
}

/**
 * Groups storage units and non-packable items by physical location.
 * `season`/`search` apply to both; `class_type`/`status` apply to storage
 * units only (non-packable items don't carry those facets).
 */
export function groupByLocation(storage: StorageUnit[], allItems: ItemRecord[], filters: Filters): LocationGroup[] {
  let units = [...storage];
  let items = allItems.filter(isNonPackableItem);

  if (filters.season && filters.season !== 'All') {
    units = units.filter((u) => u.season === filters.season);
    items = items.filter((i) => i.season === filters.season);
  }
  if (filters.class_type && filters.class_type !== 'All') {
    units = units.filter((u) => u.class_type === filters.class_type);
  }
  if (filters.status && filters.status !== 'All') {
    units = units.filter((u) => (u.status ?? 'Empty') === filters.status);
  }
  if (filters.search && filters.search.trim() !== '') {
    const term = filters.search.toLowerCase().trim();
    units = units.filter(
      (u) =>
        u.id.toLowerCase().includes(term) ||
        (u.short_name || '').toLowerCase().includes(term) ||
        (u.location ? String(u.location).toLowerCase().includes(term) : false),
    );
    items = items.filter(
      (i) => i.id.toLowerCase().includes(term) || String((i.short_name as string) ?? '').toLowerCase().includes(term),
    );
  }

  const order = [...STORAGE_CONFIG.LOCATIONS] as string[];
  const seen = new Set<string>(order);
  [...units.map((u) => u.location), ...items.map(itemLocation)].forEach((loc) => {
    const key = loc || UNASSIGNED;
    if (key !== UNASSIGNED && !seen.has(key)) {
      seen.add(key);
      order.push(key);
    }
  });
  order.push(UNASSIGNED);

  return order
    .map((location) => {
      const groupUnits = units.filter((u) => (u.location || UNASSIGNED) === location);
      const groupItems = items.filter((i) => itemLocation(i) === location);
      return { location, units: groupUnits, items: groupItems, count: groupUnits.length + groupItems.length };
    })
    .filter((g) => g.count > 0);
}
