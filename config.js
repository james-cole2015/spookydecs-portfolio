// Configuration and Constants

// Global variables
let config = {};
let allItems = [];

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
  'Static Prop': ['stakes', 'tethers', 'height_length', 'date_acquired'],
  'Inflatable': ['stakes', 'tethers', 'height_length', 'date_acquired', 'adapter'],
  'Animatronic': ['stakes', 'tethers', 'height_length', 'date_acquired', 'adapter'],
  'String Light': ['color', 'length', 'bulb_type', 'notes'],
  'Spot Light': ['color', 'bulb_type', 'notes'],
  'Plug': ['length', 'male_ends', 'female_ends'],
  'Cord': ['length', 'male_ends', 'female_ends'],
  'Adapter': []
};

// Define which class_types have repair tracking
const HAS_REPAIR_TRACKING = ['Static Prop', 'Inflatable', 'Animatronic', 'String Light', 'Spot Light'];

// Attribute display names
const ATTRIBUTE_LABELS = {
  'stakes': '# of Stakes',
  'tethers': '# of Tethers',
  'height_length': 'Item Height / Length',
  'date_acquired': 'Date Acquired',
  'adapter': 'Adapter',
  'color': 'Color',
  'length': 'Length',
  'bulb_type': 'Bulb Type',
  'notes': 'Notes',
  'male_ends': 'Male Ends',
  'female_ends': 'Female Ends'
};

// Helper function to format field names
function formatFieldName(key) {
  return key
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}