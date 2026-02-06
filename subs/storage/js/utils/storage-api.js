/**
 * Storage API Client
 * Handles all HTTP requests to the storage endpoints
 * Updated to handle standardized lambda_utils response format
 */

import STORAGE_CONFIG from './storage-config.js';

let config = null;

export async function loadConfig() {
  if (config) return config;
  
  try {
    const response = await fetch('/config.json');
    config = await response.json();
    
    // Also assign to window.CONFIG for CDN components to access
    window.CONFIG = config;
    
    return config;
  } catch (error) {
    console.error('Failed to load config:', error);
    throw new Error('Configuration not available');
  }
}

function getHeaders() {
  return {
    'Content-Type': 'application/json',
    'Origin': window.location.origin
  };
}

async function handleResponse(response) {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    // Handle standardized error format: { success: false, error: "...", details: {...} }
    const errorMessage = error.error || error.message || `HTTP ${response.status}`;
    const errorDetails = error.details || null;
    
    const err = new Error(errorMessage);
    err.details = errorDetails;
    err.statusCode = response.status;
    throw err;
  }
  return response.json();
}

/**
 * Storage API methods
 */
export const storageAPI = {
  /**
   * Get all storage units with optional filters
   */
  async getAll(filters = {}) {
    const cfg = await loadConfig();
    const params = new URLSearchParams();
    
    Object.keys(filters).forEach(key => {
      if (filters[key] && filters[key] !== 'All') {
        params.append(key, filters[key]);
      }
    });

    const queryString = params.toString();
    const url = queryString 
      ? `${cfg.API_ENDPOINT}${STORAGE_CONFIG.API.STORAGE}?${queryString}` 
      : `${cfg.API_ENDPOINT}${STORAGE_CONFIG.API.STORAGE}`;
    
    const response = await fetch(url, { headers: getHeaders() });
    const data = await handleResponse(response);
    
    // Handle standardized response format: { success: true, data: { storage_units: [...], count: N } }
    if (data.success && data.data) {
      return data.data.storage_units || [];
    }
    // Fallback for old format
    return data.storage_units || [];
  },

  /**
   * Get storage unit by ID
   */
  async getById(id) {
    const cfg = await loadConfig();
    const response = await fetch(
      `${cfg.API_ENDPOINT}${STORAGE_CONFIG.API.STORAGE_BY_ID(id)}`,
      { headers: getHeaders() }
    );
    const data = await handleResponse(response);
    
    // Handle standardized response format: { success: true, data: { storage_unit: {...} } }
    if (data.success && data.data && data.data.storage_unit) {
      return data.data.storage_unit;
    }
    // Fallback for old format
    return data.storage_unit || null;
  },

  /**
   * Create new tote
   */
  async createTote(data) {
    const cfg = await loadConfig();
    const response = await fetch(`${cfg.API_ENDPOINT}${STORAGE_CONFIG.API.STORAGE_TOTES}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    const result = await handleResponse(response);
    
    // Handle standardized response format: { success: true, data: { storage_unit: {...} } }
    if (result.success && result.data && result.data.storage_unit) {
      return result.data.storage_unit;
    }
    // Fallback for old format
    return result.storage_unit || null;
  },

  /**
   * Create new self-contained storage unit
   */
  async createSelf(data) {
    const cfg = await loadConfig();
    const response = await fetch(`${cfg.API_ENDPOINT}${STORAGE_CONFIG.API.STORAGE_SELF}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    const result = await handleResponse(response);
    
    // Handle standardized response format: { success: true, data: { storage_unit: {...} } }
    if (result.success && result.data && result.data.storage_unit) {
      return result.data.storage_unit;
    }
    // Fallback for old format
    return result.storage_unit || null;
  },

  /**
   * Update storage unit metadata
   */
  async update(id, data) {
    const cfg = await loadConfig();
    const response = await fetch(
      `${cfg.API_ENDPOINT}${STORAGE_CONFIG.API.STORAGE_BY_ID(id)}`,
      {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data)
      }
    );
    const result = await handleResponse(response);
    
    // Handle standardized response format: { success: true, data: { storage_unit: {...} } }
    if (result.success && result.data && result.data.storage_unit) {
      return result.data.storage_unit;
    }
    // Fallback for old format
    return result.storage_unit || null;
  },

  /**
   * Delete storage unit (must be empty)
   */
  async delete(id) {
    const cfg = await loadConfig();
    const response = await fetch(
      `${cfg.API_ENDPOINT}${STORAGE_CONFIG.API.STORAGE_BY_ID(id)}`,
      {
        method: 'DELETE',
        headers: getHeaders()
      }
    );
    const result = await handleResponse(response);
    
    // Handle standardized response format: { success: true, data: { id: "..." }, message: "..." }
    if (result.success) {
      return result;
    }
    // Fallback for old format
    return result;
  },

  /**
   * Add items to storage unit
   */
  async addItems(storageId, itemIds, markPacked = false) {
    const cfg = await loadConfig();
    const response = await fetch(
      `${cfg.API_ENDPOINT}${STORAGE_CONFIG.API.STORAGE_CONTENTS(storageId)}`,
      {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          item_ids: itemIds,
          mark_packed: markPacked
        })
      }
    );
    const result = await handleResponse(response);
    
    // Handle standardized response format: { success: true, data: { storage_id, items_added, total_contents, ... } }
    if (result.success && result.data) {
      return result.data;
    }
    // Fallback for old format (returns the data directly)
    return result;
  },

  /**
   * Remove items from storage unit
   */
  async removeItems(storageId, itemIds) {
    const cfg = await loadConfig();
    const response = await fetch(
      `${cfg.API_ENDPOINT}${STORAGE_CONFIG.API.STORAGE_CONTENTS(storageId)}`,
      {
        method: 'DELETE',
        headers: getHeaders(),
        body: JSON.stringify({
          item_ids: itemIds
        })
      }
    );
    const result = await handleResponse(response);
    
    // Handle standardized response format: { success: true, data: { storage_id, items_removed, remaining_contents } }
    if (result.success && result.data) {
      return result.data;
    }
    // Fallback for old format
    return result;
  },

  /**
   * Pack single-packed items (creates self-contained storage units)
   */
  async packSingleItems(itemIds, location) {
    const cfg = await loadConfig();
    const response = await fetch(`${cfg.API_ENDPOINT}/storage/pack-single`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        item_ids: itemIds,
        location: location
      })
    });
    const result = await handleResponse(response);
    
    // Handle standardized response format: { success: true, data: { units_created, location, storage_units: [...] } }
    if (result.success && result.data) {
      return result.data;
    }
    // Fallback for old format
    return result;
  },

};

