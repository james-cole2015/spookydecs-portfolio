/**
 * API Helper: maintenance.js
 * Handles requests to the maintenance subdomain API
 */

import { loadConfig, getMaintenanceUrl } from './items.js';

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
    
    // Handle different response formats
    // Based on your Lambda, it returns { records: [...], count: N }
    if (data.records && Array.isArray(data.records)) {
      // Limit to the requested number of records
      return data.records.slice(0, limit);
    } else if (Array.isArray(data)) {
      return data.slice(0, limit);
    } else if (data.Items && Array.isArray(data.Items)) {
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