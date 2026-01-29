// Item Configuration
// Defines class hierarchy, types, and field attributes

export const CLASS_HIERARCHY = {
  'Decoration': {
    types: ['Inflatable', 'Animatronic', 'Static Prop'],
    icon: '🎃'
  },
  'Light': {
    types: ['String Light', 'Spot Light', 'Projection'],
    icon: '💡'
  },
  'Accessory': {
    types: ['Cord', 'Plug', 'Receptacle', 'Timer', 'Controller'],
    icon: '🔌'
  },
  'Storage': {
    types: ['Tote', 'Box', 'Bin'],
    icon: '📦'
  }
};

export const SEASONS = [
  { value: 'Halloween', label: 'Halloween', icon: '🎃' },
  { value: 'Christmas', label: 'Christmas', icon: '🎄' },
  { value: 'Shared', label: 'Shared', icon: '🔄' }
];

export const ITEM_STATUS = [
  { value: 'Active', label: 'Active', color: '#16a34a' },
  { value: 'Packed', label: 'Packed', color: '#6b7280' },
  { value: 'Deployed', label: 'Deployed', color: '#3b82f6' },
  { value: 'Retired', label: 'Retired', color: '#ef4444' }
];

// Field definitions by class type
export const CLASS_TYPE_ATTRIBUTES = {
  'Inflatable': {
    fields: ['height_length', 'stakes', 'tethers', 'adapter', 'power_inlet'],
    required: ['height_length']
  },
  'Animatronic': {
    fields: ['height_length', 'stakes', 'tethers', 'adapter', 'power_inlet'],
    required: ['height_length']
  },
  'Static Prop': {
    fields: ['height_length', 'stakes', 'tethers', 'power_inlet'],
    required: []
  },
  'String Light': {
    fields: ['color', 'bulb_type', 'length', 'power_inlet'],
    required: ['color', 'length']
  },
  'Spot Light': {
    fields: ['color', 'bulb_type', 'power_inlet'],
    required: ['color']
  },
  'Projection': {
    fields: ['power_inlet'],
    required: []
  },
  'Cord': {
    fields: ['length', 'male_ends', 'female_ends', 'watts', 'amps'],
    required: ['length']
  },
  'Plug': {
    fields: ['male_ends', 'female_ends', 'power_inlet'],
    required: []
  },
  'Receptacle': {
    fields: ['female_ends', 'power_inlet'],
    required: ['female_ends']
  },
  'Timer': {
    fields: ['male_ends', 'female_ends', 'power_inlet'],
    required: []
  },
  'Controller': {
    fields: ['male_ends', 'female_ends', 'power_inlet'],
    required: []
  },
  'Tote': {
    fields: [],
    required: []
  },
  'Box': {
    fields: [],
    required: []
  },
  'Bin': {
    fields: [],
    required: []
  }
};

// Field metadata
export const FIELD_METADATA = {
  'height_length': { label: 'Height/Length', type: 'text', suffix: 'ft', placeholder: '6.5' },
  'stakes': { label: 'Stakes', type: 'number', placeholder: '2' },
  'tethers': { label: 'Tethers', type: 'number', placeholder: '4' },
  'adapter': { label: 'Adapter', type: 'text', placeholder: 'Type of adapter' },
  'power_inlet': { label: 'Power Required', type: 'checkbox' },
  'color': { label: 'Color', type: 'text', placeholder: 'Multi, White, Blue' },
  'bulb_type': { label: 'Bulb Type', type: 'text', placeholder: 'LED, Incandescent' },
  'length': { label: 'Length', type: 'text', suffix: 'ft', placeholder: '25' },
  'male_ends': { label: 'Male Ends', type: 'number', placeholder: '1' },
  'female_ends': { label: 'Female Ends', type: 'number', placeholder: '3' },
  'watts': { label: 'Watts', type: 'text', placeholder: '1800' },
  'amps': { label: 'Amps', type: 'text', placeholder: '15' }
};

// Status badge colors
export function getStatusColor(status) {
  const statusObj = ITEM_STATUS.find(s => s.value === status);
  return statusObj ? statusObj.color : '#6b7280';
}

// Get class icon
export function getClassIcon(className) {
  return CLASS_HIERARCHY[className]?.icon || '📦';
}

// Get season icon
export function getSeasonIcon(season) {
  const seasonObj = SEASONS.find(s => s.value === season);
  return seasonObj ? seasonObj.icon : '🔄';
}

// Get placeholder icon for items without photos
// For Decorations, use season-specific icons (pumpkin for Halloween, tree for Christmas)
// For other classes, use the class icon
export function getPlaceholderIcon(className, season) {
  if (className === 'Decoration') {
    return getSeasonIcon(season);
  }
  return getClassIcon(className);
}

// Validate required fields for class type
export function validateClassType(classType, data) {
  const config = CLASS_TYPE_ATTRIBUTES[classType];
  if (!config) return { valid: true, missing: [] };
  
  const missing = config.required.filter(field => !data[field]);
  return {
    valid: missing.length === 0,
    missing
  };
}