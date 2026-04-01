/**
 * api.js
 * Single API client for the tracker sub.
 *
 *   - API base URL: window.SpookyConfig.get() → API_ENDPOINT + /tracker
 *   - Auth headers: window.SpookyAuth.buildHeaders()
 *   - 401 handling: window.SpookyAuth.redirectToLogin()
 */

async function getApiEndpoint() {
  const config = await window.SpookyConfig.get();
  return `${config.API_ENDPOINT}/tracker`;
}

async function handleResponse(response) {
  if (response.status === 401) {
    await window.SpookyAuth.redirectToLogin();
    return null;
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    const err = new Error(error.error || error.message || `HTTP ${response.status}`);
    err.statusCode = response.status;
    err.details = error.details || null;
    throw err;
  }

  if (response.status === 204) return null;
  const json = await response.json();
  return json.data !== undefined ? json.data : json;
}

async function request(method, path, body = null) {
  const base = await getApiEndpoint();
  const url = `${base}${path}`;
  const options = { method, headers: window.SpookyAuth.buildHeaders() };
  if (body !== null) options.body = JSON.stringify(body);
  return handleResponse(await fetch(url, options));
}

const Api = {
  get:   (path)        => request('GET',    path),
  post:  (path, body)  => request('POST',   path, body),
  patch: (path, body)  => request('PATCH',  path, body),
  put:   (path, body)  => request('PUT',    path, body),
  del:   (path)        => request('DELETE', path),

  // ── Epics ─────────────────────────────────────────────────────────────────
  epics: {
    list:   ()               => request('GET',    '/epics'),
    get:    (slug)           => request('GET',    `/epics/${encodeURIComponent(slug)}`),
    create: (data)           => request('POST',   '/epics', data),
    update: (slug, data)     => request('PATCH',  `/epics/${encodeURIComponent(slug)}`, data),
    replace:(slug, data)     => request('PUT',    `/epics/${encodeURIComponent(slug)}`, data),
    delete: (slug)           => request('DELETE', `/epics/${encodeURIComponent(slug)}`),
  },

  // ── Issues ────────────────────────────────────────────────────────────────
  issues: {
    list(params = {}) {
      const qs = new URLSearchParams(params).toString();
      return request('GET', qs ? `/issues?${qs}` : '/issues');
    },
    get:    (id)          => request('GET',    `/issues/${id}`),
    create: (data)        => request('POST',   '/issues', data),
    update: (id, payload) => request('PATCH',  `/issues/${id}`, payload),
    delete: (id)          => request('DELETE', `/issues/${id}`),
  },

  // ── Tasks ─────────────────────────────────────────────────────────────────
  tasks: {
    list:   (issueId)     => request('GET',    `/tasks?issue_id=${encodeURIComponent(issueId)}`),
    create: (data)        => request('POST',   '/tasks', data),
    update: (taskId, data)=> request('PATCH',  `/tasks/${encodeURIComponent(taskId)}`, data),
    delete: (taskId)      => request('DELETE', `/tasks/${encodeURIComponent(taskId)}`),
  },
};

window.TrackerApi = Api;
