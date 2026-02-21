// Ideas API Client

const HEADERS = { 'Content-Type': 'application/json' };

async function getEndpoint() {
  const { API_ENDPOINT } = await window.SpookyConfig.get();
  return `${API_ENDPOINT}/ideas`;
}

async function handleResponse(response) {
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

// GET all ideas
export async function listIdeas() {
  const endpoint = await getEndpoint();
  const response = await fetch(endpoint, { method: 'GET', headers: HEADERS });
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
    headers: HEADERS,
    body: JSON.stringify(body)
  });
  return await handleResponse(response);
}

// PUT update existing idea (id must be in body)
export async function updateIdea(body) {
  const endpoint = await getEndpoint();
  const response = await fetch(endpoint, {
    method: 'PUT',
    headers: HEADERS,
    body: JSON.stringify(body)
  });
  return await handleResponse(response);
}

// DELETE idea by id
export async function deleteIdea(id) {
  const endpoint = await getEndpoint();
  const response = await fetch(`${endpoint}?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: HEADERS
  });
  return await handleResponse(response);
}
