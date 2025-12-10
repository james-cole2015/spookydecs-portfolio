/**
 * API Client
 * Handles all API calls to Lambda endpoints with automatic config loading
 */

let apiConfig = null;

/**
 * Load API configuration from /config.json
 */
async function loadConfig() {
  if (apiConfig) {
    return apiConfig;
  }

  console.log('[API] Loading config.json...');
  
  try {
    const response = await fetch('/config.json');
    if (!response.ok) {
      console.error('[API] Config load failed:', response.status);
      throw new Error(`Failed to load config: ${response.status}`);
    }
    apiConfig = await response.json();
    console.log('[API] ✓ Config loaded');
    return apiConfig;
  } catch (error) {
    console.error('[API] Config loading error:', error);
    throw new Error(`Config loading error: ${error.message}`);
  }
}

/**
 * Get API base URL
 */
async function getApiUrl() {
  const config = await loadConfig();
  return config.apiUrl || config.API_URL;
}

/**
 * Make authenticated API request
 * @param {string} endpoint - API endpoint path
 * @param {Object} options - Fetch options
 */
async function apiRequest(endpoint, options = {}) {
  const baseUrl = await getApiUrl();
  const url = `${baseUrl}${endpoint}`;

  const defaultHeaders = {
    'Content-Type': 'application/json',
  };

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);
    
    // Parse response
    let data;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    // Handle errors
    if (!response.ok) {
      const errorMessage = data.error || data.message || `HTTP ${response.status}`;
      throw new Error(errorMessage);
    }

    return data;
  } catch (error) {
    // Enhance error with more context
    if (error.message.includes('Failed to fetch')) {
      throw new Error('Network error: Unable to reach API');
    }
    throw error;
  }
}

/**
 * Fetch photos with optional filters
 * @param {Object} filters - Filter parameters
 * @returns {Promise<Array>} Array of photos
 */
export async function fetchPhotos(filters = {}) {
  try {
    // Build query string from filters
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== 'all' && value !== '') {
        if (Array.isArray(value)) {
          // Handle array values (tags)
          if (value.length > 0) {
            params.append(key, value.join(','));
          }
        } else {
          params.append(key, value);
        }
      }
    });

    const queryString = params.toString();
    const endpoint = `/admin/images${queryString ? `?${queryString}` : ''}`;
    
    const data = await apiRequest(endpoint, { method: 'GET' });
    
    // Lambda returns raw array or might return { photos: [] }
    return Array.isArray(data) ? data : (data.photos || []);
  } catch (error) {
    console.error('fetchPhotos error:', error);
    throw new Error(`Failed to fetch photos: ${error.message}`);
  }
}

/**
 * Fetch statistics for a specific photo type
 * @param {string} photo_type - Photo type ('all', 'christmas', 'halloween')
 * @returns {Promise<Object>} Stats object
 */
export async function fetchStats(photo_type = 'all') {
  try {
    const endpoint = `/admin/images/stats${photo_type !== 'all' ? `?photo_type=${photo_type}` : ''}`;
    const data = await apiRequest(endpoint, { method: 'GET' });
    
    return data;
  } catch (error) {
    console.error('fetchStats error:', error);
    throw new Error(`Failed to fetch stats: ${error.message}`);
  }
}

/**
 * Fetch items for a specific season
 * @param {string} season - Season name (christmas, halloween, etc)
 * @returns {Promise<Array>} Array of items
 */
export async function fetchItems(season) {
  try {
    if (!season || season === 'all') {
      throw new Error('Season parameter is required');
    }

    const endpoint = `/admin/items?season=${season.toLowerCase()}`;
    const data = await apiRequest(endpoint, { method: 'GET' });
    
    // Return raw array or extract from wrapper
    return Array.isArray(data) ? data : (data.items || []);
  } catch (error) {
    console.error('fetchItems error:', error);
    throw new Error(`Failed to fetch items for ${season}: ${error.message}`);
  }
}

/**
 * Update a photo's metadata
 * @param {string} photoId - Photo ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated photo object
 */
