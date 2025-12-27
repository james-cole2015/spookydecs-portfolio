/**
 * Storage API Client
 * 
 * Handles HTTP requests to the storage API endpoints
 * Used for fetching storage details when displaying photo relationships
 */

const getConfig = () => window.appConfig;

/**
 * Handle API response errors
 * @param {Response} response - Fetch response
 * @returns {Promise<Response>}
 */
async function handleResponse(response) {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Fetch a single storage container by ID
 * @param {string} storageId - Storage ID
 * @returns {Promise<Object>} Storage object
 */
export async function fetchStorageById(storageId) {
  const config = getConfig();
  const url = `${config.API_ENDPOINT}/storage/${storageId}`;
  
  console.log('Fetching storage:', storageId);
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  });
  
  return handleResponse(response);
}

/**
 * Fetch all storage containers with optional filters
 * @param {Object} filters - Filter parameters
 * @returns {Promise<Object>} API response with storage array
 */
export async function fetchStorage(filters = {}) {
  const config = getConfig();
  const params = new URLSearchParams(filters);
  const url = `${config.API_ENDPOINT}/storage${params.toString() ? '?' + params.toString() : ''}`;
  
  console.log('Fetching storage:', url);
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  });
  
  return handleResponse(response);
}

/**
 * Search storage containers by query string
 * @param {string} query - Search query
 * @param {Object} filters - Additional filters
 * @returns {Promise<Object[]>} Array of matching storage containers
 */
export async function searchStorage(query, filters = {}) {
  const allFilters = { ...filters, search: query };
  const response = await fetchStorage(allFilters);
  return response.storage || [];
}
