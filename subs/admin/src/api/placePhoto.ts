/**
 * Place-photo adapters — the per-target glue for /place-photo (#621).
 *
 * Each target is an existing record. Loaders list the candidates; the
 * attach step maps a freshly uploaded photo onto the record. Uploads go
 * through the shared usePhotoUpload hook (see PlacePhotoPage); this file
 * only handles reads and the one write that is not a plain upload
 * (connection photos, which the deployments sub links via PATCH).
 */
import type { PickerOption } from '@spookydecs/ui';

const { buildHeaders, redirectToLogin } = window.SpookyAuth;

export type PlaceTarget = 'item' | 'connection' | 'idea' | 'maintenance';

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
export async function listIdeaOptions(): Promise<PickerOption[]> {
  const data = await getJson<Array<Record<string, unknown>>>('/ideas');
  return (data ?? []).map((idea) => ({
    id: String(idea.id ?? idea.idea_id),
    label: String(idea.title || idea.id || idea.idea_id),
    description: idea.status ? String(idea.status) : undefined,
  }));
}

/** List maintenance records (repairs and inspections; any status). */
export async function listMaintenanceOptions(): Promise<PickerOption[]> {
  const data = await getJson<Array<Record<string, unknown>>>('/admin/maintenance-records');
  return (data ?? []).map((record) => ({
    id: String(record.record_id),
    label: String(record.title || record.record_type || record.record_id),
    description: [record.item_id, record.status].filter(Boolean).map(String).join(' · ') || undefined,
  }));
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
