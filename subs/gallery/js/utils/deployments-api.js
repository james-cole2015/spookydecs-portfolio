/**
 * Deployments API Client
 * 
 * Handles HTTP requests to the deployments API endpoints
 * Used for fetching deployment details when displaying photo relationships
 */

const getConfig = () => window.appConfig;

/**
 * Handle API response errors
 * @param {Response} response - Fetch response
 * @returns {Promise<Response>}
 */
async function handleResponse(response) {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Fetch a single deployment by ID
 * @param {string} deploymentId - Deployment ID
 * @returns {Promise<Object>} Deployment object
 */
export async function fetchDeploymentById(deploymentId) {
  const config = getConfig();
  const url = `${config.API_ENDPOINT}/deployments/${deploymentId}`;
  
  console.log('Fetching deployment:', deploymentId);
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  });
  
  return handleResponse(response);
}

/**
 * Fetch all deployments with optional filters
 * @param {Object} filters - Filter parameters
 * @returns {Promise<Object>} API response with deployments array
 */
export async function fetchDeployments(filters = {}) {
  const config = getConfig();
  const params = new URLSearchParams(filters);
  const url = `${config.API_ENDPOINT}/deployments${params.toString() ? '?' + params.toString() : ''}`;
  
  console.log('Fetching deployments:', url);
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  });
  
  return handleResponse(response);
}

/**
 * Search deployments by query string
 * @param {string} query - Search query
 * @param {Object} filters - Additional filters
 * @returns {Promise<Object[]>} Array of matching deployments
 */
export async function searchDeployments(query, filters = {}) {
  const allFilters = { ...filters, search: query };
  const response = await fetchDeployments(allFilters);
  return response.deployments || [];
}
