/**
 * Deployments API client — typed port of the vanilla deployment-api.js.
 *
 * Framework-agnostic: calls `window.SpookyConfig`/`window.SpookyAuth` directly
 * (SpookyConfig.get() is cached, and ConfigProvider warms it at boot). Role
 * gating (`hasMinRole`) and the `success/data` response shape are preserved
 * exactly from the original.
 */

function auth() {
  return window.SpookyAuth;
}

async function getConfig() {
  return await window.SpookyConfig.get();
}

export async function getItemsAdminUrl(): Promise<string> {
  const cfg = await getConfig();
  return (cfg.ITEMS_ADMIN as string) || '';
}

async function apiCall(
  endpoint: string,
  method: string = 'GET',
  body: unknown = null,
): Promise<any> {
  const { API_ENDPOINT } = await getConfig();
  const url = `${API_ENDPOINT}${endpoint}`;
  const options: RequestInit = { method, headers: auth().buildHeaders() };
  if (body) options.body = JSON.stringify(body);

  const response = await fetch(url, options);
  if (response.status === 401) {
    await auth().redirectToLogin();
    return null;
  }
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `API error: ${response.status}`);
  }
  return await response.json();
}

// Deployments

export interface DeploymentFilters {
  season?: string;
  year?: number | string;
  status?: string;
}

export async function listDeployments(filters: DeploymentFilters = {}): Promise<any> {
  let endpoint = '/deployments';
  const params = new URLSearchParams();
  if (filters.season) params.append('season', filters.season);
  if (filters.year) params.append('year', String(filters.year));
  if (filters.status) params.append('status', filters.status);
  if (params.toString()) endpoint += `?${params.toString()}`;
  return await apiCall(endpoint);
}

export async function getDeployment(deploymentId: string, include: string[] = []): Promise<any> {
  let endpoint = `/deployments/${deploymentId}`;
  if (include.length > 0) endpoint += `?include=${include.join(',')}`;
  return await apiCall(endpoint);
}

export async function createDeployment(deploymentData: unknown): Promise<any> {
  if (!auth().hasMinRole('builder')) throw new Error('Insufficient permissions');
  return await apiCall('/deployments', 'POST', deploymentData);
}

export async function updateDeployment(deploymentId: string, updates: unknown): Promise<any> {
  if (!auth().hasMinRole('builder')) throw new Error('Insufficient permissions');
  return await apiCall(`/deployments/${deploymentId}`, 'PUT', updates);
}

export async function deleteDeployment(deploymentId: string): Promise<any> {
  if (!auth().hasMinRole('admin')) throw new Error('Insufficient permissions');
  return await apiCall(`/deployments/${deploymentId}`, 'DELETE');
}

export async function checkDeploymentExists(
  season: string,
  year: number | string,
): Promise<boolean> {
  try {
    const response = await listDeployments({ season, year });
    return response.data && response.data.length > 0;
  } catch (error) {
    console.error('Error checking deployment existence:', error);
    return false;
  }
}

export async function completeDeployment(deploymentId: string): Promise<any> {
  if (!auth().hasMinRole('builder')) throw new Error('Insufficient permissions');
  return await apiCall(`/deployments/${deploymentId}/complete`, 'POST');
}

// Historical Deployments

export async function listHistoricalDeployments(): Promise<any> {
  return await apiCall('/deployments/historical');
}

export async function getHistoricalDeployment(deploymentId: string): Promise<any> {
  return await apiCall(`/deployments/historical/${deploymentId}`);
}

// Items

export interface ItemFilters {
  season?: string;
  class?: string;
  class_type?: string;
  status?: string;
  search?: string;
  connection_building?: string | boolean;
  exclude_deployment?: string;
}

export async function searchItems(filters: ItemFilters = {}): Promise<any> {
  let endpoint = '/items';
  const params = new URLSearchParams();
  if (filters.season) params.append('season', filters.season);
  if (filters.class) params.append('class', filters.class);
  if (filters.class_type) params.append('class_type', filters.class_type);
  if (filters.status) params.append('status', filters.status);
  if (filters.search) params.append('search', filters.search);
  if (filters.connection_building) params.append('connection_building', String(filters.connection_building));
  if (filters.exclude_deployment) params.append('exclude_deployment', filters.exclude_deployment);
  if (params.toString()) endpoint += `?${params.toString()}`;
  return await apiCall(endpoint);
}

export async function getItem(itemId: string): Promise<any> {
  return await apiCall(`/items/${itemId}`);
}

// Sessions

export async function createSession(deploymentId: string, sessionData: unknown): Promise<any> {
  if (!auth().hasMinRole('builder')) throw new Error('Insufficient permissions');
  return await apiCall(`/deployments/${deploymentId}/sessions`, 'POST', sessionData);
}

