/**
 * Items API Client
 * 
 * Handles HTTP requests to the items API endpoints
 * Used for fetching item details when displaying photo relationships
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
 * Fetch a single item by ID
 * @param {string} itemId - Item ID
 * @returns {Promise<Object>} Item object
 */
export async function fetchItemById(itemId) {
  const config = getConfig();
  const url = `${config.API_ENDPOINT}/items/${itemId}`;
  
  console.log('Fetching item:', itemId);
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  });
  
  return handleResponse(response);
}

/**
 * Fetch multiple items by IDs
 * @param {string[]} itemIds - Array of item IDs
 * @returns {Promise<Object[]>} Array of item objects
 */
export async function fetchItemsByIds(itemIds) {
  if (!itemIds || itemIds.length === 0) {
    return [];
  }
  
  const promises = itemIds.map(id => 
    fetchItemById(id).catch(error => {
      console.error(`Error fetching item ${id}:`, error);
      return null;
    })
  );
  
  const results = await Promise.all(promises);
  return results.filter(item => item !== null);
}

/**
 * Fetch all items with optional filters
 * @param {Object} filters - Filter parameters
 * @returns {Promise<Object>} API response with items array
 */
export async function fetchItems(filters = {}) {
  const config = getConfig();
  const params = new URLSearchParams(filters);
  const url = `${config.API_ENDPOINT}/items${params.toString() ? '?' + params.toString() : ''}`;
  
  console.log('Fetching items:', url);
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  });
  
  return handleResponse(response);
}

/**
 * Search items by query string
 * @param {string} query - Search query
 * @param {Object} filters - Additional filters
 * @returns {Promise<Object[]>} Array of matching items
 */
export async function searchItems(query, filters = {}) {
  const allFilters = { ...filters, search: query };
  const response = await fetchItems(allFilters);
  return response.items || [];
}
