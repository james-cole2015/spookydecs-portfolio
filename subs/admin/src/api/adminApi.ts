/**
 * Admin API client — typed port of the vanilla js/utils/admin-api.js.
 *
 * Framework-agnostic: calls `window.SpookyConfig`/`window.SpookyAuth` directly
 * (SpookyConfig.get() is cached, and ConfigProvider warms it at boot). The
 * cross-sub stats fan-out, role/401 handling, and `success/data` unwrapping are
 * preserved exactly from the original. Backends are untouched.
 */
import type {
  InspectorStats,
  ItemSearchText,
  SearchItem,
  SubStats,
  SubdomainUrls,
  SystemHealth,
  WorkbenchStats,
} from '../config/adminConfig';

const { buildHeaders, redirectToLogin } = window.SpookyAuth;

/** Resolve every sub's external URL from the runtime config. */
export async function getSubdomainUrls(): Promise<SubdomainUrls> {
  const config = await window.SpookyConfig.get();

  return {
    ideas: (config.IDEAS_ADMIN_URL as string) || '',
    items: (config.ITEMS_ADMIN as string) || '',
    finance: (config.finance_url as string) || '',
    maintenance: (config.MAINT_URL as string) || '',
    storage: (config.STR_ADM_URL as string) || '',
    workbench: (config.WORKBENCH_URL as string) || '',
    deployments: (config.DEPLOY_ADMIN as string) || '',
    audit: (config.AUDIT_URL as string) || '',
    inspector: (config.INSPECT_URL as string) || '',
    images: (config.IMAGES_URL as string) || '',
    gallery: (config.GALLERY_ADM_URL as string) || '',
    tracker: (config.TRACKER_URL as string) || '',
  };
}

/** Fetch Inspector violation statistics. */
export async function fetchInspectorStats(): Promise<InspectorStats | null> {
  const config = await window.SpookyConfig.get();

  const response = await fetch(`${config.API_ENDPOINT}/admin/inspector/violations/stats`, {
    headers: buildHeaders(),
  });

  if (response.status === 401) {
    await redirectToLogin();
    return null;
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch inspector stats: ${response.status}`);
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch inspector stats');
  }

  return result.data;
}

/** Fetch Workbench statistics (resilient — returns zeros on failure). */
export async function fetchWorkbenchStats(): Promise<WorkbenchStats | null> {
  const config = await window.SpookyConfig.get();

  try {
    const response = await fetch(`${config.API_ENDPOINT}/stats/workbench`, {
      headers: buildHeaders(),
    });

    if (response.status === 401) {
      await redirectToLogin();
      return null;
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch workbench stats: ${response.status}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch workbench stats');
    }

    return result.data;
  } catch (error) {
    console.error('Error fetching workbench stats:', error);
    return { active: 0, scheduled: 0, completed: 0 };
  }
}

/** Static system-health snapshot (placeholder values, ported verbatim). */
export async function calculateSystemHealth(): Promise<SystemHealth> {
  return {
    items: { healthy: true, count: 150 },
    storage: { healthy: true, count: 12 },
    deployments: { healthy: true, count: 1 },
    finance: { healthy: false, pendingCount: 5 },
    maintenance: { healthy: false, overdueCount: 3 },
    photos: { healthy: true, completionRate: 95 },
  };
}

/**
 * Fetch live per-sub stats from `/stats/{key}` (the SystemMap fan-out). Returns
 * null on any failure so a single sub being down can't break the map.
 */
export async function fetchSubStats(statsKey: string): Promise<SubStats | null> {
  const config = await window.SpookyConfig.get();
  const apiBase = config.API_ENDPOINT;
  if (!apiBase) return null;

  try {
    const response = await fetch(`${apiBase}/stats/${statsKey}`);
    if (!response.ok) return null;
    const result = await response.json();
    return result.success ? result.data : null;
  } catch (error) {
    console.error(`Failed to load stats for ${statsKey}:`, error);
    return null;
  }
}

/** Search items by free-text query. */
export async function searchItems(query: string): Promise<SearchItem[] | null> {
  const config = await window.SpookyConfig.get();
  const params = new URLSearchParams({ search: query });

  const response = await fetch(`${config.API_ENDPOINT}/items?${params}`, {
    headers: buildHeaders(),
  });

  if (response.status === 401) {
    await redirectToLogin();
    return null;
  }

  if (!response.ok) {
    throw new Error(`Item search failed: ${response.status}`);
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Item search failed');
  }

  return result.data?.items || [];
}

/** Get the current search_text record for an item. */
export async function getItemSearchText(itemId: string): Promise<ItemSearchText | null> {
  const config = await window.SpookyConfig.get();

  const response = await fetch(`${config.API_ENDPOINT}/items/${encodeURIComponent(itemId)}`, {
    headers: buildHeaders(),
  });

  if (response.status === 401) {
    await redirectToLogin();
    return null;
  }

  if (!response.ok) {
    throw new Error(`Failed to get item: ${response.status}`);
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to get item');
  }

  const item = result.data;
  return {
    item_id: item.id,
    short_name: item.short_name || '',
    season: item.season || '',
    search_text: item.search_text || '',
  };
}

/** Update an item's search_text. */
export async function updateItemSearchText(itemId: string, searchText: string): Promise<any> {
  const config = await window.SpookyConfig.get();

  const response = await fetch(`${config.API_ENDPOINT}/items/${encodeURIComponent(itemId)}`, {
    method: 'PATCH',
    headers: buildHeaders(),
    body: JSON.stringify({ search_text: searchText }),
  });

  if (response.status === 401) {
    await redirectToLogin();
    return null;
  }

  if (!response.ok) {
    throw new Error(`Failed to update search text: ${response.status}`);
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to update search text');
  }

  return result.data;
}

/** Trigger a vector index rebuild ('text' = Iris, 'images' = Gallery, 'all'). */
export async function triggerReindex(mode: 'all' | 'text' | 'images' = 'all'): Promise<any> {
  const config = await window.SpookyConfig.get();
  const url =
    mode === 'all'
      ? `${config.API_ENDPOINT}/iris/index`
      : `${config.API_ENDPOINT}/iris/index?mode=${encodeURIComponent(mode)}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: buildHeaders(),
  });

  if (response.status === 401) {
    await redirectToLogin();
    return null;
  }

  if (!response.ok) {
    throw new Error(`Reindex failed: ${response.status}`);
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Reindex failed');
  }

  return result.data;
}

/**
 * Submit the full conversation to Iris (multi-turn POST /iris/chat). Sends the
 * `messages` array, handles the 401 redirect + error states, and returns
 * `result.data` ({ response, tool_calls_made }).
 */
export async function submitIrisQuery(
  messages: Array<{ role: string; content: string }>,
): Promise<{ response: string; tool_calls_made?: unknown[] } | null> {
  const config = await window.SpookyConfig.get();

  const response = await fetch(`${config.API_ENDPOINT}/iris/chat`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({ messages }),
  });

  if (response.status === 401) {
    await redirectToLogin();
    return null;
  }

  if (!response.ok) {
    throw new Error(`Iris request failed: ${response.status}`);
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Iris returned an error');
  }

  return result.data;
}
