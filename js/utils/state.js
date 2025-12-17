// State Management - URL params + localStorage
// Manages tab and filter state with persistence

const STORAGE_KEY = 'items-state';
const DEFAULT_TAB = 'decorations';

export function saveTabState(tab, filters) {
  // Build URL params
  const params = new URLSearchParams();
  params.set('tab', tab);
  
  // Add non-empty filters to URL
  Object.entries(filters).forEach(([key, value]) => {
    if (value && value !== '') {
      params.set(key, value);
    }
  });
  
  // Update URL without reload
  const newUrl = `${window.location.pathname}?${params.toString()}`;
  window.history.replaceState({}, '', newUrl);
  
  // Save to localStorage as backup
  const state = { tab, filters };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function restoreTabState() {
  const params = new URLSearchParams(window.location.search);
  
  // Try to restore from URL first
  if (params.has('tab')) {
    return {
      tab: params.get('tab'),
      filters: {
        search: params.get('search') || '',
        season: params.get('season') || '',
        class_type: params.get('class_type') || '',
        repair_status: params.get('repair_status') || '',
        status: params.get('status') || ''
      }
    };
  }
  
  // Fallback to localStorage
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.error('Failed to restore state from localStorage:', error);
  }
  
  // Default state
  return {
    tab: DEFAULT_TAB,
    filters: {
      search: '',
      season: '',
      class_type: '',
      repair_status: '',
      status: ''
    }
  };
}

export function clearTabState() {
  // Clear URL params
  window.history.replaceState({}, '', window.location.pathname);
  
  // Clear localStorage
  localStorage.removeItem(STORAGE_KEY);
}

// Tab to class mapping
const TAB_CLASS_MAP = {
  'decorations': 'Decoration',
  'lights': 'Light',
  'accessories': 'Accessory'
};

export function getFilteredItems(items, state) {
  if (!items || !Array.isArray(items)) {
    return [];
  }
  
  return items.filter(item => {
    // Tab filter (class)
    const expectedClass = TAB_CLASS_MAP[state.tab];
    if (item.class !== expectedClass) {
      return false;
    }
    
    // Search filter (short_name or id)
    if (state.filters.search) {
      const search = state.filters.search.toLowerCase();
      const matchesName = item.short_name?.toLowerCase().includes(search);
      const matchesId = item.id?.toLowerCase().includes(search);
      
      if (!matchesName && !matchesId) {
        return false;
      }
    }
    
    // Season filter
    if (state.filters.season && item.season !== state.filters.season) {
      return false;
    }
    
    // Class type filter
    if (state.filters.class_type && item.class_type !== state.filters.class_type) {
      return false;
    }
    
    // Repair status filter
    if (state.filters.repair_status) {
      const needsRepair = item.repair_status?.needs_repair === true;
      
      if (state.filters.repair_status === 'needs_repair' && !needsRepair) {
        return false;
      }
      
      if (state.filters.repair_status === 'operational' && needsRepair) {
        return false;
      }
    }
    
    // Status filter (Active/Retired)
    if (state.filters.status && item.status !== state.filters.status) {
      return false;
    }
    
    return true;
  });
}

export function getAvailableClassTypes(items, currentTab) {
  const expectedClass = TAB_CLASS_MAP[currentTab];
  
  // Get unique class types for current tab
  const classTypes = new Set();
  
  items.forEach(item => {
    if (item.class === expectedClass && item.class_type) {
      classTypes.add(item.class_type);
    }
  });
  
  return Array.from(classTypes).sort();
}