export async function updatePhoto(photoId, updates) {
  try {
    if (!photoId) {
      throw new Error('Photo ID is required');
    }

    const endpoint = `/admin/images`;
    const data = await apiRequest(endpoint, {
      method: 'PUT',
      body: JSON.stringify({
        photo_id: photoId,
        ...updates
      })
    });
    
    return data;
  } catch (error) {
    console.error('updatePhoto error:', error);
    throw new Error(`Failed to update photo ${photoId}: ${error.message}`);
  }
}

/**
 * Smart tag photos using Claude Vision API
 * Supports both single photo and batch processing
 * @param {string|Array} photoIdOrIds - Single photo ID or array of photo IDs
 * @returns {Promise<Object|Array>} Tag results
 */
export async function smartTag(photoIdOrIds) {
  try {
    const isBatch = Array.isArray(photoIdOrIds);
    
    if (isBatch && photoIdOrIds.length === 0) {
      throw new Error('Photo IDs array cannot be empty');
    }

    const endpoint = `/admin/images/smart-tag`;
    
    // Single photo mode
    if (!isBatch) {
      const data = await apiRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify({ photo_id: photoIdOrIds })
      });
      
      return data;
    }
    
    // Batch mode (limit to 10 per Lambda constraint)
    const photoIds = photoIdOrIds.slice(0, 10);
    
    if (photoIds.length < photoIdOrIds.length) {
      console.warn(`Smart tag limited to first 10 photos (${photoIdOrIds.length} requested)`);
    }

    const data = await apiRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify({ photo_ids: photoIds })
    });
    
    // Lambda returns { results: [...] } for batch
    return data.results || data;
    
  } catch (error) {
    console.error('smartTag error:', error);
    const photoCount = Array.isArray(photoIdOrIds) ? photoIdOrIds.length : 1;
    throw new Error(`Failed to smart tag ${photoCount} photo(s): ${error.message}`);
  }
}

/**
 * Upload a new photo with metadata
 * @param {File} file - File object from input
 * @param {Object} metadata - Photo metadata
 * @returns {Promise<Object>} Upload result
 */
export async function uploadPhoto(file, metadata = {}) {
  try {
    if (!file) {
      throw new Error('File is required');
    }

    // Create FormData for multipart upload
    const formData = new FormData();
    formData.append('file', file);
    
    // Add metadata fields
    Object.entries(metadata).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        formData.append(key, typeof value === 'object' ? JSON.stringify(value) : value);
      }
    });

    const baseUrl = await getApiUrl();
    const url = `${baseUrl}/admin/images`;

    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      // Don't set Content-Type - browser will set it with boundary
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(error.error || error.message || `HTTP ${response.status}`);
    }

    return await response.json();
    
  } catch (error) {
    console.error('uploadPhoto error:', error);
    throw new Error(`Failed to upload photo: ${error.message}`);
  }
}

/**
 * Delete a photo
 * @param {string} photoId - Photo ID to delete
 * @returns {Promise<Object>} Delete result
 */
export async function deletePhoto(photoId) {
  try {
    if (!photoId) {
      throw new Error('Photo ID is required');
    }

    const endpoint = `/admin/images`;
    const data = await apiRequest(endpoint, {
      method: 'DELETE',
      body: JSON.stringify({ photo_id: photoId })
    });
    
    return data;
  } catch (error) {
    console.error('deletePhoto error:', error);
    throw new Error(`Failed to delete photo ${photoId}: ${error.message}`);
  }
}

/**
 * Batch delete photos
 * @param {Array} photoIds - Array of photo IDs
 * @returns {Promise<Object>} Delete results
 */
export async function deletePhotos(photoIds) {
  try {
    if (!Array.isArray(photoIds) || photoIds.length === 0) {
      throw new Error('Photo IDs array is required');
    }

    const endpoint = `/admin/images/batch`;
    const data = await apiRequest(endpoint, {
      method: 'DELETE',
      body: JSON.stringify({ photo_ids: photoIds })
    });
    
    return data;
  } catch (error) {
    console.error('deletePhotos error:', error);
    throw new Error(`Failed to delete ${photoIds.length} photos: ${error.message}`);
  }
}