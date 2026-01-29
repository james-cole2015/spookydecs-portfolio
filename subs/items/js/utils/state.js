// URL State Management
// Syncs filters and view state with URL query parameters

/**
 * Get current URL parameters as object
 */
export function getUrlParams() {
  const params = new URLSearchParams(window.location.search);
  const obj = {};
  
  for (const [key, value] of params) {
    obj[key] = value;
  }
  
  return obj;
}

/**
 * Update URL parameters without page reload
 */
export function updateUrlParams(params, replaceState = false) {
  const url = new URL(window.location);
  
  Object.keys(params).forEach(key => {
    if (params[key] === null || params[key] === '' || params[key] === undefined) {
      url.searchParams.delete(key);
    } else {
      url.searchParams.set(key, params[key]);
    }
  });
  
  if (replaceState) {
    window.history.replaceState({}, '', url);
  } else {
    window.history.pushState({}, '', url);
  }
}

/**
 * Clear all URL parameters
 */
export function clearUrlParams() {
  const url = new URL(window.location);
  url.search = '';
  window.history.pushState({}, '', url);
}

/**
 * Get single URL parameter
 */
export function getUrlParam(key, defaultValue = null) {
  const params = new URLSearchParams(window.location.search);
  return params.get(key) || defaultValue;
}

/**
 * Set single URL parameter
 */
export function setUrlParam(key, value, replaceState = false) {
  updateUrlParams({ [key]: value }, replaceState);
}

/**
 * Remove single URL parameter
 */
export function removeUrlParam(key) {
  updateUrlParams({ [key]: null });
}