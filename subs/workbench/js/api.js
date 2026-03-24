// Workbench API Module — read-only seasonal summary

// --- Auth helpers ---

function getAuthToken() {
  const match = document.cookie.match(/(?:^|;\s*)spookydecs_auth=([^;]+)/);
  return match ? match[1] : null;
}

async function redirectToLogin() {
  const { AUTH_URL } = await window.SpookyConfig.get();
  console.warn('[workbench-api] 401 received — redirecting to login');
  window.location.href = `${AUTH_URL}?redirect=${encodeURIComponent(window.location.href)}`;
}

function buildHeaders(extra = {}) {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...extra,
  };
}

async function apiCall(endpoint, options = {}) {
  const { API_ENDPOINT } = await window.SpookyConfig.get();
  const url = `${API_ENDPOINT}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: buildHeaders(options.headers),
  });

  if (response.status === 401) { await redirectToLogin(); return null; }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || error.message || `API Error: ${response.status}`);
  }

  const result = await response.json();
  return result.data || result;
}

/**
 * Returns the seasonal summary grouped by work bucket for the given year.
 * Shape: { off_season: { ideas, inspections, repairs, maintenance_tasks }, halloween: {...}, christmas: {...} }
 */
export async function getSeasonalSummary(year) {
  return apiCall(`/workbench/summary?year=${year}`);
}
