#!/usr/bin/env node
/**
 * Deployments — pre-season lifecycle gate.
 *
 * Drives the full deployment state machine against a live API stage and asserts
 * every guarded transition, then restores everything it touched. Run before the
 * Halloween and Christmas setup weekends. See ../README.md for the design.
 *
 *   SD_TOKEN='eyJ...' node tests/preseason/lifecycle.e2e.mjs --season Halloween
 *   ... --year 2029   use a different sentinel year (default 2030) so a run never touches an
 *                     existing DEP-{HAL|CHR}-2030 someone is using as a test deployment
 *
 * Zero dependencies — Node 18+ (native fetch). Requires the AWS CLI for two gaps the
 * REST API does not cover: reading/restoring tote status (storage table) and deleting
 * the sentinel deployment (no DELETE route exists — see README §7).
 */
import { spawnSync } from 'node:child_process';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const API_HOST = 'https://miinu7boec.execute-api.us-east-2.amazonaws.com';
const AWS_REGION = 'us-east-2';

/** Default sentinel year: inside DEPLOYMENT_CONFIG's 2023..2030 range, never a real season. */
const DEFAULT_SENTINEL_YEAR = 2030;

const ZONES = [
  { zone_code: 'FY', zone_name: 'Front Yard', receptacle_id: 'REC-FY-001' },
  { zone_code: 'BY', zone_name: 'Back Yard', receptacle_id: 'REC-BY-001' },
  { zone_code: 'SY', zone_name: 'Side Yard', receptacle_id: 'REC-SY-001' },
];

const SEASON_CODES = { Halloween: 'HAL', Christmas: 'CHR' };

/**
 * Phases that cannot run because the inventory genuinely has no fixture for them —
 * as opposed to a seeding oversight. Reported as N/A (does not fail the run) but
 * always printed, so the gap stays visible instead of silently rotting.
 *
 * Re-verify each entry when inventory changes: if Christmas ever acquires an
 * oversized non-packable prop, delete its entry so the phases run for real.
 */
const FIXTURE_EXEMPT = {
  Christmas: {
    6: 'dev has zero non-packable Christmas items (verified 2026-08-13: 4 Halloween static props, 0 Christmas). Same code path is covered by the Halloween run.',
    10: 'depends on phase 6 fixture — see above.',
  },
};

class FixtureMissing extends Error {}

function parseArgs(argv) {
  const args = {
    season: null, stage: 'dev', verbose: false, keep: false, cleanupOnly: false,
    forceProd: false, conformance: false, offSeason: false, yes: false,
    year: DEFAULT_SENTINEL_YEAR,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--season') args.season = argv[++i];
    else if (a === '--stage') args.stage = argv[++i];
    else if (a === '--verbose' || a === '-v') args.verbose = true;
    else if (a === '--keep') args.keep = true;
    else if (a === '--cleanup-only') args.cleanupOnly = true;
    else if (a === '--force-prod') args.forceProd = true;
    else if (a === '--conformance') args.conformance = true;
    else if (a === '--off-season') args.offSeason = true;
    else if (a === '--yes') args.yes = true;
    else if (a === '--year') args.year = Number(argv[++i]);
    else die(`Unknown argument: ${a}`);
  }
  if (!['dev', 'demo', 'prod'].includes(args.stage)) die(`--stage must be dev|demo|prod`);
  if (!Number.isInteger(args.year) || args.year < 2023 || args.year > 2030) die('--year must be an integer in 2023..2030');
  // --season is required for the destructive lifecycle (it selects the sentinel ID) but
  // optional for --conformance, which is season-independent — routes/GSIs/status vocabulary
  // don't vary by season, and /stage shape sampling just picks the most recent historical
  // deployment on the target stage when no season is given.
  if (args.season && !SEASON_CODES[args.season]) die('--season must be Halloween or Christmas');
  if (!args.conformance && !SEASON_CODES[args.season]) {
    die('--season must be Halloween or Christmas');
  }
  // Conformance mode is read-only and safe against any stage, including prod, at any time
  // of year — it bypasses the destructive-lifecycle gate below entirely.
  if (args.stage === 'prod' && !args.conformance) {
    if (!args.forceProd || !args.offSeason) {
      die(
        'Refusing to run the destructive lifecycle against prod. This creates a real ' +
        'DEP-{HAL|CHR}-2030 record and mutates real item statuses. Pass BOTH --force-prod ' +
        'and --off-season if you are certain no season is active, or use --conformance for ' +
        'a safe, read-only prod check instead.'
      );
    }
  }
  return args;
}

const ARGS = parseArgs(process.argv.slice(2));
const SENTINEL_YEAR = ARGS.year;
const TOKEN = process.env.SD_TOKEN;
const BASE = `${API_HOST}/${ARGS.stage}`;
const DEPLOYMENT_ID = ARGS.season ? `DEP-${SEASON_CODES[ARGS.season]}-${SENTINEL_YEAR}` : null;

function die(msg) {
  console.error(`\n  ${msg}\n`);
  process.exit(2);
}

// ---------------------------------------------------------------------------
// Tiny test runner
// ---------------------------------------------------------------------------

const C = {
  reset: '\x1b[0m', dim: '\x1b[2m', red: '\x1b[31m',
  green: '\x1b[32m', yellow: '\x1b[33m', cyan: '\x1b[36m',
};

const results = [];

/**
 * Builds a phase runner bound to its own results array and abort flag, so the lifecycle
 * gate and conformance mode can each track pass/fail/na/skip independently without one
 * mode's abort affecting the other. `phase()` below is the lifecycle-mode instance,
 * threaded through `FIXTURE_EXEMPT` lookups exactly as before.
 */
function makePhaseRunner(resultsArray, { exemptions = {} } = {}) {
  const state = { aborted: false };
  return async function runPhase(n, name, fn, { critical = false } = {}) {
    if (state.aborted) {
      resultsArray.push({ n, name, status: 'skip' });
      console.log(`${C.dim}  ${String(n).padStart(2)}  SKIP  ${name}${C.reset}`);
      return null;
    }
    const started = Date.now();
    try {
      const value = await fn();
      const ms = Date.now() - started;
      resultsArray.push({ n, name, status: 'pass', ms });
      console.log(`${C.green}  ${String(n).padStart(2)}  PASS${C.reset}  ${name} ${C.dim}(${ms}ms)${C.reset}`);
      return value;
    } catch (err) {
      const ms = Date.now() - started;
      const exempt = exemptions[n];
      if (err instanceof FixtureMissing && exempt) {
        resultsArray.push({ n, name, status: 'na', ms, error: exempt });
        console.log(`${C.yellow}  ${String(n).padStart(2)}  N/A ${C.reset}  ${name}`);
        console.log(`${C.yellow}          ${exempt}${C.reset}`);
        return null;
      }
      if (err instanceof FixtureMissing) {
        resultsArray.push({ n, name, status: 'na', ms, error: err.message });
        console.log(`${C.yellow}  ${String(n).padStart(2)}  N/A ${C.reset}  ${name}`);
        console.log(`${C.yellow}          ${err.message}${C.reset}`);
        return null;
      }
      resultsArray.push({ n, name, status: 'fail', ms, error: err.message });
      console.log(`${C.red}  ${String(n).padStart(2)}  FAIL${C.reset}  ${name} ${C.dim}(${ms}ms)${C.reset}`);
      console.log(`${C.red}          ${err.message}${C.reset}`);
      if (critical) {
        state.aborted = true;
        console.log(`${C.yellow}          critical phase — remaining phases skipped${C.reset}`);
      }
      return null;
    }
  };
}

const phase = makePhaseRunner(results, { exemptions: FIXTURE_EXEMPT[ARGS.season] || {} });

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function assertEq(actual, expected, what) {
  if (actual !== expected) throw new Error(`${what}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

function assertStatus(res, expected, what) {
  if (res.status !== expected) {
    throw new Error(`${what}: expected HTTP ${expected}, got ${res.status} — ${JSON.stringify(res.body)?.slice(0, 200)}`);
  }
}

// ---------------------------------------------------------------------------
// API client
// ---------------------------------------------------------------------------

function authHeaders() {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` };
}

/**
 * `stage` defaults to ARGS.stage but can be overridden (e.g. 'dev') so conformance mode
 * can compare two stages from a single process without a second harness invocation.
 */
