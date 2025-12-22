// Items API Client
// Wrapper for items Lambda endpoints

let configCache = null;

// Load config from /config.json
async function loadConfig() {
  if (configCache) return configCache;
  
  try {
    const response = await fetch('/config.json');
    if (!response.ok) {
      throw new Error('Failed to load config');
    }
    configCache = await response.json();
    return configCache;
  } catch (error) {
    console.error('Failed to load config.json:', error);
    throw new Error('Configuration not loaded');
  }
}

// Get API endpoint from config
async function getApiEndpoint() {
  const config = await loadConfig();
  
  if (!config.API_ENDPOINT) {
    throw new Error('API_ENDPOINT not found in config');
  }
  
  return config.API_ENDPOINT;
}

/**
 * Get Storage subdomain URL from config
 * @returns {Promise<string>} Storage URL (e.g., "https://dev-storage.spookydecs.com")
 */
export async function getStorageUrl() {
  const config = await loadConfig();
  
  if (!config.STR_ADM_URL) {
    console.error('STR_ADM_URL not found in config');
    throw new Error('Storage URL not configured');
  }
  
  return config.STR_ADM_URL;
}

/**
 * Get Deployment subdomain URL from config
 * @returns {Promise<string>} Deployment URL (e.g., "https://dev-deployments.spookydecs.com")
 */
export async function getDeploymentUrl() {
  const config = await loadConfig();
  
  if (!config.DEPLOY_ADMIN_URL) {
    console.error('DEPLOY_ADMIN_URL not found in config');
    throw new Error('Deployment URL not configured');
  }
  
  return config.DEPLOY_ADMIN_URL;
}

/**
 * Fetch all items
 * @returns {Promise<Array>} Array of item objects
 */
export async function fetchAllItems() {
  try {
    const apiEndpoint = await getApiEndpoint();
    
    const response = await fetch(`${apiEndpoint}/items`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch items: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Handle different response formats (some APIs return { items: [...] })
    if (Array.isArray(data)) {
      return data;
    } else if (data.items && Array.isArray(data.items)) {
      return data.items;
    } else {
      console.error('Unexpected response format:', data);
      return [];
    }
  } catch (error) {
    console.error('Error fetching items:', error);
    throw error;
  }
}

/**
 * Fetch a single item by ID
 * @param {string} itemId - Item ID (e.g., "DEC-INF-ZERO-011")
 * @returns {Promise<Object>} Item object
 */
export async function fetchItemById(itemId) {
  try {
    const apiEndpoint = await getApiEndpoint();
    
    const response = await fetch(`${apiEndpoint}/items/${itemId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch item ${itemId}: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error fetching item ${itemId}:`, error);
    throw error;
  }
}

/**
 * Create a new item
 * @param {Object} itemData - Item data object
 * @returns {Promise<Object>} Created item with ID
 */
export async function createItem(itemData) {
  try {
    const apiEndpoint = await getApiEndpoint();
    
    console.log('Sending POST to:', `${apiEndpoint}/admin/items`);
    console.log('Request body:', JSON.stringify(itemData, null, 2));
    
    const response = await fetch(`${apiEndpoint}/admin/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(itemData)
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response body:', errorText);
      
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        errorData = { message: errorText };
      }
      
      throw new Error(errorData.message || `Failed to create item: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error creating item:', error);
    throw error;
  }
}

/**
 * Update an existing item
 * @param {string} itemId - Item ID
 * @param {Object} itemData - Updated item data (partial or full)
 * @returns {Promise<Object>} Updated item
 */
export async function updateItem(itemId, itemData) {
  try {
    const apiEndpoint = await getApiEndpoint();
    
    const response = await fetch(`${apiEndpoint}/items/${itemId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(itemData)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to update item: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error updating item ${itemId}:`, error);
    throw error;
  }
}

/**
 * Delete an item (hard delete)
 * @param {string} itemId - Item ID
 * @returns {Promise<Object>} Delete confirmation
 */
export async function deleteItem(itemId) {
  try {
    const apiEndpoint = await getApiEndpoint();
    
    const response = await fetch(`${apiEndpoint}/items/${itemId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to delete item: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error deleting item ${itemId}:`, error);
    throw error;
  }
}

/**
 * Retire an item (soft delete - updates status to "Retired")
 * @param {string} itemId - Item ID
 * @returns {Promise<Object>} Updated item
 */
export async function retireItem(itemId) {
  try {
    // Retire is just updating the status field
    return await updateItem(itemId, { status: 'Retired' });
  } catch (error) {
    console.error(`Error retiring item ${itemId}:`, error);
    throw error;
  }
}

/**
 * Bulk retire items
 * @param {Array<string>} itemIds - Array of item IDs
 * @returns {Promise<Array>} Array of results
 */
export async function bulkRetireItems(itemIds) {
  try {
    const promises = itemIds.map(id => retireItem(id));
    return await Promise.all(promises);
  } catch (error) {
    console.error('Error bulk retiring items:', error);
    throw error;
  }
}

/**
 * Bulk delete items
 * @param {Array<string>} itemIds - Array of item IDs
 * @returns {Promise<Array>} Array of results
 */
export async function bulkDeleteItems(itemIds) {
  try {
    const promises = itemIds.map(id => deleteItem(id));
    return await Promise.all(promises);
  } catch (error) {
    console.error('Error bulk deleting items:', error);
    throw error;
  }
}

/**
 * Bulk store items in a location
 * @param {Array<string>} itemIds - Array of item IDs
 * @param {string} location - Storage location
 * @returns {Promise<Object>} Store confirmation
 */
export async function bulkStore(itemIds, location) {
  try {
    const apiEndpoint = await getApiEndpoint();
    
    const response = await fetch(`${apiEndpoint}/items/bulk`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        item_ids: itemIds,
        location: location
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || errorData.message || `Failed to store items: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error bulk storing items:', error);
    throw error;
  }
}

// Create itemsAPI object for consistency with other subdomains
export const itemsAPI = {
  getAll: fetchAllItems,
  getById: fetchItemById,
  create: createItem,
  update: updateItem,
  delete: deleteItem,
  retire: retireItem,
  bulkRetire: bulkRetireItems,
  bulkDelete: bulkDeleteItems,
  bulkStore: bulkStore
};

// Export config loader for use in other modules
export { loadConfig };