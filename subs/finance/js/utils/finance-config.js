// Finance Configuration & Constants

export const COST_TYPES = [
  { value: 'acquisition', label: 'Acquisition' },
  { value: 'repair', label: 'Repair' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'build', label: 'Build' },
  { value: 'supply_purchase', label: 'Supply Purchase' },
  { value: 'gift', label: 'Gift' },
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
  gift: [
    { value: 'decoration', label: 'Decoration' },
    { value: 'light', label: 'Light' },
    { value: 'accessory', label: 'Accessory' },
    { value: 'parts', label: 'Parts' },
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

export const REQUIRED_FIELDS = [
  'item_name',
  'cost_type',
  'category',
  'cost_date',
  'total_cost',
  'vendor'
];

export const FORM_DEFAULTS = {
  cost_type: 'acquisition',
  category: 'decoration',
  currency: 'USD',
  quantity: 1,
  unit_cost: 0,
  total_cost: 0,
  tax: 0,
  value: 0
};

// Validation Functions
export function validateCostRecord(record) {
  const errors = {};

  REQUIRED_FIELDS.forEach(field => {
    if (!record[field] || record[field].toString().trim() === '') {
      errors[field] = 'This field is required';
    }
  });

  // For non-gift cost types, total cost must be > 0
  if (record.cost_type !== 'gift') {
    if (record.total_cost !== undefined && record.total_cost <= 0) {
      errors.total_cost = 'Total cost must be greater than 0';
    }
  }

  if (record.quantity !== undefined && record.quantity <= 0) {
    errors.quantity = 'Quantity must be greater than 0';
  }

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

// Calculate value based on cost type
export function calculateValue(costType, totalCost, tax = 0) {
  if (costType === 'gift') {
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