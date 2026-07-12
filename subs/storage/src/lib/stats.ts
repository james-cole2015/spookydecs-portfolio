import type { StorageUnit } from '../config/storageConfig';
import type { ItemRecord } from '../api/storageApi';

export interface SeasonStat {
  storage: number;
  items: number;
  unpacked_items: number;
}

export interface StorageStats {
  total_storage: number;
  unpacked_storage: number;
  total_items: number;
  unpacked_items: number;
  by_season: Record<string, SeasonStat>;
}

const SEASONS = ['Halloween', 'Christmas', 'Shared'];

function storageData(item: ItemRecord): Record<string, unknown> {
  return (item.storage_data as Record<string, unknown>) ?? {};
}

/** Port of storage-list.js calculateStats(). */
export function calculateStats(storage: StorageUnit[], items: ItemRecord[]): StorageStats {
  const stats: StorageStats = {
    total_storage: storage.length,
    unpacked_storage: storage.filter((u) => u.packed === false).length,
    total_items: items.length,
    unpacked_items: items.filter((i) => storageData(i).is_stored === false).length,
    by_season: {},
  };

  SEASONS.forEach((season) => {
    const seasonStorage = storage.filter((u) => u.season === season);
    const seasonItems = items.filter((i) => i.season === season);
    const unpacked = seasonItems.filter((i) => storageData(i).is_stored === false);
    if (seasonStorage.length > 0 || seasonItems.length > 0) {
      stats.by_season[season] = {
        storage: seasonStorage.length,
        items: seasonItems.length,
        unpacked_items: unpacked.length,
      };
    }
  });

  return stats;
}

/** Port of storage-list.js applyFilters(). */
export function applyFilters(storage: StorageUnit[], filters: Record<string, string>): StorageUnit[] {
  let filtered = [...storage];
  if (filters.season && filters.season !== 'All') filtered = filtered.filter((u) => u.season === filters.season);
  if (filters.location && filters.location !== 'All') filtered = filtered.filter((u) => u.location === filters.location);
  if (filters.class_type && filters.class_type !== 'All') filtered = filtered.filter((u) => u.class_type === filters.class_type);
  if (filters.status && filters.status !== 'All') {
    filtered = filtered.filter((u) => (u.status ?? 'Empty') === filters.status);
  }
  if (filters.search && filters.search.trim() !== '') {
    const term = filters.search.toLowerCase().trim();
    filtered = filtered.filter(
      (u) =>
        u.id.toLowerCase().includes(term) ||
        (u.short_name || '').toLowerCase().includes(term) ||
        (u.location ? String(u.location).toLowerCase().includes(term) : false),
    );
  }
  filtered.sort((a, b) => (a.short_name || '').localeCompare(b.short_name || ''));
  return filtered;
}
