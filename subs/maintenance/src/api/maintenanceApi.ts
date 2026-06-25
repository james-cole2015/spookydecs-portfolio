/**
 * Maintenance API client — typed port of the vanilla js/api.js + js/scheduleApi.js.
 *
 * Framework-agnostic: calls `window.SpookyConfig`/`window.SpookyAuth` directly
 * (SpookyConfig.get() is cached, and ConfigProvider warms it at boot). The
 * `data`-unwrapping and 401→redirect behavior are preserved exactly from the
 * originals. All endpoints are unchanged.
 */
import type {
  MaintenanceRecord,
  ScheduleTemplate,
  Item,
  ItemCosts,
} from '../config/maintenanceConfig';

function auth() {
  return window.SpookyAuth;
}

async function getApiEndpoint(): Promise<string> {
  const { API_ENDPOINT } = await window.SpookyConfig.get();
  return API_ENDPOINT;
}

async function handleResponse(response: Response): Promise<any> {
  if (response.status === 401) {
    await auth().redirectToLogin();
    return null;
  }
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }
  return response.json();
}

export interface RecordsResult {
  records: MaintenanceRecord[];
  count: number;
}

export interface ItemFilters {
  class_type?: string;
  status?: string;
  enabled?: boolean | string;
}

// ============================================
// MAINTENANCE RECORDS API
// ============================================

export const recordsAPI = {
  async getAll(): Promise<RecordsResult> {
    const API_ENDPOINT = await getApiEndpoint();
    const response = await fetch(`${API_ENDPOINT}/admin/maintenance-records`, {
      headers: auth().buildHeaders(),
    });
    const json = await handleResponse(response);
    return { records: json.data || [], count: json.data?.length || 0 };
  },

  async getByItem(itemId: string): Promise<RecordsResult> {
    const API_ENDPOINT = await getApiEndpoint();
    const response = await fetch(
      `${API_ENDPOINT}/admin/maintenance-records?item_id=${encodeURIComponent(itemId)}`,
      { headers: auth().buildHeaders() },
    );
    const json = await handleResponse(response);
    return { records: json.data || [], count: json.data?.length || 0 };
  },

  async getById(recordId: string): Promise<MaintenanceRecord> {
    const API_ENDPOINT = await getApiEndpoint();
    const response = await fetch(
      `${API_ENDPOINT}/admin/maintenance-records/${encodeURIComponent(recordId)}`,
      { headers: auth().buildHeaders() },
    );
    const json = await handleResponse(response);
    return json.data;
  },

  async create(recordData: Partial<MaintenanceRecord>): Promise<MaintenanceRecord> {
    const API_ENDPOINT = await getApiEndpoint();
    const response = await fetch(`${API_ENDPOINT}/admin/maintenance-records`, {
      method: 'POST',
      headers: auth().buildHeaders(),
      body: JSON.stringify(recordData),
    });
    const json = await handleResponse(response);
    return json.data;
  },

  async update(recordId: string, recordData: Partial<MaintenanceRecord>): Promise<MaintenanceRecord> {
    const API_ENDPOINT = await getApiEndpoint();
    const response = await fetch(
      `${API_ENDPOINT}/admin/maintenance-records/${encodeURIComponent(recordId)}`,
      { method: 'PUT', headers: auth().buildHeaders(), body: JSON.stringify(recordData) },
    );
    const json = await handleResponse(response);
    return json.data;
  },

  async delete(recordId: string): Promise<MaintenanceRecord> {
    const API_ENDPOINT = await getApiEndpoint();
    const response = await fetch(
      `${API_ENDPOINT}/admin/maintenance-records/${encodeURIComponent(recordId)}`,
      { method: 'DELETE', headers: auth().buildHeaders() },
    );
    const json = await handleResponse(response);
    return json.data.deleted_record;
  },

  async performInspection(recordId: string, inspectionData: Record<string, unknown>): Promise<MaintenanceRecord> {
    const API_ENDPOINT = await getApiEndpoint();
    const response = await fetch(
      `${API_ENDPOINT}/admin/maintenance-records/${encodeURIComponent(recordId)}/inspect`,
      { method: 'POST', headers: auth().buildHeaders(), body: JSON.stringify(inspectionData) },
    );
    const json = await handleResponse(response);
    return json.data;
  },

  async performRepair(recordId: string, repairData: Record<string, unknown>): Promise<MaintenanceRecord> {
    const API_ENDPOINT = await getApiEndpoint();
    const response = await fetch(
      `${API_ENDPOINT}/admin/maintenance-records/${encodeURIComponent(recordId)}/repair`,
      { method: 'POST', headers: auth().buildHeaders(), body: JSON.stringify(repairData) },
    );
    const json = await handleResponse(response);
    return json.data;
  },

  async getMultipleByItems(itemIds: string[]): Promise<RecordsResult> {
    const promises = itemIds.map((id) =>
      this.getByItem(id).catch((err) => {
        console.warn(`Failed to fetch records for ${id}:`, err);
        return { records: [], count: 0 } as RecordsResult;
      }),
    );
    const results = await Promise.all(promises);
    const allRecords = results.flatMap((result) => result.records || []);
    return { records: allRecords, count: allRecords.length };
  },
};

