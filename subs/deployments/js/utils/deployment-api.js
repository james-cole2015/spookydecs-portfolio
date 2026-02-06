// Deployment API Client - DEBUG VERSION
// Handles all API calls to the deployments backend

let API_ENDPOINT = '';

// Load config
async function loadConfig() {
  if (API_ENDPOINT) return API_ENDPOINT;
  
  try {
    const response = await fetch('/config.json');
    const config = await response.json();
    API_ENDPOINT = config.API_ENDPOINT;
    console.log('[API] Loaded config, endpoint:', API_ENDPOINT);
    return API_ENDPOINT;
  } catch (error) {
    console.error('[API] Failed to load config:', error);
    throw new Error('Failed to load API configuration');
  }
}

// Helper function to make API calls
async function apiCall(endpoint, method = 'GET', body = null) {
  await loadConfig();
  
  const url = `${API_ENDPOINT}${endpoint}`;
  
  console.log('[API] Making request:', {
    method,
    url,
    endpoint,
    hasBody: !!body
  });
  
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json'
    }
  };
  
  if (body) {
    options.body = JSON.stringify(body);
    console.log('[API] Request body:', body);
  }
  
  try {
    const response = await fetch(url, options);
    
    console.log('[API] Response status:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[API] Error response:', errorData);
      throw new Error(errorData.error || `API error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('[API] Success response:', data);
    return data;
    
  } catch (error) {
    console.error('[API] Fetch failed:', error);
    throw error;
  }
}

// Deployment CRUD operations

export async function listDeployments(filters = {}) {
  let endpoint = '/deployments';
  const params = new URLSearchParams();
  
  if (filters.season) params.append('season', filters.season);
  if (filters.year) params.append('year', filters.year);
  if (filters.status) params.append('status', filters.status);
  
  if (params.toString()) {
    endpoint += `?${params.toString()}`;
  }
  
  return await apiCall(endpoint);
}

export async function getDeployment(deploymentId, include = []) {
  let endpoint = `/deployments/${deploymentId}`;
  
  if (include.length > 0) {
    endpoint += `?include=${include.join(',')}`;
  }
  
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

// Check if deployment exists
export async function checkDeploymentExists(season, year) {
  try {
    const response = await listDeployments({ season, year });
    return response.data && response.data.length > 0;
  } catch (error) {
    console.error('Error checking deployment existence:', error);
    return false;
  }
}

// Items API (for fetching items to add to deployment)
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
  
  if (params.toString()) {
    endpoint += `?${params.toString()}`;
  }
  
  return await apiCall(endpoint);
}

export async function getItem(itemId) {
  return await apiCall(`/items/${itemId}`);
}

// Session management

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
  console.log('[API] getZoneSessions called with:', { deploymentId, zoneCode });
  const endpoint = `/deployments/${deploymentId}/zones/${zoneCode}/sessions`;
  console.log('[API] getZoneSessions endpoint:', endpoint);
  return await apiCall(endpoint);
}

// Connection management

export async function getAvailablePorts(deploymentId, zoneCode) {
  return await apiCall(`/deployments/${deploymentId}/zones/${zoneCode}/ports`);
}

export async function createConnection(deploymentId, connectionData) {
  return await apiCall(`/deployments/${deploymentId}/connections`, 'POST', connectionData);
}

export async function removeConnection(deploymentId, connectionId) {
  return await apiCall(`/deployments/${deploymentId}/connections/${connectionId}`, 'DELETE');
}