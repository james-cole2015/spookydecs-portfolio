// API client for maintenance records and items endpoints

const { getAuthToken, buildHeaders, redirectToLogin } = window.SpookyAuth;

async function getApiEndpoint() {
  const { API_ENDPOINT } = await window.SpookyConfig.get();
  return API_ENDPOINT;
}

async function handleResponse(response) {
  if (response.status === 401) {
    await redirectToLogin();
    return null;
  }
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
    headers: buildHeaders()
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
    { headers: buildHeaders() }
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
    { headers: buildHeaders() }
  );

  const json = await handleResponse(response);
  return json.data;
}

export async function createRecord(recordData) {
  const API_ENDPOINT = await getApiEndpoint();
  const response = await fetch(`${API_ENDPOINT}/admin/maintenance-records`, {
    method: 'POST',
    headers: buildHeaders(),
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
      headers: buildHeaders(),
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
      headers: buildHeaders()
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
      headers: buildHeaders(),
      body: JSON.stringify(inspectionData)
    }
  );

  const json = await handleResponse(response);
  return json.data;
}

// ============================================
// PERFORM REPAIR
// ============================================

export async function performRepair(recordId, repairData) {
  const API_ENDPOINT = await getApiEndpoint();
  const response = await fetch(
    `${API_ENDPOINT}/admin/maintenance-records/${encodeURIComponent(recordId)}/repair`,
    {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify(repairData)
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
    { headers: buildHeaders() }
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
    { headers: buildHeaders() }
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

  const response = await fetch(url, { headers: buildHeaders() });
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
  return `${ITEMS_ADMIN}/${itemId}`;
}

export async function getCostsUrl() {
  const { finance_url } = await window.SpookyConfig.get();
  return finance_url;
}

export async function fetchItemCosts(itemId) {
  const API_ENDPOINT = await getApiEndpoint();
  const response = await fetch(
    `${API_ENDPOINT}/finance/costs/item/${encodeURIComponent(itemId)}`,
    { headers: buildHeaders() }
  );
  const json = await handleResponse(response);
  return json; // { costs: [...], summary: {...}, count: N }
}

export async function fetchPhoto(photoId) {
  const API_ENDPOINT = await getApiEndpoint();
  const response = await fetch(
    `${API_ENDPOINT}/admin/images/${encodeURIComponent(photoId)}`,
    { headers: buildHeaders() }
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