/**
 * Storage Subdomain Configuration
 * Centralized constants, validation rules, and configuration
 */

export const STORAGE_CONFIG = {
  // Class Types
  CLASS_TYPES: {
    TOTE: 'Tote',
    SELF: 'Self'
  },

  // Seasons
  SEASONS: ['Halloween', 'Christmas', 'Shared'],

  // Locations
  LOCATIONS: ['Shed', 'Attic', 'Crawl Space', 'Other'],

  // Sizes (for Totes only)
  SIZES: ['Small', 'Medium', 'Large', 'Extra Large'],

  // Abbreviations for ID generation
  SEASON_CODES: {
    'Halloween': 'HAL',
    'Christmas': 'CHR',
    'Shared': 'SHD'
  },

  CLASS_TYPE_CODES: {
    'Tote': 'TOTE',
    'Self': 'SELF'
  },

  // Form field definitions for each class type
  FORM_FIELDS: {
    tote: [
      {
        name: 'season',
        label: 'Season',
        type: 'select',
        required: true,
        options: 'SEASONS',
        helpText: 'Which holiday season this tote is for'
      },
      {
        name: 'location',
        label: 'Location',
        type: 'select',
        required: true,
        options: 'LOCATIONS',
        helpText: 'Where this tote is physically stored'
      },
      {
        name: 'short_name',
        label: 'Short Name',
        type: 'text',
        required: true,
        placeholder: 'e.g., Halloween Inflatables',
        helpText: 'A descriptive name for this tote'
      },
      {
        name: 'size',
        label: 'Size',
        type: 'select',
        required: true,
        options: 'SIZES',
        helpText: 'Physical size of the tote'
      },
      {
        name: 'general_notes',
        label: 'General Notes',
        type: 'textarea',
        required: false,
        placeholder: 'Any additional notes about this tote...',
        helpText: 'Optional notes about contents, handling, etc.'
      }
    ],
    self: [
      {
        name: 'season',
        label: 'Season',
        type: 'select',
        required: true,
        options: 'SEASONS',
        helpText: 'Which holiday season this item belongs to'
      },
      {
        name: 'item_id',
        label: 'Item',
        type: 'item-select',
        required: true,
        helpText: 'Select the item stored in its original packaging'
      },
      {
        name: 'location',
        label: 'Location',
        type: 'select',
        required: true,
        options: 'LOCATIONS',
        helpText: 'Where this item is physically stored'
      },
      {
        name: 'short_name',
        label: 'Short Name',
        type: 'text',
        required: true,
        placeholder: 'e.g., 12ft Skeleton (Original Box)',
        helpText: 'A descriptive name for this storage unit'
      },
      {
        name: 'general_notes',
        label: 'General Notes',
        type: 'textarea',
        required: false,
        placeholder: 'Any additional notes...',
        helpText: 'Optional notes about condition, handling, etc.'
      }
    ]
  },

  // Filter options for list page
  FILTER_OPTIONS: {
    season: ['All', 'Halloween', 'Christmas', 'Shared'],
    location: ['All', 'Shed', 'Attic', 'Crawl Space', 'Other'],
    class_type: ['All', 'Tote', 'Self'],
    packed: ['All', 'Packed', 'Unpacked'],
    size: ['All', 'Small', 'Medium', 'Large', 'Extra Large']
  },

  // Table columns configuration for desktop view
  TABLE_COLUMNS: [
    { key: 'id', label: 'ID', sortable: true, width: '150px' },
    { key: 'short_name', label: 'Short Name', sortable: true, width: 'auto' },
    { key: 'class_type', label: 'Type', sortable: true, width: '80px' },
    { key: 'season', label: 'Season', sortable: true, width: '100px' },
    { key: 'location', label: 'Location', sortable: true, width: '120px' },
    { key: 'size', label: 'Size', sortable: true, width: '80px' },
    { key: 'contents_count', label: 'Items', sortable: true, width: '70px' },
    { key: 'packed', label: 'Packed', sortable: true, width: '80px' },
    { key: 'actions', label: 'Actions', sortable: false, width: '200px' }
  ],

  // Wizard steps
  WIZARD_STEPS: {
    create: [
      { id: 1, label: '', key: 'type' },
      { id: 2, label: '', key: 'info' },
      { id: 3, label: '', key: 'review' }
    ],
    pack: [
      { id: 1, label: '', key: 'storage' },
      { id: 2, label: '', key: 'items' },
      { id: 3, label: '', key: 'review' }
    ]
  },

  // API endpoints
  API: {
    BASE: '/api/v1',
    STORAGE: '/storage',
    STORAGE_TOTES: '/storage/totes',
    STORAGE_SELF: '/storage/self',
    STORAGE_BY_ID: (id) => `/storage/${id}`,
    STORAGE_CONTENTS: (id) => `/storage/${id}/contents`,
    ITEMS: '/items',
    ITEMS_BY_ID: (id) => `/items/${id}`,
    IMAGES_PRESIGN: '/admin/images/presign',
    IMAGES_CONFIRM: '/admin/images/confirm'
  },

  // Validation rules
  VALIDATION: {
    short_name: {
      minLength: 3,
      maxLength: 100,
      pattern: /^[a-zA-Z0-9\s\-_()]+$/,
      message: 'Short name must be 3-100 characters and contain only letters, numbers, spaces, and basic punctuation'
    },
    general_notes: {
      maxLength: 500,
      message: 'Notes must be 500 characters or less'
    }
  }
};

/**
 * Get form fields for a specific class type
 */
export function getFormFields(classType) {
  const key = classType.toLowerCase();
  return STORAGE_CONFIG.FORM_FIELDS[key] || [];
}

/**
 * Get options for a select field
 */
export function getFieldOptions(optionsKey) {
  return STORAGE_CONFIG[optionsKey] || [];
}

/**
 * Validate a field value
 */
export function validateField(fieldName, value) {
  const rules = STORAGE_CONFIG.VALIDATION[fieldName];
  if (!rules) return { valid: true };

  if (rules.minLength && value.length < rules.minLength) {
    return { valid: false, message: rules.message };
  }

  if (rules.maxLength && value.length > rules.maxLength) {
    return { valid: false, message: rules.message };
  }

  if (rules.pattern && !rules.pattern.test(value)) {
    return { valid: false, message: rules.message };
  }

  return { valid: true };
}

/**
 * Get display label for packed status
 */
export function getPackedLabel(packed) {
  return packed ? '✅ Packed' : '⚪ Unpacked';
}

/**
 * Get CSS class for packed status
 */
export function getPackedClass(packed) {
  return packed ? 'packed' : 'unpacked';
}

/**
 * Format storage unit for display
 */
export function formatStorageUnit(unit) {
  // Normalize old vs new data structures
  const season = unit.season || unit.category;
  const classType = unit.class_type || (unit.type === 'TOTE' ? 'Tote' : 'Self');
  
  return {
    ...unit,
    season,
    class_type: classType,
    contents_count: unit.contents_count || (unit.contents ? unit.contents.length : 0)
  };
}

/**
 * Get placeholder image URL
 */
export function getPlaceholderImage() {
  return 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"%3E%3Crect fill="%23e5e7eb" width="100" height="100"/%3E%3Ctext x="50" y="50" font-family="Arial" font-size="14" fill="%239ca3af" text-anchor="middle" dominant-baseline="middle"%3ENo Photo%3C/text%3E%3C/svg%3E';
}

export default STORAGE_CONFIG;