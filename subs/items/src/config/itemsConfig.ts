// Items sub configuration — typed port of item-config.js (#332)
import type { FilterOption } from '@spookydecs/ui';

export const CLASS_HIERARCHY: Record<string, { types: string[]; icon: string }> = {
  Decoration: { types: ['Inflatable', 'Animatronic', 'Static Prop'], icon: '🎃' },
  Light:      { types: ['String Light', 'Spot Light', 'Projection'], icon: '💡' },
  Accessory:  { types: ['Cord', 'Plug', 'Receptacle'], icon: '🔌' },
};

export const ALLOWED_CLASSES = ['Decoration', 'Light', 'Accessory'] as const;
export type ItemClass = typeof ALLOWED_CLASSES[number];

export const SEASONS = [
  { value: 'Halloween', label: 'Halloween', icon: '🎃' },
  { value: 'Christmas', label: 'Christmas', icon: '🎄' },
  { value: 'Shared',    label: 'Shared',    icon: '🔄' },
] as const;

// Canonical item lifecycle (see items.md §6A — #280):
// Ready → Packed → Staged → PreDeployment → Deployed → TearDown → (repack) → Packed
// Ready/Packed are the items-owned states; the rest are set by the deployments flow.
export const ITEM_STATUS = [
  { value: 'Ready',         label: 'Ready',          color: '#16a34a' },
  { value: 'Packed',        label: 'Packed',         color: '#6b7280' },
  { value: 'Staged',        label: 'Staged',         color: '#f59e0b' },
  { value: 'PreDeployment', label: 'Pre-Deployment', color: '#0ea5e9' },
  { value: 'Deployed',      label: 'Deployed',       color: '#3b82f6' },
  { value: 'TearDown',      label: 'Tear Down',      color: '#f97316' },
  { value: 'Retired',       label: 'Retired',        color: '#ef4444' },
] as const;

// Fields per class_type — verbatim from item-config.js
export const CLASS_TYPE_ATTRIBUTES: Record<string, { fields: string[]; required: string[] }> = {
  Inflatable:    { fields: ['height_length', 'stakes', 'tethers', 'adapter', 'power_inlet'], required: ['height_length'] },
  Animatronic:   { fields: ['height_length', 'stakes', 'tethers', 'adapter', 'power_inlet'], required: ['height_length'] },
  'Static Prop': { fields: ['height_length', 'stakes', 'tethers', 'power_inlet'],            required: [] },
  'String Light':{ fields: ['color', 'bulb_type', 'length', 'power_inlet'],                  required: ['color', 'length'] },
  'Spot Light':  { fields: ['color', 'bulb_type', 'power_inlet'],                            required: ['color'] },
  Projection:    { fields: ['power_inlet'],                                                   required: [] },
  Cord:          { fields: ['length', 'male_ends', 'female_ends', 'watts', 'amps'],          required: ['length'] },
  Plug:          { fields: ['male_ends', 'female_ends', 'power_inlet'],                      required: [] },
  Receptacle:    { fields: ['female_ends', 'power_inlet'],                                   required: ['female_ends'] },
  Timer:         { fields: ['male_ends', 'female_ends', 'power_inlet'],                      required: [] },
  Controller:    { fields: ['male_ends', 'female_ends', 'power_inlet'],                      required: [] },
  Tote:          { fields: [], required: [] },
  Box:           { fields: [], required: [] },
  Bin:           { fields: [], required: [] },
};

export interface FieldMeta {
  label: string;
  type: 'text' | 'number' | 'checkbox';
  suffix?: string;
  placeholder?: string;
}

