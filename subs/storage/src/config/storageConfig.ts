/**
 * Storage Subdomain Configuration — typed port of the vanilla storage-config.js.
 * Constants, validation rules, form-field definitions, and the StorageUnit
 * normalizer (`formatStorageUnit`) that reconciles 3 schema versions.
 */

export type ClassType = 'Tote' | 'Self';
export type Season = 'Halloween' | 'Christmas' | 'Shared';

export interface FormField {
  name: string;
  label: string;
  type: 'select' | 'text' | 'textarea' | 'item-select';
  required: boolean;
  options?: string;
  helpText?: string;
  placeholder?: string;
}

/** Normalized storage unit shape consumed by the UI. */
export interface StorageUnit {
  id: string;
  season: Season | string;
  class_type: ClassType | string;
  short_name: string;
  name?: string;
  status?: string;
  packed: boolean;
  location?: string;
  size?: string;
  general_notes?: string;
  contents?: unknown[];
  contents_count: number;
  item_id?: string;
  primary_photo_id?: string;
  photo_ids?: string[];
  [key: string]: unknown;
}

export const STORAGE_CONFIG = {
  CLASS_TYPES: { TOTE: 'Tote', SELF: 'Self' } as const,
  SEASONS: ['Halloween', 'Christmas', 'Shared'] as const,
  LOCATIONS: ['Shed', 'Attic', 'Crawl Space', 'Other'] as const,
  SIZES: ['Small', 'Medium', 'Large', 'Extra Large'] as const,

  SEASON_CODES: { Halloween: 'HAL', Christmas: 'CHR', Shared: 'SHD' } as Record<string, string>,
  CLASS_TYPE_CODES: { Tote: 'TOTE', Self: 'SELF' } as Record<string, string>,

  FORM_FIELDS: {
    tote: [
      { name: 'season', label: 'Season', type: 'select', required: true, options: 'SEASONS', helpText: 'Which holiday season this tote is for' },
      { name: 'location', label: 'Location', type: 'select', required: true, options: 'LOCATIONS', helpText: 'Where this tote is physically stored' },
      { name: 'short_name', label: 'Short Name', type: 'text', required: true, placeholder: 'e.g., Halloween Inflatables', helpText: 'A descriptive name for this tote' },
      { name: 'size', label: 'Size', type: 'select', required: true, options: 'SIZES', helpText: 'Physical size of the tote' },
      { name: 'general_notes', label: 'General Notes', type: 'textarea', required: false, placeholder: 'Any additional notes about this tote...', helpText: 'Optional notes about contents, handling, etc.' },
    ],
    self: [
      { name: 'season', label: 'Season', type: 'select', required: true, options: 'SEASONS', helpText: 'Which holiday season this item belongs to' },
      { name: 'item_id', label: 'Item', type: 'item-select', required: true, helpText: 'Select the item stored in its original packaging' },
      { name: 'location', label: 'Location', type: 'select', required: true, options: 'LOCATIONS', helpText: 'Where this item is physically stored' },
      { name: 'short_name', label: 'Short Name', type: 'text', required: true, placeholder: 'e.g., 12ft Skeleton (Original Box)', helpText: 'A descriptive name for this storage unit' },
      { name: 'general_notes', label: 'General Notes', type: 'textarea', required: false, placeholder: 'Any additional notes...', helpText: 'Optional notes about condition, handling, etc.' },
    ],
  } as Record<string, FormField[]>,

  FILTER_OPTIONS: {
    season: ['All', 'Halloween', 'Christmas', 'Shared'],
    location: ['All', 'Shed', 'Attic', 'Crawl Space', 'Other'],
    class_type: ['All', 'Tote', 'Self'],
    packed: ['All', 'Packed', 'Unpacked'],
    size: ['All', 'Small', 'Medium', 'Large', 'Extra Large'],
  } as Record<string, string[]>,

  TABLE_COLUMNS: [
    { key: 'id', label: 'ID', sortable: true },
    { key: 'short_name', label: 'Short Name', sortable: true },
    { key: 'class_type', label: 'Type', sortable: true },
    { key: 'season', label: 'Season', sortable: true },
    { key: 'location', label: 'Location', sortable: true },
    { key: 'size', label: 'Size', sortable: true },
    { key: 'contents_count', label: 'Items', sortable: true },
    { key: 'packed', label: 'Packed', sortable: true },
    { key: 'actions', label: 'Actions', sortable: false },
  ],

  WIZARD_STEPS: {
    create: [
      { id: 1, label: 'Type', key: 'type' },
      { id: 2, label: 'Info', key: 'info' },
      { id: 3, label: 'Review', key: 'review' },
    ],
    pack: [
      { id: 1, label: 'Storage', key: 'storage' },
      { id: 2, label: 'Items', key: 'items' },
      { id: 3, label: 'Review', key: 'review' },
    ],
  },

  API: {
    BASE: '/api/v1',
    STORAGE: '/storage',
    STORAGE_TOTES: '/storage/totes',
    STORAGE_SELF: '/storage/self',
    STORAGE_BY_ID: (id: string) => `/storage/${id}`,
    STORAGE_CONTENTS: (id: string) => `/storage/${id}/contents`,
    ITEMS: '/items',
    ITEMS_BY_ID: (id: string) => `/items/${id}`,
    IMAGES_PRESIGN: '/admin/images/presign',
    IMAGES_CONFIRM: '/admin/images/confirm',
  },

  VALIDATION: {
    short_name: {
      minLength: 3,
      maxLength: 100,
      pattern: /^[a-zA-Z0-9\s\-_()]+$/,
      message: 'Short name must be 3-100 characters and contain only letters, numbers, spaces, and basic punctuation',
    },
    general_notes: {
      maxLength: 500,
      message: 'Notes must be 500 characters or less',
    },
  } as Record<string, { minLength?: number; maxLength?: number; pattern?: RegExp; message: string }>,
};

