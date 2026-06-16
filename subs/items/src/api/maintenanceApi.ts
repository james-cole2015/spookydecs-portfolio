/**
 * Maintenance API client for items sub — typed port of api/maintenance.js (#332).
 * Framework-agnostic: calls window.SpookyConfig/window.SpookyAuth directly.
 */
import { type MaintenanceRecord } from './types';

function auth() { return window.SpookyAuth; }

async function getMaintenanceBaseUrl(): Promise<string> {
  const config = await window.SpookyConfig.get() as any;
  if (!config.MAINT_URL) throw new Error('Maintenance URL not configured');
  return config.MAINT_URL;
}

export async function getMaintenanceRecords(
  itemId: string,
  limit = 5,
): Promise<MaintenanceRecord[]> {
  const { API_ENDPOINT } = await window.SpookyConfig.get();
  const params = new URLSearchParams({ item_id: itemId, limit: String(limit) });
  const res = await fetch(`${API_ENDPOINT}/admin/maintenance-records?${params}`, {
    headers: auth().buildHeaders(),
  });
  if (res.status === 401) { await auth().redirectToLogin(); return []; }
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const records: MaintenanceRecord[] =
    data.success && Array.isArray(data.data) ? data.data :
    Array.isArray(data.records) ? data.records :
    Array.isArray(data) ? data :
    Array.isArray(data.Items) ? data.Items : [];
  return records.slice(0, limit);
}

export async function getMaintenancePageUrl(itemId: string): Promise<string> {
  const base = await getMaintenanceBaseUrl();
  return `${base}/${itemId}`;
}
