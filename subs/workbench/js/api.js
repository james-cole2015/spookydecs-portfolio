// Workbench API Module
// All API calls for workbench functionality

const HEADERS = { 'Content-Type': 'application/json' };

async function apiCall(endpoint, options = {}) {
  const { API_ENDPOINT } = await window.SpookyConfig.get();
  const url = `${API_ENDPOINT}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: { ...HEADERS, ...options.headers }
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || error.message || `API Error: ${response.status}`);
  }

  const result = await response.json();
  return result.data || result;
}

// ============ SEASON MANAGEMENT ============

export async function getSeasons() {
  return apiCall('/workbench/seasons');
}

export async function getSeason(seasonId) {
  return apiCall(`/workbench/seasons/${seasonId}`);
}

export async function createSeason(seasonData) {
  return apiCall('/workbench/seasons', {
    method: 'POST',
    body: JSON.stringify(seasonData)
  });
}

export async function updateSeason(seasonId, updates) {
  return apiCall(`/workbench/seasons/${seasonId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates)
  });
}

export async function endSeason(seasonId, dispositions) {
  return apiCall(`/workbench/seasons/${seasonId}/end-season`, {
    method: 'POST',
    body: JSON.stringify(dispositions)
  });
}

// ============ ITEM MANAGEMENT ============

export async function getSeasonItems(seasonId, filters = {}) {
  const queryParams = new URLSearchParams(filters).toString();
  const endpoint = `/workbench/seasons/${seasonId}/items${queryParams ? '?' + queryParams : ''}`;
  return apiCall(endpoint);
}

export async function getItem(seasonId, itemId) {
  return apiCall(`/workbench/seasons/${seasonId}/items/${itemId}`);
}

export async function createItem(seasonId, itemData) {
  return apiCall(`/workbench/seasons/${seasonId}/items`, {
    method: 'POST',
    body: JSON.stringify(itemData)
  });
}

export async function updateItem(seasonId, itemId, updates) {
  return apiCall(`/workbench/seasons/${seasonId}/items/${itemId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates)
  });
}

export async function deleteItem(seasonId, itemId) {
  return apiCall(`/workbench/seasons/${seasonId}/items/${itemId}`, {
    method: 'DELETE'
  });
}

export async function syncItemBack(seasonId, itemId) {
  return apiCall(`/workbench/seasons/${seasonId}/items/${itemId}/sync-back`, {
    method: 'POST'
  });
}

// ============ BULK OPERATIONS ============

export async function importItems(seasonId, importConfig) {
  return apiCall(`/workbench/seasons/${seasonId}/import`, {
    method: 'POST',
    body: JSON.stringify(importConfig)
  });
}

export async function bulkUpdateItems(seasonId, updates) {
  return apiCall(`/workbench/seasons/${seasonId}/items/bulk-update`, {
    method: 'POST',
    body: JSON.stringify(updates)
  });
}