// ============================================
// ITEMS API
// ============================================

export const itemsAPI = {
  async getById(itemId: string): Promise<Item> {
    const API_ENDPOINT = await getApiEndpoint();
    const response = await fetch(`${API_ENDPOINT}/items/${encodeURIComponent(itemId)}`, {
      headers: auth().buildHeaders(),
    });
    const json = await handleResponse(response);
    return json.data;
  },

  async search(query: string): Promise<{ items: Item[] }> {
    if (!query || query.length < 2) return { items: [] };
    const API_ENDPOINT = await getApiEndpoint();
    const response = await fetch(`${API_ENDPOINT}/items?search=${encodeURIComponent(query)}`, {
      headers: auth().buildHeaders(),
    });
    const json = await handleResponse(response);
    const items = json.data?.items || [];
    return { items: items.slice(0, 10) };
  },

  async getAll(filters: ItemFilters = {}): Promise<Item[]> {
    const API_ENDPOINT = await getApiEndpoint();
    const queryParams = new URLSearchParams();
    if (filters.class_type) queryParams.append('class_type', filters.class_type);
    if (filters.status) queryParams.append('status', filters.status);
    if (filters.enabled !== undefined) queryParams.append('enabled', String(filters.enabled));
    const queryString = queryParams.toString();
    const url = `${API_ENDPOINT}/items${queryString ? '?' + queryString : ''}`;
    const response = await fetch(url, { headers: auth().buildHeaders() });
    const json = await handleResponse(response);
    return json.data?.items || [];
  },
};

// ============================================
// SCHEDULE TEMPLATE API
// ============================================

export interface ScheduleFilters {
  class_type?: string;
  status?: string;
  task_type?: string;
  enabled?: boolean | string;
  is_default?: boolean | string;
}

