/**
 * URL State Management
 * 
 * Utilities for managing URL query parameters and state
 * Enables bookmarkable filters and pagination
 */

import { updateURL } from './router.js';

/**
 * Get all query parameters from current URL
 * @returns {Object} Key-value pairs of query parameters
 */
export function getQueryParams() {
  const params = new URLSearchParams(window.location.search);
  const result = {};
  
  for (const [key, value] of params.entries()) {
    result[key] = value;
  }
  
  return result;
}

/**
 * Get a specific query parameter
 * @param {string} key - Parameter name
 * @param {*} defaultValue - Default value if parameter not found
 * @returns {string|null}
 */
export function getQueryParam(key, defaultValue = null) {
  const params = new URLSearchParams(window.location.search);
  return params.get(key) || defaultValue;
}

/**
 * Set query parameters in URL without page reload
 * @param {Object} params - Parameters to set
 * @param {boolean} replace - Replace history instead of push
 */
export function setQueryParams(params, replace = false) {
  const currentParams = new URLSearchParams(window.location.search);
  
  // Update parameters
  Object.entries(params).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') {
      currentParams.delete(key);
    } else {
      currentParams.set(key, value);
    }
  });
  
  // Build new URL
  const newURL = `${window.location.pathname}${currentParams.toString() ? '?' + currentParams.toString() : ''}`;
  
  // Update URL
  if (replace) {
    window.history.replaceState({}, '', newURL);
  } else {
    updateURL(newURL);
  }
}

/**
 * Remove specific query parameters
 * @param {string|string[]} keys - Parameter key(s) to remove
 */
export function removeQueryParams(keys) {
  const params = new URLSearchParams(window.location.search);
  const keysArray = Array.isArray(keys) ? keys : [keys];
  
  keysArray.forEach(key => params.delete(key));
  
  const newURL = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
  updateURL(newURL);
}

/**
 * Clear all query parameters
 */
export function clearQueryParams() {
  updateURL(window.location.pathname);
}

/**
 * Get filters from URL query parameters
 * @returns {Object} Filter object
 */
export function getFiltersFromURL() {
  const params = getQueryParams();
  
  return {
    photo_type: params.photo_type || null,
    season: params.season || null,
    year: params.year || null,
    search: params.search || null,
    tags: params.tags || null,
    next_token: params.next_token || null
  };
}

/**
 * Update URL with filter parameters
 * @param {Object} filters - Filter object
 * @param {boolean} replace - Replace history instead of push
 */
export function updateFiltersInURL(filters, replace = false) {
  const params = {};
  
  // Only include non-null filter values
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      params[key] = value;
    }
  });
  
  setQueryParams(params, replace);
}

/**
 * Build API query string from filters
 * @param {Object} filters - Filter object
 * @returns {string} Query string (without leading ?)
 */
export function buildQueryString(filters) {
  const params = new URLSearchParams();
  
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      params.append(key, value);
    }
  });
  
  return params.toString();
}

/**
 * Parse pagination token from URL
 * @returns {string|null}
 */
export function getPaginationToken() {
  return getQueryParam('next_token');
}

/**
 * Update pagination token in URL
 * @param {string|null} token - Pagination token
 */
export function updatePaginationToken(token) {
  if (token) {
    setQueryParams({ next_token: token }, true); // Replace history
  } else {
    removeQueryParams('next_token');
  }
}

/**
 * Get current tab from URL or default
 * @param {string} defaultTab - Default tab if not in URL
 * @returns {string}
 */
export function getCurrentTab(defaultTab = 'gallery') {
  return getQueryParam('photo_type', defaultTab);
}

/**
 * Update current tab in URL
 * @param {string} tab - Tab name
 */
export function updateCurrentTab(tab) {
  // Clear pagination when changing tabs
  const currentFilters = getFiltersFromURL();
  
  updateFiltersInURL({
    ...currentFilters,
    photo_type: tab,
    next_token: null
  }, true);
}

/**
 * Get sort parameters from URL
 * @returns {Object} Sort configuration
 */
export function getSortFromURL() {
  const sortBy = getQueryParam('sort_by', 'upload_date');
  const sortOrder = getQueryParam('sort_order', 'desc');
  
  return { sortBy, sortOrder };
}

/**
 * Update sort parameters in URL
 * @param {string} sortBy - Field to sort by
 * @param {string} sortOrder - Sort order (asc/desc)
 */
export function updateSortInURL(sortBy, sortOrder) {
  setQueryParams({ sort_by: sortBy, sort_order: sortOrder }, true);
}
