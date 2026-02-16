// API Helper: maintenance.js

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
    headers: { 'Content-Type': 'application/json' }
  });

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