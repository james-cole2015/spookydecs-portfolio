// Images API Client
import { showToast } from '../shared/toast.js';

const API_PATH = '/admin/images';
const HEADERS = { 'Content-Type': 'application/json' };

async function getApiBase() {
  const { API_ENDPOINT } = await window.SpookyConfig.get();
  return `${API_ENDPOINT}${API_PATH}`;
}

export async function fetchImages(filters = {}) {
  try {
    const params = new URLSearchParams();
    if (filters.season) params.append('season', filters.season);
    if (filters.photo_type) params.append('photo_type', filters.photo_type);
    if (filters.year) params.append('year', filters.year);
    if (filters.item_id) params.append('item_id', filters.item_id);
    if (filters.storage_id) params.append('storage_id', filters.storage_id);
    if (filters.class_type) params.append('class_type', filters.class_type);
    if (filters.tags) params.append('tags', filters.tags);
    if (filters.limit) params.append('limit', filters.limit);

    const apiBase = await getApiBase();
    const response = await fetch(`${apiBase}?${params.toString()}`);

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`Failed to fetch images: HTTP ${response.status} — ${body}`);
    }

    const data = await response.json();
    return data.photos || [];
  } catch (error) {
    console.error('Error fetching images:', error);
    showToast('Failed to load images', 'error');
    throw error;
  }
}

export async function fetchImage(photoId) {
  try {
    const apiBase = await getApiBase();
    const response = await fetch(`${apiBase}/${photoId}`);

    if (!response.ok) {
      throw new Error(response.status === 404 ? 'Image not found' : `Failed to fetch image: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching image:', error);
    showToast(error.message, 'error');
    throw error;
  }
}

export async function updateImage(photoId, updates) {
  try {
    const apiBase = await getApiBase();
    const response = await fetch(`${apiBase}/${photoId}`, {
      method: 'PUT',
      headers: HEADERS,
      body: JSON.stringify(updates)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update image');
    }

    const data = await response.json();
    showToast('Image updated successfully', 'success');
    return data.photo;
  } catch (error) {
    console.error('Error updating image:', error);
    showToast(error.message, 'error');
    throw error;
  }
}

export async function patchImage(photoId, updates) {
  try {
    const apiBase = await getApiBase();
    const response = await fetch(`${apiBase}/${photoId}`, {
      method: 'PATCH',
      headers: HEADERS,
      body: JSON.stringify(updates)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update image');
    }

    const data = await response.json();
    showToast('Image updated successfully', 'success');
    return data.photo;
  } catch (error) {
    console.error('Error patching image:', error);
    showToast(error.message, 'error');
    throw error;
  }
}

export async function deleteImage(photoId) {
  try {
    const apiBase = await getApiBase();
    const response = await fetch(`${apiBase}/${photoId}`, { method: 'DELETE' });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to delete image');
    }

    showToast('Image deleted successfully', 'success');
    return await response.json();
  } catch (error) {
    console.error('Error deleting image:', error);
    showToast(error.message, 'error');
    throw error;
  }
}

export async function setPrimaryPhoto(payload) {
  try {
    const apiBase = await getApiBase();
    const response = await fetch(`${apiBase}/set_primary`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to set primary: HTTP ${response.status}`);
    }

    showToast('Primary photo updated', 'success');
    return await response.json();
  } catch (error) {
    console.error('Error setting primary photo:', error);
    showToast(error.message, 'error');
    throw error;
  }
}

export async function getStats(photoType = null) {
  try {
    const apiBase = await getApiBase();
    const url = photoType
      ? `${apiBase}/stats?photo_type=${photoType}`
      : `${apiBase}/stats`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error('Failed to fetch statistics');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching stats:', error);
    throw error;
  }
}
