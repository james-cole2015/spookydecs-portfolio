// Images API Client
import { showToast } from '../shared/toast.js';

const API_PATH = '/admin/images';

const { getAuthToken, buildHeaders, redirectToLogin } = window.SpookyAuth;

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
    if (filters.idea_id) params.append('idea_id', filters.idea_id);
    if (filters.class_type) params.append('class_type', filters.class_type);
    if (filters.tags) params.append('tags', filters.tags);
    if (filters.limit) params.append('limit', filters.limit);

    const apiBase = await getApiBase();
    const response = await fetch(`${apiBase}?${params.toString()}`, {
      headers: buildHeaders()
    });

    if (response.status === 401) { await redirectToLogin(); return null; }

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`Failed to fetch images: HTTP ${response.status} — ${body}`);
    }

    const data = await response.json();
    return (data.data || data).photos || [];
  } catch (error) {
    console.error('Error fetching images:', error);
    showToast('Failed to load images', 'error');
    throw error;
  }
}

export async function fetchImage(photoId) {
  try {
    const apiBase = await getApiBase();
    const response = await fetch(`${apiBase}/${photoId}`, {
      headers: buildHeaders()
    });

    if (response.status === 401) { await redirectToLogin(); return null; }

    if (!response.ok) {
      throw new Error(response.status === 404 ? 'Image not found' : `Failed to fetch image: ${response.statusText}`);
    }

    const d = await response.json();
    return d.data ?? d;
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
      headers: buildHeaders(),
      body: JSON.stringify(updates)
    });

    if (response.status === 401) { await redirectToLogin(); return null; }

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Update error details:', errorData.details?.message);
      throw new Error(errorData.error || 'Failed to update image');
    }

    const data = await response.json();
    showToast('Image updated successfully', 'success');
    return (data.data || data).photo;
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
      headers: buildHeaders(),
      body: JSON.stringify(updates)
    });

    if (response.status === 401) { await redirectToLogin(); return null; }

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Patch error details:', errorData.details?.message);
      throw new Error(errorData.error || 'Failed to update image');
    }

    const data = await response.json();
    showToast('Image updated successfully', 'success');
    return (data.data || data).photo;
  } catch (error) {
    console.error('Error patching image:', error);
    showToast(error.message, 'error');
    throw error;
  }
}

export async function deleteImage(photoId) {
  try {
    const apiBase = await getApiBase();
    const response = await fetch(`${apiBase}/${photoId}`, {
      method: 'DELETE',
      headers: buildHeaders()
    });

    if (response.status === 401) { await redirectToLogin(); return null; }

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
      headers: buildHeaders(),
      body: JSON.stringify(payload)
    });

    if (response.status === 401) { await redirectToLogin(); return null; }

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

export async function fetchIdeas() {
  try {
    const { API_ENDPOINT } = await window.SpookyConfig.get();
    const response = await fetch(`${API_ENDPOINT}/ideas`, {
      headers: buildHeaders()
    });
    if (response.status === 401) { await redirectToLogin(); return []; }
    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data) ? data : (data?.data ?? data?.ideas ?? []);
  } catch {
    return [];
  }
}

export async function suggestTags(photoId) {
  try {
    const { API_ENDPOINT } = await window.SpookyConfig.get();
    const response = await fetch(`${API_ENDPOINT}/admin/images/${photoId}/suggest-tags`, {
      method: 'POST',
      headers: buildHeaders(),
      credentials: 'include',
    });

    if (response.status === 401) { await redirectToLogin(); return null; }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to suggest tags: HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.data ?? data;
  } catch (error) {
    console.error('Error suggesting tags:', error);
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

    const response = await fetch(url, {
      headers: buildHeaders()
    });

    if (response.status === 401) { await redirectToLogin(); return null; }

    if (!response.ok) {
      throw new Error('Failed to fetch statistics');
    }

    const d = await response.json();
    return d.data ?? d;
  } catch (error) {
    console.error('Error fetching stats:', error);
    throw error;
  }
}
