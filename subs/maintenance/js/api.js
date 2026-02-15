// API client for maintenance records and items endpoints

const HEADERS = { 'Content-Type': 'application/json' };

async function getApiEndpoint() {
  const { API_ENDPOINT } = await window.SpookyConfig.get();
  return API_ENDPOINT;
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
  const API_ENDPOINT = await getApiEndpoint();
  const response = await fetch(`${API_ENDPOINT}/admin/maintenance-records`, {
    headers: HEADERS
  });

  const json = await handleResponse(response);
  return {
    records: json.data || [],
    count: json.data?.length || 0
  };
}

export async function fetchRecordsByItem(itemId) {
  const API_ENDPOINT = await getApiEndpoint();
  const response = await fetch(
    `${API_ENDPOINT}/admin/maintenance-records?item_id=${encodeURIComponent(itemId)}`,
    { headers: HEADERS }
  );

  const json = await handleResponse(response);
  return {
    records: json.data || [],
    count: json.data?.length || 0
  };
}

export async function fetchRecord(recordId) {
  const API_ENDPOINT = await getApiEndpoint();
  const response = await fetch(
    `${API_ENDPOINT}/admin/maintenance-records/${encodeURIComponent(recordId)}`,
    { headers: HEADERS }
  );

  const json = await handleResponse(response);
  return json.data;
}

export async function createRecord(recordData) {
  const API_ENDPOINT = await getApiEndpoint();
  const response = await fetch(`${API_ENDPOINT}/admin/maintenance-records`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify(recordData)
  });

  const json = await handleResponse(response);
  return json.data;
}

export async function updateRecord(recordId, recordData) {
  const API_ENDPOINT = await getApiEndpoint();
  const response = await fetch(
    `${API_ENDPOINT}/admin/maintenance-records/${encodeURIComponent(recordId)}`,
    {
      method: 'PUT',
      headers: HEADERS,
      body: JSON.stringify(recordData)
    }
  );

  const json = await handleResponse(response);
  return json.data;
}

export async function deleteRecord(recordId) {
  const API_ENDPOINT = await getApiEndpoint();
  const response = await fetch(
    `${API_ENDPOINT}/admin/maintenance-records/${encodeURIComponent(recordId)}`,
    {
      method: 'DELETE',
      headers: HEADERS
    }
  );

  const json = await handleResponse(response);
  return json.data.deleted_record;
}

// ============================================
// PERFORM INSPECTION
// ============================================

export async function performInspection(recordId, inspectionData) {
  const API_ENDPOINT = await getApiEndpoint();
  const response = await fetch(
    `${API_ENDPOINT}/admin/maintenance-records/${encodeURIComponent(recordId)}/inspect`,
    {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify(inspectionData)
    }
  );

  const json = await handleResponse(response);
  return json.data;
}

// ============================================
// ITEMS API
// ============================================

export async function fetchItem(itemId) {
  const API_ENDPOINT = await getApiEndpoint();
  const response = await fetch(
    `${API_ENDPOINT}/items/${encodeURIComponent(itemId)}`,
    { headers: HEADERS }
  );

  const json = await handleResponse(response);
  return json.data;
}

export async function searchItems(query) {
  if (!query || query.length < 2) {
    return { items: [] };
  }

  const API_ENDPOINT = await getApiEndpoint();
  const response = await fetch(
    `${API_ENDPOINT}/items?search=${encodeURIComponent(query)}`,
    { headers: HEADERS }
  );

  const json = await handleResponse(response);
  const items = json.data?.items || [];
  return { items: items.slice(0, 10) };
}

export async function fetchAllItems(filters = {}) {
  const API_ENDPOINT = await getApiEndpoint();

  const queryParams = new URLSearchParams();
  if (filters.class_type) queryParams.append('class_type', filters.class_type);
  if (filters.status) queryParams.append('status', filters.status);
  if (filters.enabled !== undefined) queryParams.append('enabled', filters.enabled);

  const queryString = queryParams.toString();
  const url = `${API_ENDPOINT}/items${queryString ? '?' + queryString : ''}`;

  const response = await fetch(url, { headers: HEADERS });
  const json = await handleResponse(response);
  return json.data?.items || [];
}

// ============================================
// BATCH OPERATIONS
// ============================================

export async function fetchMultipleRecordsByItems(itemIds) {
  const promises = itemIds.map(id =>
    fetchRecordsByItem(id).catch(err => {
      console.warn(`Failed to fetch records for ${id}:`, err);
      return { records: [], count: 0 };
    })
  );

  const results = await Promise.all(promises);
  const allRecords = results.flatMap(result => result.records || []);
  return { records: allRecords, count: allRecords.length };
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

export async function getItemUrl(itemId) {
  const { ITEMS_ADMIN } = await window.SpookyConfig.get();
  return `${ITEMS_ADMIN}/items/${itemId}`;
}

export async function getCostsUrl() {
  const { COSTS_URL } = await window.SpookyConfig.get();
  return COSTS_URL;
}

// ============================================
// PHOTO UPLOAD API
// ============================================

export async function getPresignedUrls(files, recordData) {
  const API_ENDPOINT = await getApiEndpoint();

  const photoTypeMap = {
    'repair': 'repair',
    'maintenance': 'maintenance',
    'inspection': 'inspection'
  };

  const requestBody = {
    context: 'maintenance',
    photo_type: photoTypeMap[recordData.record_type] || 'maintenance',
    season: recordData.season || 'shared',
    files: files.map(file => ({
      filename: file.name,
      content_type: file.type
    })),
    item_ids: [recordData.item_id]
  };

  const response = await fetch(`${API_ENDPOINT}/admin/images/presign`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify(requestBody)
  });

  return handleResponse(response);
}

export async function uploadToS3(file, presignedUrl) {
  const response = await fetch(presignedUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file
  });

  if (!response.ok) {
    throw new Error(`S3 upload failed: ${response.status}`);
  }
}

export async function confirmPhotoUpload(uploads, recordData, photoType) {
  const API_ENDPOINT = await getApiEndpoint();

  const requestBody = {
    context: 'maintenance',
    photo_type: photoType,
    season: recordData.season || 'shared',
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

  const response = await fetch(`${API_ENDPOINT}/admin/images/confirm`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify(requestBody)
  });

  const data = await handleResponse(response);
  return data.photo_ids.map(photo_id => ({ photo_id, photo_type: photoType }));
}

export async function fetchPhoto(photoId) {
  const API_ENDPOINT = await getApiEndpoint();
  const response = await fetch(
    `${API_ENDPOINT}/admin/images/${encodeURIComponent(photoId)}`,
    { headers: HEADERS }
  );

  return handleResponse(response);
}

export async function fetchMultiplePhotos(photoIds) {
  if (!photoIds || photoIds.length === 0) return [];

  const results = await Promise.all(
    photoIds.map(id =>
      fetchPhoto(id).catch(err => {
        console.warn(`Failed to fetch photo ${id}:`, err);
        return null;
      })
    )
  );

  return results.filter(photo => photo !== null);
}