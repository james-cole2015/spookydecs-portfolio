/**
 * Audit API client — typed port of the vanilla js/utils/audit-api.js.
 *
 * Framework-agnostic: calls `window.SpookyConfig` / `window.SpookyAuth` directly
 * (SpookyConfig.get() is cached, and ConfigProvider warms it at boot) — the same
 * pattern as storage's storageApi.ts. Preserves the vanilla behaviors exactly:
 * Cookie auth via buildHeaders(), 401 -> redirectToLogin(), the `result.data ||
 * result` unwrap, and `environment` derived from the runtime stage (not a filter).
 */
import { DEFAULT_PAGE_SIZE } from '../lib/format';
import type { AuditRecord, EntityType, Operation, RecordsPage } from '../types/audit';
import { ENTITY_TYPES } from '../lib/format';

/**
 * `getStage()` is a real method on the api-config.js CDN global but is not part
 * of the shared @spookydecs/ui ambient type (which only declares `get()`). Read
 * it through a local typed view so the sub consumes the library as-is without
 * editing the shared globals.
 */
function getEnvironment(): string {
  const cfg = window.SpookyConfig as unknown as { getStage?: () => string };
  return cfg.getStage?.() ?? '';
}

function buildQuery(params: Record<string, string | number | null | undefined>): string {
  const pairs = Object.entries(params).filter(([, v]) => v !== null && v !== undefined && v !== '');
  if (!pairs.length) return '';
  return '?' + pairs.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join('&');
}

async function request<T>(path: string, params: Record<string, string | number | null | undefined> = {}): Promise<T> {
  const { API_ENDPOINT } = await window.SpookyConfig.get();
  const url = `${API_ENDPOINT}${path}${buildQuery(params)}`;
  const headers = window.SpookyAuth ? window.SpookyAuth.buildHeaders() : {};
  const response = await fetch(url, { headers });
  if (response.status === 401) {
    if (window.SpookyAuth) await window.SpookyAuth.redirectToLogin();
    throw new Error('Unauthorized');
  }
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.error || result.message || `HTTP ${response.status}`);
  }
  return (result.data ?? result) as T;
}

export interface GetRecordsArgs {
  entityType?: string;
  operation?: string;
  nextToken?: string | null;
  limit?: number;
}

/** Primary list: one server page for a specific entity type (+ optional operation). */
export async function getRecords({
  entityType,
  operation,
  nextToken,
  limit = DEFAULT_PAGE_SIZE,
}: GetRecordsArgs = {}): Promise<RecordsPage> {
  const page = await request<RecordsPage>('/audit/records', {
    entityType,
    operation,
    environment: getEnvironment(),
    nextToken,
    limit,
  });
  return { records: page.records || [], nextToken: page.nextToken || null };
}

/**
 * "All types" view: fan out one getRecords per entity type in parallel, merge,
 * and sort by timestamp desc client-side. Single merged page (no cursor).
 */
export async function getAllTypes({
  operation,
  limit = DEFAULT_PAGE_SIZE,
}: { operation?: string; limit?: number } = {}): Promise<RecordsPage> {
  const types = Object.keys(ENTITY_TYPES) as EntityType[];
  const pages = await Promise.all(
    types.map((t) => getRecords({ entityType: t, operation, limit }).catch(() => ({ records: [], nextToken: null }))),
  );
  const merged = pages.flatMap((p) => p.records);
  merged.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
  return { records: merged.slice(0, limit), nextToken: null };
}

/** Paginated loop over /audit/records (limit=100) until the cursor exhausts — for bulk export. */
export async function getAllRecordsForExport({
  entityType,
  operation,
}: { entityType?: string; operation?: string } = {}): Promise<AuditRecord[]> {
  const records: AuditRecord[] = [];
  let token: string | null = null;
  do {
    const page: RecordsPage = await request<RecordsPage>('/audit/records', {
      entityType,
      operation,
      environment: getEnvironment(),
      nextToken: token,
      limit: 100,
    });
    records.push(...(page.records || []));
    token = page.nextToken || null;
  } while (token);
  return records;
}

export { getEnvironment };
export type { Operation };
