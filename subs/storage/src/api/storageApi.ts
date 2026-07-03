/**
 * Storage API client — typed port of the vanilla storage-api.js.
 *
 * Framework-agnostic: calls `window.SpookyConfig`/`window.SpookyAuth` directly
 * (SpookyConfig.get() is cached, and ConfigProvider warms it at boot). Role
 * gating (`hasMinRole`) and the `success/data` response unwrapping are preserved
 * exactly from the original.
 */
import STORAGE_CONFIG, { formatStorageUnit, type StorageUnit } from '../config/storageConfig';

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
    const message = error.error || error.message || `HTTP ${response.status}`;
    const err = new Error(message) as Error & { details?: unknown; statusCode?: number };
    err.details = error.details || null;
    err.statusCode = response.status;
    throw err;
  }
  return response.json();
}

export interface StorageFilters {
  season?: string;
  location?: string;
  class_type?: string;
  packed?: string;
  size?: string;
  [key: string]: string | undefined;
}

export const storageAPI = {
  async getAll(filters: StorageFilters = {}): Promise<StorageUnit[]> {
    const API_ENDPOINT = await getApiEndpoint();
    const params = new URLSearchParams();
    Object.keys(filters).forEach((key) => {
      const v = filters[key];
      if (v && v !== 'All') params.append(key, v);
    });
    const qs = params.toString();
    const url = qs
      ? `${API_ENDPOINT}${STORAGE_CONFIG.API.STORAGE}?${qs}`
      : `${API_ENDPOINT}${STORAGE_CONFIG.API.STORAGE}`;
    const response = await fetch(url, { headers: auth().buildHeaders() });
    const data = await handleResponse(response);
    const units = data.success && data.data ? data.data.storage_units || [] : data.storage_units || [];
    return units.map(formatStorageUnit);
  },

  async getById(id: string): Promise<StorageUnit | null> {
    const API_ENDPOINT = await getApiEndpoint();
    const response = await fetch(`${API_ENDPOINT}${STORAGE_CONFIG.API.STORAGE_BY_ID(id)}`, {
      headers: auth().buildHeaders(),
    });
    const data = await handleResponse(response);
    const unit = data.success && data.data && data.data.storage_unit ? data.data.storage_unit : data.storage_unit || null;
    return unit ? formatStorageUnit(unit) : null;
  },

  async createTote(data: Record<string, unknown>): Promise<StorageUnit | null> {
    if (!auth().hasMinRole('builder')) throw new Error('Insufficient permissions');
    const API_ENDPOINT = await getApiEndpoint();
    const response = await fetch(`${API_ENDPOINT}${STORAGE_CONFIG.API.STORAGE_TOTES}`, {
      method: 'POST',
      headers: auth().buildHeaders(),
      body: JSON.stringify(data),
    });
    const result = await handleResponse(response);
    const unit = result.success && result.data && result.data.storage_unit ? result.data.storage_unit : result.storage_unit || null;
    return unit ? formatStorageUnit(unit) : null;
  },

  async createSelf(data: Record<string, unknown>): Promise<StorageUnit | null> {
    if (!auth().hasMinRole('builder')) throw new Error('Insufficient permissions');
    const API_ENDPOINT = await getApiEndpoint();
    const response = await fetch(`${API_ENDPOINT}${STORAGE_CONFIG.API.STORAGE_SELF}`, {
      method: 'POST',
      headers: auth().buildHeaders(),
      body: JSON.stringify(data),
    });
    const result = await handleResponse(response);
    const unit = result.success && result.data && result.data.storage_unit ? result.data.storage_unit : result.storage_unit || null;
    return unit ? formatStorageUnit(unit) : null;
  },

  async update(id: string, data: Record<string, unknown>): Promise<StorageUnit | null> {
    if (!auth().hasMinRole('builder')) throw new Error('Insufficient permissions');
    const API_ENDPOINT = await getApiEndpoint();
    const response = await fetch(`${API_ENDPOINT}${STORAGE_CONFIG.API.STORAGE_BY_ID(id)}`, {
      method: 'PUT',
      headers: auth().buildHeaders(),
      body: JSON.stringify(data),
    });
    const result = await handleResponse(response);
    const unit = result.success && result.data && result.data.storage_unit ? result.data.storage_unit : result.storage_unit || null;
    return unit ? formatStorageUnit(unit) : null;
  },

  async delete(id: string): Promise<any> {
    if (!auth().hasMinRole('admin')) throw new Error('Insufficient permissions');
    const API_ENDPOINT = await getApiEndpoint();
    const response = await fetch(`${API_ENDPOINT}${STORAGE_CONFIG.API.STORAGE_BY_ID(id)}`, {
      method: 'DELETE',
      headers: auth().buildHeaders(),
    });
    return handleResponse(response);
  },

  async addItems(storageId: string, itemIds: string[], markPacked = false): Promise<any> {
    if (!auth().hasMinRole('builder')) throw new Error('Insufficient permissions');
    const API_ENDPOINT = await getApiEndpoint();
    const response = await fetch(`${API_ENDPOINT}${STORAGE_CONFIG.API.STORAGE_CONTENTS(storageId)}`, {
      method: 'POST',
      headers: auth().buildHeaders(),
      body: JSON.stringify({ item_ids: itemIds, mark_packed: markPacked }),
    });
    const result = await handleResponse(response);
    return result.success && result.data ? result.data : result;
  },

  async removeItems(storageId: string, itemIds: string[]): Promise<any> {
    if (!auth().hasMinRole('builder')) throw new Error('Insufficient permissions');
    const API_ENDPOINT = await getApiEndpoint();
    const response = await fetch(`${API_ENDPOINT}${STORAGE_CONFIG.API.STORAGE_CONTENTS(storageId)}`, {
      method: 'DELETE',
      headers: auth().buildHeaders(),
      body: JSON.stringify({ item_ids: itemIds }),
    });
    const result = await handleResponse(response);
    return result.success && result.data ? result.data : result;
  },

  async packSingleItems(itemIds: string[], location: string): Promise<any> {
    if (!auth().hasMinRole('builder')) throw new Error('Insufficient permissions');
    const API_ENDPOINT = await getApiEndpoint();
    const response = await fetch(`${API_ENDPOINT}/storage/pack-single`, {
      method: 'POST',
      headers: auth().buildHeaders(),
      body: JSON.stringify({ item_ids: itemIds, location }),
    });
    const result = await handleResponse(response);
    return result.success && result.data ? result.data : result;
  },
};

