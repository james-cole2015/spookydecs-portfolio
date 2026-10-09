import type { ItemRecord } from '../api/storageApi';

function sd(item: ItemRecord): Record<string, unknown> {
  return (item.storage_data as Record<string, unknown>) ?? {};
}

/** True for items stored directly by location rather than packed in a tote. */
export function isNonPackableItem(item: ItemRecord): boolean {
  return sd(item).packable === false && item.class !== 'Deployment' && item.class !== 'Storage' && item.class_type !== 'Receptacle';
}
