// Item Configuration and Constants
// Centralized configuration for items subdomain

// Class Hierarchy (defines which class_types belong to each class)
export const CLASS_HIERARCHY = {
  'Decoration': ['Inflatable', 'Static Prop', 'Animatronic'],
  'Accessory': ['Plug', 'Cord', 'Adapter'],
  'Light': ['String Light', 'Spot Light']
};

// Icon mapping for class types
export const CLASS_TYPE_ICONS = {
  'Cord': '🔌',
  'Inflatable': '🎈',
  'Plug': '⚡',
  'Static Prop': '🎃',
  'Animatronic': '🤖',
  'Light': '💡',
  'String Light': '💡',
  'Spot Light': '💡',
  'Adapter': '🔧'
};

// Define which attributes to show for each class_type
export const CLASS_TYPE_ATTRIBUTES = {
  'Inflatable': ['stakes', 'tethers', 'height_length', 'adapter', 'date_acquired', 'watts', 'amps'],
  'Static Prop': ['stakes', 'tethers', 'height_length', 'date_acquired'],
  'Animatronic': ['stakes', 'tethers', 'height_length', 'adapter', 'date_acquired', 'watts', 'amps'],
  'Plug': ['length', 'male_ends', 'female_ends'],
  'Cord': ['length', 'male_ends', 'female_ends'],
  'Adapter': [],
  'String Light': ['color', 'bulb_type', 'length', 'notes', 'watts', 'amps'],
  'Spot Light': ['color', 'bulb_type', 'notes', 'watts', 'amps']
};

// Define which class_types have repair tracking
export const HAS_REPAIR_TRACKING = ['Static Prop', 'Inflatable', 'Animatronic', 'String Light', 'Spot Light'];

// Attribute display names
export const ATTRIBUTE_LABELS = {
  'stakes': 'Stakes',
  'tethers': 'Tethers',
  'height_length': 'Height/Length',
  'adapter': 'Adapter',
  'date_acquired': 'Date Acquired',
  'length': 'Length (ft)',
  'male_ends': 'Male Ends',
  'female_ends': 'Female Ends',
  'color': 'Color',
  'bulb_type': 'Bulb Type',
  'notes': 'Notes',
  'watts': 'Power (Watts)',
  'amps': 'Current (Amps)'
};

// Tab configuration (3 tabs: Decorations, Lights, Accessories)
export const TABS = [
  { id: 'decorations', label: 'Decorations', class: 'Decoration', icon: '✨' },
  { id: 'lights', label: 'Lights', class: 'Light', icon: '💡' },
  { id: 'accessories', label: 'Accessories', class: 'Accessory', icon: '⚙️' }
];

// Filter options
export const SEASON_OPTIONS = ['Halloween', 'Christmas', 'Shared'];

export const STATUS_OPTIONS = ['Active', 'Retired'];

export const REPAIR_STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'operational', label: 'Operational' },
  { value: 'needs_repair', label: 'Needs Repair' }
];

// Table column definitions
export const TABLE_COLUMNS = {
  decorations: [
    { key: 'id', label: 'ID', sortable: true, width: '15%' },
    { key: 'season', label: 'Season', sortable: true, width: '12%' },
    { key: 'short_name', label: 'Name', sortable: true, width: '22%' },
    { key: 'class_type', label: 'Type', sortable: true, width: '15%' },
    { key: 'status', label: 'Status', sortable: true, width: '12%' },
    { key: 'repair_status', label: 'Repair', sortable: false, width: '12%' },
    { key: 'storage', label: 'Storage', sortable: false, width: '12%' }
  ],
  lights: [
    { key: 'id', label: 'ID', sortable: true, width: '12%' },
    { key: 'season', label: 'Season', sortable: true, width: '12%' },
    { key: 'short_name', label: 'Name', sortable: true, width: '25%' },
    { key: 'class_type', label: 'Type', sortable: true, width: '15%' },
    { key: 'status', label: 'Status', sortable: true, width: '12%' },
    { key: 'repair_status', label: 'Repair', sortable: false, width: '12%' },
    { key: 'storage', label: 'Storage', sortable: false, width: '12%' }
  ],
  accessories: [
    { key: 'id', label: 'ID', sortable: true, width: '12%' },
    { key: 'season', label: 'Season', sortable: true, width: '12%' },
    { key: 'short_name', label: 'Name', sortable: true, width: '25%' },
    { key: 'class_type', label: 'Type', sortable: true, width: '15%' },
    { key: 'status', label: 'Status', sortable: true, width: '12%' },
    { key: 'repair_status', label: 'Repair', sortable: false, width: '12%' },
    { key: 'storage', label: 'Storage', sortable: false, width: '12%' }
  ]
};

// Helper function to format field names
export function formatFieldName(key) {
  return key
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Helper to get icon for class type
export function getClassTypeIcon(classType) {
  return CLASS_TYPE_ICONS[classType] || '📦';
}

// Helper to check if class type has repair tracking
export function hasRepairTracking(classType) {
  return HAS_REPAIR_TRACKING.includes(classType);
}

// Helper to get class types for a class
export function getClassTypesForClass(className) {
  return CLASS_HIERARCHY[className] || [];
}

// Helper to get attributes for a class type
export function getAttributesForClassType(classType) {
  return CLASS_TYPE_ATTRIBUTES[classType] || [];
}

// Helper to get attribute label
export function getAttributeLabel(attributeKey) {
  return ATTRIBUTE_LABELS[attributeKey] || formatFieldName(attributeKey);
}