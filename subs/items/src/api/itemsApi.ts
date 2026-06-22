/**
 * Items API client — typed port of api/items.js (#332).
 *
 * The camelCase↔snake_case field mapping is load-bearing and preserved verbatim:
 *   type↔class, category↔class_type, shortName↔short_name,
 *   heightLength↔height_length, maleEnds↔male_ends, etc.
 *
 * Framework-agnostic: calls window.SpookyConfig / window.SpookyAuth directly.
 */
import { type Item, type CascadePreview } from './types';
import { ALLOWED_CLASSES } from '../config/itemsConfig';

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

export async function getStorageUrl(): Promise<string> {
  const config = await window.SpookyConfig.get() as any;
  if (!config.STR_ADM_URL) throw new Error('Storage URL not configured');
  return config.STR_ADM_URL;
}

export async function getDeploymentUrl(): Promise<string> {
  const config = await window.SpookyConfig.get() as any;
  if (!config.DEPLOY_ADMIN) throw new Error('Deployment URL not configured');
  return config.DEPLOY_ADMIN;
}

async function resolvePhotoUrl(item: Item): Promise<Item> {
  if (!item.images?.primary_photo_id) return item;
  const API = await getApiEndpoint();
  const res = await fetch(`${API}/admin/images/${item.images.primary_photo_id}`, {
    headers: auth().buildHeaders(),
  });
  if (!res.ok) return item;
  const data = await res.json();
  const photo = data.success && data.data ? data.data : data.cloudfront_url ? data : null;
  if (photo?.cloudfront_url) {
    item.images = { ...item.images, cloudfront_url: photo.cloudfront_url };
  }
  return item;
}

async function resolvePhotoUrls(items: Item[]): Promise<Item[]> {
  const ids = [...new Set(
    items.filter((i) => i.images?.primary_photo_id).map((i) => i.images!.primary_photo_id!),
  )];
  if (ids.length === 0) return items;
  const API = await getApiEndpoint();
  const photos = await Promise.all(
    ids.map((id) =>
      fetch(`${API}/admin/images/${id}`, { headers: auth().buildHeaders() })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          const photo = d?.success && d.data ? d.data : d?.cloudfront_url ? d : null;
          return photo ? { id, url: photo.cloudfront_url } : null;
        })
        .catch(() => null),
    ),
  );
  const map: Record<string, string> = {};
  photos.forEach((p) => { if (p) map[p.id] = p.url; });
  return items.map((item) => {
    const pid = item.images?.primary_photo_id;
    if (pid && map[pid]) return { ...item, images: { ...item.images, cloudfront_url: map[pid] } };
    return item;
  });
}

function unwrapItems(data: any): Item[] {
  if (data.success && Array.isArray(data.data?.items)) return data.data.items;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.items)) return data.items;
  return [];
}

export async function fetchAllItems(bustCache = false): Promise<Item[]> {
  const API = await getApiEndpoint();
  const url = bustCache ? `${API}/items?_t=${Date.now()}` : `${API}/items`;
  const res = await fetch(url, {
    headers: auth().buildHeaders(),
    ...(bustCache && { cache: 'no-cache' }),
  });
  const data = await handleResponse(res);
  if (!data) return [];
  const all = unwrapItems(data);
  const filtered = all.filter((i) => ALLOWED_CLASSES.includes(i.class as any));
  return resolvePhotoUrls(filtered);
}

export async function fetchItemById(itemId: string, bustCache = false): Promise<Item> {
  const API = await getApiEndpoint();
  const url = bustCache ? `${API}/items/${itemId}?_t=${Date.now()}` : `${API}/items/${itemId}`;
  const res = await fetch(url, {
    headers: auth().buildHeaders(),
    ...(bustCache && { cache: 'no-cache' }),
  });
  const data = await handleResponse(res);
  const item: Item = data.success && data.data ? data.data : data.id ? data : (() => { throw new Error('Invalid response'); })();
  return resolvePhotoUrl(item);
}

