// Deployment API Client
// Handles all API calls to the deployments backend

let API_ENDPOINT = '';

async function loadConfig() {
  if (API_ENDPOINT) return API_ENDPOINT;
  try {
    const response = await fetch('/config.json');
    const config = await response.json();
    API_ENDPOINT = config.API_ENDPOINT;
    return API_ENDPOINT;
  } catch (error) {
    console.error('Failed to load config:', error);
    throw new Error('Failed to load API configuration');
  }
}

async function apiCall(endpoint, method = 'GET', body = null) {
  await loadConfig();
  const url = `${API_ENDPOINT}${endpoint}`;
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (body) {
    options.body = JSON.stringify(body);
  }
  const response = await fetch(url, options);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `API error: ${response.status}`);
  }
  return await response.json();
}

// Deployments

export async function listDeployments(filters = {}) {
  let endpoint = '/deployments';
  const params = new URLSearchParams();
  if (filters.season) params.append('season', filters.season);
  if (filters.year) params.append('year', filters.year);
  if (filters.status) params.append('status', filters.status);
  if (params.toString()) endpoint += `?${params.toString()}`;
  return await apiCall(endpoint);
}

export async function getDeployment(deploymentId, include = []) {
  let endpoint = `/deployments/${deploymentId}`;
  if (include.length > 0) endpoint += `?include=${include.join(',')}`;
  return await apiCall(endpoint);
}

export async function createDeployment(deploymentData) {
  return await apiCall('/deployments', 'POST', deploymentData);
}

export async function updateDeployment(deploymentId, updates) {
  return await apiCall(`/deployments/${deploymentId}`, 'PUT', updates);
}

export async function deleteDeployment(deploymentId) {
  return await apiCall(`/deployments/${deploymentId}`, 'DELETE');
}

export async function checkDeploymentExists(season, year) {
  try {
    const response = await listDeployments({ season, year });
    return response.data && response.data.length > 0;
  } catch (error) {
    console.error('Error checking deployment existence:', error);
    return false;
  }
}

// Items

export async function searchItems(filters = {}) {
  await loadConfig();
  let endpoint = '/items';
  const params = new URLSearchParams();
  if (filters.season) params.append('season', filters.season);
  if (filters.class) params.append('class', filters.class);
  if (filters.class_type) params.append('class_type', filters.class_type);
  if (filters.status) params.append('status', filters.status);
  if (filters.search) params.append('search', filters.search);
  if (filters.connection_building) params.append('connection_building', filters.connection_building);
  if (filters.exclude_deployment) params.append('exclude_deployment', filters.exclude_deployment);
  if (params.toString()) endpoint += `?${params.toString()}`;
  return await apiCall(endpoint);
}

export async function getItem(itemId) {
  return await apiCall(`/items/${itemId}`);
}

// Sessions

export async function createSession(deploymentId, sessionData) {
  return await apiCall(`/deployments/${deploymentId}/sessions`, 'POST', sessionData);
}

export async function endSession(deploymentId, sessionId, data) {
  return await apiCall(`/deployments/${deploymentId}/sessions/${sessionId}`, 'PUT', data);
}

export async function getSession(deploymentId, sessionId) {
  return await apiCall(`/deployments/${deploymentId}/sessions/${sessionId}`);
}

export async function getZoneSessions(deploymentId, zoneCode) {
  return await apiCall(`/deployments/${deploymentId}/zones/${zoneCode}/sessions`);
}

// Connections

export async function getAvailablePorts(deploymentId, zoneCode) {
  return await apiCall(`/deployments/${deploymentId}/zones/${zoneCode}/ports`);
}

export async function createConnection(deploymentId, connectionData) {
  return await apiCall(`/deployments/${deploymentId}/connections`, 'POST', connectionData);
}

export async function removeConnection(deploymentId, connectionId) {
  return await apiCall(`/deployments/${deploymentId}/connections/${connectionId}`, 'DELETE');
}

/**
 * Mark a connection as removed (connection_type = 'removal').
 * Only removal_reason is needed — Lambda handles connection_type and removed_in_session.
 */
export async function updateConnection(deploymentId, connectionId, updates) {
  console.log('[deployment-api] updateConnection:', { deploymentId, connectionId, updates });
  return await apiCall(
    `/deployments/${deploymentId}/connections/${connectionId}`,
    'PATCH',
    updates
  );
}

export async function updateConnectionPhotos(deploymentId, connectionId, photoIds) {
  console.log('[deployment-api] updateConnectionPhotos:', { deploymentId, connectionId, photoIds });
  return await apiCall(
    `/deployments/${deploymentId}/connections/${connectionId}/photos`,
    'PATCH',
    { photo_ids: photoIds }
  );
}

export async function getConnection(deploymentId, sessionId, connectionId) {
  return await apiCall(`/deployments/${deploymentId}/sessions/${sessionId}/connections/${connectionId}`);
}

/**
 * Get connections marked as removed (connection_type = 'removal') for a session.
 * Uses removed_in_session to scope to current session only.
 */
export async function getRemovedConnections(deploymentId, sessionId) {
  console.log('[deployment-api] getRemovedConnections:', { deploymentId, sessionId });
  return await apiCall(`/deployments/${deploymentId}/sessions/${sessionId}/connections?type=removal`);
}

export async function fetchImageById(imageId) {
  try {
    await loadConfig();
    const response = await fetch(`${API_ENDPOINT}/admin/images/${imageId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) {
      console.warn(`Failed to fetch image ${imageId}: ${response.status}`);
      return null;
    }
    const data = await response.json();
    if (data.success && data.data) return data.data;
    if (data.cloudfront_url) return data;
    return null;
  } catch (error) {
    console.warn(`Error fetching image ${imageId}:`, error);
    return null;
  }
}