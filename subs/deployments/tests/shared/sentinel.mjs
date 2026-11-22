/**
 * Sentinel deployment fixture — create/snapshot/restore/delete, extracted from the
 * pre-season API gate (tests/preseason/lifecycle.e2e.mjs, phases 1 and 19) so the
 * Playwright e2e suite (tests/e2e/fixtures.ts) can reuse the exact same blast-radius
 * and cleanup story instead of re-deriving it.
 *
 * Uses a sentinel deployment ID (`DEP-{HAL|CHR}-2030`) — year 2030 sits inside the
 * DEPLOYMENT_CONFIG 2023..2030 range but is never a real season, so it can't collide
 * with live data. Zero dependencies — Node 18+ (native fetch) + AWS CLI for the two
 * gaps the REST API doesn't cover (tote status, and deleting the sentinel — no
 * DELETE /deployments/{id} route exists on any stage).
 */
import { spawnSync } from 'node:child_process';

export const API_HOST = 'https://miinu7boec.execute-api.us-east-2.amazonaws.com';
export const AWS_REGION = 'us-east-2';
export const SENTINEL_YEAR = 2030;
export const SEASON_CODES = { Halloween: 'HAL', Christmas: 'CHR' };
export const ZONES = [
  { zone_code: 'FY', zone_name: 'Front Yard', receptacle_id: 'REC-FY-001' },
  { zone_code: 'BY', zone_name: 'Back Yard', receptacle_id: 'REC-BY-001' },
  { zone_code: 'SY', zone_name: 'Side Yard', receptacle_id: 'REC-SY-001' },
];

export function sentinelDeploymentId(season) {
  return `DEP-${SEASON_CODES[season]}-${SENTINEL_YEAR}`;
}

/** Minimal REST client bound to a token + stage — mirrors lifecycle.e2e.mjs's `api()`. */
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

function ddb(args, stage) {
  const out = spawnSync('aws', ['dynamodb', ...args, '--region', AWS_REGION], { encoding: 'utf8' });
  if (out.status !== 0) {
    throw new Error(`aws dynamodb ${args[0]} failed: ${(out.stderr || '').trim().slice(0, 200)}`);
  }
  return out.stdout ? JSON.parse(out.stdout || '{}') : {};
}

// #715 interplay: advancing an item to PreDeployment removes it from its tote's `contents` and clears
// storage_data.tote_id; restore those too, or each run drains dev inventory.
function toteExtra(toteId, stage) {
  const r = ddb(['get-item', '--table-name', `sd_storage_records_${stage}`,
    '--key', JSON.stringify({ id: { S: toteId } })], stage);
  return {
    contents: (r?.Item?.contents?.L || []).map((v) => v.S),
    staged_deployment_id: r?.Item?.staged_deployment_id?.S ?? null,
  };
}

function itemExtra(itemId, stage) {
  const r = ddb(['get-item', '--table-name', `sd_items_records_${stage}`,
    '--key', JSON.stringify({ id: { S: itemId } })], stage);
  const sd = r?.Item?.storage_data?.M || {};
  return { tote_id: sd.tote_id?.S ?? null, is_stored: sd.is_stored?.BOOL ?? null };
}

function toteStatus(toteId, stage) {
  const r = ddb(['get-item', '--table-name', `sd_storage_records_${stage}`,
    '--key', JSON.stringify({ id: { S: toteId } })], stage);
  return r?.Item?.status?.S;
}

/**
 * Creates the sentinel deployment for `season` and returns its id. Cleans up a
 * leftover sentinel first (mirrors lifecycle.e2e.mjs phase 0's preflight).
 */
export async function createSentinelDeployment(api, season, { notes } = {}) {
  const deploymentId = sentinelDeploymentId(season);
  const existing = await api('GET', `/deployments/${deploymentId}`);
  if (existing.status === 200) {
    await deleteSentinel(api, deploymentId, 'dev');
  }
  const res = await api('POST', '/deployments', {
    season,
    year: SENTINEL_YEAR,
    zones: ZONES,
    notes: notes || 'Playwright e2e — safe to delete (#554)',
  });
  if (res.status !== 201) {
    throw new Error(`Failed to create sentinel deployment ${deploymentId}: HTTP ${res.status}`);
  }
  return deploymentId;
}

