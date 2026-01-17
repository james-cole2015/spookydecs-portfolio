// Finance Configuration & Constants

export const COST_TYPES = [
  { value: 'acquisition', label: 'Acquisition' },
  { value: 'repair', label: 'Repair' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'build', label: 'Build' },
  { value: 'supply_purchase', label: 'Supply Purchase' },
  { value: 'other', label: 'Other' }
];

// Dynamic categories based on cost type
export const CATEGORIES_BY_COST_TYPE = {
  acquisition: [
    { value: 'decoration', label: 'Decoration' },
    { value: 'light', label: 'Light' },
    { value: 'accessory', label: 'Accessory' },
    { value: 'other', label: 'Other' }
  ],
  repair: [
    { value: 'parts', label: 'Parts' },
    { value: 'consumables', label: 'Consumables' },
    { value: 'other', label: 'Other' }
  ],
  maintenance: [
    { value: 'parts', label: 'Parts' },
    { value: 'consumables', label: 'Consumables' },
    { value: 'other', label: 'Other' }
  ],
  build: [
    { value: 'parts', label: 'Parts' },
    { value: 'consumables', label: 'Consumables' },
    { value: 'other', label: 'Other' }
  ],
  supply_purchase: [
    { value: 'consumables', label: 'Consumables' }
  ],
  other: [
    { value: 'other', label: 'Other' }
  ]
};

export const SUBCATEGORIES = {
  materials: ['Wood', 'Metal', 'Fabric', 'Paint', 'Adhesive', 'Other'],
  labor: ['Installation', 'Repair', 'Maintenance', 'Consultation', 'Other'],
  parts: ['Electrical', 'Mechanical', 'Structural', 'Decorative', 'Other'],
  consumables: ['Hardware', 'Tools', 'Supplies', 'Packaging', 'Other'],
  decoration: ['Inflatable', 'Animatronic', 'Static Prop', 'Signage', 'Other'],
  light: ['String Lights', 'Spot Lights', 'Projectors', 'Bulbs', 'Other'],
  accessory: ['Cords', 'Plugs', 'Receptacles', 'Stakes', 'Other']
};

export const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'GBP', label: 'GBP (£)' }
];

// Base required fields (not including total_cost or value - those are conditional)
export const REQUIRED_FIELDS = [
  'item_name',
  'cost_type',
  'category',
  'cost_date',
  'vendor'
];

export const FORM_DEFAULTS = {
  cost_type: '',
  category: '',
  currency: 'USD',
  quantity: 1,
  unit_cost: 0,
  total_cost: 0,
  tax: 0,
  value: 0,
  is_gift: false
};

// Related ID configuration by cost type
export const RELATED_ID_CONFIG = {
  acquisition: { 
    field: 'related_item_id', 
    label: 'Related Item', 
    required: (category) => ['decoration', 'light', 'accessory'].includes(category),
    endpoint: '/items',
    searchFields: ['short_name', 'id'],
    classFilter: ['Decoration', 'Light', 'Accessory']
  },
  repair: { 
    field: 'related_record_id', 
    label: 'Related Record', 
    required: false, 
    endpoint: '/admin/maintenance-records',
    searchFields: ['record_id', 'short_description']
  },
  maintenance: { 
    field: 'related_record_id', 
    label: 'Related Record', 
    required: false, 
    endpoint: '/admin/maintenance-records',
    searchFields: ['record_id', 'short_description']
  },
  build: { 
    field: 'related_idea_id', 
    label: 'Related Idea', 
    required: false, 
    endpoint: '/ideas',
    searchFields: ['idea_name', 'id']
  },
  supply_purchase: null, // No related field
  other: { 
    field: 'related_item_id', 
    label: 'Related Item', 
    required: false, 
    endpoint: '/items',
    searchFields: ['short_name', 'id'],
    classFilter: ['Decoration', 'Light', 'Accessory']
  }
};

// Get related ID config for a cost type
export function getRelatedIdConfig(costType) {
  return RELATED_ID_CONFIG[costType];
}

// Check if related ID is required for given cost type and category
export function isRelatedIdRequired(costType, category) {
  const config = RELATED_ID_CONFIG[costType];
  if (!config) return false;
  
  if (typeof config.required === 'function') {
    return config.required(category);
  }
  return config.required;
}

