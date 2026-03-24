/**
 * Storage API Client
 * Handles all HTTP requests to the storage endpoints
 */

import STORAGE_CONFIG from './storage-config.js';

function getAuthToken() {
  const match = document.cookie.match(/(?:^|;\s*)spookydecs_auth=([^;]+)/);
  return match ? match[1] : null;
}

async function redirectToLogin() {
  const { AUTH_URL } = await window.SpookyConfig.get();
  console.warn('[storage-api] 401 received — redirecting to login');
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
    const errorMessage = error.error || error.message || `HTTP ${response.status}`;
    const errorDetails = error.details || null;

    const err = new Error(errorMessage);
    err.details = errorDetails;
    err.statusCode = response.status;
    throw err;
  }
  return response.json();
}

export const storageAPI = {
  async getAll(filters = {}) {
    const API_ENDPOINT = await getApiEndpoint();
    const params = new URLSearchParams();

    Object.keys(filters).forEach(key => {
      if (filters[key] && filters[key] !== 'All') {
        params.append(key, filters[key]);
      }
    });

    const queryString = params.toString();
    const url = queryString
      ? `${API_ENDPOINT}${STORAGE_CONFIG.API.STORAGE}?${queryString}`
      : `${API_ENDPOINT}${STORAGE_CONFIG.API.STORAGE}`;

    const response = await fetch(url, { headers: buildHeaders() });
    const data = await handleResponse(response);

    if (data.success && data.data) return data.data.storage_units || [];
    return data.storage_units || [];
  },

  async getById(id) {
    const API_ENDPOINT = await getApiEndpoint();
    const response = await fetch(
      `${API_ENDPOINT}${STORAGE_CONFIG.API.STORAGE_BY_ID(id)}`,
      { headers: buildHeaders() }
    );
    const data = await handleResponse(response);

    if (data.success && data.data && data.data.storage_unit) return data.data.storage_unit;
    return data.storage_unit || null;
  },

  async createTote(data) {
    const API_ENDPOINT = await getApiEndpoint();
    const response = await fetch(`${API_ENDPOINT}${STORAGE_CONFIG.API.STORAGE_TOTES}`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify(data)
    });
    const result = await handleResponse(response);

    if (result.success && result.data && result.data.storage_unit) return result.data.storage_unit;
    return result.storage_unit || null;
  },

  async createSelf(data) {
    const API_ENDPOINT = await getApiEndpoint();
    const response = await fetch(`${API_ENDPOINT}${STORAGE_CONFIG.API.STORAGE_SELF}`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify(data)
    });
    const result = await handleResponse(response);

    if (result.success && result.data && result.data.storage_unit) return result.data.storage_unit;
    return result.storage_unit || null;
  },

  async update(id, data) {
    const API_ENDPOINT = await getApiEndpoint();
    const response = await fetch(
      `${API_ENDPOINT}${STORAGE_CONFIG.API.STORAGE_BY_ID(id)}`,
      {
        method: 'PUT',
        headers: buildHeaders(),
        body: JSON.stringify(data)
      }
    );
    const result = await handleResponse(response);

    if (result.success && result.data && result.data.storage_unit) return result.data.storage_unit;
    return result.storage_unit || null;
  },

  async delete(id) {
    const API_ENDPOINT = await getApiEndpoint();
    const response = await fetch(
      `${API_ENDPOINT}${STORAGE_CONFIG.API.STORAGE_BY_ID(id)}`,
      {
        method: 'DELETE',
        headers: buildHeaders()
      }
    );
    return handleResponse(response);
  },

  async addItems(storageId, itemIds, markPacked = false) {
    const API_ENDPOINT = await getApiEndpoint();
    const response = await fetch(
      `${API_ENDPOINT}${STORAGE_CONFIG.API.STORAGE_CONTENTS(storageId)}`,
      {
        method: 'POST',
        headers: buildHeaders(),
        body: JSON.stringify({ item_ids: itemIds, mark_packed: markPacked })
      }
    );
    const result = await handleResponse(response);

    if (result.success && result.data) return result.data;
    return result;
  },

  async removeItems(storageId, itemIds) {
    const API_ENDPOINT = await getApiEndpoint();
    const response = await fetch(
      `${API_ENDPOINT}${STORAGE_CONFIG.API.STORAGE_CONTENTS(storageId)}`,
      {
        method: 'DELETE',
        headers: buildHeaders(),
        body: JSON.stringify({ item_ids: itemIds })
      }
    );
    const result = await handleResponse(response);

    if (result.success && result.data) return result.data;
    return result;
  },

  async packSingleItems(itemIds, location) {
    const API_ENDPOINT = await getApiEndpoint();
    const response = await fetch(`${API_ENDPOINT}/storage/pack-single`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify({ item_ids: itemIds, location })
    });
    const result = await handleResponse(response);

    if (result.success && result.data) return result.data;
    return result;
  }
};

