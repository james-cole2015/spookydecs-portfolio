/**
 * API Helper: maintenance.js
 * Handles requests to the maintenance subdomain API
 */

import { loadConfig } from './items.js';

/**
 * Get Maintenance subdomain URL from config
 */
async function getMaintenanceUrl() {
  const config = await loadConfig();
  
  if (!config.MAINT_URL) {
    console.error('MAINT_URL not found in config');
    throw new Error('Maintenance URL not configured');
  }
  
  return config.MAINT_URL;
}

/**
 * Fetch maintenance records for a specific item
 * @param {string} itemId - The item ID to fetch records for
 * @param {number} limit - Maximum number of records to return (default: 5)
 * @returns {Promise<Array>} Array of maintenance records
 */
export async function getMaintenanceRecords(itemId, limit = 5) {
  try {
    const config = await loadConfig();
    const apiEndpoint = config.API_ENDPOINT;
    
    if (!apiEndpoint) {
      throw new Error('API_ENDPOINT not found in config.json');
    }
    
    // Build query parameters
    const params = new URLSearchParams({
      item_id: itemId,
      limit: limit.toString()
    });
    
    // Use /admin/maintenance-records path as expected by Lambda
    const url = `${apiEndpoint}/admin/maintenance-records?${params.toString()}`;
    
    console.log(`Fetching maintenance records from: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      // Handle different error status codes
      if (response.status === 404) {
        console.log(`No maintenance records found for item: ${itemId}`);
        return [];
      }
      
      throw new Error(`API returned status ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Handle standardized response format: { success: true, data: [...] }
    if (data.success && data.data && Array.isArray(data.data)) {
      console.log(`Retrieved ${data.data.length} maintenance records for item: ${itemId}`);
      return data.data.slice(0, limit);
    }
    // Handle legacy format: { records: [...], count: N }
    else if (data.records && Array.isArray(data.records)) {
      console.log(`Retrieved ${data.records.length} maintenance records (legacy format) for item: ${itemId}`);
      return data.records.slice(0, limit);
    }
    // Handle direct array format
    else if (Array.isArray(data)) {
      console.log(`Retrieved ${data.length} maintenance records (array format) for item: ${itemId}`);
      return data.slice(0, limit);
    }
    // Handle DynamoDB format
    else if (data.Items && Array.isArray(data.Items)) {
      console.log(`Retrieved ${data.Items.length} maintenance records (DynamoDB format) for item: ${itemId}`);
      return data.Items.slice(0, limit);
    }
    
    console.warn('Unexpected API response format:', data);
    return [];
    
  } catch (error) {
    console.error('Error fetching maintenance records:', error);
    throw error;
  }
}

/**
 * Get the full URL for viewing an item's maintenance records
 * @param {string} itemId - The item ID
 * @returns {Promise<string>} Full URL to maintenance page
 */
export async function getMaintenancePageUrl(itemId) {
  const baseUrl = await getMaintenanceUrl();
  return `${baseUrl}/${itemId}`;
}

export { getMaintenanceUrl };