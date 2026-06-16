// Items sub configuration — typed port of item-config.js (#332)

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

export const ITEM_STATUS = [
  { value: 'Active',   label: 'Active',   color: '#16a34a' },
  { value: 'Packed',   label: 'Packed',   color: '#6b7280' },
  { value: 'Deployed', label: 'Deployed', color: '#3b82f6' },
  { value: 'Retired',  label: 'Retired',  color: '#ef4444' },
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
