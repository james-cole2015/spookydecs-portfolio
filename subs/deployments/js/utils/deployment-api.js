// Deployment API Client
// Handles all API calls to the deployments backend

let API_ENDPOINT = '';

// Load config
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

// Helper function to make API calls
async function apiCall(endpoint, method = 'GET', body = null) {
  await loadConfig();
  
  const url = `${API_ENDPOINT}${endpoint}`;
  
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json'
    }
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
  
  // NEW - Add exclude_deployment parameter
  if (filters.exclude_deployment) {
    params.append('exclude_deployment', filters.exclude_deployment);
  }
  
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
  return await apiCall(`/deployments/${deploymentId}/zones/${zoneCode}/sessions`);
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

/**
 * Update connection (for marking items as removed)
 * @param {string} deploymentId - Deployment ID
 * @param {string} connectionId - Connection ID
 * @param {Object} updates - Updates to apply { state: boolean, removal_reason: string }
 * @returns {Promise<Object>} API response
 */
export async function updateConnection(deploymentId, connectionId, updates) {
  console.log('[deployment-api] updateConnection:', { deploymentId, connectionId, updates });
  
  return await apiCall(
    `/deployments/${deploymentId}/connections/${connectionId}`,
    'PATCH',
    updates
  );
}

/**
 * Update connection with photo IDs
 * @param {string} deploymentId - Deployment ID
 * @param {string} connectionId - Connection ID
 * @param {string[]} photoIds - Array of photo IDs to add
 * @returns {Promise<Object>} API response
 */
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
 * Fetch image details by ID
 * @param {string} imageId - Image ID
 * @returns {Promise<Object|null>} Image object with cloudfront_url or null if not found
 */
export async function fetchImageById(imageId) {
  try {
    await loadConfig();

    const response = await fetch(`${API_ENDPOINT}/admin/images/${imageId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.warn(`Failed to fetch image ${imageId}: ${response.status}`);
      return null;
    }

    const data = await response.json();

    // Handle standardized response format
    if (data.success && data.data) {
      return data.data;
    }
    // Fallback for direct object
    else if (data.cloudfront_url) {
      return data;
    }

    return null;
  } catch (error) {
    console.warn(`Error fetching image ${imageId}:`, error);
    return null;
  }
}