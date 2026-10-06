/**
 * Place-photo adapters — the per-target glue for /place-photo (#621).
 *
 * Each target is an existing record. Loaders list the candidates; the
 * attach step maps a freshly uploaded photo onto the record. Uploads go
 * through the shared usePhotoUpload hook (see PlacePhotoPage); this file
 * only handles reads and the one write that is not a plain upload
 * (connection photos, which the deployments sub links via PATCH).
 */
import type { EntityListOption, PickerOption } from '@spookydecs/ui';

const { buildHeaders, redirectToLogin } = window.SpookyAuth;

export type PlaceTarget = 'item' | 'connection' | 'idea' | 'maintenance';

/**
 * A maintenance option. The item id travels with it so an upload can link the
 * photo to the item as well as the record. The images sub treats a photo with no
 * item, idea, deployment, storage, or cost link as orphaned, and record_id alone
 * does not count.
 */
export interface MaintenanceOption extends EntityListOption {
  itemId: string;
}

/** A deployment connection, flattened with the items it touches. */
export interface ConnectionOption {
  deploymentId: string;
  connectionId: string;
  itemIds: string[];
  description: string;
}

/** GET a JSON envelope; redirects to login on 401; returns null on 401. */
async function getJson<T>(path: string): Promise<T | null> {
  const config = await window.SpookyConfig.get();
  const response = await fetch(`${config.API_ENDPOINT}${path}`, { headers: buildHeaders() });

  if (response.status === 401) {
    await redirectToLogin();
    return null;
  }
  if (!response.ok) {
    throw new Error(`GET ${path} failed: ${response.status}`);
  }

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || `GET ${path} failed`);
  }
  return result.data as T;
}

/** Search items by name/id (server-side). Needs at least two characters. */
export async function searchItemOptions(query: string): Promise<PickerOption[]> {
  if (query.trim().length < 2) return [];
  const data = await getJson<{ items?: Array<Record<string, unknown>> }>(
    `/items?${new URLSearchParams({ search: query.trim() })}`,
  );
  return (data?.items ?? []).map((item) => ({
    id: String(item.id),
    label: String(item.short_name || item.id),
    description: item.short_name ? String(item.id) : undefined,
  }));
}

/** List ideas (all statuses — completed ideas can still get photos). */
export async function listIdeaOptions(): Promise<EntityListOption[]> {
  const data = await getJson<Array<Record<string, unknown>>>('/ideas');
  return (data ?? []).map((idea) => ({
    id: String(idea.id ?? idea.idea_id),
    label: String(idea.title || idea.id || idea.idea_id),
    description: idea.status ? String(idea.status) : undefined,
    tags: idea.status ? [String(idea.status)] : [],
  }));
}

/**
 * Look up item short names for a set of ids. A failed lookup falls back to the
 * id, so one bad item does not blank the whole list.
 */
async function itemShortNames(ids: string[]): Promise<Map<string, string>> {
  const names = new Map<string, string>();
  await Promise.all(
    ids.map(async (id) => {
      try {
        const item = await getJson<Record<string, unknown>>(`/items/${encodeURIComponent(id)}`);
        if (item?.short_name) names.set(id, String(item.short_name));
      } catch {
        // Fall back to the id below.
      }
    }),
  );
  return names;
}

/**
 * List maintenance records (repairs and inspections; any status). Each option is
 * labelled with the item's short name, so the picker's search matches it.
 */
export async function listMaintenanceOptions(): Promise<MaintenanceOption[]> {
  const data = await getJson<Array<Record<string, unknown>>>('/admin/maintenance-records');
  const records = data ?? [];
  const itemIds = Array.from(new Set(records.map((r) => String(r.item_id ?? '')).filter(Boolean)));
  const names = await itemShortNames(itemIds);

  return records.map((record) => {
    const itemId = String(record.item_id ?? '');
    const itemName = names.get(itemId) ?? itemId;
    const kind = String(record.record_type ?? 'record');
    return {
      id: String(record.record_id),
      itemId,
      label: [itemName, kind].filter(Boolean).join(' · '),
      description: [record.title, record.status].filter(Boolean).map(String).join(' · ') || undefined,
      tags: [kind, String(record.status ?? '')].filter(Boolean),
    };
  });
}

/**
 * Connections across active deployments, flattened. Each connection lists
 * both items it touches, so an item shows up if it is on either end.
 */
export async function listConnectionOptions(): Promise<ConnectionOption[]> {
  const deployments = await getJson<Array<Record<string, unknown>>>('/deployments');
  const connections: ConnectionOption[] = [];

  for (const deployment of deployments ?? []) {
    const deploymentId = String(deployment.deployment_id);
    const detail = await getJson<{ connections?: Array<Record<string, unknown>> }>(
      `/deployments/${encodeURIComponent(deploymentId)}?include=connections`,
    );
    for (const c of detail?.connections ?? []) {
      const itemIds = [c.from_item_id, c.to_item_id].filter(Boolean).map(String);
      connections.push({
        deploymentId,
        connectionId: String(c.connection_id),
        itemIds,
        description: `${c.from_item_id ?? '?'} → ${c.to_item_id ?? '?'}`,
      });
    }
  }
  return connections;
}

/**
 * Link uploaded photos to a connection. The deployments sub's route is
 * PATCH /deployments/{id}/connections/{cid}/photos with a non-empty photo_ids
 * array; it appends and de-duplicates.
 */
export async function attachPhotosToConnection(
  deploymentId: string,
  connectionId: string,
  photoIds: string[],
): Promise<void> {
  const config = await window.SpookyConfig.get();
  const path = `/deployments/${encodeURIComponent(deploymentId)}/connections/${encodeURIComponent(connectionId)}/photos`;
  const response = await fetch(`${config.API_ENDPOINT}${path}`, {
    method: 'PATCH',
    headers: buildHeaders(),
    body: JSON.stringify({ photo_ids: photoIds }),
  });

  if (response.status === 401) {
    await redirectToLogin();
    throw new Error('Session expired');
  }
  if (!response.ok) {
    throw new Error(`Connection photo link failed: ${response.status}`);
  }
  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || 'Connection photo link failed');
  }
}
