/**
 * URL State Management
 * Handles reading and writing state to URL parameters for filter persistence
 */

/**
 * Get all URL parameters as an object
 */
export function getUrlParams() {
  const params = new URLSearchParams(window.location.search);
  const result = {};
  
  for (const [key, value] of params) {
    result[key] = value;
  }
  
  return result;
}

/**
 * Get a specific URL parameter
 */
export function getUrlParam(key, defaultValue = null) {
  const params = new URLSearchParams(window.location.search);
  return params.get(key) || defaultValue;
}

/**
 * Set URL parameters without page reload
 */
export function setUrlParams(params, replace = false) {
  const url = new URL(window.location);
  
  // Update or add parameters
  Object.keys(params).forEach(key => {
    if (params[key] === null || params[key] === undefined || params[key] === '') {
      url.searchParams.delete(key);
    } else {
      url.searchParams.set(key, params[key]);
    }
  });
  
  // Update URL without reload
  if (replace) {
    window.history.replaceState({}, '', url);
  } else {
    window.history.pushState({}, '', url);
  }
}

/**
 * Update a single URL parameter
 */
export function setUrlParam(key, value, replace = false) {
  setUrlParams({ [key]: value }, replace);
}

/**
 * Remove URL parameters
 */
export function removeUrlParams(keys) {
  const params = {};
  keys.forEach(key => {
    params[key] = null;
  });
  setUrlParams(params, true);
}

/**
 * Clear all URL parameters
 */
export function clearUrlParams() {
  const url = new URL(window.location);
  url.search = '';
  window.history.replaceState({}, '', url);
}

/**
 * Get filters from URL for storage list
 */
export function getFiltersFromUrl() {
  const params = getUrlParams();
  
  return {
    season: params.season || 'All',
    location: params.location || 'All',
    class_type: params.class_type || 'All',
    packed: params.packed || 'All',
    size: params.size || 'All',
    search: params.search || ''
  };
}

/**
 * Save filters to URL
 */
export function saveFiltersToUrl(filters) {
  const params = {};
  
  Object.keys(filters).forEach(key => {
    if (filters[key] && filters[key] !== 'All' && filters[key] !== '') {
      params[key] = filters[key];
    }
  });
  
  setUrlParams(params, true);
}

/**
 * Get active tab from URL
 */
export function getActiveTab() {
  return getUrlParam('tab', 'All');
}

/**
 * Set active tab in URL
 */
export function setActiveTab(tab) {
  setUrlParam('tab', tab, true);
}

/**
 * Build query string from filters
 */
export function buildQueryString(filters) {
  const params = new URLSearchParams();
  
  Object.keys(filters).forEach(key => {
    if (filters[key] && filters[key] !== 'All' && filters[key] !== '') {
      params.append(key, filters[key]);
    }
  });
  
  return params.toString();
}

export default {
  getUrlParams,
  getUrlParam,
  setUrlParams,
  setUrlParam,
  removeUrlParams,
  clearUrlParams,
  getFiltersFromUrl,
  saveFiltersToUrl,
  getActiveTab,
  setActiveTab,
  buildQueryString
};
