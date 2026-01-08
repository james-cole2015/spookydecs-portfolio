/**
 * Storage API Client
 * Handles all HTTP requests to the storage endpoints
 */

import STORAGE_CONFIG from './storage-config.js';

// Get API base URL from config or environment
const getApiBase = () => {
  if (window.CONFIG && window.CONFIG.API_ENDPOINT) {
    return window.CONFIG.API_ENDPOINT;
  }
  return 'https://api.spookydecs.com';
};

const API_BASE = getApiBase();

/**
 * Generic fetch wrapper with error handling
 */
async function apiFetch(url, options = {}) {
  try {
    const response = await fetch(`${API_BASE}${url}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.message || 'API request failed');
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

/**
 * Storage API methods
 */
export const storageAPI = {
  /**
   * Get all storage units with optional filters
   */
  async getAll(filters = {}) {
    const params = new URLSearchParams();
    
    Object.keys(filters).forEach(key => {
      if (filters[key] && filters[key] !== 'All') {
        params.append(key, filters[key]);
      }
    });

    const queryString = params.toString();
    const url = queryString ? `${STORAGE_CONFIG.API.STORAGE}?${queryString}` : STORAGE_CONFIG.API.STORAGE;
    
    const response = await apiFetch(url);
    return response.storage_units || [];
  },

  /**
   * Get storage unit by ID
   */
  async getById(id) {
    const response = await apiFetch(STORAGE_CONFIG.API.STORAGE_BY_ID(id));
    return response.storage_unit;
  },

  /**
   * Create new tote
   */
  async createTote(data) {
    const response = await apiFetch(STORAGE_CONFIG.API.STORAGE_TOTES, {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return response.storage_unit;
  },

  /**
   * Create new self-contained storage unit
   */
  async createSelf(data) {
    const response = await apiFetch(STORAGE_CONFIG.API.STORAGE_SELF, {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return response.storage_unit;
  },

  /**
   * Update storage unit metadata
   */
  async update(id, data) {
    const response = await apiFetch(STORAGE_CONFIG.API.STORAGE_BY_ID(id), {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    return response.storage_unit;
  },

  /**
   * Delete storage unit (must be empty)
   */
  async delete(id) {
    const response = await apiFetch(STORAGE_CONFIG.API.STORAGE_BY_ID(id), {
      method: 'DELETE'
    });
    return response;
  },

  /**
   * Add items to storage unit
   */
  async addItems(storageId, itemIds, markPacked = false) {
    const response = await apiFetch(STORAGE_CONFIG.API.STORAGE_CONTENTS(storageId), {
      method: 'POST',
      body: JSON.stringify({
        item_ids: itemIds,
        mark_packed: markPacked
      })
    });
    return response;
  },

  /**
   * Remove items from storage unit
   */
  async removeItems(storageId, itemIds) {
    const response = await apiFetch(STORAGE_CONFIG.API.STORAGE_CONTENTS(storageId), {
      method: 'DELETE',
      body: JSON.stringify({
        item_ids: itemIds
      })
    });
    return response;
  },

  /**
   * Pack single-packed items (creates self-contained storage units)
   */
  async packSingleItems(itemIds, location) {
    const response = await apiFetch('/storage/pack-single', {
      method: 'POST',
      body: JSON.stringify({
        item_ids: itemIds,
        location: location
      })
    });
    return response;
  },

  /**
   * Upload photo for storage unit
   * @param {File} file - Image file
   * @param {string} storageUnitId - Storage unit ID
   * @param {string} season - Season (halloween, christmas, shared)
   * @returns {Promise<Object>} { photo_id, photo_url, thumb_cloudfront_url }
   */
  async uploadStoragePhoto(file, storageUnitId, season) {
    try {
      console.log('Starting storage photo upload:', { storageUnitId, season, fileName: file.name });
      
      // Step 1: Get presigned URL
      const presignResponse = await apiFetch(STORAGE_CONFIG.API.IMAGES_PRESIGN, {
        method: 'POST',
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
      
      console.log('Presign response:', presignResponse);
      
      // Response contains uploads array
      if (!presignResponse.uploads || presignResponse.uploads.length === 0) {
        throw new Error('No presigned URLs returned');
      }
      
      const upload = presignResponse.uploads[0];
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
      const confirmResponse = await apiFetch('/admin/images/confirm', {
        method: 'POST',
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
      
      console.log('Confirm response:', confirmResponse);

      const result = {
        photo_id: confirmResponse.photo_ids ? confirmResponse.photo_ids[0] : null,
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
    const params = new URLSearchParams();
    
    Object.keys(filters).forEach(key => {
      if (filters[key]) {
        params.append(key, filters[key]);
      }
    });

    const queryString = params.toString();
    const url = queryString ? `${STORAGE_CONFIG.API.ITEMS}?${queryString}` : STORAGE_CONFIG.API.ITEMS;
    
    const response = await apiFetch(url);
    return response.items || [];
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
    const response = await apiFetch(STORAGE_CONFIG.API.ITEMS_BY_ID(id));
    return response.item;
  },

  /**
   * Bulk store items in a location
   */
  async bulkStore(itemIds, location) {
    const response = await apiFetch('/admin/items/bulk', {
      method: 'PATCH',
      body: JSON.stringify({
        item_ids: itemIds,
        location: location
      })
    });
    return response;
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
    
    try {
      const response = await apiFetch(`/admin/images/${photoId}`);
      return response;
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
    const photoPromises = validIds.map(id => this.getById(id));
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