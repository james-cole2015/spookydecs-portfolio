/**
 * Inspector API client — typed port of the vanilla `js/utils/inspector-api.js`.
 *
 * Framework-agnostic: calls `window.SpookyConfig`/`window.SpookyAuth` directly
 * (SpookyConfig.get() is cached, and ConfigProvider warms it at boot). The
 * `success/data` response unwrapping and 401 → redirectToLogin are preserved
 * exactly from the original. This is the frontend of the Inspector Gadget
 * pipeline — endpoints are unchanged.
 */
import { getRuleCategoryConfig, type Rule, type Violation } from '../config/inspectorConfig';

interface RequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
}

interface ViolationsPage {
  violations: Violation[];
  lastKey: string | null;
  hasMore: boolean;
}

interface ViolationParams {
  limit?: number;
  lastKey?: string | null;
  status?: string | null;
  rule_id?: string | null;
}

async function getBaseUrl(): Promise<string> {
  const { API_ENDPOINT } = await window.SpookyConfig.get();
  return API_ENDPOINT;
}

async function request<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const baseUrl = await getBaseUrl();
  const url = `${baseUrl}${endpoint}`;

  try {
    const config: RequestInit = {
      method: options.method || 'GET',
      headers: window.SpookyAuth.buildHeaders(options.headers),
    };

    if (options.body) {
      config.body =
        typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
    }

    const response = await fetch(url, config);

    if (response.status === 401) {
      await window.SpookyAuth.redirectToLogin();
      return null as T;
    }

    const result = await response.json();

    if (!response.ok) {
      const errorMsg =
        result.error || result.message || `Request failed (HTTP ${response.status})`;
      throw new Error(errorMsg);
    }

    if (Object.prototype.hasOwnProperty.call(result, 'success') && !result.success) {
      const errorMsg = result.error || 'Request failed';
      const errorDetails = result.details ? ` - ${JSON.stringify(result.details)}` : '';
      throw new Error(`${errorMsg}${errorDetails}`);
    }

    return (result.data ?? result) as T;
  } catch (error) {
    console.error(`API Error (${endpoint}):`, error);
    throw error;
  }
}

function buildQueryString(params: Record<string, unknown>): string {
  const filtered = Object.entries(params)
    .filter(([, value]) => value !== null && value !== undefined)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');
  return filtered ? `?${filtered}` : '';
}

export const InspectorAPI = {
  request,
  buildQueryString,

  // ==================== RULES ====================

  getRules(): Promise<{ rules: Rule[] }> {
    return request('/admin/inspector/rules', { method: 'GET' });
  },

  getRule(ruleId: string): Promise<{ rule: Rule }> {
    return request(`/admin/inspector/rules/${ruleId}`, { method: 'GET' });
  },

  updateRule(ruleId: string, updates: Partial<Rule>): Promise<{ rule: Rule }> {
    return request(`/admin/inspector/rules/${ruleId}`, { method: 'PATCH', body: updates });
  },

  deleteRule(ruleId: string): Promise<unknown> {
    return request(`/admin/inspector/rules/${ruleId}`, { method: 'DELETE' });
  },

  executeRule(ruleId: string, ruleCategory: string): Promise<unknown> {
    const categoryConfig = getRuleCategoryConfig(ruleCategory);
    if (!categoryConfig) {
      throw new Error(`Unknown rule category: ${ruleCategory}`);
    }
    return request(categoryConfig.endpoint, { method: 'POST', body: { rule_id: ruleId } });
  },

  // ==================== VIOLATIONS ====================

  getViolations(params: ViolationParams = {}): Promise<ViolationsPage> {
    const { limit = 25, lastKey = null, status = null, rule_id = null } = params;
    const queryString = buildQueryString({ limit, lastKey, status, rule_id });
    return request(`/admin/inspector/violations${queryString}`, { method: 'GET' });
  },

  getStats(): Promise<{ total_open?: number; by_resolution_mode?: Record<string, number> }> {
    return request('/admin/inspector/violations/stats', { method: 'GET' });
  },

  getViolation(violationId: string): Promise<{ violation: Violation }> {
    return request(`/admin/inspector/violations/${violationId}`, { method: 'GET' });
  },

  updateViolation(violationId: string, notes: string): Promise<unknown> {
    return request(`/admin/inspector/violations/${violationId}`, {
      method: 'PUT',
      body: { notes },
    });
  },

  dismissViolation(violationId: string, dismissalNotes: string): Promise<unknown> {
    return request(`/admin/inspector/violations/${violationId}/dismiss`, {
      method: 'PATCH',
      body: { dismissal_notes: dismissalNotes },
    });
  },

  deleteViolation(violationId: string): Promise<unknown> {
    return request(`/admin/inspector/violations/${violationId}`, { method: 'DELETE' });
  },

  runIG(violationId: string): Promise<unknown> {
    return request(`/admin/inspector/violations/${violationId}/run-ig`, { method: 'POST' });
  },

  // ==================== BATCH ====================

  async getViolationsForRule(ruleId: string): Promise<Violation[]> {
    const allViolations: Violation[] = [];
    let lastKey: string | null = null;
    let hasMore = true;

    while (hasMore) {
      const result = await this.getViolations({ rule_id: ruleId, limit: 100, lastKey });
      allViolations.push(...result.violations);
      lastKey = result.lastKey;
      hasMore = result.hasMore;
    }
    return allViolations;
  },

  async getAllViolations(): Promise<Violation[]> {
    const allViolations: Violation[] = [];
    let lastKey: string | null = null;
    let hasMore = true;

    while (hasMore) {
      const result = await this.getViolations({ limit: 100, lastKey });
      allViolations.push(...result.violations);
      lastKey = result.lastKey;
      hasMore = result.hasMore;
    }
    return allViolations;
  },

  async getViolationsForItem(itemId: string): Promise<Violation[]> {
    const all = await this.getAllViolations();
    return all.filter((v) => v.entity_id === itemId);
  },
};

export default InspectorAPI;
