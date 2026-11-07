import type { ItemRecord } from '../api/storageApi';

/**
 * Item pack-state predicates (#701).
 *
 * "In a unit" is status === 'Packed'. "On the shelf" is storage_data.is_stored === true,
 * which only holds once the unit is Stored. A boxed item (Packed, is_stored=false) is
 * packed, not unpacked. These are valid on legacy data (Packed <=> is_stored) and new data.
 */
function sd(item: ItemRecord): Record<string, unknown> {
  return (item.storage_data as Record<string, unknown>) ?? {};
}

/** Item is in a storage unit (boxed), whether or not the unit is on the shelf. */
export function isInUnit(item: ItemRecord): boolean {
  return item.status === 'Packed';
}

/** Item is packed in a unit, or stored loose on the shelf (non-packable). */
export function isPackedOrStored(item: ItemRecord): boolean {
  return isInUnit(item) || sd(item).is_stored === true;
}

/** Unpacked audit: not in a unit and not on the shelf. Mirrors the API unpacked=true filter. */
export function isUnpacked(item: ItemRecord): boolean {
  return !isInUnit(item) && sd(item).is_stored !== true;
}

/** Statuses an item can be packed from; a missing status is allowed (legacy records). */
const PACKABLE_FROM = ['Ready', 'TearDown'];

/** Item is eligible to be packed into a unit right now (not boxed, not shelved, not deployed). */
export function canBePacked(item: ItemRecord): boolean {
  const status = item.status as string | undefined;
  return isUnpacked(item) && (!status || PACKABLE_FROM.includes(status));
}