export interface ItemRecord {
  id: string;
  [key: string]: unknown;
}

export const itemsAPI = {
  async getAll(filters: Record<string, string> = {}): Promise<ItemRecord[]> {
    const API_ENDPOINT = await getApiEndpoint();
    const params = new URLSearchParams();
    Object.keys(filters).forEach((key) => {
      if (filters[key]) params.append(key, filters[key]);
    });
    const qs = params.toString();
    const url = qs ? `${API_ENDPOINT}${STORAGE_CONFIG.API.ITEMS}?${qs}` : `${API_ENDPOINT}${STORAGE_CONFIG.API.ITEMS}`;
    const response = await fetch(url, { headers: auth().buildHeaders() });
    const data = await handleResponse(response);
    if (data.success && data.data && data.data.items) return data.data.items;
    return data.items || [];
  },

  async getUnpacked(season: string | null = null): Promise<ItemRecord[]> {
    const filters: Record<string, string> = { unpacked: 'true' };
    if (season) filters.season = season;
    return this.getAll(filters);
  },

  async getById(id: string): Promise<ItemRecord | null> {
    const API_ENDPOINT = await getApiEndpoint();
    const response = await fetch(`${API_ENDPOINT}${STORAGE_CONFIG.API.ITEMS_BY_ID(id)}`, {
      headers: auth().buildHeaders(),
    });
    const data = await handleResponse(response);
    if (data.success && data.data) return data.data;
    if (data.item) return data.item;
    if (data.id) return data;
    return null;
  },

  async bulkStore(itemIds: string[], location: string): Promise<any> {
    if (!auth().hasMinRole('builder')) throw new Error('Insufficient permissions');
    const API_ENDPOINT = await getApiEndpoint();
    const response = await fetch(`${API_ENDPOINT}/admin/items/bulk`, {
      method: 'PATCH',
      headers: auth().buildHeaders(),
      body: JSON.stringify({ item_ids: itemIds, location }),
    });
    const data = await handleResponse(response);
    return data.success && data.data ? data.data : data;
  },
};

export const photosAPI = {
  async getById(photoId: string): Promise<any> {
    if (!photoId) return null;
    const API_ENDPOINT = await getApiEndpoint();
    try {
      const response = await fetch(`${API_ENDPOINT}/admin/images/${photoId}`, {
        headers: auth().buildHeaders(),
      });
      if (response.status === 404) return null; // missing photo is not an error — degrade gracefully
      const data = await handleResponse(response);
      return data.success && data.data ? data.data : data;
    } catch (error) {
      console.error(`Failed to fetch photo ${photoId}:`, error);
      return null;
    }
  },

  async getByIds(photoIds: string[]): Promise<Record<string, any>> {
    if (!photoIds || photoIds.length === 0) return {};
    const validIds = photoIds.filter((id) => id);
    const photos = await Promise.all(
      validIds.map((id) =>
        this.getById(id).catch((err) => {
          console.warn(`Failed to fetch photo ${id}:`, err);
          return null;
        }),
      ),
    );
    const photoMap: Record<string, any> = {};
    photos.forEach((photo, index) => {
      if (photo) photoMap[validIds[index]] = photo;
    });
    return photoMap;
  },

  async listPhotos(storageId: string, photoType = 'storage'): Promise<{ count: number; photos: any[] }> {
    if (!storageId) return { count: 0, photos: [] };
    const API_ENDPOINT = await getApiEndpoint();
    const params = new URLSearchParams({ photo_type: photoType, storage_id: storageId });
    try {
      const response = await fetch(`${API_ENDPOINT}/admin/images?${params.toString()}`, {
        headers: auth().buildHeaders(),
      });
      return await handleResponse(response);
    } catch (error) {
      console.error(`Failed to list photos for storage ${storageId}:`, error);
      return { count: 0, photos: [] };
    }
  },

  async setPrimary(photoId: string, storageId: string): Promise<any> {
    if (!auth().hasMinRole('builder')) throw new Error('Insufficient permissions');
    const API_ENDPOINT = await getApiEndpoint();
    const response = await fetch(`${API_ENDPOINT}/admin/images/set_primary`, {
      method: 'POST',
      headers: auth().buildHeaders(),
      body: JSON.stringify({ photo_id: photoId, context: 'storage', storage_id: storageId }),
    });
    return handleResponse(response);
  },
};
