/**
 * Sentinel storage-unit fixture — find/sweep-by-marker/pick-a-real-item, adapted from
 * subs/deployments/tests/shared/sentinel.mjs (#554) for #589.
 *
 * Key divergence from deployments: storage unit IDs are server-generated sequential
 * (STOR-{TYPE}-{SEASON}-{N}), not deterministic/client-chosen like deployments'
 * DEP-{SEASON}-2030. There is no known ID to preflight-delete by, so instead every
 * sentinel storage unit is tagged with a distinctive marker in its name field
 * (SENTINEL_MARKER). Both preflight and teardown call sweepSentinels(), which lists
 * every storage unit, finds ones carrying the marker, and deletes them — unpacking
 * their contents first since DELETE /storage/{id} 400s on a non-empty unit. This is
 * simpler than deployments' snapshot/restore ledger: there's a real DELETE /storage/{id}
 * route on every stage, and removing an item from a storage unit already fires the
 * Item.Unpacked event that resets the item's storage_data — so sweeping a sentinel's
 * contents is itself the item cleanup, no separate ledger needed.
 */

export const API_HOST = 'https://miinu7boec.execute-api.us-east-2.amazonaws.com';
// Must satisfy the storage sub's short_name validation pattern (letters, digits,
// spaces, hyphen, underscore, parens only — see STORAGE_CONFIG.VALIDATION in
// subs/storage/src/config/storageConfig.ts), so no brackets or colons.
export const SENTINEL_MARKER = 'E2E SENTINEL - safe to delete';

/** Minimal REST client bound to a token + stage — mirrors deployments' sentinel.mjs `api()`. */
export function makeApiClient({ token, stage = 'dev' }) {
  const base = `${API_HOST}/${stage}`;
  return async function api(method, path, body) {
    const res = await fetch(`${base}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const text = await res.text();
    let parsed;
    try { parsed = text ? JSON.parse(text) : null; } catch { parsed = text; }
    return { status: res.status, body: parsed, data: parsed?.data };
  };
}

/** A fresh, run-unique name carrying the marker — pass as `name`/`short_name` on create. */
export function sentinelName(classType) {
  return `${SENTINEL_MARKER} ${classType} ${Date.now()}`;
}

function isSentinel(unit) {
  const label = String(unit.name ?? unit.short_name ?? '');
  return label.includes(SENTINEL_MARKER);
}

/** Lists every storage unit and returns the ones carrying the sentinel marker. */
export async function findSentinels(api) {
  const res = await api('GET', '/storage');
  const units = res.data?.storage_units || res.body?.storage_units || [];
  return units.filter(isSentinel);
}

/**
 * Deletes one sentinel unit, unpacking its contents first (DELETE /storage/{id}
 * 400s with "Cannot delete storage unit with contents" otherwise — see
 * sd_storage_handler.py's delete_storage). Removing items fires Item.Unpacked,
 * which is exactly the reset a crashed run's packed test item needs.
 */
export async function deleteSentinelUnit(api, unit) {
  const contents = unit.contents || [];
  if (contents.length > 0) {
    await api('DELETE', `/storage/${unit.id}/contents`, { item_ids: contents });
  }
  const res = await api('DELETE', `/storage/${unit.id}`);
  return res.status === 200 || res.status === 404;
}

/** Preflight/teardown sweep — finds and deletes every leftover sentinel unit. */
export async function sweepSentinels(api) {
  const sentinels = await findSentinels(api);
  for (const unit of sentinels) {
    await deleteSentinelUnit(api, unit);
  }
  return sentinels.length;
}

/**
 * Picks a real, already-unpacked item eligible for the tote pack-flow — the same
 * filter PackWizardPage's TotePackFlow applies (packable !== false, is_stored ===
 * false, single_packed !== true, not a Receptacle, not a Deployment/Storage record).
 * Not a sentinel itself — packing then unpacking it during the run is a round trip
 * that self-heals its status.
 */
export async function pickPackableItem(api) {
  const res = await api('GET', '/items?unpacked=true');
  const items = res.data?.items || res.body?.items || [];
  return items.find((item) => {
    if (item.class === 'Deployment' || item.class === 'Storage' || item.class_type === 'Receptacle') return false;
    const sd = item.storage_data || {};
    return sd.packable !== false && sd.is_stored === false && sd.single_packed !== true;
  }) || null;
}
