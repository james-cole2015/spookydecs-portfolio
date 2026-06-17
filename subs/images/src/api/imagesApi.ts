/**
 * Images API client — typed port of js/utils/images-api.js (#336).
 * Framework-agnostic: reads window.SpookyConfig / window.SpookyAuth directly
 * (the .ts API layer is allowed to touch the globals; .tsx components use the
 * useConfig/useAuth hooks). Toasts are no longer fired here — callers show them
 * via the shared useToast (the sub's own shared/toast.js was dropped).
 */
import type { Photo } from '../config/imagesConfig';

const API_PATH = '/admin/images';

function auth() {
  return window.SpookyAuth;
}

async function getApiBase(): Promise<string> {
  const { API_ENDPOINT } = await window.SpookyConfig.get();
  return `${API_ENDPOINT}${API_PATH}`;
}

export interface ImageFilters {
  season?: string;
  photo_type?: string;
  year?: string | number;
  item_id?: string;
  storage_id?: string;
  idea_id?: string;
  class_type?: string;
  tags?: string;
  limit?: string | number;
}

export interface MatchedItem {
  item_id: string;
  short_name?: string;
  similarity?: number;
  confidence?: string;
}

export interface SuggestTagsResult {
  suggested_tags?: string[];
  matched_items?: MatchedItem[];
}

export async function fetchImages(filters: ImageFilters = {}): Promise<Photo[]> {
  const params = new URLSearchParams();
  if (filters.season) params.append('season', filters.season);
  if (filters.photo_type) params.append('photo_type', filters.photo_type);
  if (filters.year) params.append('year', String(filters.year));
  if (filters.item_id) params.append('item_id', filters.item_id);
  if (filters.storage_id) params.append('storage_id', filters.storage_id);
  if (filters.idea_id) params.append('idea_id', filters.idea_id);
  if (filters.class_type) params.append('class_type', filters.class_type);
  if (filters.tags) params.append('tags', filters.tags);
  if (filters.limit) params.append('limit', String(filters.limit));

  const apiBase = await getApiBase();
  const response = await fetch(`${apiBase}?${params.toString()}`, {
    headers: auth().buildHeaders(),
  });

  if (response.status === 401) {
    await auth().redirectToLogin();
    return [];
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Failed to fetch images: HTTP ${response.status} — ${body}`);
  }

  const data = await response.json();
  return (data.data || data).photos || [];
}

export async function fetchImage(photoId: string): Promise<Photo | null> {
  const apiBase = await getApiBase();
  const response = await fetch(`${apiBase}/${photoId}`, {
    headers: auth().buildHeaders(),
  });

  if (response.status === 401) {
    await auth().redirectToLogin();
    return null;
  }

  if (!response.ok) {
    throw new Error(
      response.status === 404 ? 'Image not found' : `Failed to fetch image: ${response.statusText}`,
    );
  }

  const d = await response.json();
  return (d.data ?? d) as Photo;
}

export async function updateImage(
  photoId: string,
  updates: Record<string, unknown>,
): Promise<Photo | null> {
  const apiBase = await getApiBase();
  const response = await fetch(`${apiBase}/${photoId}`, {
    method: 'PUT',
    headers: auth().buildHeaders(),
    body: JSON.stringify(updates),
  });

  if (response.status === 401) {
    await auth().redirectToLogin();
    return null;
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('Update error details:', errorData.details?.message);
    throw new Error(errorData.error || 'Failed to update image');
  }

  const data = await response.json();
  return (data.data || data).photo as Photo;
}

export async function patchImage(
  photoId: string,
  updates: Record<string, unknown>,
): Promise<Photo | null> {
  const apiBase = await getApiBase();
  const response = await fetch(`${apiBase}/${photoId}`, {
    method: 'PATCH',
    headers: auth().buildHeaders(),
    body: JSON.stringify(updates),
  });

  if (response.status === 401) {
    await auth().redirectToLogin();
    return null;
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('Patch error details:', errorData.details?.message);
    throw new Error(errorData.error || 'Failed to update image');
  }

  const data = await response.json();
  return (data.data || data).photo as Photo;
}

export async function deleteImage(photoId: string): Promise<unknown> {
  const apiBase = await getApiBase();
  const response = await fetch(`${apiBase}/${photoId}`, {
    method: 'DELETE',
    headers: auth().buildHeaders(),
  });

  if (response.status === 401) {
    await auth().redirectToLogin();
    return null;
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to delete image');
  }

  return response.json();
}

/** Promote a photo to primary for its entity. payload: { photo_id, context, <context>_id }. */
export async function setPrimaryPhoto(payload: Record<string, unknown>): Promise<unknown> {
  const apiBase = await getApiBase();
  const response = await fetch(`${apiBase}/set_primary`, {
    method: 'POST',
    headers: auth().buildHeaders(),
    body: JSON.stringify(payload),
  });

  if (response.status === 401) {
    await auth().redirectToLogin();
    return null;
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to set primary: HTTP ${response.status}`);
  }

  return response.json();
}

/** Cross-sub read: GET /ideas — used to resolve idea titles on the entities page. */
export async function fetchIdeas(): Promise<any[]> {
  try {
    const { API_ENDPOINT } = await window.SpookyConfig.get();
    const response = await fetch(`${API_ENDPOINT}/ideas`, {
      headers: auth().buildHeaders(),
    });
    if (response.status === 401) {
      await auth().redirectToLogin();
      return [];
    }
    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data) ? data : (data?.data ?? data?.ideas ?? []);
  } catch {
    return [];
  }
}

/** Claude Vision tag suggestion: POST /admin/images/:photoId/suggest-tags. */
export async function suggestTags(photoId: string): Promise<SuggestTagsResult | null> {
  const { API_ENDPOINT } = await window.SpookyConfig.get();
  const response = await fetch(`${API_ENDPOINT}/admin/images/${photoId}/suggest-tags`, {
    method: 'POST',
    headers: auth().buildHeaders(),
  });

  if (response.status === 401) {
    await auth().redirectToLogin();
    return null;
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to suggest tags: HTTP ${response.status}`);
  }

  const data = await response.json();
  return (data.data ?? data) as SuggestTagsResult;
}

export async function getStats(photoType: string | null = null): Promise<any> {
  const apiBase = await getApiBase();
  const url = photoType ? `${apiBase}/stats?photo_type=${photoType}` : `${apiBase}/stats`;

  const response = await fetch(url, { headers: auth().buildHeaders() });

  if (response.status === 401) {
    await auth().redirectToLogin();
    return null;
  }

  if (!response.ok) {
    throw new Error('Failed to fetch statistics');
  }

  const d = await response.json();
  return d.data ?? d;
}