export function getFormFields(classType: string): FormField[] {
  const key = classType.toLowerCase();
  return STORAGE_CONFIG.FORM_FIELDS[key] || [];
}

export function getFieldOptions(optionsKey: string): readonly string[] {
  return (STORAGE_CONFIG as Record<string, unknown>)[optionsKey] as string[] || [];
}

export function validateField(fieldName: string, value: string): { valid: boolean; message?: string } {
  const rules = STORAGE_CONFIG.VALIDATION[fieldName];
  if (!rules) return { valid: true };
  if (rules.minLength && value.length < rules.minLength) return { valid: false, message: rules.message };
  if (rules.maxLength && value.length > rules.maxLength) return { valid: false, message: rules.message };
  if (rules.pattern && !rules.pattern.test(value)) return { valid: false, message: rules.message };
  return { valid: true };
}

export function getPackedLabel(packed: boolean): string {
  return packed ? '✅ Packed' : '⚪ Unpacked';
}

export type ChipColor = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger';

/** Single source of truth for season pill colors. Halloween=orange, Christmas=green, Shared=violet. */
export function seasonChipColor(season?: string): ChipColor {
  switch (season) {
    case 'Halloween':
      return 'warning';
    case 'Christmas':
      return 'success';
    case 'Shared':
      return 'secondary';
    default:
      return 'default';
  }
}

/** Normalize old vs new storage-unit schemas (V1.4 renamed short_name→name, packed→status). */
export function formatStorageUnit(unit: Record<string, any>): StorageUnit {
  const season = unit.season || unit.category;
  const classType = unit.class_type || (unit.type === 'TOTE' ? 'Tote' : 'Self');
  const shortName = unit.name || unit.short_name;
  const packed = ['Packed', 'Stored', 'Staged'].includes(unit.status) || Boolean(unit.packed);

  return {
    ...unit,
    season,
    class_type: classType,
    short_name: shortName,
    packed,
    contents_count: unit.contents_count || (unit.contents ? unit.contents.length : 0),
  } as StorageUnit;
}

export function getPlaceholderImage(): string {
  return 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"%3E%3Crect fill="%231e1b2e" width="100" height="100"/%3E%3Ctext x="50" y="50" font-family="Arial" font-size="14" fill="%237c6f9c" text-anchor="middle" dominant-baseline="middle"%3ENo Photo%3C/text%3E%3C/svg%3E';
}

export default STORAGE_CONFIG;