export const scheduleAPI = {
  async getAll(filters: ScheduleFilters = {}): Promise<ScheduleTemplate[]> {
    const API_ENDPOINT = await getApiEndpoint();
    const queryParams = new URLSearchParams();
    if (filters.class_type) queryParams.append('class_type', filters.class_type);
    if (filters.status) queryParams.append('status', filters.status);
    if (filters.task_type) queryParams.append('task_type', filters.task_type);
    if (filters.enabled !== undefined) queryParams.append('enabled', String(filters.enabled));
    if (filters.is_default !== undefined) queryParams.append('is_default', String(filters.is_default));
    const queryString = queryParams.toString();
    const url = `${API_ENDPOINT}/admin/maintenance-schedules${queryString ? '?' + queryString : ''}`;
    const response = await fetch(url, { headers: auth().buildHeaders() });
    const json = await handleResponse(response);
    return json.data || [];
  },

  async getById(scheduleId: string): Promise<ScheduleTemplate> {
    const API_ENDPOINT = await getApiEndpoint();
    const response = await fetch(`${API_ENDPOINT}/admin/maintenance-schedules/${scheduleId}`, {
      headers: auth().buildHeaders(),
    });
    const json = await handleResponse(response);
    return json.data;
  },

  async create(scheduleData: Partial<ScheduleTemplate>): Promise<ScheduleTemplate> {
    const API_ENDPOINT = await getApiEndpoint();
    const response = await fetch(`${API_ENDPOINT}/admin/maintenance-schedules`, {
      method: 'POST',
      headers: auth().buildHeaders(),
      body: JSON.stringify(scheduleData),
    });
    const json = await handleResponse(response);
    return json.data;
  },

  async update(scheduleId: string, scheduleData: Partial<ScheduleTemplate>): Promise<ScheduleTemplate> {
    const API_ENDPOINT = await getApiEndpoint();
    const response = await fetch(`${API_ENDPOINT}/admin/maintenance-schedules/${scheduleId}`, {
      method: 'PUT',
      headers: auth().buildHeaders(),
      body: JSON.stringify(scheduleData),
    });
    const json = await handleResponse(response);
    return json.data;
  },

  async delete(scheduleId: string): Promise<unknown> {
    const API_ENDPOINT = await getApiEndpoint();
    const response = await fetch(`${API_ENDPOINT}/admin/maintenance-schedules/${scheduleId}`, {
      method: 'DELETE',
      headers: auth().buildHeaders(),
    });
    const json = await handleResponse(response);
    return json.data;
  },

  async getRecords(scheduleId: string): Promise<MaintenanceRecord[]> {
    const API_ENDPOINT = await getApiEndpoint();
    const response = await fetch(`${API_ENDPOINT}/admin/maintenance-schedules/${scheduleId}/records`, {
      headers: auth().buildHeaders(),
    });
    const json = await handleResponse(response);
    return json.data || [];
  },

  async generateRecords(scheduleId: string, count = 2): Promise<unknown> {
    const API_ENDPOINT = await getApiEndpoint();
    const response = await fetch(`${API_ENDPOINT}/admin/maintenance-schedules/${scheduleId}/generate`, {
      method: 'POST',
      headers: auth().buildHeaders(),
      body: JSON.stringify({ count }),
    });
    const json = await handleResponse(response);
    return json.data;
  },

  async applyToItems(scheduleId: string, data: Record<string, unknown>): Promise<any> {
    const API_ENDPOINT = await getApiEndpoint();
    const response = await fetch(`${API_ENDPOINT}/admin/maintenance-schedules/${scheduleId}/apply`, {
      method: 'POST',
      headers: auth().buildHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },
};

// ============================================
// COSTS + PHOTOS + EXTERNAL LINKS
// ============================================

export const photosAPI = {
  async getById(photoId: string): Promise<any> {
    const API_ENDPOINT = await getApiEndpoint();
    const response = await fetch(`${API_ENDPOINT}/admin/images/${encodeURIComponent(photoId)}`, {
      headers: auth().buildHeaders(),
    });
    return handleResponse(response);
  },

  async getByIds(photoIds: string[]): Promise<any[]> {
    if (!photoIds || photoIds.length === 0) return [];
    const results = await Promise.all(
      photoIds.map((id) =>
        this.getById(id).catch((err) => {
          console.warn(`Failed to fetch photo ${id}:`, err);
          return null;
        }),
      ),
    );
    return results.filter((photo) => photo !== null);
  },
};

export async function fetchItemCosts(itemId: string): Promise<ItemCosts> {
  const API_ENDPOINT = await getApiEndpoint();
  const response = await fetch(`${API_ENDPOINT}/finance/costs/item/${encodeURIComponent(itemId)}`, {
    headers: auth().buildHeaders(),
  });
  return handleResponse(response); // { costs: [...], summary: {...}, count: N }
}

export async function getItemUrl(itemId: string): Promise<string> {
  const cfg = await window.SpookyConfig.get();
  return `${(cfg as any).ITEMS_ADMIN}/${itemId}`;
}

export async function getCostsUrl(): Promise<string> {
  const cfg = await window.SpookyConfig.get();
  return (cfg as any).FINANCE_URL;
}