export const FIELD_METADATA: Record<string, FieldMeta> = {
  height_length: { label: 'Height/Length', type: 'text',     suffix: 'ft', placeholder: '6.5' },
  stakes:        { label: 'Stakes',        type: 'number',                  placeholder: '2' },
  tethers:       { label: 'Tethers',       type: 'number',                  placeholder: '4' },
  adapter:       { label: 'Adapter',       type: 'text',                    placeholder: 'Type of adapter' },
  power_inlet:   { label: 'Power Required',type: 'checkbox' },
  color:         { label: 'Color',         type: 'text',                    placeholder: 'Multi, White, Blue' },
  bulb_type:     { label: 'Bulb Type',     type: 'text',                    placeholder: 'LED, Incandescent' },
  length:        { label: 'Length',        type: 'text',     suffix: 'ft', placeholder: '25' },
  male_ends:     { label: 'Male Ends',     type: 'number',                  placeholder: '1' },
  female_ends:   { label: 'Female Ends',   type: 'number',                  placeholder: '3' },
  watts:         { label: 'Watts',         type: 'text',                    placeholder: '1800' },
  amps:          { label: 'Amps',          type: 'text',                    placeholder: '15' },
};

// ── List-view filters ──────────────────────────────────────────────────────
// State + option config for the shared @spookydecs/ui FilterBar (#429). `class_type`
// is a hidden filter carried in the URL (set by landing-page nav, cascaded off
// `class`), not a rendered select — so it is absent from FILTER_SELECT_KEYS.

export interface Filters {
  search: string;
  season: string;
  class: string;
  class_type: string;
  status: string;
  maintenance: string;
  // Assignable to the shared FilterBar's Record<string,string> filter shape.
  [key: string]: string;
}

export const FILTER_KEYS = ['search', 'season', 'class', 'class_type', 'status', 'maintenance'] as const;

/** Select keys rendered in the bar, in order (first option per key is its "All" sentinel). */
export const FILTER_SELECT_KEYS = ['status', 'season', 'class', 'maintenance'];

export const FILTER_LABELS: Record<string, string> = {
  status: 'Status',
  season: 'Season',
  class: 'Class',
  maintenance: 'Maintenance',
};

export const FILTER_OPTIONS: Record<string, FilterOption[]> = {
  status: [{ value: '', label: 'All Statuses' }, ...ITEM_STATUS.map((s) => ({ value: s.value, label: s.label }))],
  season: [{ value: '', label: 'All Seasons' }, ...SEASONS.map((s) => ({ value: s.value, label: s.label, icon: s.icon }))],
  class: [
    { value: '', label: 'All Classes' },
    ...Object.keys(CLASS_HIERARCHY).map((c) => ({ value: c, label: c, icon: CLASS_HIERARCHY[c].icon })),
  ],
  maintenance: [
    { value: '', label: 'All' },
    { value: 'needs_repair', label: 'Needs Repair' },
    { value: 'non_operational', label: 'Non-Operational' },
  ],
};

export function readFilters(params: URLSearchParams): Filters {
  return {
    search:      params.get('search')      ?? '',
    season:      params.get('season')      ?? '',
    class:       params.get('class')       ?? '',
    class_type:  params.get('class_type')  ?? '',
    status:      params.get('status')      ?? '',
    maintenance: params.get('maintenance') ?? '',
  };
}

export function getClassIcon(cls: string): string {
  return CLASS_HIERARCHY[cls]?.icon ?? '📦';
}

export function getSeasonIcon(season: string): string {
  return SEASONS.find((s) => s.value === season)?.icon ?? '🔄';
}

export function getPlaceholderIcon(cls: string, season: string): string {
  return cls === 'Decoration' ? getSeasonIcon(season) : getClassIcon(cls);
}

export function getStatusColor(status: string): string {
  return ITEM_STATUS.find((s) => s.value === status)?.color ?? '#6b7280';
}

export const TYPE_ICONS: Record<string, string> = {
  Inflatable:    '🎈',
  Animatronic:   '🤖',
  'Static Prop': '🗿',
  'String Light':'💡',
  'Spot Light':  '🔦',
  Projection:    '📽️',
  Cord:          '➰',
  Plug:          '🔌',
  Receptacle:    '⚡',
  Timer:         '⏱️',
  Controller:    '🎮',
  Tote:          '📦',
  Box:           '📫',
  Bin:           '🗑️',
};
