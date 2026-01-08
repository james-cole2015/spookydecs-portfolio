/**
 * Storage API Client
 * Handles all HTTP requests to the storage endpoints
 */

import STORAGE_CONFIG from './storage-config.js';

let config = null;

export async function loadConfig() {
  if (config) return config;
  
  try {
    const response = await fetch('/config.json');
    config = await response.json();
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
    throw new Error(error.error || `HTTP ${response.status}`);
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
    return data.storage_unit;
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
    return result.storage_unit;
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
    return result.storage_unit;
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
    return result.storage_unit;
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
    return handleResponse(response);
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
    return handleResponse(response);
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
    return handleResponse(response);
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
    return handleResponse(response);
  },

  /**
   * Upload photo for storage unit
   * @param {File} file - Image file
   * @param {string} storageUnitId - Storage unit ID
   * @param {string} season - Season (halloween, christmas, shared)
   * @returns {Promise<Object>} { photo_id, photo_url, thumb_cloudfront_url }
   */
  async uploadStoragePhoto(file, storageUnitId, season) {
    const cfg = await loadConfig();
    
    try {
      console.log('Starting storage photo upload:', { storageUnitId, season, fileName: file.name });
      
      // Step 1: Get presigned URL
      const presignResponse = await fetch(`${cfg.API_ENDPOINT}${STORAGE_CONFIG.API.IMAGES_PRESIGN}`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          context: 'storage',
          photo_type: 'storage',
          season: season.toLowerCase(),
          files: [{
            filename: file.name,
            content_type: file.type
          }],
          is_public: false
        })
      });
      
      const presignData = await handleResponse(presignResponse);
      console.log('Presign response:', presignData);
      
      // Response contains uploads array
      if (!presignData.uploads || presignData.uploads.length === 0) {
        throw new Error('No presigned URLs returned');
      }
      
      const upload = presignData.uploads[0];
      const { presigned_url, photo_id, cloudfront_url } = upload;

      // Step 2: Upload to S3
      console.log('Uploading to S3...');
      const s3Response = await fetch(presigned_url, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type
        }
      });

      if (!s3Response.ok) {
        throw new Error(`S3 upload failed: ${s3Response.status}`);
      }
      
      console.log('S3 upload successful');

      // Step 3: Confirm upload (triggers thumbnail generation)
      console.log('Confirming upload...');
      const confirmResponse = await fetch(`${cfg.API_ENDPOINT}/admin/images/confirm`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          context: 'storage',
          photo_type: 'storage',
          season: season.toLowerCase(),
          year: new Date().getFullYear(),
          is_public: false,
          is_visible: true,
          photos: [{
            cloudfront_url: cloudfront_url,
            thumb_cloudfront_url: upload.thumb_cloudfront_url,
            s3_key: upload.s3_key,
            thumb_s3_key: upload.thumb_s3_key,
            metadata: {
              original_filename: file.name,
              content_type: file.type,
              file_size: file.size,
              storage_unit_id: storageUnitId
            }
          }]
        })
      });
      
      const confirmData = await handleResponse(confirmResponse);
      console.log('Confirm response:', confirmData);

      const result = {
        photo_id: confirmData.photo_ids ? confirmData.photo_ids[0] : null,
        photo_url: cloudfront_url,
        thumb_cloudfront_url: upload.thumb_cloudfront_url
      };
      
      console.log('Photo upload complete:', result);
      
      return result;
    } catch (error) {
      console.error('Storage photo upload failed:', error);
      throw error;
    }
  }
};

/**
 * Items API methods (for fetching unpacked items)
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
    return data.item;
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
    return handleResponse(response);
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
      return handleResponse(response);
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