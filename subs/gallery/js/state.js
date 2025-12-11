/**
 * Global State Management
 * Provides localStorage-backed state with event-based updates
 */

const STATE_KEY = 'spookydecs_admin_state';

// Default state structure
const DEFAULT_STATE = {
  currentTab: 'items',
  filters: {
    photo_type: 'catalog',
    season: 'all',
    class_type: 'all',
    year: 'all',
    tags: [],
    search: ''
  },
  pagination: {
    currentPage: 1,
    itemsPerPage: 20
  },
  photos: [],
  stats: {
    total: 0,
    christmas: 0,
    halloween: 0
  },
  selectedPhotos: [],
  items: {} // keyed by season: { christmas: [...], halloween: [...] }
};

// In-memory state cache
let stateCache = null;

/**
 * Load state from localStorage or return default
 */
function loadState() {
  if (stateCache) {
    return stateCache;
  }

  try {
    const stored = localStorage.getItem(STATE_KEY);
    if (stored) {
      stateCache = { ...DEFAULT_STATE, ...JSON.parse(stored) };
      return stateCache;
    }
  } catch (e) {
    console.warn('Failed to load state from localStorage:', e);
  }

  stateCache = { ...DEFAULT_STATE };
  return stateCache;
}

/**
 * Save state to localStorage
 */
function saveState(state) {
  stateCache = state;
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Failed to save state to localStorage:', e);
  }
}

/**
 * Get current state
 */
export function getState() {
  return loadState();
}

/**
 * Update state and emit change event
 * @param {Object|Function} updates - Object to merge or function that receives current state
 */
export function setState(updates) {
  const currentState = getState();
  
  const newState = typeof updates === 'function'
    ? updates(currentState)
    : { ...currentState, ...updates };

  saveState(newState);
  
  // Emit state change event
  window.dispatchEvent(new CustomEvent('stateChange', {
    detail: { state: newState, previous: currentState }
  }));
}

/**
 * Update specific filter
 * @param {string} key - Filter key
 * @param {*} value - Filter value
 */
export function setFilter(key, value) {
  setState(state => ({
    ...state,
    filters: {
      ...state.filters,
      [key]: value
    }
  }));
}

/**
 * Update multiple filters at once
 * @param {Object} filters - Filters to update
 */
export function setFilters(filters) {
  setState(state => ({
    ...state,
    filters: {
      ...state.filters,
      ...filters
    }
  }));
}

/**
 * Reset filters to default
 */
export function resetFilters() {
  setState(state => ({
    ...state,
    filters: { ...DEFAULT_STATE.filters }
  }));
}

/**
 * Update photos array
 * @param {Array} photos - Photos array
 */
export function setPhotos(photos) {
  setState({ photos: [...photos] }); // Create new array reference
}

/**
 * Update stats
 * @param {Object} stats - Stats object
 */
export function setStats(stats) {
  setState(state => ({
    ...state,
    stats: { ...state.stats, ...stats }
  }));
}

/**
 * Update items cache for a specific season
 * @param {string} season - Season name (christmas, halloween, etc)
 * @param {Array} items - Items array
 */
export function setItems(season, items) {
  setState(state => ({
    ...state,
    items: {
      ...state.items,
      [season.toLowerCase()]: items
    }
  }));
}

/**
 * Toggle photo selection
 * @param {string} photoId - Photo ID to toggle
 */
export function togglePhotoSelection(photoId) {
  setState(state => {
    const selected = state.selectedPhotos.includes(photoId)
      ? state.selectedPhotos.filter(id => id !== photoId)
      : [...state.selectedPhotos, photoId];
    
    return { ...state, selectedPhotos: selected };
  });
}

/**
 * Select multiple photos
 * @param {Array} photoIds - Array of photo IDs
 */
export function selectPhotos(photoIds) {
  setState(state => ({
    ...state,
    selectedPhotos: [...new Set([...state.selectedPhotos, ...photoIds])]
  }));
}

/**
 * Clear all selected photos
 */
export function clearSelection() {
  setState({ selectedPhotos: [] });
}

/**
 * Set current tab
 * @param {string} tab - Tab name
 */
export function setCurrentTab(tab) {
  setState({ currentTab: tab });
}

/**
 * Set current page
 * @param {number} page - Page number
 */
export function setPage(page) {
  setState(state => ({
    ...state,
    pagination: {
      ...state.pagination,
      currentPage: page
    }
  }));
}

/**
 * Reset pagination to page 1
 */
export function resetPagination() {
  setPage(1);
}

/**
 * Clear all state and reset to default
 */
export function clearState() {
  saveState(DEFAULT_STATE);
  window.dispatchEvent(new CustomEvent('stateChange', {
    detail: { state: DEFAULT_STATE, previous: getState() }
  }));
}

/**
 * Subscribe to state changes
 * @param {Function} callback - Callback function(state, previousState)
 * @returns {Function} Unsubscribe function
 */
export function subscribe(callback) {
  const handler = (event) => {
    callback(event.detail.state, event.detail.previous);
  };
  
  window.addEventListener('stateChange', handler);
  
  // Return unsubscribe function
  return () => window.removeEventListener('stateChange', handler);
}

/**
 * Subscribe to specific state changes (filtered by path)
 * @param {string} path - Dot notation path (e.g., 'filters.season')
 * @param {Function} callback - Callback function(newValue, oldValue)
 * @returns {Function} Unsubscribe function
 */
export function subscribeTo(path, callback) {
  const getValue = (obj, path) => {
    return path.split('.').reduce((acc, key) => acc?.[key], obj);
  };

  const handler = (event) => {
    const newValue = getValue(event.detail.state, path);
    const oldValue = getValue(event.detail.previous, path);
    
    if (newValue !== oldValue) {
      callback(newValue, oldValue);
    }
  };
  
  window.addEventListener('stateChange', handler);
  
  return () => window.removeEventListener('stateChange', handler);
}