export async function endSession(
  deploymentId: string,
  sessionId: string,
  data: unknown,
): Promise<any> {
  if (!auth().hasMinRole('builder')) throw new Error('Insufficient permissions');
  return await apiCall(`/deployments/${deploymentId}/sessions/${sessionId}`, 'PUT', data);
}

export async function getSession(deploymentId: string, sessionId: string): Promise<any> {
  return await apiCall(`/deployments/${deploymentId}/sessions/${sessionId}`);
}

export async function getZoneSessions(deploymentId: string, zoneCode: string): Promise<any> {
  return await apiCall(`/deployments/${deploymentId}/zones/${zoneCode}/sessions`);
}

export async function getActiveSessions(deploymentId: string): Promise<any> {
  return await apiCall(`/deployments/${deploymentId}/sessions/active`);
}

// Connections

export async function getAvailablePorts(deploymentId: string, zoneCode: string): Promise<any> {
  return await apiCall(`/deployments/${deploymentId}/zones/${zoneCode}/ports`);
}

export async function createConnection(deploymentId: string, connectionData: unknown): Promise<any> {
  if (!auth().hasMinRole('builder')) throw new Error('Insufficient permissions');
  return await apiCall(`/deployments/${deploymentId}/connections`, 'POST', connectionData);
}

export async function removeConnection(deploymentId: string, connectionId: string): Promise<any> {
  if (!auth().hasMinRole('builder')) throw new Error('Insufficient permissions');
  return await apiCall(`/deployments/${deploymentId}/connections/${connectionId}`, 'DELETE');
}

export async function updateConnection(
  deploymentId: string,
  connectionId: string,
  updates: unknown,
): Promise<any> {
  if (!auth().hasMinRole('builder')) throw new Error('Insufficient permissions');
  console.log('[deployments-api] updateConnection:', { deploymentId, connectionId, updates });
  return await apiCall(`/deployments/${deploymentId}/connections/${connectionId}`, 'PATCH', updates);
}

export async function updateConnectionPhotos(
  deploymentId: string,
  connectionId: string,
  photoIds: string[],
): Promise<any> {
  if (!auth().hasMinRole('builder')) throw new Error('Insufficient permissions');
  console.log('[deployments-api] updateConnectionPhotos:', { deploymentId, connectionId, photoIds });
  return await apiCall(
    `/deployments/${deploymentId}/connections/${connectionId}/photos`,
    'PATCH',
    { photo_ids: photoIds },
  );
}

export async function getConnection(
  deploymentId: string,
  sessionId: string,
  connectionId: string,
): Promise<any> {
  return await apiCall(
    `/deployments/${deploymentId}/sessions/${sessionId}/connections/${connectionId}`,
  );
}

export async function getRemovedConnections(deploymentId: string, sessionId: string): Promise<any> {
  console.log('[deployments-api] getRemovedConnections:', { deploymentId, sessionId });
  return await apiCall(
    `/deployments/${deploymentId}/sessions/${sessionId}/connections?type=removal`,
  );
}

export async function fetchImageById(imageId: string): Promise<any> {
  try {
    const { API_ENDPOINT } = await getConfig();
    const response = await fetch(`${API_ENDPOINT}/admin/images/${imageId}`, {
      method: 'GET',
      headers: auth().buildHeaders(),
    });
    if (response.status === 401) {
      await auth().redirectToLogin();
      return null;
    }
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

export async function getStagingTotes(deploymentId: string): Promise<any> {
  return await apiCall(`/deployments/${deploymentId}/stage`);
}

export async function stageTote(deploymentId: string, body: unknown): Promise<any> {
  if (!auth().hasMinRole('builder')) throw new Error('Insufficient permissions');
  return await apiCall(`/deployments/${deploymentId}/stage`, 'POST', body);
}

export async function apiTeardownStart(deploymentId: string): Promise<any> {
  if (!auth().hasMinRole('builder')) throw new Error('Insufficient permissions');
  return await apiCall(`/deployments/${deploymentId}/teardown/start`, 'POST');
}

export async function apiTeardownItem(deploymentId: string, itemId: string): Promise<any> {
  if (!auth().hasMinRole('builder')) throw new Error('Insufficient permissions');
  return await apiCall(`/deployments/${deploymentId}/teardown/item`, 'POST', { item_id: itemId });
}

export async function apiTeardownComplete(deploymentId: string): Promise<any> {
  if (!auth().hasMinRole('builder')) throw new Error('Insufficient permissions');
  return await apiCall(`/deployments/${deploymentId}/teardown/complete`, 'POST');
}
