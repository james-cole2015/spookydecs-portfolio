// Pack mode — a 3-way choice over an item's storage_data.packable/single_packed
// booleans, shared by BuildCompleteWizard and AcquisitionPurchaseWizard (#620).
// Local copy: the ideas sub is a separate package from items, so this mirrors
// (and must stay in sync with) subs/items/src/config/itemsConfig.ts's PACK_MODES.
export const PACK_MODE_OPTIONS = [
  { value: 'tote',      label: 'Tote-packed' },
  { value: 'single',    label: 'Single-packed' },
  { value: 'oversized', label: 'Large & Oversized' },
] as const;
export type PackMode = typeof PACK_MODE_OPTIONS[number]['value'];

export function packModeToStorageFlags(mode: string): { packable: boolean; single_packed: boolean } {
  if (mode === 'oversized') return { packable: false, single_packed: false };
  if (mode === 'single')    return { packable: true, single_packed: true };
  return { packable: true, single_packed: false }; // 'tote' / default
}
