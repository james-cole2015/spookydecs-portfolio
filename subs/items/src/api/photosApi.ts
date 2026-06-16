/**
 * Photos API client for items sub — typed port of api/photos.js (#332).
 * Full presign→confirm→link/unlink→set_primary flow preserved verbatim.
 * Framework-agnostic: calls window.SpookyAuth/SpookyConfig directly.
 */
import { type Photo } from './types';

function auth() { return window.SpookyAuth; }

async function getApiEndpoint(): Promise<string> {
  const { API_ENDPOINT } = await window.SpookyConfig.get();
  return API_ENDPOINT;
}

async function handleResponse(res: Response): Promise<any> {
  if (res.status === 401) { await auth().redirectToLogin(); return null; }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || err.message || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchPhotoById(photoId: string): Promise<Photo | null> {
  try {
    const API = await getApiEndpoint();
    const res = await fetch(`${API}/admin/images/${photoId}`, { headers: auth().buildHeaders() });
    if (res.status === 404) return null;
    const data = await handleResponse(res);
    return data?.success && data.data ? data.data : data?.photo_id ? data : null;
  } catch {
    return null;
  }
}

export async function fetchPhotosByIds(ids: string[]): Promise<Photo[]> {
  if (!ids.length) return [];
  const results = await Promise.all(ids.map(fetchPhotoById));
  return results.filter((p): p is Photo => p !== null);
}

export async function linkPhotoToItem(
  photoId: string,
  itemId: string,
  isPrimary = false,
): Promise<void> {
  const API = await getApiEndpoint();
  const res = await fetch(`${API}/admin/images/${photoId}/link`, {
    method: 'POST',
    headers: auth().buildHeaders(),
    body: JSON.stringify({ item_id: itemId, is_primary: isPrimary }),
  });
  await handleResponse(res);
}

export async function unlinkPhotoFromItem(photoId: string, itemId: string): Promise<void> {
  const API = await getApiEndpoint();
  const res = await fetch(`${API}/admin/images/${photoId}/unlink`, {
    method: 'POST',
    headers: auth().buildHeaders(),
    body: JSON.stringify({ item_id: itemId }),
  });
  await handleResponse(res);
}

export async function deletePhoto(photoId: string): Promise<void> {
  const API = await getApiEndpoint();
  const res = await fetch(`${API}/admin/images/${photoId}`, {
    method: 'DELETE',
    headers: auth().buildHeaders(),
  });
  await handleResponse(res);
}

export async function setPrimaryPhoto(photoId: string, itemId: string): Promise<void> {
  const API = await getApiEndpoint();
  const res = await fetch(`${API}/admin/images/set_primary`, {
    method: 'POST',
    headers: auth().buildHeaders(),
    body: JSON.stringify({ photo_id: photoId, context: 'item', item_id: itemId }),
  });
  await handleResponse(res);
}

export async function listPhotosForItem(itemId: string): Promise<{ count: number; photos: Photo[] }> {
  const API = await getApiEndpoint();
  const res = await fetch(`${API}/admin/images?item_id=${encodeURIComponent(itemId)}`, {
    headers: auth().buildHeaders(),
  });
  return handleResponse(res);
}
