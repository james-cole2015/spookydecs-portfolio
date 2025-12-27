// API client for maintenance records and items endpoints

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

// ============================================
// MAINTENANCE RECORDS API
// ============================================

export async function fetchAllRecords() {
  const cfg = await loadConfig();
  const response = await fetch(`${cfg.API_ENDPOINT}/admin/maintenance-records`, {
    headers: getHeaders()
  });
  
  return handleResponse(response);
}

export async function fetchRecordsByItem(itemId) {
  const cfg = await loadConfig();
  const response = await fetch(
    `${cfg.API_ENDPOINT}/admin/maintenance-records?item_id=${encodeURIComponent(itemId)}`,
    { headers: getHeaders() }
  );
  
  return handleResponse(response);
}

export async function fetchRecord(recordId) {
  const cfg = await loadConfig();
  const response = await fetch(
    `${cfg.API_ENDPOINT}/admin/maintenance-records/${encodeURIComponent(recordId)}`,
    { headers: getHeaders() }
  );
  
  const data = await handleResponse(response);
  return data.record;
}

export async function createRecord(recordData) {
  const cfg = await loadConfig();
  const response = await fetch(`${cfg.API_ENDPOINT}/admin/maintenance-records`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(recordData)
  });
  
  const data = await handleResponse(response);
  return data.record;
}

export async function updateRecord(recordId, recordData) {
  const cfg = await loadConfig();
  const response = await fetch(
    `${cfg.API_ENDPOINT}/admin/maintenance-records/${encodeURIComponent(recordId)}`,
    {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(recordData)
    }
  );
  
  const data = await handleResponse(response);
  return data.record;
}

export async function deleteRecord(recordId) {
  const cfg = await loadConfig();
  const response = await fetch(
    `${cfg.API_ENDPOINT}/admin/maintenance-records/${encodeURIComponent(recordId)}`,
    {
      method: 'DELETE',
      headers: getHeaders()
    }
  );
  
  return handleResponse(response);
}

// ============================================
// ITEMS API
// ============================================

export async function fetchItem(itemId) {
  const cfg = await loadConfig();
  const response = await fetch(
    `${cfg.API_ENDPOINT}/items/${encodeURIComponent(itemId)}`,
    { headers: getHeaders() }
  );
  
  return handleResponse(response);
}

export async function searchItems(query) {
  const cfg = await loadConfig();
  
  if (!query || query.length < 2) {
    return { items: [] };
  }
  
  const response = await fetch(
    `${cfg.API_ENDPOINT}/items?search=${encodeURIComponent(query)}`,
    { headers: getHeaders() }
  );
  
  const data = await handleResponse(response);
  // Limit to 10 results
  return {
    items: (data.items || []).slice(0, 10)
  };
}

// ============================================
// BATCH OPERATIONS
// ============================================

export async function fetchMultipleRecordsByItems(itemIds) {
  // Fetch records for multiple items in parallel
  const promises = itemIds.map(id => 
    fetchRecordsByItem(id).catch(err => {
      console.warn(`Failed to fetch records for ${id}:`, err);
      return { records: [] };
    })
  );
  
  const results = await Promise.all(promises);
  
  // Flatten all records
  const allRecords = results.flatMap(result => result.records || []);
  return { records: allRecords, count: allRecords.length };
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

export function getItemUrl(itemId) {
  if (!config) return '#';
  return `${config.ITEMS_ADMIN}/items/${itemId}`;
}

export function getCostsUrl() {
  if (!config) return '#';
  return config.COSTS_URL;
}

// ============================================
// PHOTO UPLOAD API
// ============================================

/**
 * Get presigned URLs for photo uploads
 * @param {File[]} files - Array of File objects to upload
 * @param {Object} recordData - Record data for context (season, item_id, etc.)
 * @returns {Promise<Object>} Presigned URLs and metadata
 */
export async function getPresignedUrls(files, recordData) {
  const cfg = await loadConfig();
  
  // Determine photo_type based on record_type
  const photoTypeMap = {
    'repair': 'repair',
    'maintenance': 'maintenance',
    'inspection': 'inspection'
  };
  
  const photo_type = photoTypeMap[recordData.record_type] || 'maintenance';
  
  // Infer season from record data (you may need to adjust this logic)
  const season = recordData.season || 'shared';
  
  // Prepare files metadata
  const filesMetadata = files.map(file => ({
    filename: file.name,
    content_type: file.type
  }));
  
  const requestBody = {
    context: 'maintenance',
    photo_type: photo_type,
    season: season,
    files: filesMetadata,
    item_ids: [recordData.item_id]
  };
  
  const response = await fetch(`${cfg.API_ENDPOINT}/admin/images/presign`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(requestBody)
  });
  
  return handleResponse(response);
}

/**
 * Upload file to S3 using presigned URL
 * @param {File} file - File to upload
 * @param {string} presignedUrl - Presigned URL from API
 * @returns {Promise<void>}
 */
export async function uploadToS3(file, presignedUrl) {
  const response = await fetch(presignedUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type
    },
    body: file
  });
  
  if (!response.ok) {
    throw new Error(`S3 upload failed: ${response.status}`);
  }
}

/**
 * Confirm photo uploads and create DynamoDB records
 * @param {Array} uploads - Upload metadata from presign response
 * @param {Object} recordData - Record data for context
 * @param {string} photoType - Type of photo (maintenance, repair, inspection)
 * @returns {Promise<Array>} Array of {photo_id, photo_type} objects
 */
export async function confirmPhotoUpload(uploads, recordData, photoType) {
  const cfg = await loadConfig();
  
  // Determine season
  const season = recordData.season || 'shared';
  
  const requestBody = {
    context: 'maintenance',
    photo_type: photoType,
    season: season,
    year: new Date().getFullYear(),
    item_ids: [recordData.item_id],
    is_public: false,
    is_visible: true,
    photos: uploads.map(upload => ({
      cloudfront_url: upload.cloudfront_url,
      thumb_cloudfront_url: upload.thumb_cloudfront_url,
      s3_key: upload.s3_key,
      thumb_s3_key: upload.thumb_s3_key,
      metadata: {
        original_filename: upload.original_filename,
        content_type: upload.content_type
      }
    }))
  };
  
  const response = await fetch(`${cfg.API_ENDPOINT}/admin/images/confirm`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(requestBody)
  });
  
  const data = await handleResponse(response);
  
  // Return array of {photo_id, photo_type} objects
  return data.photo_ids.map(photo_id => ({
    photo_id: photo_id,
    photo_type: photoType
  }));
}

/**
 * Fetch photo metadata by photo_id
 * @param {string} photoId - Photo ID to fetch
 * @returns {Promise<Object>} Photo object with URLs and metadata
 */
export async function fetchPhoto(photoId) {
  const cfg = await loadConfig();
  
  const response = await fetch(
    `${cfg.API_ENDPOINT}/admin/images/${encodeURIComponent(photoId)}`,
    { headers: getHeaders() }
  );
  
  return handleResponse(response);
}

/**
 * Fetch multiple photos by IDs
 * @param {string[]} photoIds - Array of photo IDs
 * @returns {Promise<Array>} Array of photo objects
 */
export async function fetchMultiplePhotos(photoIds) {
  if (!photoIds || photoIds.length === 0) {
    return [];
  }
  
  const promises = photoIds.map(id => 
    fetchPhoto(id).catch(err => {
      console.warn(`Failed to fetch photo ${id}:`, err);
      return null;
    })
  );
  
  const results = await Promise.all(promises);
  
  // Filter out nulls (failed fetches)
  return results.filter(photo => photo !== null);
}