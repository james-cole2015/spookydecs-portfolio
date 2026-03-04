// Admin API utilities

/**
 * Get all subdomain URLs from config
 * @returns {Promise<Object>} Object containing all subdomain URLs
 */
export async function getSubdomainUrls() {
  const config = await window.SpookyConfig.get();

  return {
    ideas: config.IDEAS_ADMIN_URL || '',
    items: config.INV_ADMIN_URL || '',
    finance: config.finance_url || '',
    maintenance: config.MAINT_URL || '',
    storage: config.STR_ADM_URL || '',
    workbench: config.WORKBENCH_URL || '',
    deployments: config.DEPLOY_ADMIN || '',
    audit: config.AUDIT_URL || '',
    inspector: config.INSPECT_URL || '',
    images: config.IMAGES_URL || '',
    gallery: ''
  };
}

/**
 * Fetch Inspector violation statistics
 * @returns {Promise<Object>} Statistics object with by_severity, by_status, total
 */
export async function fetchInspectorStats() {
  const config = await window.SpookyConfig.get();

  const response = await fetch(`${config.API_ENDPOINT}/admin/inspector/violations/stats`);

  if (!response.ok) {
    throw new Error(`Failed to fetch inspector stats: ${response.status}`);
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch inspector stats');
  }

  return result.data;
}

/**
 * Fetch Workbench statistics
 * @returns {Promise<Object>} Workbench stats with active, scheduled, completed counts
 */
export async function fetchWorkbenchStats() {
  const config = await window.SpookyConfig.get();

  try {
    const response = await fetch(`${config.API_ENDPOINT}/stats/workbench`);

    if (!response.ok) {
      throw new Error(`Failed to fetch workbench stats: ${response.status}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch workbench stats');
    }

    return result.data;
  } catch (error) {
    console.error('Error fetching workbench stats:', error);
    return { active: 0, scheduled: 0, completed: 0 };
  }
}

/**
 * Calculate system health status
 */
export async function calculateSystemHealth() {
  return {
    items: { healthy: true, count: 150 },
    storage: { healthy: true, count: 12 },
    deployments: { healthy: true, count: 1 },
    finance: { healthy: false, pendingCount: 5 },
    maintenance: { healthy: false, overdueCount: 3 },
    photos: { healthy: true, completionRate: 95 }
  };
}

/**
 * Submit conversation to Iris
 * @param {Array<{role: string, content: string}>} messages - Full conversation history
 * @returns {Promise<{response: string, tool_calls_made: Array}>}
 *
 * TODO: Verify SpookyConfig key for Iris endpoint. Currently uses API_ENDPOINT + /iris/chat.
 *       If a dedicated key is added (e.g. config.IRIS_URL), update accordingly.
 */
export async function submitIrisQuery(messages) {
  const config = await window.SpookyConfig.get();

  const response = await fetch(`${config.API_ENDPOINT}/iris/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
    credentials: 'include'
  });

  if (!response.ok) {
    throw new Error(`Iris request failed: ${response.status}`);
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Iris returned an error');
  }

  return result.data;
}