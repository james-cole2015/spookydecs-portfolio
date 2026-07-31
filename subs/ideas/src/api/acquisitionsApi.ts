/**
 * Acquisitions API client — CRUD against sd_acquisitions_handler (#492).
 *
 * A near-verbatim port of ideasApi.ts: same handleResponse (401→redirect,
 * success/data unwrap) and the same window.SpookyConfig endpoint pattern. The
 * records are keyed on `acquisition_id` and the backend gates mutations to
 * ['admin','builder'], so create/update/delete mirror the items-sub client gate
 * (hasMinRole('builder')) for a fast client-side rejection + defense in depth.
 */
import type { Acquisition } from '../config/acquisitionsConfig';

function auth() {
  return window.SpookyAuth;
}

async function handleResponse(response: Response): Promise<any> {
  if (response.status === 401) {
    // Mid-session token expiry — bounce to login, then throw so callers surface an
    // error rather than silently collapsing to [] (mirrors ideasApi #513 handling).
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
  return `${API_ENDPOINT}/acquisitions`;
}

// GET all acquisitions (full Scan; filtering is client-side — no GSI, doc §9).
export async function listAcquisitions(): Promise<Acquisition[]> {
  const endpoint = await getEndpoint();
  const response = await fetch(endpoint, { method: 'GET', headers: auth().buildHeaders() });
  const data = await handleResponse(response);
  return Array.isArray(data) ? data : data?.acquisitions || [];
}

// GET single acquisition by id — falls back to the list scan if the route errors.
export async function getAcquisition(id: string): Promise<Acquisition | null> {
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
  const all = await listAcquisitions();
  return all.find((a) => a.acquisition_id === id) || null;
}

// POST create — gated to builder/admin (matches server check_role(['admin','builder'])).
export async function createAcquisition(body: Partial<Acquisition>): Promise<any> {
  if (!auth().hasMinRole('builder')) throw new Error('Insufficient permissions');
  const endpoint = await getEndpoint();
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: auth().buildHeaders(),
    body: JSON.stringify(body),
  });
  return await handleResponse(response);
}

// PUT update — id goes in the path (/acquisitions/{id}); gated to builder/admin.
export async function updateAcquisition(
  body: Partial<Acquisition> & { acquisition_id: string },
): Promise<any> {
  if (!auth().hasMinRole('builder')) throw new Error('Insufficient permissions');
  const endpoint = await getEndpoint();
  const response = await fetch(`${endpoint}/${encodeURIComponent(body.acquisition_id)}`, {
    method: 'PUT',
    headers: auth().buildHeaders(),
    body: JSON.stringify(body),
  });
  return await handleResponse(response);
}

// POST /acquisitions/{id}/enrich — kick off Renfield (202, in_progress). Gated to
// builder/admin for parity with the other mutating calls (backend gates the same).
// Terminal status + target_attributes land on the record; poll via getAcquisition.
export async function startEnrichment(id: string): Promise<any> {
  if (!auth().hasMinRole('builder')) throw new Error('Insufficient permissions');
  const endpoint = await getEndpoint();
  const response = await fetch(`${endpoint}/${encodeURIComponent(id)}/enrich`, {
    method: 'POST',
    headers: auth().buildHeaders(),
  });
  return await handleResponse(response);
}

// DELETE by id — plain delete (no /cascade route; no linked costs/photos in W3). Gated.
export async function deleteAcquisition(id: string): Promise<any> {
  if (!auth().hasMinRole('builder')) throw new Error('Insufficient permissions');
  const endpoint = await getEndpoint();
  const response = await fetch(`${endpoint}/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: auth().buildHeaders(),
  });
  return await handleResponse(response);
}
