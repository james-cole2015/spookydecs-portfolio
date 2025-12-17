// Photos API Client
// Wrapper for photos Lambda endpoints and operations

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
 * Fetch a photo by ID
 * @param {string} photoId - Photo ID (e.g., "PHOTO-20251209-212532-6706a500")
 * @returns {Promise<Object|null>} Photo object or null if not found
 */
export async function fetchPhotoById(photoId) {
  try {
    const apiEndpoint = await getApiEndpoint();
    
    const response = await fetch(`${apiEndpoint}/images/${photoId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        return null; // Photo doesn't exist
      }
      throw new Error(`Failed to fetch photo: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error fetching photo ${photoId}:`, error);
    return null;
  }
}

/**
 * Fetch multiple photos by IDs
 * @param {Array<string>} photoIds - Array of photo IDs
 * @returns {Promise<Array>} Array of photo objects (nulls filtered out)
 */
export async function fetchPhotosByIds(photoIds) {
  if (!photoIds || photoIds.length === 0) {
    return [];
  }
  
  try {
    const promises = photoIds.map(id => fetchPhotoById(id));
    const results = await Promise.all(promises);
    
    // Filter out nulls (photos that don't exist)
    return results.filter(photo => photo !== null);
  } catch (error) {
    console.error('Error fetching photos:', error);
    return [];
  }
}

/**
 * Upload a photo file
 * @param {File} file - File object from input
 * @param {string} itemId - Item ID to associate with
 * @param {string} season - Season (halloween, christmas, shared)
 * @param {boolean} isPrimary - Whether this is the primary photo
 * @returns {Promise<Object>} Photo record with photo_id
 */
export async function uploadPhoto(file, itemId, season, isPrimary = false) {
  try {
    // Validate file
    if (!file || !(file instanceof File)) {
      throw new Error('Invalid file object');
    }
    
    const apiEndpoint = await getApiEndpoint();
    
    // Create FormData for file upload
    const formData = new FormData();
    formData.append('file', file);
    formData.append('item_id', itemId);
    formData.append('season', season.toLowerCase());
    formData.append('is_primary', isPrimary.toString());
    formData.append('photo_type', 'catalog');
    
    const response = await fetch(`${apiEndpoint}/images/upload`, {
      method: 'POST',
      body: formData
      // Don't set Content-Type header - browser will set it with boundary
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Upload failed: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error uploading photo:', error);
    throw error;
  }
}

/**
 * Upload multiple photos for an item
 * @param {Array<File>} files - Array of File objects
 * @param {string} itemId - Item ID
 * @param {string} season - Season
 * @returns {Promise<Array>} Array of photo records
 */
export async function uploadPhotos(files, itemId, season) {
  if (!files || files.length === 0) {
    return [];
  }
  
  try {
    // First photo is primary, rest are secondary
    const uploadPromises = files.map((file, index) => 
      uploadPhoto(file, itemId, season, index === 0)
    );
    
    return await Promise.all(uploadPromises);
  } catch (error) {
    console.error('Error uploading photos:', error);
    throw error;
  }
}

/**
 * Link a photo to an item
 * Updates the photo's item_ids array and optionally sets as primary photo
 * @param {string} photoId - Photo ID
 * @param {string} itemId - Item ID
 * @param {boolean} isPrimary - Set as item's primary photo
 * @returns {Promise<Object>} Updated photo record
 */
export async function linkPhotoToItem(photoId, itemId, isPrimary = false) {
  try {
    const apiEndpoint = await getApiEndpoint();
    
    const response = await fetch(`${apiEndpoint}/images/${photoId}/link`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        item_id: itemId,
        is_primary: isPrimary
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to link photo: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error linking photo to item:', error);
    throw error;
  }
}

/**
 * Unlink a photo from an item
 * Removes itemId from photo's item_ids array
 * @param {string} photoId - Photo ID
 * @param {string} itemId - Item ID
 * @returns {Promise<Object>} Updated photo record
 */
export async function unlinkPhotoFromItem(photoId, itemId) {
  try {
    const apiEndpoint = await getApiEndpoint();
    
    const response = await fetch(`${apiEndpoint}/images/${photoId}/unlink`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        item_id: itemId
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to unlink photo: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error unlinking photo from item:', error);
    throw error;
  }
}

/**
 * Delete a photo
 * @param {string} photoId - Photo ID
 * @returns {Promise<Object>} Delete confirmation
 */
export async function deletePhoto(photoId) {
  try {
    const apiEndpoint = await getApiEndpoint();
    
    const response = await fetch(`${apiEndpoint}/images/${photoId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to delete photo: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error deleting photo:', error);
    throw error;
  }
}

/**
 * Get all photos for an item
 * Fetches primary and secondary photos
 * @param {Object} item - Item object with images field
 * @returns {Promise<Object>} Object with { primary, secondary }
 */
export async function getPhotosForItem(item) {
  const result = {
    primary: null,
    secondary: []
  };
  
  if (!item || !item.images) {
    return result;
  }
  
  try {
    // Fetch primary photo
    if (item.images.primary_photo_id) {
      result.primary = await fetchPhotoById(item.images.primary_photo_id);
    }
    
    // Fetch secondary photos
    if (item.images.secondary_photo_ids && item.images.secondary_photo_ids.length > 0) {
      result.secondary = await fetchPhotosByIds(item.images.secondary_photo_ids);
    }
    
    return result;
  } catch (error) {
    console.error('Error getting photos for item:', error);
    return result;
  }
}

/**
 * Validate file before upload
 * @param {File} file - File to validate
 * @throws {Error} If file is invalid
 */
export function validateFile(file) {
  // Max file size: 10MB
  const MAX_SIZE = 10 * 1024 * 1024;
  
  if (file.size > MAX_SIZE) {
    throw new Error(`File too large. Maximum size is 10MB (file is ${(file.size / 1024 / 1024).toFixed(2)}MB)`);
  }
  
  // Allowed types
  const ALLOWED_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/heic',
    'image/heif'
  ];
  
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error(`Invalid file type. Allowed types: JPEG, PNG, HEIC, HEIF`);
  }
}