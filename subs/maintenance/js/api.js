// API client for maintenance and items endpoints

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