// Validation Functions
export function validateCostRecord(record) {
  const errors = {};

  // Validate base required fields
  REQUIRED_FIELDS.forEach(field => {
    if (!record[field] || record[field].toString().trim() === '') {
      errors[field] = 'This field is required';
    }
  });

  // Get is_gift flag (defaults to false)
  const isGift = record.is_gift === true || record.is_gift === 'true';

  // Conditional validation based on is_gift flag
  if (isGift) {
    // For gifts: value is required, total_cost is optional (can be 0)
    if (!record.value || parseFloat(record.value) <= 0) {
      errors.value = 'Value is required for gifts and must be greater than 0';
    }
    
    // total_cost can be 0 or positive for gifts
    if (record.total_cost && parseFloat(record.total_cost) < 0) {
      errors.total_cost = 'Total cost cannot be negative';
    }
  } else {
    // For non-gifts: total_cost is required and must be > 0
    if (!record.total_cost || parseFloat(record.total_cost) <= 0) {
      errors.total_cost = 'Total cost must be greater than 0';
    }
  }

  // Validate related ID based on cost type and category
  const relatedIdConfig = getRelatedIdConfig(record.cost_type);
  if (relatedIdConfig) {
    const isRequired = isRelatedIdRequired(record.cost_type, record.category);
    const relatedIdField = relatedIdConfig.field;
    
    if (isRequired && (!record[relatedIdField] || record[relatedIdField].trim() === '')) {
      errors[relatedIdField] = `${relatedIdConfig.label} is required`;
    }
  }

  // Quantity validation
  if (record.quantity !== undefined && record.quantity <= 0) {
    errors.quantity = 'Quantity must be greater than 0';
  }

  // Date validation
  if (record.cost_date) {
    const date = new Date(record.cost_date);
    if (isNaN(date.getTime())) {
      errors.cost_date = 'Invalid date format';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

// Get available categories for a given cost type
export function getCategoriesForCostType(costType) {
  return CATEGORIES_BY_COST_TYPE[costType] || CATEGORIES_BY_COST_TYPE.other;
}

// Calculate value based on is_gift flag
export function calculateValue(isGift, totalCost, tax = 0) {
  if (isGift) {
    // For gifts, value should be manually entered, not calculated
    return 0;
  }
  return parseFloat(totalCost) || 0;
}

// Formatting Functions
export function formatCurrency(amount, currency = 'USD') {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  });
  return formatter.format(amount);
}

export function formatDate(isoString) {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

export function formatDateTime(isoString) {
  const date = new Date(isoString);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// ID Generation
export function generateCostId(existingCosts = []) {
  const year = new Date().getFullYear();
  const yearPrefix = `COST-${year}-`;
  
  const yearCosts = existingCosts
    .filter(cost => cost.cost_id.startsWith(yearPrefix))
    .map(cost => {
      const match = cost.cost_id.match(/COST-\d{4}-(\d{3})/);
      return match ? parseInt(match[1]) : 0;
    });
  
  const nextNumber = yearCosts.length > 0 ? Math.max(...yearCosts) + 1 : 1;
  const paddedNumber = String(nextNumber).padStart(3, '0');
  
  return `${yearPrefix}${paddedNumber}`;
}

// Filter Functions
export function filterCosts(costs, filters) {
  return costs.filter(cost => {
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesSearch = 
        cost.item_name?.toLowerCase().includes(searchLower) ||
        cost.cost_id?.toLowerCase().includes(searchLower) ||
        cost.vendor?.toLowerCase().includes(searchLower) ||
        cost.description?.toLowerCase().includes(searchLower);
      
      if (!matchesSearch) return false;
    }

    // Cost type filter
    if (filters.cost_type && filters.cost_type !== 'all') {
      if (cost.cost_type !== filters.cost_type) return false;
    }

    // Category filter
    if (filters.category && filters.category !== 'all') {
      if (cost.category !== filters.category) return false;
    }

    // Vendor filter
    if (filters.vendor && filters.vendor !== 'all') {
      if (cost.vendor !== filters.vendor) return false;
    }

    // is_gift filter
    if (filters.is_gift !== undefined && filters.is_gift !== 'all') {
      const filterIsGift = filters.is_gift === true || filters.is_gift === 'true';
      const costIsGift = cost.is_gift === true;
      if (costIsGift !== filterIsGift) return false;
    }

    // Date range filter
    if (filters.startDate) {
      if (new Date(cost.cost_date) < new Date(filters.startDate)) return false;
    }

    if (filters.endDate) {
      if (new Date(cost.cost_date) > new Date(filters.endDate)) return false;
    }

    return true;
  });
}

// Sort Functions
export function sortCosts(costs, sortBy, sortOrder = 'desc') {
  const sorted = [...costs].sort((a, b) => {
    let aVal = a[sortBy];
    let bVal = b[sortBy];

    // Handle dates
    if (sortBy === 'cost_date' || sortBy === 'purchase_date') {
      aVal = new Date(aVal).getTime();
      bVal = new Date(bVal).getTime();
    }

    // Handle numbers
    if (sortBy === 'total_cost' || sortBy === 'unit_cost' || sortBy === 'quantity') {
      aVal = parseFloat(aVal) || 0;
      bVal = parseFloat(bVal) || 0;
    }

    // Handle strings
    if (typeof aVal === 'string') {
      aVal = aVal.toLowerCase();
      bVal = bVal?.toLowerCase() || '';
    }

    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  return sorted;
}

// Calculate total cost from unit cost and quantity
export function calculateTotalCost(unitCost, quantity) {
  const unit = parseFloat(unitCost) || 0;
  const qty = parseFloat(quantity) || 1;
  return (unit * qty).toFixed(2);
}