/**
 * Items API methods (for fetching unpacked items)
 * Updated to handle standardized lambda_utils response format
 */
export const itemsAPI = {
  /**
   * Get all items with optional filters
   */
  async getAll(filters = {}) {
    const cfg = await loadConfig();
    const params = new URLSearchParams();
    
    Object.keys(filters).forEach(key => {
      if (filters[key]) {
        params.append(key, filters[key]);
      }
    });

    const queryString = params.toString();
    const url = queryString 
      ? `${cfg.API_ENDPOINT}${STORAGE_CONFIG.API.ITEMS}?${queryString}` 
      : `${cfg.API_ENDPOINT}${STORAGE_CONFIG.API.ITEMS}`;
    
    const response = await fetch(url, { headers: getHeaders() });
    const data = await handleResponse(response);
    
    // Handle standardized response format: { success: true, data: { items: [...] } }
    if (data.success && data.data && data.data.items) {
      return data.data.items;
    }
    // Fallback for old format
    return data.items || [];
  },

  /**
   * Get unpacked items (for packing workflow)
   */
  async getUnpacked(season = null) {
    const filters = { packing_status: 'false' };
    if (season) {
      filters.season = season;
    }
    return this.getAll(filters);
  },

  /**
   * Get item by ID
   */
  async getById(id) {
    const cfg = await loadConfig();
    const response = await fetch(
      `${cfg.API_ENDPOINT}${STORAGE_CONFIG.API.ITEMS_BY_ID(id)}`,
      { headers: getHeaders() }
    );
    const data = await handleResponse(response);
    
    // Handle standardized response format: { success: true, data: {...item...} }
    if (data.success && data.data) {
      return data.data;
    }
    // Fallback for old format
    else if (data.item) {
      return data.item;
    } else if (data.id) {
      return data;
    }
    
    return null;
  },

  /**
   * Bulk store items in a location
   */
  async bulkStore(itemIds, location) {
    const cfg = await loadConfig();
    const response = await fetch(`${cfg.API_ENDPOINT}/admin/items/bulk`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({
        item_ids: itemIds,
        location: location
      })
    });
    const data = await handleResponse(response);
    
    // Handle standardized response format: { success: true, data: { items_stored: N, ... } }
    if (data.success && data.data) {
      return data.data;
    }
    // Fallback for old format
    return data;
  }
};

/**
 * Photos API methods (for fetching photo details)
 */
export const photosAPI = {
  /**
   * Get photo details by ID
   */
  async getById(photoId) {
    if (!photoId) return null;
    
    const cfg = await loadConfig();
    
    try {
      const response = await fetch(
        `${cfg.API_ENDPOINT}/admin/images/${photoId}`,
        { headers: getHeaders() }
      );
      const data = await handleResponse(response);
      
      // Handle standardized response format if photos Lambda is updated
      if (data.success && data.data) {
        return data.data;
      }
      // Fallback for current format
      return data;
    } catch (error) {
      console.error(`Failed to fetch photo ${photoId}:`, error);
      return null;
    }
  },

  /**
   * Batch fetch multiple photos by IDs
   */
  async getByIds(photoIds) {
    if (!photoIds || photoIds.length === 0) return [];
    
    // Filter out null/undefined IDs
    const validIds = photoIds.filter(id => id);
    
    // Fetch all photos in parallel
    const photoPromises = validIds.map(id => 
      this.getById(id).catch(err => {
        console.warn(`Failed to fetch photo ${id}:`, err);
        return null;
      })
    );
    
    const photos = await Promise.all(photoPromises);
    
    // Return as a map for easy lookup: { photo_id: photo_data }
    const photoMap = {};
    photos.forEach((photo, index) => {
      if (photo) {
        photoMap[validIds[index]] = photo;
      }
    });
    
    return photoMap;
  }
};

export default { storageAPI, itemsAPI, photosAPI };