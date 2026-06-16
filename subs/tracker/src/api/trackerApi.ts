/**
 * Tracker API client — typed port of the vanilla js/utils/api.js.
 *
 * Framework-agnostic: calls `window.SpookyConfig`/`window.SpookyAuth` directly
 * (SpookyConfig.get() is cached, and ConfigProvider warms it at boot). The
 * `success/data` unwrapping and 401 redirect are preserved exactly from the
 * original.
 *
 *   - API base URL: window.SpookyConfig.get() → API_ENDPOINT + /tracker
 *   - Auth headers: window.SpookyAuth.buildHeaders()
 *   - 401 handling: window.SpookyAuth.redirectToLogin()
 */
import type { Epic, Issue, Task, Attachment } from '../config/trackerConfig';

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

async function getApiEndpoint(): Promise<string> {
  const config = await window.SpookyConfig.get();
  return `${config.API_ENDPOINT}/tracker`;
}

async function handleResponse(response: Response): Promise<any> {
  if (response.status === 401) {
    await window.SpookyAuth.redirectToLogin();
    return null;
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    const err = new Error(error.error || error.message || `HTTP ${response.status}`) as Error & {
      statusCode?: number;
      details?: unknown;
    };
    err.statusCode = response.status;
    err.details = error.details || null;
    throw err;
  }

  if (response.status === 204) return null;
  const json = await response.json();
  return json.data !== undefined ? json.data : json;
}

async function request(method: HttpMethod, path: string, body: unknown = null): Promise<any> {
  const base = await getApiEndpoint();
  const url = `${base}${path}`;
  const options: RequestInit = { method, headers: window.SpookyAuth.buildHeaders() };
  if (body !== null) options.body = JSON.stringify(body);
  return handleResponse(await fetch(url, options));
}

export interface IssueListParams {
  epic?: string;
  state?: string;
  [key: string]: string | undefined;
}

export const TrackerApi = {
  get: (path: string) => request('GET', path),
  post: (path: string, body: unknown) => request('POST', path, body),
  patch: (path: string, body: unknown) => request('PATCH', path, body),
  put: (path: string, body: unknown) => request('PUT', path, body),
  del: (path: string) => request('DELETE', path),

  // ── Epics ─────────────────────────────────────────────────────────────────
  epics: {
    list: (): Promise<Epic[]> => request('GET', '/epics'),
    get: (slug: string): Promise<Epic> => request('GET', `/epics/${encodeURIComponent(slug)}`),
    create: (data: Partial<Epic>): Promise<Epic> => request('POST', '/epics', data),
    update: (slug: string, data: Partial<Epic>): Promise<Epic> =>
      request('PATCH', `/epics/${encodeURIComponent(slug)}`, data),
    replace: (slug: string, data: Partial<Epic>): Promise<Epic> =>
      request('PUT', `/epics/${encodeURIComponent(slug)}`, data),
    delete: (slug: string) => request('DELETE', `/epics/${encodeURIComponent(slug)}`),
  },

  // ── Issues ────────────────────────────────────────────────────────────────
  issues: {
    list(params: IssueListParams = {}): Promise<Issue[]> {
      const clean: Record<string, string> = {};
      Object.entries(params).forEach(([k, v]) => {
        if (v != null && v !== '') clean[k] = v;
      });
      const qs = new URLSearchParams(clean).toString();
      return request('GET', qs ? `/issues?${qs}` : '/issues');
    },
    get: (id: string): Promise<Issue> => request('GET', `/issues/${id}`),
    create: (data: Partial<Issue>): Promise<Issue> => request('POST', '/issues', data),
    update: (id: string, payload: Partial<Issue>): Promise<Issue> =>
      request('PATCH', `/issues/${id}`, payload),
    delete: (id: string) => request('DELETE', `/issues/${id}`),
  },

  // ── Tasks ─────────────────────────────────────────────────────────────────
  tasks: {
    list: (issueId: string): Promise<Task[]> =>
      request('GET', `/tasks?issue_id=${encodeURIComponent(issueId)}`),
    create: (data: Partial<Task> & { parent_issue: string }): Promise<Task> =>
      request('POST', '/tasks', data),
    update: (taskId: string, data: Partial<Task>): Promise<Task> =>
      request('PATCH', `/tasks/${encodeURIComponent(taskId)}`, data),
    addNote: (taskId: string, text: string): Promise<Task> =>
      request('PATCH', `/tasks/${encodeURIComponent(taskId)}`, { add_note: text }),
    delete: (taskId: string) => request('DELETE', `/tasks/${encodeURIComponent(taskId)}`),
  },

  // ── Attachments ───────────────────────────────────────────────────────────
  attachments: {
    list: (issueId: string): Promise<{ items?: Attachment[] } | Attachment[]> =>
      request('GET', `/issues/${issueId}/attachments`),
    create: (issueId: string, data: { photos: unknown[] }) =>
      request('POST', `/issues/${issueId}/attachments`, data),
    remove: (issueId: string, attachmentId: string) =>
      request('DELETE', `/issues/${issueId}/attachments/${encodeURIComponent(attachmentId)}`),
  },
};

export default TrackerApi;
