/**
 * Ideas API client — typed port of the vanilla js/utils/ideas-api.js.
 *
 * Framework-agnostic: calls `window.SpookyConfig`/`window.SpookyAuth` directly
 * (SpookyConfig.get() is cached, and ConfigProvider warms it at boot). The
 * `success/data` response unwrapping and 401→redirect are preserved exactly.
 */
import type { Idea, Cost } from '../config/ideasConfig';

function auth() {
  return window.SpookyAuth;
}

async function handleResponse(response: Response): Promise<any> {
  if (response.status === 401) {
    // Mid-session token expiry — bounce to login, then throw so callers surface an
    // error rather than silently collapsing to []. AuthGate blocks unauthenticated
    // visitors at boot, so reaching here means a valid session went stale (#513).
    await auth().redirectToLogin();
    throw new Error('Your session has expired. Redirecting to login…');
  }

  const contentType = response.headers.get('content-type');

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    if (contentType?.includes('application/json')) {
      const errorData = await response.json();
      errorMessage = errorData.error || errorData.message || errorMessage;
    }
    throw new Error(errorMessage);
  }

  if (contentType?.includes('application/json')) {
    const json = await response.json();
    if (json && typeof json === 'object' && 'success' in json && 'data' in json) {
      return json.data;
    }
    return json;
  }

  return null;
}

async function getEndpoint(): Promise<string> {
  const { API_ENDPOINT } = await window.SpookyConfig.get();
  return `${API_ENDPOINT}/ideas`;
}

async function getApiBase(): Promise<string> {
  const { API_ENDPOINT } = await window.SpookyConfig.get();
  return API_ENDPOINT;
}

// GET all ideas
export async function listIdeas(): Promise<Idea[]> {
  const endpoint = await getEndpoint();
  const response = await fetch(endpoint, { method: 'GET', headers: auth().buildHeaders() });
  const data = await handleResponse(response);
  return Array.isArray(data) ? data : data?.ideas || [];
}

// GET single idea by id — cheap polling target; falls back to the list scan.
export async function getIdea(id: string): Promise<Idea | null> {
  const endpoint = await getEndpoint();
  try {
    const response = await fetch(`${endpoint}/${encodeURIComponent(id)}`, {
      method: 'GET',
      headers: auth().buildHeaders(),
    });
    if (response.status === 404) return null;
    if (response.ok) return await handleResponse(response);
  } catch {
    // route unavailable — fall through to the list scan
  }
  const ideas = await listIdeas();
  return ideas.find((i) => i.id === id) || null;
}

// POST /ideas/{id}/enrich — kick off async agent enrichment (returns 202 body)
export async function startEnrichment(id: string): Promise<any> {
  const endpoint = await getEndpoint();
  const response = await fetch(`${endpoint}/${encodeURIComponent(id)}/enrich`, {
    method: 'POST',
    headers: auth().buildHeaders(),
  });
  return await handleResponse(response);
}

// POST create new idea
export async function createIdea(body: Partial<Idea>): Promise<any> {
  const endpoint = await getEndpoint();
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: auth().buildHeaders(),
    body: JSON.stringify(body),
  });
  return await handleResponse(response);
}

// PUT update existing idea (id must be in body)
export async function updateIdea(body: Partial<Idea> & { id: string }): Promise<any> {
  const endpoint = await getEndpoint();
  const response = await fetch(endpoint, {
    method: 'PUT',
    headers: auth().buildHeaders(),
    body: JSON.stringify(body),
  });
  return await handleResponse(response);
}

// GET all finance cost records linked to an idea
export async function getIdeaCosts(ideaId: string): Promise<Cost[]> {
  const base = await getApiBase();
  const response = await fetch(
    `${base}/finance/costs?related_idea_id=${encodeURIComponent(ideaId)}`,
    { method: 'GET', headers: auth().buildHeaders() },
  );
  const data = await handleResponse(response);
  return Array.isArray(data) ? data : data?.costs || [];
}

// POST create a new finance cost record linked to an idea
export async function createIdeaCost(ideaId: string, body: Record<string, unknown>): Promise<any> {
  const base = await getApiBase();
  const response = await fetch(`${base}/finance/costs`, {
    method: 'POST',
    headers: auth().buildHeaders(),
    body: JSON.stringify({ ...body, related_idea_id: ideaId }),
  });
  return await handleResponse(response);
}

// POST create an item record in the items table
export async function createItem(body: Record<string, unknown>): Promise<any> {
  const base = await getApiBase();
  const response = await fetch(`${base}/items`, {
    method: 'POST',
    headers: auth().buildHeaders(),
    body: JSON.stringify(body),
  });
  return await handleResponse(response);
}

// GET all photos linked to an idea (via images table GSI)
export async function getIdeaPhotos(ideaId: string, photoType?: string): Promise<any[]> {
  const base = await getApiBase();
  const params = new URLSearchParams({ idea_id: ideaId });
  if (photoType) params.set('photo_type', photoType);
  const response = await fetch(`${base}/admin/images?${params}`, {
    method: 'GET',
    headers: auth().buildHeaders(),
  });
  const data = await handleResponse(response);
  return Array.isArray(data) ? data : data?.photos || [];
}

// DELETE idea via cascade endpoint — removes associated costs + photos then the idea.
export async function deleteIdea(id: string): Promise<any> {
  const endpoint = await getEndpoint();
  const response = await fetch(`${endpoint}/${encodeURIComponent(id)}/cascade`, {
    method: 'DELETE',
    headers: auth().buildHeaders(),
  });
  return await handleResponse(response);
}

// GET preview of records that would be deleted with the idea (no side effects)
export async function previewIdeaCascade(id: string): Promise<any> {
  const endpoint = await getEndpoint();
  const response = await fetch(`${endpoint}/${encodeURIComponent(id)}/cascade`, {
    method: 'GET',
    headers: auth().buildHeaders(),
  });
  return await handleResponse(response);
}