async function api(method, path, body, { stage = ARGS.stage } = {}) {
  const base = stage === ARGS.stage ? BASE : `${API_HOST}/${stage}`;
  const res = await fetch(`${base}${path}`, {
    method,
    headers: authHeaders(),
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  let parsed;
  try { parsed = text ? JSON.parse(text) : null; } catch { parsed = text; }
  if (ARGS.verbose) {
    console.log(`${C.dim}        → ${method} ${path} [${res.status}] (${stage})${C.reset}`);
  }
  return { status: res.status, body: parsed, data: parsed?.data };
}

/** API Gateway via AWS CLI — read-only `get-stage`/`get-deployment` describe calls only. */
function apigw(args) {
  const out = spawnSync('aws', ['apigateway', ...args, '--region', AWS_REGION], { encoding: 'utf8' });
  if (out.status !== 0) throw new Error(`aws apigateway ${args[0]} failed: ${(out.stderr || '').trim().slice(0, 200)}`);
  return out.stdout ? JSON.parse(out.stdout || '{}') : {};
}

/** Read an item's current status straight from the items API (source of truth). */
async function itemStatus(itemId) {
  const res = await api('GET', `/items/${itemId}`);
  assertStatus(res, 200, `GET /items/${itemId}`);
  return (res.data ?? res.body)?.status;
}

/**
 * Totes are STORAGE records, not items — `GET /items/{tote_id}` 404s on them.
 * There is no read-by-id storage route exposed here, so tote state is read from
 * the storage table directly and from the stage response's `tote_status`.
 */
function ddb(args) {
  const out = spawnSync('aws', ['dynamodb', ...args, '--region', AWS_REGION], { encoding: 'utf8' });
  if (out.status !== 0) throw new Error(`aws dynamodb ${args[0]} failed: ${(out.stderr || '').trim().slice(0, 200)}`);
  return out.stdout ? JSON.parse(out.stdout || '{}') : {};
}

function toteStatus(toteId) {
  const r = ddb(['get-item', '--table-name', `sd_storage_records_${ARGS.stage}`,
    '--key', JSON.stringify({ id: { S: toteId } })]);
  return r?.Item?.status?.S;
}

/**
 * #470: item.status never carries 'Staged' — the STAGING-{tote_id|item_id}
 * record on the deployment partition is the sole staged signal. Returns the
 * record's item_ids list, or null if no STAGING record exists for this key.
 */
function stagedItemIds(staginKey) {
  const r = ddb(['get-item', '--table-name', `sd_deployments_records_${ARGS.stage}`,
    '--key', JSON.stringify({
      deployment_id: { S: DEPLOYMENT_ID },
      deployment_item_id: { S: `STAGING-${staginKey}` },
    })]);
  if (!r?.Item) return null;
  return (r.Item.item_ids?.L || []).map((v) => v.S);
}

// ---------------------------------------------------------------------------
// Restore ledger — every mutated item, with the status it had before we touched it
// ---------------------------------------------------------------------------

const ledger = new Map(); // item_id -> original status  (items table)
const toteLedger = new Map(); // tote_id -> original status  (storage table)

async function remember(itemId) {
  if (ledger.has(itemId)) return;
  try {
    ledger.set(itemId, await itemStatus(itemId));
  } catch (err) {
    console.log(`${C.yellow}        ! could not snapshot ${itemId}: ${err.message}${C.reset}`);
  }
}

function rememberTote(toteId) {
  if (toteLedger.has(toteId)) return;
  try {
    toteLedger.set(toteId, toteStatus(toteId));
  } catch (err) {
    console.log(`${C.yellow}        ! could not snapshot tote ${toteId}: ${err.message}${C.reset}`);
  }
}

async function restoreAll() {
  const failed = [];
  let restored = 0;

  for (const [itemId, original] of ledger) {
    if (!original) { failed.push(`${itemId} (no snapshot)`); continue; }
    // NOTE: `status` only. PATCH /items/{id} does not remove attributes when sent
    // null, so staged_deployment_id cannot be cleared through the API — it is
    // audit-only and no longer read (#469), so leaving it is harmless.
    const res = await api('PATCH', `/items/${itemId}`, { status: original });
    if (res.status >= 200 && res.status < 300) restored++;
    else failed.push(`${itemId} (HTTP ${res.status})`);
  }

  for (const [toteId, original] of toteLedger) {
    if (!original) { failed.push(`${toteId} (no snapshot)`); continue; }
    try {
      ddb(['update-item', '--table-name', `sd_storage_records_${ARGS.stage}`,
        '--key', JSON.stringify({ id: { S: toteId } }),
        '--update-expression', 'SET #s = :s',
        '--expression-attribute-names', JSON.stringify({ '#s': 'status' }),
        '--expression-attribute-values', JSON.stringify({ ':s': { S: original } })]);
      restored++;
    } catch (err) {
      failed.push(`${toteId} (${err.message})`);
    }
  }

  return { restored, total: ledger.size + toteLedger.size, failed };
}

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

/**
 * The API has no DELETE /deployments/{id} route on any stage (the handler implements
 * it, but the API Gateway method was never created — README §7). Try the API first so
 * this self-heals if the route is ever added, then fall back to deleting the records
 * straight out of DynamoDB.
 */
async function deleteSentinel() {
  const res = await api('DELETE', `/deployments/${DEPLOYMENT_ID}`);
  if (res.status === 200 || res.status === 204 || res.status === 404) return true;

  try {
    const rows = ddb(['query', '--table-name', `sd_deployments_records_${ARGS.stage}`,
      '--key-condition-expression', 'deployment_id = :d',
      '--expression-attribute-values', JSON.stringify({ ':d': { S: DEPLOYMENT_ID } })]);
    for (const row of rows.Items || []) {
      ddb(['delete-item', '--table-name', `sd_deployments_records_${ARGS.stage}`,
        '--key', JSON.stringify({
          deployment_id: { S: DEPLOYMENT_ID },
          deployment_item_id: { S: row.deployment_item_id.S },
        })]);
    }
    console.log(`${C.dim}        (API DELETE unavailable — removed ${(rows.Items || []).length} row(s) via DynamoDB)${C.reset}`);
    return true;
  } catch (err) {
    console.log(`${C.red}        DDB fallback failed: ${err.message}${C.reset}`);
    return false;
  }
}

async function cleanup() {
  console.log(`\n${C.cyan}  Cleanup${C.reset}`);
  const { restored, total, failed } = await restoreAll();
  console.log(`    records restored: ${restored}/${total}`);
  if (failed.length) {
    console.log(`${C.red}    RESTORE FAILED — fix these by hand: ${failed.join(', ')}${C.reset}`);
  }
  const deleted = await deleteSentinel();
  console.log(`    sentinel ${DEPLOYMENT_ID}: ${deleted ? 'deleted' : `${C.red}DELETE FAILED${C.reset}`}`);
  return failed.length === 0 && deleted;
}

/**
 * Interactive gate on top of the `--force-prod`/`--off-season` flags (AC3): typing the
 * two flags is a copy-paste away from an accident, so the destructive lifecycle also
 * requires the operator to type an exact phrase back. `--yes` is the explicit,
 * separately-flagged bypass for scripted/off-season-batch use (CI has no TTY to prompt).
 */
async function confirmProdDestructive() {
  if (ARGS.stage !== 'prod' || ARGS.conformance || ARGS.yes) return;
  const { createInterface } = await import('node:readline/promises');
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const requiredPhrase = `DESTROY PROD ${ARGS.season}`;
  console.log(`\n${C.red}  About to run the DESTRUCTIVE lifecycle against PROD.${C.reset}`);
  console.log(`${C.yellow}  This creates ${DEPLOYMENT_ID} and mutates real item statuses.${C.reset}`);
  const answer = await rl.question(`  Type "${requiredPhrase}" to continue: `);
  rl.close();
  if (answer.trim() !== requiredPhrase) die('Confirmation phrase did not match. Aborting.');
}

// ---------------------------------------------------------------------------
// getAvailablePorts helpers (#553) — the endpoint's `items` list only ever contains
// the zone's receptacle (always present, never depends on inventory) plus whatever
// items are already wired into that zone's connection graph. On a fresh zone the
// receptacle is the ONLY entry, so it is also the only meaningful source of a "real"
// port for the gate to plug into — this mirrors how the real yard setup works
// (plug the first cord into the wall outlet) and is why the zone blocks below source
// every connection's `from_item_id`/`from_port` from this endpoint instead of a
// hardcoded item/port string.
// ---------------------------------------------------------------------------

async function fetchPorts(zoneCode) {
  const res = await api('GET', `/deployments/${DEPLOYMENT_ID}/zones/${zoneCode}/ports`);
  assertStatus(res, 200, `GET /zones/${zoneCode}/ports`);
  return res.data ?? res.body;
}

function receptacleEntry(portsData, zoneCode) {
  const receptacleId = ZONES.find((z) => z.zone_code === zoneCode)?.receptacle_id;
  return (portsData?.items || []).find((i) => i.item_id === receptacleId);
}

// ---------------------------------------------------------------------------
// The gate
// ---------------------------------------------------------------------------

async function main() {
  if (!TOKEN) die('SD_TOKEN is not set. Copy the `spookydecs_auth` cookie value from devtools.');

  if (ARGS.conformance) {
    const ok = await runConformance();
    process.exit(ok ? 0 : 1);
  }

  await confirmProdDestructive();

  console.log(`\n${C.cyan}  Deployments pre-season gate${C.reset}`);
  console.log(`  season ${ARGS.season}  ·  stage ${ARGS.stage}  ·  sentinel ${DEPLOYMENT_ID}\n`);

  if (ARGS.cleanupOnly) {
    const ok = await cleanup();
    process.exit(ok ? 0 : 1);
  }

  // Shared state threaded between phases.
  const S = {
    declared: null,
    connectionId: null,
    connectionItemId: null,
    placementItemId: null,
    connFromPort: null,
    connFromItemId: null,
    connZone: 'FY',
  };

  // ── Multi-zone connection fixture pool (#553) ─────────────────────────────
  // Every zone block and the resume-partial phase only ever needs a `to_item_id` —
  // the `from` side is always the zone's receptacle (see getAvailablePorts helpers
  // above), so the pool below only has to supply plain staged items, not powered ones.
  // Drawn first from the primary tote staged in phase 5; if that tote runs short,
  // `topUpPool` stages one more idle tote in full so multi-zone/resume coverage
  // degrades to N/A (via FixtureMissing) only when dev truly has nothing left to give.
  let primaryToteId = null;
  const toppedUpToteIds = [];
  const stagedPool = [];
  const consumedFromPool = new Set();

  async function topUpPool(staging) {
    const usedToteIds = new Set([primaryToteId, ...toppedUpToteIds].filter(Boolean));
    const candidate = (staging.totes || []).find(
      (t) => !usedToteIds.has(t.id) && (t.contents || []).length > 0
    );
    if (!candidate) return false;
    const contents = (candidate.contents || [])
      .map((c) => (typeof c === 'string' ? c : c.id)).filter(Boolean);
    if (contents.length === 0) return false;

    rememberTote(candidate.id);
    for (const id of contents) await remember(id);
    const res = await api('POST', `/deployments/${DEPLOYMENT_ID}/stage`, {
      tote_id: candidate.id, item_ids: contents,
    });
    if (res.status !== 200) return false;

    toppedUpToteIds.push(candidate.id);
    stagedPool.push(...contents);
    console.log(`${C.dim}        (topped up connection pool with tote ${candidate.id}, +${contents.length} item(s))${C.reset}`);
    return true;
  }

  /** Port a connection plugs into on this item (mirrors the server's to_port rule, #627). */
  function targetPort(item) {
    if (Number(item?.male_ends || 0) > 0) return 'Male_1';
    if (item?.power_inlet === true) return 'Power_Inlet';
    return null;
  }

  /**
   * Draws a staged pool item that can actually take power — a connection target needs a
   * male end or a power inlet, or the server now rejects the to_port. Tote-staged items stay
   * 'Packed' until declared/connected (#470), so 'Packed' or 'Staged' both count as available.
   */
  async function drawPoweredItem(staging, why) {
    const rejected = new Set();
    for (;;) {
      for (const id of stagedPool) {
        if (consumedFromPool.has(id) || rejected.has(id)) continue;
        let st;
        try { st = await itemStatus(id); } catch { rejected.add(id); continue; }
        if (!['Packed', 'Staged'].includes(st)) { rejected.add(id); continue; }
        const detail = await api('GET', `/items/${id}`);
        const port = targetPort(detail.data ?? detail.body);
        if (!port) { rejected.add(id); continue; }
        consumedFromPool.add(id);
        return { id, port };
      }
      if (!(await topUpPool(staging))) break;
    }
    throw new FixtureMissing(
      `no staged item with a male end or power inlet available for ${why} — tried topping up totes, dev has nothing left`
    );
  }

  /** Live topology as the graph page sees it: active placements + connections, receptacles resolved. */
  async function fetchGraph() {
    const res = await api('GET', `/deployments/${DEPLOYMENT_ID}/graph`);
    assertStatus(res, 200, 'GET /graph');
    return res.data ?? res.body;
  }

  /** A zone's deployed set under the no-session model: declared items + targets of active connections. */
  function zoneSet(graph, zoneCode) {
    const ids = new Set();
    (graph.placements || []).filter((p) => p.zone_code === zoneCode).forEach((p) => ids.add(p.item_id));
    (graph.connections || []).filter((c) => c.zone_code === zoneCode).forEach((c) => ids.add(c.to_item_id));
    return ids;
  }

  try {
    // ── 0 ────────────────────────────────────────────────────────────────────
    await phase(0, 'Preflight — auth valid, no leftover sentinel', async () => {
      const list = await api('GET', '/deployments');
      assertStatus(list, 200, 'GET /deployments');
      assert(Array.isArray(list.data), 'GET /deployments should return data[]');

      const existing = await api('GET', `/deployments/${DEPLOYMENT_ID}`);
      if (existing.status === 200) {
        console.log(`${C.yellow}        leftover sentinel found — removing${C.reset}`);
        assert(await deleteSentinel(), 'could not delete leftover sentinel; clean up by hand');
      }
    }, { critical: true });

    // ── 1 ────────────────────────────────────────────────────────────────────
    await phase(1, 'Create — 201, pre-deployment, exactly 3 zones', async () => {
      const res = await api('POST', '/deployments', {
        season: ARGS.season,
        year: SENTINEL_YEAR,
        zones: ZONES,
        notes: 'pre-season automated gate — safe to delete',
      });
      assertStatus(res, 201, 'POST /deployments');
      assertEq(res.data.metadata.deployment_id, DEPLOYMENT_ID, 'deployment_id');
      assertEq(res.data.metadata.status, 'pre-deployment', 'initial status');
      assertEq(res.data.zones.length, 3, 'zone count');
      assertEq(res.data.metadata.statistics.total_zones, 3, 'statistics.total_zones');
      const codes = res.data.zones.map((z) => z.zone_code).sort();
      assertEq(codes.join(','), 'BY,FY,SY', 'zone codes');
      res.data.zones.forEach((z) => assertEq(z.status, 'not_started', `zone ${z.zone_code} status`));
    }, { critical: true });

    // ── 2 ────────────────────────────────────────────────────────────────────
    await phase(2, 'Duplicate guard — second create returns 409', async () => {
      const res = await api('POST', '/deployments', {
        season: ARGS.season, year: SENTINEL_YEAR, zones: ZONES,
      });
      assertStatus(res, 409, 'duplicate POST /deployments');
    });

    // ── 3 ────────────────────────────────────────────────────────────────────
    await phase(3, 'Input validation — bad year and missing zones rejected', async () => {
      const stringYear = await api('POST', '/deployments', {
        season: ARGS.season, year: String(SENTINEL_YEAR), zones: ZONES,
      });
      assertStatus(stringYear, 400, 'year-as-string');

      const noZones = await api('POST', '/deployments', {
        season: ARGS.season, year: SENTINEL_YEAR - 1,
      });
      assertStatus(noZones, 400, 'missing zones');

      const noSeason = await api('POST', '/deployments', {
        year: SENTINEL_YEAR - 1, zones: ZONES,
      });
      assertStatus(noSeason, 400, 'missing season');
    });

    // ── 4 ────────────────────────────────────────────────────────────────────
    const staging = await phase(4, 'Stage discovery — totes and non-packables, season-matched', async () => {
      const res = await api('GET', `/deployments/${DEPLOYMENT_ID}/stage`);
      assertStatus(res, 200, 'GET /stage');
      const d = res.data;
      for (const key of ['totes', 'staged_totes', 'non_packable_items', 'staged_non_packable']) {
        assert(Array.isArray(d[key]), `/stage response missing array: ${key}`);
      }
      assertEq(d.season, ARGS.season, '/stage echoed season');

      // Season filter sanity: nothing off-season should be offered.
      const offSeason = [...d.totes, ...d.non_packable_items]
        .filter((x) => x.season && ![ARGS.season, 'Shared'].includes(x.season));
      assert(offSeason.length === 0,
        `season filter leaked ${offSeason.length} off-season record(s), e.g. ${offSeason[0]?.id}`);

      assert(d.totes.length > 0,
        `no stageable totes for ${ARGS.season} — cannot verify the staging path. ` +
        `Seed a Packed/Stored tote before the gate.`);
      return d;
    }, { critical: true });

    // ── 5 ────────────────────────────────────────────────────────────────────
    const stagedItems = await phase(5, 'Stage tote — tote and selected contents become Staged', async () => {
      // Prefer a tote with several items so the partial-staging assertion is meaningful.
      const tote = [...staging.totes].sort(
        (a, b) => (b.contents?.length || 0) - (a.contents?.length || 0))[0];
      const contents = (tote.contents || [])
        .map((c) => (typeof c === 'string' ? c : c.id)).filter(Boolean);
      assert(contents.length > 0, `tote ${tote.id} is empty — cannot verify content staging`);

      rememberTote(tote.id);
      for (const id of contents) await remember(id);

      // `POST /stage` is a PARTIAL staging API: tote_id selects the tote, item_ids
      // selects which of its contents to stage. tote_id alone is a 400.
      const missingItems = await api('POST', `/deployments/${DEPLOYMENT_ID}/stage`, { tote_id: tote.id });
      assertStatus(missingItems, 400, 'POST /stage with tote_id but no item_ids');

      const selected = contents.slice(0, Math.max(1, contents.length - 1));
      const res = await api('POST', `/deployments/${DEPLOYMENT_ID}/stage`, {
        tote_id: tote.id, item_ids: selected,
      });
      assertStatus(res, 200, 'POST /stage {tote_id, item_ids}');
      assertEq(res.data.tote_status, 'Staged', `tote ${tote.id} status in response`);
      assertEq(res.data.items_staged_count, selected.length, 'items_staged_count');
      assertEq(res.data.items_failed_count, 0, 'items_failed_count');
      assertEq(toteStatus(tote.id), 'Staged', `tote ${tote.id} status in storage table`);

      // #470: item.status never carries 'Staged' for tote-resident items — the
      // STAGING-{tote_id} record's item_ids list is the sole staged signal, and
      // selected items stay 'Packed' until create_connection/create_placement
      // advances them to 'PreDeployment'.
      const stagedIds = stagedItemIds(tote.id);
      assert(stagedIds !== null, `STAGING-${tote.id} record was not written`);
      for (const id of selected) {
        assert(stagedIds.includes(id), `${id} missing from STAGING-${tote.id}.item_ids`);
        assertEq(await itemStatus(id), 'Packed', `staged tote content ${id} stays Packed until connected`);
      }
      // Unselected contents must be left alone — partial staging must not over-reach.
      const unselected = contents.filter((id) => !selected.includes(id));
      for (const id of unselected) {
        assert(!stagedIds.includes(id), `unselected item ${id} was staged anyway`);
      }
      assertEq(res.data.items_remaining_count, unselected.length, 'items_remaining_count');

      primaryToteId = tote.id;
      stagedPool.push(...selected);
      return selected;
    }, { critical: true });

    // ── 6 ────────────────────────────────────────────────────────────────────
    const looseItem = await phase(6, 'Stage loose non-packable (#460) — no tote_id path', async () => {
      const candidate = staging.non_packable_items[0];
      if (!candidate) {
        throw new FixtureMissing(
          `no idle non-packable items for ${ARGS.season} — the #460 loose-staging path is unverified. ` +
          `Seed one (storage_data.packable === false) before the gate.`
        );
      }
      await remember(candidate.id);
      const statusBefore = await itemStatus(candidate.id);
      const res = await api('POST', `/deployments/${DEPLOYMENT_ID}/stage`, { item_ids: [candidate.id] });
      assertStatus(res, 200, 'POST /stage {item_ids}');
      // #470: item.status never carries 'Staged' — the STAGING-{item_id} record
      // is the sole staged signal, and item.status is left untouched by this call.
      const stagingIds = stagedItemIds(candidate.id);
      assert(stagingIds !== null, `STAGING-${candidate.id} record was not written`);
      assert(stagingIds.includes(candidate.id), `${candidate.id} missing from STAGING-${candidate.id}.item_ids`);
      assertEq(await itemStatus(candidate.id), statusBefore, `loose item ${candidate.id} status unchanged by staging`);

      // It must now show up on the staged side of the split, not the idle side.
      const recheck = await api('GET', `/deployments/${DEPLOYMENT_ID}/stage`);
      const stagedNonPackableIds = recheck.data.staged_non_packable.map((x) => x.id);
      assert(stagedNonPackableIds.includes(candidate.id),
        `${candidate.id} staged but absent from staged_non_packable`);
      return candidate;
    });

    // ── 7 ────────────────────────────────────────────────────────────────────
    await phase(7, 'Declare — first declare flips pre-deployment → active_setup, item → PreDeployment', async () => {
      // Declare (a PLACEMENT- record) is how an item becomes part of a zone now that sessions
      // are retired (#638). It works for any item, powered or not.
      const item = await drawPoweredItem(staging, 'FY primary item (declare + connect)');
      const res = await api('POST', `/deployments/${DEPLOYMENT_ID}/placements`, {
        zone_code: S.connZone, item_id: item.id, notes: 'pre-season gate',
      });
      assert(res.status === 200 || res.status === 201, `POST /placements: ${res.status} ${JSON.stringify(res.body)?.slice(0, 200)}`);
      S.declared = item;
      assertEq(await itemStatus(item.id), 'PreDeployment', `declared item ${item.id} status`);
      const dep = await api('GET', `/deployments/${DEPLOYMENT_ID}`);
      assertEq(dep.data.status ?? dep.data.metadata?.status, 'active_setup',
        'deployment status after first declare');
    }, { critical: true });

    // ── 8 ────────────────────────────────────────────────────────────────────
    await phase(8, 'Declare guard — declaring an already-declared item returns 409', async () => {
      assert(S.declared, 'no declared item from phase 7');
      const res = await api('POST', `/deployments/${DEPLOYMENT_ID}/placements`, {
        zone_code: S.connZone, item_id: S.declared.id,
      });
      assertStatus(res, 409, 'duplicate declare');
    });

    // ── 8.5 ──────────────────────────────────────────────────────────────────
    const fyPorts = await phase(8.5, 'getAvailablePorts [FY] — receptacle offers a usable port', async () => {
      const data = await fetchPorts(S.connZone);
      const entry = receptacleEntry(data, S.connZone);
      assert(entry, `receptacle missing from getAvailablePorts items [${S.connZone}] — empty picker in the UI`);
      assert(entry.available_count > 0, `receptacle has no available ports [${S.connZone}]`);
      assert(Array.isArray(entry.available_ports) && entry.available_ports.length > 0,
        `receptacle available_ports empty despite available_count > 0 [${S.connZone}]`);
      return entry;
    }, { critical: true });

    // ── 9 ────────────────────────────────────────────────────────────────────
    await phase(9, 'Connection path — wire the declared item to the receptacle (no session needed)', async () => {
      // `from` is the power SOURCE (the zone receptacle, sourced from getAvailablePorts per #553);
      // `to` is the declared item being plugged in. Ports use the server's real names (#627).
      assert(S.declared, 'no declared item from phase 7');
      S.connFromItemId = fyPorts.item_id;
      S.connFromPort = fyPorts.available_ports[0];
      const res = await api('POST', `/deployments/${DEPLOYMENT_ID}/connections`, {
        zone_code: S.connZone,
        from_item_id: S.connFromItemId,
        from_port: S.connFromPort,
        to_item_id: S.declared.id,
        to_port: S.declared.port,
        notes: 'pre-season gate',
      });
      assert(res.status === 200 || res.status === 201, `POST /connections: ${res.status} ${JSON.stringify(res.body)?.slice(0, 200)}`);
      assert(res.data.session_id === undefined, 'connection record still carries a session_id — sessions should be gone');
      S.connectionId = res.data.connection_id;
      S.connectionItemId = S.declared.id;
      assertEq(await itemStatus(S.declared.id), 'PreDeployment', `connected item ${S.declared.id} status`);
    }, { critical: true });

    // ── 9.5 ──────────────────────────────────────────────────────────────────
    await phase(9.5, 'getAvailablePorts [FY] — consumed port now excluded', async () => {
      const data = await fetchPorts(S.connZone);
      const entry = receptacleEntry(data, S.connZone);
      assert(entry, `receptacle missing from getAvailablePorts items after connecting [${S.connZone}]`);
      assert(!entry.available_ports.includes(S.connFromPort),
        `consumed port ${S.connFromPort} still listed as available — getAvailablePorts not reflecting live connection state`);
    });

    // ── 10 ───────────────────────────────────────────────────────────────────
    await phase(10, 'Placement path (#457) — static prop Staged → PreDeployment', async () => {
      if (!looseItem) throw new FixtureMissing('no loose non-packable staged in phase 6 — placement path unverified');
      const detail = await api('GET', `/items/${looseItem.id}`);
      const item = detail.data ?? detail.body;
      const portless = Number(item.male_ends || 0) === 0
        && Number(item.female_ends || 0) === 0
        && item.power_inlet !== true;
      assert(portless, `${looseItem.id} has power ports — pick a static prop for the placement path`);

      const res = await api('POST', `/deployments/${DEPLOYMENT_ID}/placements`, {
        zone_code: S.connZone, item_id: looseItem.id, notes: 'pre-season gate',
      });
      assert(res.status === 200 || res.status === 201, `POST /placements: ${res.status}`);
      S.placementItemId = looseItem.id;
      assertEq(await itemStatus(looseItem.id), 'PreDeployment', `placed prop ${looseItem.id} status`);
    });

    // ── 11 ───────────────────────────────────────────────────────────────────
    await phase(11, 'Port reuse guard — a source port already in use is rejected', async () => {
      assert(S.connFromItemId, 'no connection created in phase 9');
      const other = await drawPoweredItem(staging, 'port-reuse guard (to)');
      const res = await api('POST', `/deployments/${DEPLOYMENT_ID}/connections`, {
        zone_code: S.connZone,
        from_item_id: S.connFromItemId,
        from_port: S.connFromPort,
        to_item_id: other.id,
        to_port: other.port,
      });
      assertStatus(res, 400, 'duplicate source port connection');
      assert(/already in use/i.test(JSON.stringify(res.body)), `rejected for the wrong reason: ${JSON.stringify(res.body)?.slice(0, 160)}`);
    });

    // ── 11.1 ─────────────────────────────────────────────────────────────────
    await phase(11.1, 'Target dedupe (#628) — an item can only be plugged in once per deployment', async () => {
      const entry = receptacleEntry(await fetchPorts(S.connZone), S.connZone);
      if (!entry || entry.available_count === 0) {
        throw new FixtureMissing(`receptacle has no second free port [${S.connZone}] — target-dedupe guard unverified this run`);
      }
      const res = await api('POST', `/deployments/${DEPLOYMENT_ID}/connections`, {
        zone_code: S.connZone,
        from_item_id: entry.item_id,
        from_port: entry.available_ports[0],
        to_item_id: S.declared.id,
        to_port: S.declared.port,
      });
      assertStatus(res, 400, 'second connection into the same target');
      assert(/already has an active connection/i.test(JSON.stringify(res.body)), `rejected for the wrong reason: ${JSON.stringify(res.body)?.slice(0, 160)}`);
    });

    // ── 11.2 ─────────────────────────────────────────────────────────────────
    await phase(11.2, 'to_port validation (#627) — nonexistent target port rejected', async () => {
      const entry = receptacleEntry(await fetchPorts(S.connZone), S.connZone);
      if (!entry || entry.available_count === 0) {
        throw new FixtureMissing(`no free receptacle port to test to_port validation [${S.connZone}]`);
      }
      const other = await drawPoweredItem(staging, 'to_port validation (to)');
      const res = await api('POST', `/deployments/${DEPLOYMENT_ID}/connections`, {
        zone_code: S.connZone,
        from_item_id: entry.item_id,
        from_port: entry.available_ports[0],
        to_item_id: other.id,
        to_port: 'Male_99',
      });
      assertStatus(res, 400, 'to_port Male_99');
    });

    // ── 11.3 ─────────────────────────────────────────────────────────────────
    await phase(11.3, 'Zone integrity (#638) — wiring across zones is rejected', async () => {
      const byEntry = receptacleEntry(await fetchPorts('BY'), 'BY');
      assert(byEntry && byEntry.available_count > 0, 'BY receptacle has no free port for the cross-zone attempt');
      // A fresh, unwired item declared in FY. (Not S.declared: that one already has a connection,
      // so the target-dedupe guard would fire first and mask the zone check.)
      const fyItem = await drawPoweredItem(staging, 'cross-zone guard (declared in FY)');
      const decl = await api('POST', `/deployments/${DEPLOYMENT_ID}/placements`, {
        zone_code: S.connZone, item_id: fyItem.id, notes: 'pre-season gate — cross-zone fixture',
      });
      assert(decl.status === 200 || decl.status === 201, `POST /placements (cross-zone fixture): ${decl.status}`);
      // A BY outlet feeding an item declared in FY must be refused.
      const res = await api('POST', `/deployments/${DEPLOYMENT_ID}/connections`, {
        zone_code: 'BY',
        from_item_id: byEntry.item_id,
        from_port: byEntry.available_ports[0],
        to_item_id: fyItem.id,
        to_port: fyItem.port,
      });
      assertStatus(res, 400, 'BY outlet → item declared in FY');
      assert(/zone/i.test(JSON.stringify(res.body)), `rejected for the wrong reason: ${JSON.stringify(res.body)?.slice(0, 160)}`);
    });

    // ── 12 ───────────────────────────────────────────────────────────────────
    await phase(12, 'Sessions retired — the session routes no longer exist', async () => {
      // The API Gateway resources are still deployed (deletion deferred to a cleanup issue),
      // so this proves the handler no longer serves them.
      const open = await api('POST', `/deployments/${DEPLOYMENT_ID}/sessions`, { zone_code: S.connZone });
      assertStatus(open, 404, 'POST /sessions');
      const active = await api('GET', `/deployments/${DEPLOYMENT_ID}/sessions/active`);
      assertStatus(active, 404, 'GET /sessions/active');
    });

    // Removal fixture (12.1-12.5, #552) — a second connection, soft-removed, then hard-deleted.

    // ── 12.1 ─────────────────────────────────────────────────────────────────
    const removalFixture = await phase(12.1, 'Removal fixture — second connection candidate (receptacle port 2, #553)', async () => {
      const data = await fetchPorts(S.connZone);
      const entry = receptacleEntry(data, S.connZone);
      assert(entry, `receptacle missing from getAvailablePorts items [${S.connZone}]`);
      if (entry.available_count === 0) {
        throw new FixtureMissing(
          `receptacle has no free port left for the removal fixture [${S.connZone}] — the removal path (#552) is unverified this run.`
        );
      }
      const to2 = await drawPoweredItem(staging, 'removal fixture connection (to)');
      return { fromPort: entry.available_ports[0], to2 };
    });

    // ── 12.2 ─────────────────────────────────────────────────────────────────
    const removalConn = await phase(12.2, 'Removal fixture — create second connection', async () => {
      if (!removalFixture) throw new FixtureMissing('no removal fixture (see 12.1)');
      const { fromPort, to2 } = removalFixture;
      const res = await api('POST', `/deployments/${DEPLOYMENT_ID}/connections`, {
        zone_code: S.connZone,
        from_item_id: S.connFromItemId,
        from_port: fromPort,
        to_item_id: to2.id,
        to_port: to2.port,
        notes: 'pre-season gate — removal fixture (#552)',
      });
      assert(res.status === 200 || res.status === 201, `POST /connections (removal fixture): ${res.status} ${JSON.stringify(res.body)?.slice(0, 160)}`);
      assertEq(await itemStatus(to2.id), 'PreDeployment', `removal-candidate ${to2.id} status`);
      return { connectionId: res.data.connection_id, toItemId: to2.id };
    });

    // ── 12.3 ─────────────────────────────────────────────────────────────────
    await phase(12.3, 'PATCH connection → removal (connection_type=removal)', async () => {
      if (!removalConn) throw new FixtureMissing('no removal fixture (see 12.1/12.2)');
      const res = await api('PATCH', `/deployments/${DEPLOYMENT_ID}/connections/${removalConn.connectionId}`, {
        removal_reason: 'pre-season gate — connection removal coverage (#552)',
      });
      assertStatus(res, 200, 'PATCH /connections/{cid}');
      assertEq(res.data.connection_type, 'removal', 'connection_type after PATCH');
    });

    // ── 12.4 ─────────────────────────────────────────────────────────────────
    await phase(12.4, 'Graph excludes the soft-removed connection but keeps the live one', async () => {
      if (!removalConn) throw new FixtureMissing('no removal fixture (see 12.1/12.2)');
      const g = await fetchGraph();
      const ids = (g.connections || []).map((c) => c.connection_id);
      assert(!ids.includes(removalConn.connectionId), `removed connection ${removalConn.connectionId} still in the live graph`);
      assert(ids.includes(S.connectionId), `live connection ${S.connectionId} missing from the graph`);
    });

    // ── 12.5 ─────────────────────────────────────────────────────────────────
    await phase(12.5, 'DELETE — hard remove the fixture connection', async () => {
      if (!removalConn) throw new FixtureMissing('no removal fixture (see 12.1/12.2)');
      const res = await api('DELETE', `/deployments/${DEPLOYMENT_ID}/connections/${removalConn.connectionId}`);
      assertStatus(res, 200, 'DELETE /connections/{cid}');
      const again = await api('DELETE', `/deployments/${DEPLOYMENT_ID}/connections/${removalConn.connectionId}`);
      assertStatus(again, 404, 'DELETE an already-deleted connection');
      // No restore path for a hard delete — same precedent as sentinel deletion (README §7).
      // Deleting it also frees the receptacle's second port: the resume phase (21, #553) relies on that.
    });

    // ── 12.6 ─────────────────────────────────────────────────────────────────
    await phase(12.6, 'Illuminates — PATCH connection illuminates[] sets and clears the list', async () => {
      if (!S.placementItemId) throw new FixtureMissing('no placed prop from phase 10 to illuminate');
      const set = await api('PATCH', `/deployments/${DEPLOYMENT_ID}/connections/${S.connectionId}`, {
        illuminates: [S.placementItemId, S.placementItemId],
      });
      assertStatus(set, 200, 'PATCH illuminates');
      assertEq(JSON.stringify(set.data.illuminates), JSON.stringify([S.placementItemId]), 'illuminates (deduped)');
      const g = await fetchGraph();
      const conn = (g.connections || []).find((c) => c.connection_id === S.connectionId);
      assert(conn?.illuminates?.includes(S.placementItemId), 'graph connection does not carry the illuminates list');
      const clear = await api('PATCH', `/deployments/${DEPLOYMENT_ID}/connections/${S.connectionId}`, { illuminates: [] });
      assertStatus(clear, 200, 'PATCH illuminates []');
      assertEq((clear.data.illuminates || []).length, 0, 'illuminates cleared');
    });

    // ── 13 ───────────────────────────────────────────────────────────────────
    await phase(13, 'Graph payload — declared + connected set is complete (what Complete will deploy)', async () => {
      const g = await fetchGraph();
      const set = zoneSet(g, S.connZone);
      assert(set.has(S.declared.id), `declared+connected item ${S.declared.id} absent from the FY set`);
      if (S.placementItemId) {
        assert(set.has(S.placementItemId), `placed prop ${S.placementItemId} absent from the FY set — the #457 declare path regressed`);
      }
      if (removalConn) {
        assert(!set.has(removalConn.toItemId), `removed item ${removalConn.toItemId} STILL in the FY set`);
      }
      const receptacles = Object.values(g.zones || {}).flatMap((z) => z.receptacle_ids || []);
      for (const r of receptacles) assert(g.items?.[r], `receptacle ${r} not resolved in graph items — port-aware authoring needs its female_ends`);
    }, { critical: true });

    // ── Multi-zone coverage (#553) ─────────────────────────────────────────
    // Each zone declares and wires its own item; the zone-scoped sets must stay independent
    // (no item shows up under another zone's records).
    const deployedSoFar = [S.connectionItemId, S.placementItemId].filter(Boolean);

    async function runZoneBlock(zoneCode, phaseBase) {
      const local = {};

      await phase(phaseBase + 0.1, `Declare [${zoneCode}] — item set up in the zone, deployment stays active_setup`, async () => {
        local.item = await drawPoweredItem(staging, `${zoneCode} declare + connect`);
        const res = await api('POST', `/deployments/${DEPLOYMENT_ID}/placements`, {
          zone_code: zoneCode, item_id: local.item.id, notes: 'pre-season gate — multi-zone (#553)',
        });
        assert(res.status === 200 || res.status === 201, `POST /placements [${zoneCode}]: ${res.status} ${JSON.stringify(res.body)?.slice(0, 160)}`);
        assertEq(await itemStatus(local.item.id), 'PreDeployment', `declared item ${local.item.id} status [${zoneCode}]`);
        const dep = await api('GET', `/deployments/${DEPLOYMENT_ID}`);
        assertEq(dep.data.status ?? dep.data.metadata?.status, 'active_setup', `deployment status after declare [${zoneCode}]`);
      }, { critical: true });

      const ports = await phase(phaseBase + 0.3, `getAvailablePorts [${zoneCode}] — receptacle offers a usable port`, async () => {
        const data = await fetchPorts(zoneCode);
        const entry = receptacleEntry(data, zoneCode);
        assert(entry, `receptacle missing from getAvailablePorts items [${zoneCode}]`);
        assert(entry.available_count > 0, `receptacle has no available ports [${zoneCode}]`);
        return entry;
      }, { critical: true });

      await phase(phaseBase + 0.4, `Connection path [${zoneCode}] — wire the declared item`, async () => {
        const res = await api('POST', `/deployments/${DEPLOYMENT_ID}/connections`, {
          zone_code: zoneCode,
          from_item_id: ports.item_id,
          from_port: ports.available_ports[0],
          to_item_id: local.item.id,
          to_port: local.item.port,
          notes: 'pre-season gate — multi-zone (#553)',
        });
        assert(res.status === 200 || res.status === 201, `POST /connections [${zoneCode}]: ${res.status} ${JSON.stringify(res.body)?.slice(0, 160)}`);
      });

      await phase(phaseBase + 0.5, `Zone scoping [${zoneCode}] — this zone's records are its own`, async () => {
        const g = await fetchGraph();
        const set = zoneSet(g, zoneCode);
        assert(set.has(local.item.id), `item ${local.item.id} absent from the ${zoneCode} set`);
        // Independence: items from other zones must not appear under this zone's records.
        for (const foreignId of deployedSoFar) {
          assert(!set.has(foreignId), `zone ${zoneCode} set leaked item ${foreignId} from a different zone`);
        }
      }, { critical: true });

      deployedSoFar.push(local.item.id);
    }

    // ── 19.x ─────────────────────────────────────────────────────────────────
    await runZoneBlock('BY', 19);

    // ── 20.x ─────────────────────────────────────────────────────────────────
    await runZoneBlock('SY', 20);

    // ── 21 ───────────────────────────────────────────────────────────────────
    await phase(21, 'Resume [FY] — extend an active_setup deployment without losing earlier items', async () => {
      // Setups are built a few items at a time across days, so adding to a zone later must not
      // disturb what is already there and must not re-fire the pre-deployment → active_setup flip.
      const before = zoneSet(await fetchGraph(), 'FY');
      assert(before.size > 0, 'FY zone has no prior items to verify resume against');

      const entry = receptacleEntry(await fetchPorts('FY'), 'FY');
      assert(entry && entry.available_count > 0,
        'receptacle has no free port for the resume connection — expected the removal-fixture port (12.5) to be free again');

      const item = await drawPoweredItem(staging, 'resume connection');
      const decl = await api('POST', `/deployments/${DEPLOYMENT_ID}/placements`, { zone_code: 'FY', item_id: item.id, notes: 'pre-season gate — resume (#553)' });
      assert(decl.status === 200 || decl.status === 201, `POST /placements (resume): ${decl.status}`);
      const conn = await api('POST', `/deployments/${DEPLOYMENT_ID}/connections`, {
        zone_code: 'FY', from_item_id: entry.item_id, from_port: entry.available_ports[0],
        to_item_id: item.id, to_port: item.port, notes: 'pre-season gate — resume (#553)',
      });
      assert(conn.status === 200 || conn.status === 201, `POST /connections (resume): ${conn.status}`);
      assertEq(await itemStatus(item.id), 'PreDeployment', `resume item ${item.id} status`);

      const dep = await api('GET', `/deployments/${DEPLOYMENT_ID}`);
      assertEq(dep.data.status ?? dep.data.metadata?.status, 'active_setup', 'deployment status unchanged on resume');

      const after = zoneSet(await fetchGraph(), 'FY');
      for (const id of before) assert(after.has(id), `resume DROPPED prior item ${id} from the FY set`);
      assert(after.has(item.id), `resume item ${item.id} absent from the FY set`);
    }, { critical: true });

    // ── 14 ───────────────────────────────────────────────────────────────────
    const deployedIds = await phase(14, 'Complete — status completed, items Deployed', async () => {
      const preGraph = await fetchGraph();
      const derivedBeforeComplete = new Set(['FY', 'BY', 'SY'].flatMap((z) => [...zoneSet(preGraph, z)]));
      const res = await api('POST', `/deployments/${DEPLOYMENT_ID}/complete`);
      assertStatus(res, 200, 'POST /complete');

      const dep = await api('GET', `/deployments/${DEPLOYMENT_ID}?include=zones`);
      assertEq(dep.data.status ?? dep.data.metadata?.status, 'completed', 'status after complete');

      const ids = (dep.data.zones || []).flatMap((z) => z.items_deployed || []);
      assert(ids.length > 0, 'no items_deployed after complete — nothing was actually deployed');
      // Complete derives the deployed set from records (sessions are gone): every declared item and
      // every connection target must have been written to its zone and flipped to Deployed.
      for (const id of derivedBeforeComplete) {
        assert(ids.includes(id), `item ${id} was declared/connected but absent from items_deployed after complete`);
      }
      for (const id of ids) {
        assertEq(await itemStatus(id), 'Deployed', `item ${id} status after complete`);
      }
      return ids;
    }, { critical: true });

    // ── 15 ───────────────────────────────────────────────────────────────────
    await phase(15, 'Teardown ordering — start requires completed, complete requires no Deployed', async () => {
      const start = await api('POST', `/deployments/${DEPLOYMENT_ID}/teardown/start`);
      assertStatus(start, 200, 'POST /teardown/start');
      assertEq(start.data.status, 'active_teardown', 'status after teardown/start');

      const premature = await api('POST', `/deployments/${DEPLOYMENT_ID}/teardown/complete`);
      assertStatus(premature, 400, 'teardown/complete with items still Deployed');
      assert(premature.body?.details?.still_deployed?.length > 0,
        'teardown/complete 400 should list still_deployed items');
    }, { critical: true });

    // ── 16 ───────────────────────────────────────────────────────────────────
    await phase(16, 'Teardown items — Deployed → TearDown', async () => {
      for (const id of deployedIds) {
        const res = await api('POST', `/deployments/${DEPLOYMENT_ID}/teardown/item`, { item_id: id });
        assertStatus(res, 200, `teardown/item ${id}`);
        assertEq(await itemStatus(id), 'TearDown', `item ${id} status after teardown`);
      }

      // Same item twice must be rejected — it is no longer Deployed.
      const repeat = await api('POST', `/deployments/${DEPLOYMENT_ID}/teardown/item`, {
        item_id: deployedIds[0],
      });
      assertStatus(repeat, 400, 'repeat teardown/item');
    }, { critical: true });

    // ── 17 ───────────────────────────────────────────────────────────────────
    await phase(17, 'Archive — teardown/complete flips to archived', async () => {
      const res = await api('POST', `/deployments/${DEPLOYMENT_ID}/teardown/complete`);
      assertStatus(res, 200, 'POST /teardown/complete');
      assertEq(res.data.status, 'archived', 'status after teardown/complete');
      assert(res.data.teardown_completed_at, 'teardown_completed_at not set');
    }, { critical: true });

    // ── 18 ───────────────────────────────────────────────────────────────────
    await phase(18, 'Historical — archived deployment is listable and readable', async () => {
      const list = await api('GET', '/deployments/historical');
      assertStatus(list, 200, 'GET /deployments/historical');
      const ids = (list.data || []).map((d) => d.deployment_id);
      assert(ids.includes(DEPLOYMENT_ID),
        `${DEPLOYMENT_ID} archived but missing from /historical (status-index query may have regressed)`);

      const detail = await api('GET', `/deployments/historical/${DEPLOYMENT_ID}`);
      assertStatus(detail, 200, 'GET /deployments/historical/{id}');
      assertEq(detail.data.season ?? detail.data.metadata?.season, ARGS.season, 'archived season');
    });
  } finally {
    if (ARGS.keep) {
      console.log(`\n${C.yellow}  --keep set: leaving ${DEPLOYMENT_ID} and ${ledger.size} mutated item(s) in place.${C.reset}`);
      console.log(`${C.yellow}  Undo with: node ${process.argv[1]} --season ${ARGS.season} --cleanup-only${C.reset}`);
      console.log(`${C.dim}  ledger: ${JSON.stringify(Object.fromEntries(ledger))}${C.reset}`);
    } else {
      await cleanup();
    }
    summarizeLifecycle();
  }
}

/**
 * States exactly what ran: the deployment/item state machine transitions, on ARGS.stage,
 * across all three zones plus a resume-partial cycle. Does NOT claim "Season-ready" —
 * that would imply coverage (browser/UI behavior, prod route/schema parity) this suite
 * explicitly disclaims. See sub_tests/deployments.md §8 for the known-gaps list.
 */
function summarizeLifecycle() {
  const pass = results.filter((r) => r.status === 'pass').length;
  const fail = results.filter((r) => r.status === 'fail');
  const skip = results.filter((r) => r.status === 'skip').length;
  const na = results.filter((r) => r.status === 'na');

  console.log(`\n${C.cyan}  Summary${C.reset}`);
  console.log(`    ${C.green}${pass} passed${C.reset}  ${fail.length ? C.red : C.dim}${fail.length} failed${C.reset}  ${C.dim}${skip} skipped${C.reset}  ${na.length ? C.yellow : C.dim}${na.length} n/a${C.reset}`);

  if (na.length) {
    console.log(`\n${C.yellow}  Not exercised — no inventory fixture exists:${C.reset}`);
    for (const r of na) console.log(`${C.yellow}    ${r.n}. ${r.name}${C.reset}`);
  }

  if (fail.length) {
    console.log(`\n${C.red}  NOT SEASON-READY — do not start setup weekend.${C.reset}`);
    for (const f of fail) console.log(`${C.red}    ${f.n}. ${f.name}: ${f.error}${C.reset}`);
    console.log('');
    process.exit(1);
  }
  console.log(
    `\n${C.green}  Verified: ${ARGS.season} deployment state machine (create → stage → ` +
    `declare → connect → remove → complete → teardown → archive) transitions ` +
    `correctly on ${ARGS.stage}, across all three zones (FY/BY/SY), including connection ` +
    `removal, the server guards (port reuse, target dedupe, to_port, cross-zone) and a resume cycle.${C.reset}`
  );
  console.log(
    `${C.dim}  This does not verify: browser/UI behavior or prod route/schema parity — ` +
    `run --conformance for that, see sub_tests/deployments.md §8.${C.reset}\n`
  );
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Conformance mode — read-only, safe against prod at any time (AC1/AC2/AC3)
// ---------------------------------------------------------------------------

const STATUS_VOCAB = ['pre-deployment', 'active_setup', 'completed', 'active_teardown', 'archived'];

/** Flattened `METHOD path` set for a stage's currently-deployed API Gateway snapshot. */
function deployedRouteSet(stage) {
  const restApiId = 'miinu7boec';
  const { deploymentId } = apigw(['get-stage', '--rest-api-id', restApiId, '--stage-name', stage]);
  if (!deploymentId) throw new Error(`no deploymentId for stage ${stage}`);
  const { apiSummary } = apigw([
    'get-deployment', '--rest-api-id', restApiId, '--deployment-id', deploymentId, '--embed', 'apisummary',
  ]);
  const out = new Set();
  for (const [path, methods] of Object.entries(apiSummary || {})) {
    for (const method of Object.keys(methods || {})) out.add(`${method} ${path}`);
  }
  return out;
}

/**
 * Reproduces the #551 discovery mechanism: dev's `/deployments/{id}` resource had
 * PUT/DELETE implemented by the Lambda but missing from dev's *deployed stage snapshot*.
 * `get-resources` alone would not have caught this — it reflects the resource/method tree,
 * not what's actually live on a given stage. `get-stage` + `get-deployment --embed
 * apisummary` reads the real deployed snapshot per stage. Entirely read-only (describe-class
 * calls).
 */
function checkRoutes() {
  const devRoutes = deployedRouteSet('dev');
  const targetRoutes = deployedRouteSet(ARGS.stage);
  const missing = [...devRoutes].filter((r) => !targetRoutes.has(r)).sort();
  const extra = [...targetRoutes].filter((r) => !devRoutes.has(r)).sort();
  if (missing.length || extra.length) {
    throw new Error(
      `route drift vs dev — missing on ${ARGS.stage}: [${missing.join(', ') || 'none'}]; ` +
      `extra on ${ARGS.stage}: [${extra.join(', ') || 'none'}]`
    );
  }
}

/** Sorted `IndexName:attr(KeyType),...` signature for a stage's deployments table GSIs. */
function gsiSignature(stage) {
  const d = ddb(['describe-table', '--table-name', `sd_deployments_records_${stage}`]);
  return (d.Table?.GlobalSecondaryIndexes || [])
    .map((g) => `${g.IndexName}:${(g.KeySchema || []).map((k) => `${k.AttributeName}(${k.KeyType})`).join(',')}`)
    .sort();
}

function checkGsis() {
  const dev = gsiSignature('dev');
  const target = gsiSignature(ARGS.stage);
  assertEq(target.join('|'), dev.join('|'), `GSI signature dev vs ${ARGS.stage}`);
}

/**
 * Observes real `status` values on the target stage (active + historical deployments) and
 * asserts they're a SUBSET of the known vocabulary — not equality, since an off-season prod
 * may show only `archived` (or, before any deployment has ever run there, nothing at all).
 */
async function checkStatusVocabulary() {
  const active = await api('GET', '/deployments', null, { stage: ARGS.stage });
  assertStatus(active, 200, `GET /deployments (${ARGS.stage})`);
  const hist = await api('GET', '/deployments/historical', null, { stage: ARGS.stage });
  assertStatus(hist, 200, `GET /deployments/historical (${ARGS.stage})`);

  const all = [...(active.data || []), ...(hist.data || [])];
  const observed = new Set(all.map((d) => d.status ?? d.metadata?.status).filter(Boolean));

  const unknown = [...observed].filter((s) => !STATUS_VOCAB.includes(s));
  assert(unknown.length === 0,
    `${ARGS.stage} has status value(s) outside the known vocabulary: ${unknown.join(', ')}`);

  if (observed.size === 0) {
    throw new FixtureMissing(`no deployments (live or archived) exist on ${ARGS.stage} — vocabulary unobservable this run`);
  }
}

/**
 * Samples a real historical deployment's `/stage` response shape on the target stage.
 * Read-only regardless of the deployment's status — an archived deployment's `/stage`
 * legitimately returns empty arrays, but the response KEYS are what's being asserted.
 * No sentinel is created; falls back to N/A if the target stage has no historical deployments.
 */
async function checkStageShape() {
  const hist = await api('GET', '/deployments/historical', null, { stage: ARGS.stage });
  assertStatus(hist, 200, `GET /deployments/historical (${ARGS.stage})`);
  const sample = (hist.data || [])[0];
  if (!sample) {
    throw new FixtureMissing(`no historical deployment on ${ARGS.stage} to sample /stage shape from`);
  }
  const res = await api('GET', `/deployments/${sample.deployment_id}/stage`, null, { stage: ARGS.stage });
  assertStatus(res, 200, `GET /stage on ${sample.deployment_id} (${ARGS.stage})`);
  for (const key of ['totes', 'staged_totes', 'non_packable_items', 'staged_non_packable', 'season']) {
    assert(key in (res.data || {}), `/stage response on ${ARGS.stage} missing key: ${key}`);
  }
}

/** Item count for the sentinel's deployment_id partition — 0 both times means no writes. */
function sentinelPartitionCount(stage, seasonCode) {
  const d = ddb([
    'query', '--table-name', `sd_deployments_records_${stage}`,
    '--key-condition-expression', 'deployment_id = :d',
    '--expression-attribute-values', JSON.stringify({ ':d': { S: `DEP-${seasonCode}-${SENTINEL_YEAR}` } }),
    '--select', 'COUNT',
  ]);
  return d.Count ?? 0;
}

/**
 * AC1's zero-writes proof. `describe-table`'s ItemCount is an eventually-consistent
 * estimate AWS refreshes roughly every 6 hours — not reliable for a same-run before/after
 * diff, so it's logged as supplementary context only. The actual pass/fail assertion is a
 * cheap, accurate `Query ... Select=COUNT` scoped to BOTH sentinel partitions (Halloween
 * and Christmas — conformance doesn't require --season), since that directly answers
 * "did this run write the one partition it could plausibly touch."
 */
function sentinelCountsSnapshot(stage) {
  return Object.fromEntries(
    Object.values(SEASON_CODES).map((code) => [code, sentinelPartitionCount(stage, code)])
  );
}

async function runConformance() {
  console.log(`\n${C.cyan}  Deployments conformance check — dev vs ${ARGS.stage}${C.reset}\n`);

  const before = sentinelCountsSnapshot(ARGS.stage);
  const beforeItemCount = ddb(['describe-table', '--table-name', `sd_deployments_records_${ARGS.stage}`]).Table?.ItemCount;

  const cResults = [];
  const cPhase = makePhaseRunner(cResults);

  await cPhase('routes', 'API Gateway route parity (dev vs target, deployed snapshot)', () => checkRoutes());
  await cPhase('gsi', 'DynamoDB table + GSI parity (dev vs target)', () => checkGsis());
  await cPhase('status', 'Status vocabulary parity (observed ⊆ known vocabulary)', () => checkStatusVocabulary());
  await cPhase('stage-shape', '/stage response shape parity (sampled from a real historical deployment)', () => checkStageShape());

  const after = sentinelCountsSnapshot(ARGS.stage);
  const afterItemCount = ddb(['describe-table', '--table-name', `sd_deployments_records_${ARGS.stage}`]).Table?.ItemCount;
  await cPhase('zero-write', 'Zero writes performed (sentinel partition count unchanged)', () => {
    assertEq(JSON.stringify(after), JSON.stringify(before), `sentinel partition counts on ${ARGS.stage}`);
  });
  console.log(`${C.dim}  (informational) whole-table ItemCount on ${ARGS.stage}: ${beforeItemCount} → ${afterItemCount} ` +
    `— AWS-estimated, refreshed ~every 6h, not asserted on${C.reset}`);

  return summarizeConformance(cResults);
}

/**
 * States exactly what ran: read-only structural parity between dev and ARGS.stage. Does
 * NOT claim the write-path state machine works on ARGS.stage — only --stage dev/demo runs
 * (the destructive lifecycle) prove that. Matches AC6: no claim beyond the evidence.
 */
function summarizeConformance(cResults) {
  const pass = cResults.filter((r) => r.status === 'pass').length;
  const fail = cResults.filter((r) => r.status === 'fail');
  const na = cResults.filter((r) => r.status === 'na');

  console.log(`\n${C.cyan}  Conformance summary${C.reset}`);
  console.log(`    ${C.green}${pass} passed${C.reset}  ${fail.length ? C.red : C.dim}${fail.length} failed${C.reset}  ${na.length ? C.yellow : C.dim}${na.length} n/a${C.reset}`);

  if (na.length) {
    console.log(`\n${C.yellow}  Not checked — no fixture to sample on ${ARGS.stage}:${C.reset}`);
    for (const r of na) console.log(`${C.yellow}    ${r.name}${C.reset}`);
  }

  if (fail.length) {
    console.log(`\n${C.red}  DRIFT DETECTED between dev and ${ARGS.stage} — do not assume ${ARGS.stage} matches dev.${C.reset}`);
    for (const f of fail) console.log(`${C.red}    ${f.name}: ${f.error}${C.reset}`);
    console.log('');
    return false;
  }

  console.log(
    `\n${C.green}  Verified (read-only, zero writes): routes, GSIs, status vocabulary, and ` +
    `/stage response shape on ${ARGS.stage} match dev` +
    `${na.length ? ` (${na.length} check(s) N/A — no fixture to sample, see above)` : ''}.${C.reset}`
  );
  console.log(
    `${C.dim}  This does NOT verify the write-path state machine on ${ARGS.stage} — run the ` +
    `destructive lifecycle gate on dev/demo for that.${C.reset}\n`
  );
  return true;
}

main().catch((err) => {
  console.error(`\n${C.red}  Harness crashed: ${err.stack}${C.reset}\n`);
  process.exit(2);
});
