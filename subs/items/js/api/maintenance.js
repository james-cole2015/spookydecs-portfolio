// API Helper: maintenance.js

// --- Auth helpers ---

function getAuthToken() {
  const match = document.cookie.match(/(?:^|;\s*)spookydecs_auth=([^;]+)/);
  return match ? match[1] : null;
}

async function redirectToLogin() {
  const { AUTH_URL } = await window.SpookyConfig.get();
  console.warn('[items-api] 401 received — redirecting to login');
  window.location.href = `${AUTH_URL}?redirect=${encodeURIComponent(window.location.href)}`;
}

function buildHeaders(extra = {}) {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...extra
  };
}

async function getMaintenanceUrl() {
  const { MAINT_URL } = await window.SpookyConfig.get();
  if (!MAINT_URL) throw new Error('Maintenance URL not configured');
  return MAINT_URL;
}

export async function getMaintenanceRecords(itemId, limit = 5) {
  const { API_ENDPOINT } = await window.SpookyConfig.get();

  const params = new URLSearchParams({
    item_id: itemId,
    limit: limit.toString()
  });

  const url = `${API_ENDPOINT}/admin/maintenance-records?${params.toString()}`;
  console.log(`Fetching maintenance records from: ${url}`);

  const response = await fetch(url, {
    method: 'GET',
    headers: buildHeaders()
  });

  if (response.status === 401) { await redirectToLogin(); return null; }
  if (!response.ok) {
    if (response.status === 404) {
      console.log(`No maintenance records found for item: ${itemId}`);
      return [];
    }
    throw new Error(`API returned status ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();

  if (data.success && Array.isArray(data.data)) {
    return data.data.slice(0, limit);
  } else if (data.records && Array.isArray(data.records)) {
    return data.records.slice(0, limit);
  } else if (Array.isArray(data)) {
    return data.slice(0, limit);
  } else if (data.Items && Array.isArray(data.Items)) {
    return data.Items.slice(0, limit);
  }

  console.warn('Unexpected API response format:', data);
  return [];
}

export async function getMaintenancePageUrl(itemId) {
  const baseUrl = await getMaintenanceUrl();
  return `${baseUrl}/${itemId}`;
}

export { getMaintenanceUrl };