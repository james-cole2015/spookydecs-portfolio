// Configuration and Constants

// Global variables
let config = {};
let allItems = [];

// ADD THIS - Class Hierarchy (defines which class_types belong to each class)
const CLASS_HIERARCHY = {
  'Decoration': ['Inflatable', 'Static Prop', 'Animatronic'],
  'Accessory': ['Plug', 'Cord', 'Adapter'],
  'Light': ['String Light', 'Spot Light']
};

// Icon mapping for class types
const CLASS_TYPE_ICONS = {
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
const CLASS_TYPE_ATTRIBUTES = {
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
const HAS_REPAIR_TRACKING = ['Static Prop', 'Inflatable', 'Animatronic', 'String Light', 'Spot Light'];

// Attribute display names
const ATTRIBUTE_LABELS = {
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

// Helper function to format field names
function formatFieldName(key) {
  return key
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}