// camelCase payload builder — mirrors prepareItemData() in ItemFormWizard.js verbatim
export function buildCreatePayload(formData: Record<string, any>): Record<string, any> {
  const d: Record<string, any> = {
    type:      formData.class,
    category:  formData.class_type,
    shortName: formData.short_name,
    season:    formData.season,
    status:    'Ready',
  };

  if (formData.date_acquired)   d.dateAcquired   = formData.date_acquired;
  if (formData.general_notes)   d.generalNotes   = formData.general_notes;
  if (formData.height_length)   d.heightLength   = formData.height_length;
  if (formData.stakes)          d.stakes         = formData.stakes;
  if (formData.tethers)         d.tethers        = formData.tethers;
  if (formData.color)           d.color          = formData.color;
  if (formData.bulb_type)       d.bulbType       = formData.bulb_type;
  if (formData.length)          d.length         = formData.length;
  if (formData.male_ends)       d.maleEnds       = formData.male_ends;
  if (formData.female_ends)     d.femaleEnds     = formData.female_ends;
  if (formData.watts)           d.watts          = formData.watts;
  if (formData.amps)            d.amps           = formData.amps;
  if (formData.adapter)         d.adapter        = formData.adapter;
  if (formData.power_inlet !== undefined) d.powerInlet = formData.power_inlet;
  if (formData.vendor_cost)     d.cost           = formData.vendor_cost;
  if (formData.vendor_value)    d.value          = formData.vendor_value;
  if (formData.vendor_manufacturer) d.manufacturer = formData.vendor_manufacturer;
  if (formData.vendor_store)    d.vendorStore    = formData.vendor_store;
  if (formData.storage_tote_id) d.toteId         = formData.storage_tote_id;
  if (formData.storage_location) d.toteLocation  = formData.storage_location;

  return d;
}

export async function createItem(payload: Record<string, any>): Promise<Item> {
  if (!auth().hasMinRole('builder')) throw new Error('Insufficient permissions');
  const API = await getApiEndpoint();
  const res = await fetch(`${API}/items`, {
    method: 'POST',
    headers: auth().buildHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await handleResponse(res);
  if (data.success && data.data) return data.data;
  if (data.preview || data.confirmation) return data;
  throw new Error('Invalid response format');
}

export async function updateItem(itemId: string, payload: Record<string, any>): Promise<Item> {
  if (!auth().hasMinRole('builder')) throw new Error('Insufficient permissions');
  const API = await getApiEndpoint();
  const res = await fetch(`${API}/items/${itemId}`, {
    method: 'PUT',
    headers: auth().buildHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await handleResponse(res);
  if (data.success && data.data?.item) return data.data.item;
  if (data.item) return data.item;
  if (data.id) return data;
  throw new Error('Invalid response format');
}

export async function patchItem(
  itemId: string,
  payload: Partial<Pick<Item, 'short_name' | 'season' | 'status' | 'search_text'>>,
): Promise<Item> {
  if (!auth().hasMinRole('builder')) throw new Error('Insufficient permissions');
  const API = await getApiEndpoint();
  const res = await fetch(`${API}/items/${itemId}`, {
    method: 'PATCH',
    headers: auth().buildHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await handleResponse(res);
  if (data.success && data.data?.item) return data.data.item;
  if (data.item) return data.item;
  if (data.id) return data;
  throw new Error('Invalid response format');
}

export async function deleteItem(itemId: string): Promise<void> {
  if (!auth().hasMinRole('admin')) throw new Error('Insufficient permissions');
  const API = await getApiEndpoint();
  const res = await fetch(`${API}/items/${itemId}`, {
    method: 'DELETE',
    headers: auth().buildHeaders(),
  });
  await handleResponse(res);
}

export async function cascadePreview(itemId: string): Promise<CascadePreview> {
  const API = await getApiEndpoint();
  const res = await fetch(`${API}/items/${itemId}/cascade`, { headers: auth().buildHeaders() });
  return handleResponse(res);
}

export async function cascadeDelete(itemId: string): Promise<void> {
  if (!auth().hasMinRole('admin')) throw new Error('Insufficient permissions');
  const API = await getApiEndpoint();
  const res = await fetch(`${API}/items/${itemId}/cascade`, {
    method: 'DELETE',
    headers: auth().buildHeaders(),
  });
  await handleResponse(res);
}
