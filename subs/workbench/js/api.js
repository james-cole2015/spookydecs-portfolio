// Workbench API Module — read-only seasonal summary

async function apiCall(endpoint, options = {}) {
  const { API_ENDPOINT } = await window.SpookyConfig.get();
  const url = `${API_ENDPOINT}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers }
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || error.message || `API Error: ${response.status}`);
  }

  const result = await response.json();
  return result.data || result;
}

/**
 * Returns the seasonal summary grouped by season key.
 * Shape: { halloween: { ideas, inspections, repairs, maintenance_tasks }, christmas: {...}, shared: {...} }
 */
export async function getSeasonalSummary() {
  return apiCall('/workbench/summary');
}
