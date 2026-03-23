// Ideas API Client

// --- Auth helpers ---

function getAuthToken() {
  const match = document.cookie.match(/(?:^|;\s*)spookydecs_auth=([^;]+)/);
  return match ? match[1] : null;
}

async function redirectToLogin() {
  const { AUTH_URL } = await window.SpookyConfig.get();
  console.warn('[ideas-api] 401 received — redirecting to login');
  window.location.href = `${AUTH_URL}?redirect=${encodeURIComponent(window.location.href)}`;
}

function buildHeaders(extra = {}) {
  const token = getAuthToken();
  console.debug('[ideas-api] request, token present:', !!token);
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...extra
  };
}

// --- Response handler ---

async function handleResponse(response) {
  if (response.status === 401) {
    await redirectToLogin();
    return null;
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

async function getEndpoint() {
  const { API_ENDPOINT } = await window.SpookyConfig.get();
  return `${API_ENDPOINT}/ideas`;
}

// GET all ideas
export async function listIdeas() {
  const endpoint = await getEndpoint();
  const response = await fetch(endpoint, { method: 'GET', headers: buildHeaders() });
  const data = await handleResponse(response);
  return Array.isArray(data) ? data : (data?.ideas || []);
}

// GET single idea by id (fetches all, finds by id)
export async function getIdea(id) {
  const ideas = await listIdeas();
  return ideas.find(i => i.id === id) || null;
}

// POST create new idea
export async function createIdea(body) {
  const endpoint = await getEndpoint();
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(body)
  });
  return await handleResponse(response);
}

// PUT update existing idea (id must be in body)
export async function updateIdea(body) {
  const endpoint = await getEndpoint();
  const response = await fetch(endpoint, {
    method: 'PUT',
    headers: buildHeaders(),
    body: JSON.stringify(body)
  });
  return await handleResponse(response);
}

// GET all photos linked to an idea (via images table GSI)
export async function getIdeaPhotos(ideaId, photoType = null) {
  const { API_ENDPOINT } = await window.SpookyConfig.get();
  const params = new URLSearchParams({ idea_id: ideaId });
  if (photoType) params.set('photo_type', photoType);
  const response = await fetch(
    `${API_ENDPOINT}/admin/images?${params}`,
    { method: 'GET', headers: buildHeaders() }
  );
  const data = await handleResponse(response);
  return Array.isArray(data) ? data : (data?.photos || []);
}

// GET all finance cost records linked to an idea
export async function getIdeaCosts(ideaId) {
  const { API_ENDPOINT } = await window.SpookyConfig.get();
  const response = await fetch(
    `${API_ENDPOINT}/finance/costs?related_idea_id=${encodeURIComponent(ideaId)}`,
    { method: 'GET', headers: buildHeaders() }
  );
  const data = await handleResponse(response);
  return Array.isArray(data) ? data : (data?.costs || []);
}

// POST create a new finance cost record linked to an idea
export async function createIdeaCost(ideaId, body) {
  const { API_ENDPOINT } = await window.SpookyConfig.get();
  const response = await fetch(`${API_ENDPOINT}/finance/costs`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({ ...body, related_idea_id: ideaId })
  });
  return await handleResponse(response);
}

// POST create an item record in the items table
export async function createItem(body) {
  const { API_ENDPOINT } = await window.SpookyConfig.get();
  const response = await fetch(`${API_ENDPOINT}/items`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(body)
  });
  return await handleResponse(response);
}

// DELETE idea by id
export async function deleteIdea(id) {
  const endpoint = await getEndpoint();
  const response = await fetch(`${endpoint}?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: buildHeaders()
  });
  return await handleResponse(response);
}