/** Restore ledger — every mutated item/tote, with the status it had before we touched it. */
export function createLedger() {
  const items = new Map();
  const totes = new Map();
  const extraItems = new Map();
  const extraTotes = new Map();

  return {
    async rememberItem(api, itemId, stage = 'dev') {
      if (items.has(itemId)) return;
      try { extraItems.set(itemId, itemExtra(itemId, stage)); } catch { /* status restore still runs */ }
      const res = await api('GET', `/items/${itemId}`);
      items.set(itemId, (res.data ?? res.body)?.status);
    },
    rememberTote(toteId, stage) {
      if (totes.has(toteId)) return;
      try { extraTotes.set(toteId, toteExtra(toteId, stage)); } catch { /* status restore still runs */ }
      totes.set(toteId, toteStatus(toteId, stage));
    },
    async restoreAll(api, stage) {
      const failed = [];
      let restored = 0;
      for (const [itemId, original] of items) {
        if (!original) { failed.push(`${itemId} (no snapshot)`); continue; }
        const res = await api('PATCH', `/items/${itemId}`, { status: original });
        if (res.status >= 200 && res.status < 300) restored++;
        else { failed.push(`${itemId} (HTTP ${res.status})`); continue; }
        const extra = extraItems.get(itemId);
        if (extra?.tote_id) {
          try {
            ddb(['update-item', '--table-name', `sd_items_records_${stage}`,
              '--key', JSON.stringify({ id: { S: itemId } }),
              '--update-expression', 'SET storage_data.tote_id = :t, storage_data.is_stored = :i',
              '--expression-attribute-values', JSON.stringify({ ':t': { S: extra.tote_id }, ':i': { BOOL: extra.is_stored === true } })], stage);
          } catch (err) { failed.push(`${itemId} tote pointer (${err.message})`); }
        }
      }
      for (const [toteId, original] of totes) {
        if (!original) { failed.push(`${toteId} (no snapshot)`); continue; }
        try {
          const extra = extraTotes.get(toteId);
          const values = { ':s': { S: original } };
          let expr = 'SET #s = :s';
          if (extra) {
            expr += ', contents = :c';
            values[':c'] = { L: extra.contents.map((v) => ({ S: v })) };
            if (extra.staged_deployment_id) { expr += ', staged_deployment_id = :d'; values[':d'] = { S: extra.staged_deployment_id }; }
            else expr += ' REMOVE staged_deployment_id';
          }
          ddb(['update-item', '--table-name', `sd_storage_records_${stage}`,
            '--key', JSON.stringify({ id: { S: toteId } }),
            '--update-expression', expr,
            '--expression-attribute-names', JSON.stringify({ '#s': 'status' }),
            '--expression-attribute-values', JSON.stringify(values)], stage);
          restored++;
        } catch (err) {
          failed.push(`${toteId} (${err.message})`);
        }
      }
      return { restored, total: items.size + totes.size, failed };
    },
  };
}

/**
 * BuilderPage redirects to (and refuses to create alongside) any non-archived deployment,
 * so a real active deployment on dev (e.g. copied from prod) hides the create form (#645).
 * Sets every such deployment's METADATA status to `archived` and returns [{id, status}] so
 * `restoreDeploymentStatuses` can put them back. Never touches `exceptId` (the sentinel).
 */
export async function archiveActiveDeployments(api, stage, exceptId) {
  const res = await api('GET', '/deployments');
  const active = (res.data || []).filter((d) => d.status !== 'archived' && d.deployment_id !== exceptId);
  const saved = [];
  for (const d of active) {
    setDeploymentStatus(d.deployment_id, 'archived', stage);
    saved.push({ id: d.deployment_id, status: d.status });
  }
  return saved;
}

export function restoreDeploymentStatuses(saved, stage) {
  const failed = [];
  for (const { id, status } of saved) {
    try { setDeploymentStatus(id, status, stage); } catch { failed.push(id); }
  }
  return failed;
}

function setDeploymentStatus(deploymentId, status, stage) {
  ddb(['update-item', '--table-name', `sd_deployments_records_${stage}`,
    '--key', JSON.stringify({ deployment_id: { S: deploymentId }, deployment_item_id: { S: 'METADATA' } }),
    '--update-expression', 'SET #s = :s',
    '--expression-attribute-names', JSON.stringify({ '#s': 'status' }),
    '--expression-attribute-values', JSON.stringify({ ':s': { S: status } })], stage);
}

/**
 * The API has no DELETE /deployments/{id} route on any stage (README §7) — try it first
 * so this self-heals if the route is ever added, then fall back to DynamoDB directly.
 */
export async function deleteSentinel(api, deploymentId, stage) {
  const res = await api('DELETE', `/deployments/${deploymentId}`);
  if (res.status === 200 || res.status === 204 || res.status === 404) return true;

  try {
    const rows = ddb(['query', '--table-name', `sd_deployments_records_${stage}`,
      '--key-condition-expression', 'deployment_id = :d',
      '--expression-attribute-values', JSON.stringify({ ':d': { S: deploymentId } })], stage);
    for (const row of rows.Items || []) {
      ddb(['delete-item', '--table-name', `sd_deployments_records_${stage}`,
        '--key', JSON.stringify({
          deployment_id: { S: deploymentId },
          deployment_item_id: { S: row.deployment_item_id.S },
        })], stage);
    }
    return true;
  } catch {
    return false;
  }
}
