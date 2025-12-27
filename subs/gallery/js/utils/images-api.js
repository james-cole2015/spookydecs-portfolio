/**
 * Images API Client
 * 
 * Handles all HTTP requests to the images API endpoints
 * Uses config.API_ENDPOINT from window.appConfig
 */

import { buildQueryString } from './state.js';

/**
 * Get config from global window object
 * @returns {Object} App configuration
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
 * Fetch images with optional filters
 * @param {Object} filters - Filter parameters
 * @returns {Promise<Object>} API response with photos array
 */
export async function fetchImages(filters = {}) {
  const config = getConfig();
  const queryString = buildQueryString(filters);
  const url = `${config.API_ENDPOINT}/admin/images${queryString ? '?' + queryString : ''}`;
  
  console.log('Fetching images:', url);
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  });
  
  return handleResponse(response);
}

/**
 * Fetch a single image by photo_id
 * @param {string} photoId - Photo ID
 * @returns {Promise<Object>} Photo object
 */
export async function fetchImageById(photoId) {
  const config = getConfig();
  const url = `${config.API_ENDPOINT}/admin/images/${photoId}`;
  
  console.log('Fetching image:', photoId);
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  });
  
  return handleResponse(response);
}

/**
 * Request presigned URLs for photo upload
 * @param {Object} uploadRequest - Upload request payload
 * @returns {Promise<Object>} Presigned URLs response
 */
export async function requestPresignedURLs(uploadRequest) {
  const config = getConfig();
  const url = `${config.API_ENDPOINT}/admin/images/presign`;
  
  console.log('Requesting presigned URLs:', uploadRequest);
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(uploadRequest)
  });
  
  return handleResponse(response);
}

/**
 * Upload file to S3 using presigned URL
 * @param {string} presignedUrl - Presigned URL
 * @param {File} file - File to upload
 * @param {string} contentType - Content type
 * @returns {Promise<Response>}
 */
export async function uploadToS3(presignedUrl, file, contentType) {
  console.log('Uploading to S3:', presignedUrl);
  
  const response = await fetch(presignedUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': contentType
    },
    body: file
  });
  
  if (!response.ok) {
    throw new Error(`S3 upload failed: ${response.status}`);
  }
  
  return response;
}

/**
 * Confirm photo upload and save metadata to DynamoDB
 * @param {Object} confirmRequest - Confirmation request payload
 * @returns {Promise<Object>} Confirmation response
 */
export async function confirmPhotoUpload(confirmRequest) {
  const config = getConfig();
  const url = `${config.API_ENDPOINT}/admin/images/confirm`;
  
  console.log('Confirming photo upload:', confirmRequest);
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(confirmRequest)
  });
  
  return handleResponse(response);
}

/**
 * Update photo metadata
 * @param {string} photoId - Photo ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated photo
 */
export async function updatePhoto(photoId, updates) {
  const config = getConfig();
  const url = `${config.API_ENDPOINT}/admin/images/${photoId}`;
  
  console.log('Updating photo:', photoId, updates);
  
  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(updates)
  });
  
  return handleResponse(response);
}

/**
 * Delete a photo
 * @param {string} photoId - Photo ID
 * @returns {Promise<Object>} Deletion confirmation
 */
export async function deletePhoto(photoId) {
  const config = getConfig();
  const url = `${config.API_ENDPOINT}/admin/images/${photoId}`;
  
  console.log('Deleting photo:', photoId);
  
  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json'
    }
  });
  
  return handleResponse(response);
}

/**
 * Get image statistics
 * @param {string} photoType - Optional photo type filter
 * @returns {Promise<Object>} Statistics object
 */
export async function fetchImageStats(photoType = null) {
  const config = getConfig();
  const queryString = photoType ? `?photo_type=${photoType}` : '';
  const url = `${config.API_ENDPOINT}/admin/images/stats${queryString}`;
  
  console.log('Fetching image stats');
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  });
  
  return handleResponse(response);
}

/**
 * Complete photo upload workflow
 * Handles: presign request -> S3 upload -> confirm
 * @param {Object} uploadData - Upload configuration
 * @param {File[]} files - Files to upload
 * @param {Function} progressCallback - Progress callback (optional)
 * @returns {Promise<Object>} Upload result
 */
export async function uploadPhotos(uploadData, files, progressCallback = null) {
  // Step 1: Request presigned URLs
  const presignRequest = {
    context: uploadData.context,
    photo_type: uploadData.photo_type,
    season: uploadData.season,
    item_ids: uploadData.item_ids || [],
    deployment_id: uploadData.deployment_id || null,
    idea_id: uploadData.idea_id || null,
    storage_id: uploadData.storage_id || null,
    is_public: uploadData.is_public || false,
    files: files.map(file => ({
      filename: file.name,
      content_type: file.type
    }))
  };
  
  const presignResponse = await requestPresignedURLs(presignRequest);
  
  if (progressCallback) {
    progressCallback({ stage: 'presign', progress: 25 });
  }
  
  // Step 2: Upload files to S3
  const uploadPromises = presignResponse.uploads.map(async (upload, index) => {
    const file = files[index];
    await uploadToS3(upload.presigned_url, file, upload.content_type);
    
    // Upload thumbnail if available (for future use)
    // Thumbnails are generated by Lambda, so we skip this for now
    
    return {
      s3_key: upload.s3_key,
      thumb_s3_key: upload.thumb_s3_key,
      cloudfront_url: upload.cloudfront_url,
      thumb_cloudfront_url: upload.thumb_cloudfront_url,
      metadata: {
        content_type: upload.content_type,
        file_size: file.size,
        original_filename: file.name
      }
    };
  });
  
  const uploadedPhotos = await Promise.all(uploadPromises);
  
  if (progressCallback) {
    progressCallback({ stage: 'upload', progress: 75 });
  }
  
  // Step 3: Confirm upload and save metadata
  const confirmRequest = {
    context: uploadData.context,
    photo_type: uploadData.photo_type,
    season: uploadData.season,
    year: uploadData.year || new Date().getFullYear(),
    item_ids: uploadData.item_ids || [],
    deployment_id: uploadData.deployment_id || null,
    idea_id: uploadData.idea_id || null,
    storage_id: uploadData.storage_id || null,
    is_public: uploadData.is_public || false,
    is_primary: uploadData.is_primary || false,
    is_visible: uploadData.is_visible !== false,
    caption: uploadData.caption || '',
    tags: uploadData.tags || [],
    display_order: uploadData.display_order || 0,
    photos: uploadedPhotos
  };
  
  const confirmResponse = await confirmPhotoUpload(confirmRequest);
  
  if (progressCallback) {
    progressCallback({ stage: 'confirm', progress: 100 });
  }
  
  return confirmResponse;
}
