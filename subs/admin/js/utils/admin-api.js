// Admin API utilities

let configCache = null;

/**
 * Load configuration from config.json
 */
async function loadConfig() {
    if (configCache) return configCache;
    
    try {
        const response = await fetch('/config.json');
        if (!response.ok) {
            throw new Error('Failed to load config');
        }
        configCache = await response.json();
        return configCache;
    } catch (error) {
        console.error('Error loading config:', error);
        throw error;
    }
}

/**
 * Get all subdomain URLs from config
 * @returns {Promise<Object>} Object containing all subdomain URLs
 */
export async function getSubdomainUrls() {
    const config = await loadConfig();
    
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
        images: config.IMAGES_URL ||'', 
        gallery: '' // Placeholder - no config URL yet
    };
}

/**
 * Fetch Inspector violation statistics
 * @returns {Promise<Object>} Statistics object with by_severity, by_status, total
 */
export async function fetchInspectorStats() {
    const config = await loadConfig();
    const apiBase = config.API_ENDPOINT;
    
    if (!apiBase) {
        throw new Error('API_ENDPOINT not configured');
    }
    
    try {
        const response = await fetch(`${apiBase}/admin/inspector/violations/stats`);
        
        if (!response.ok) {
            throw new Error(`Failed to fetch inspector stats: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Failed to fetch inspector stats');
        }
        
        return result.data;
    } catch (error) {
        console.error('Error fetching inspector stats:', error);
        throw error;
    }
}

/**
 * Fetch Workbench statistics (placeholder)
 * @returns {Promise<Object>} Workbench stats with active, scheduled, completed counts
 */
export async function fetchWorkbenchStats() {
    // TODO: Replace with actual API endpoint when workbench is implemented
    return {
        active: 0,
        scheduled: 0,
        completed: 0
    };
}

/**
 * Calculate system health status
 * Mock implementation - replace with actual logic
 */
export async function calculateSystemHealth() {
    // TODO: Fetch actual data from APIs and calculate health
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
 * Submit query to Iris (placeholder)
 */
export async function submitIrisQuery(query) {
    // TODO: Implement actual Claude API integration
    return {
        response: 'Not yet implemented',
        timestamp: new Date().toISOString()
    };
}

// Export config loader for use in other modules
export { loadConfig };