export const itemsAPI = {
  async getAll(filters = {}) {
    const API_ENDPOINT = await getApiEndpoint();
    const params = new URLSearchParams();

    Object.keys(filters).forEach(key => {
      if (filters[key]) params.append(key, filters[key]);
    });

    const queryString = params.toString();
    const url = queryString
      ? `${API_ENDPOINT}${STORAGE_CONFIG.API.ITEMS}?${queryString}`
      : `${API_ENDPOINT}${STORAGE_CONFIG.API.ITEMS}`;

    const response = await fetch(url, { headers: buildHeaders() });
    const data = await handleResponse(response);

    if (data.success && data.data && data.data.items) return data.data.items;
    return data.items || [];
  },

  async getUnpacked(season = null) {
    const filters = { packing_status: 'false' };
    if (season) filters.season = season;
    return this.getAll(filters);
  },

  async getById(id) {
    const API_ENDPOINT = await getApiEndpoint();
    const response = await fetch(
      `${API_ENDPOINT}${STORAGE_CONFIG.API.ITEMS_BY_ID(id)}`,
      { headers: buildHeaders() }
    );
    const data = await handleResponse(response);

    if (data.success && data.data) return data.data;
    if (data.item) return data.item;
    if (data.id) return data;
    return null;
  },

  async bulkStore(itemIds, location) {
    const API_ENDPOINT = await getApiEndpoint();
    const response = await fetch(`${API_ENDPOINT}/admin/items/bulk`, {
      method: 'PATCH',
      headers: buildHeaders(),
      body: JSON.stringify({ item_ids: itemIds, location })
    });
    const data = await handleResponse(response);

    if (data.success && data.data) return data.data;
    return data;
  }
};

export const photosAPI = {
  async getById(photoId) {
    if (!photoId) return null;

    const API_ENDPOINT = await getApiEndpoint();

    try {
      const response = await fetch(
        `${API_ENDPOINT}/admin/images/${photoId}`,
        { headers: buildHeaders() }
      );
      const data = await handleResponse(response);

      if (data.success && data.data) return data.data;
      return data;
    } catch (error) {
      console.error(`Failed to fetch photo ${photoId}:`, error);
      return null;
    }
  },

  async getByIds(photoIds) {
    if (!photoIds || photoIds.length === 0) return {};

    const validIds = photoIds.filter(id => id);
    const photos = await Promise.all(
      validIds.map(id => this.getById(id).catch(err => {
        console.warn(`Failed to fetch photo ${id}:`, err);
        return null;
      }))
    );

    const photoMap = {};
    photos.forEach((photo, index) => {
      if (photo) photoMap[validIds[index]] = photo;
    });

    return photoMap;
  },

  async listPhotos(storageId, photoType = 'storage') {
    if (!storageId) return { count: 0, photos: [] };

    const API_ENDPOINT = await getApiEndpoint();
    const params = new URLSearchParams({ photo_type: photoType, storage_id: storageId });

    try {
      const response = await fetch(
        `${API_ENDPOINT}/admin/images?${params.toString()}`,
        { headers: buildHeaders() }
      );
      const data = await handleResponse(response);
      return data; // { count, photos }
    } catch (error) {
      console.error(`Failed to list photos for storage ${storageId}:`, error);
      return { count: 0, photos: [] };
    }
  },

  async setPrimary(photoId, storageId) {
    const API_ENDPOINT = await getApiEndpoint();
    const response = await fetch(`${API_ENDPOINT}/admin/images/set_primary`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify({ photo_id: photoId, context: 'storage', storage_id: storageId })
    });
    const data = await handleResponse(response);
    return data;
  }
};

export default { storageAPI, itemsAPI, photosAPI };