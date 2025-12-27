// API client for maintenance schedule templates

import { loadConfig } from './api.js';

function getHeaders() {
  return {
    'Content-Type': 'application/json',
    'Origin': window.location.origin
  };
}

async function handleResponse(response) {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }
  return response.json();
}

// ============================================
// SCHEDULE TEMPLATE API
// ============================================

/**
 * Fetch all schedule templates with optional filters
 * @param {Object} filters - Optional filters { class_type, status, task_type, enabled, is_default }
 * @returns {Promise<Array>} Array of schedule templates
 */
export async function fetchSchedules(filters = {}) {
  try {
    const config = await loadConfig();
    const queryParams = new URLSearchParams();
    
    // Add filters to query string (using class_type, not item_id)
    if (filters.class_type) queryParams.append('class_type', filters.class_type);
    if (filters.status) queryParams.append('status', filters.status);
    if (filters.task_type) queryParams.append('task_type', filters.task_type);
    if (filters.enabled !== undefined) queryParams.append('enabled', filters.enabled);
    if (filters.is_default !== undefined) queryParams.append('is_default', filters.is_default);
    
    const queryString = queryParams.toString();
    const url = `${config.API_ENDPOINT}/admin/maintenance-schedules${queryString ? '?' + queryString : ''}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: getHeaders()
    });
    
    return handleResponse(response);
  } catch (error) {
    console.error('Error fetching schedules:', error);
    throw error;
  }
}

/**
 * Fetch a single schedule template by ID
 * @param {string} scheduleId - Schedule ID
 * @returns {Promise<Object>} Schedule template object
 */
export async function fetchSchedule(scheduleId) {
  try {
    const config = await loadConfig();
    const response = await fetch(
      `${config.API_ENDPOINT}/admin/maintenance-schedules/${scheduleId}`,
      {
        method: 'GET',
        headers: getHeaders()
      }
    );
    
    return handleResponse(response);
  } catch (error) {
    console.error('Error fetching schedule:', error);
    throw error;
  }
}

/**
 * Create a new schedule template
 * @param {Object} scheduleData - Schedule data (must include class_type, task_type, short_name, title, frequency)
 * @returns {Promise<Object>} Created schedule template
 */
export async function createSchedule(scheduleData) {
  try {
    const config = await loadConfig();
    const response = await fetch(
      `${config.API_ENDPOINT}/admin/maintenance-schedules`,
      {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(scheduleData)
      }
    );
    
    return handleResponse(response);
  } catch (error) {
    console.error('Error creating schedule:', error);
    throw error;
  }
}

/**
 * Update an existing schedule template
 * @param {string} scheduleId - Schedule ID
 * @param {Object} scheduleData - Updated schedule data
 * @returns {Promise<Object>} Updated schedule template
 */
export async function updateSchedule(scheduleId, scheduleData) {
  try {
    const config = await loadConfig();
    const response = await fetch(
      `${config.API_ENDPOINT}/admin/maintenance-schedules/${scheduleId}`,
      {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(scheduleData)
      }
    );
    
    return handleResponse(response);
  } catch (error) {
    console.error('Error updating schedule:', error);
    throw error;
  }
}

/**
 * Delete a schedule template (cancels all future scheduled records)
 * @param {string} scheduleId - Schedule ID
 * @returns {Promise<Object>} Deletion result with cancelled records count
 */
export async function deleteSchedule(scheduleId) {
  try {
    const config = await loadConfig();
    const response = await fetch(
      `${config.API_ENDPOINT}/admin/maintenance-schedules/${scheduleId}`,
      {
        method: 'DELETE',
        headers: getHeaders()
      }
    );
    
    return handleResponse(response);
  } catch (error) {
    console.error('Error deleting schedule:', error);
    throw error;
  }
}

/**
 * Fetch all maintenance records generated from a specific schedule template
 * @param {string} scheduleId - Schedule ID
 * @returns {Promise<Array>} Array of maintenance records
 */
export async function fetchScheduleRecords(scheduleId) {
  try {
    const config = await loadConfig();
    const response = await fetch(
      `${config.API_ENDPOINT}/admin/maintenance-schedules/${scheduleId}/records`,
      {
        method: 'GET',
        headers: getHeaders()
      }
    );
    
    return handleResponse(response);
  } catch (error) {
    console.error('Error fetching schedule records:', error);
    throw error;
  }
}

/**
 * Manually generate additional records for a schedule template
 * @param {string} scheduleId - Schedule ID
 * @param {number} count - Number of records to generate (default 2)
 * @returns {Promise<Object>} Generation result with created records
 */
export async function generateScheduleRecords(scheduleId, count = 2) {
  try {
    const config = await loadConfig();
    const response = await fetch(
      `${config.API_ENDPOINT}/admin/maintenance-schedules/${scheduleId}/generate`,
      {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ count })
      }
    );
    
    return handleResponse(response);
  } catch (error) {
    console.error('Error generating schedule records:', error);
    throw error;
  }
}

/**
 * Apply a template to one or more items
 * @param {string} scheduleId - Template ID to apply
 * @param {Object} data - { item_ids: string[], start_date?: string }
 * @returns {Promise<Object>} Application result with items_updated, records_created, details
 */
export async function applyTemplateToItems(scheduleId, data) {
  try {
    const config = await loadConfig();
    const response = await fetch(
      `${config.API_ENDPOINT}/admin/maintenance-schedules/${scheduleId}/apply`,
      {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data)
      }
    );
    
    return handleResponse(response);
  } catch (error) {
    console.error('Error applying template to items:', error);
    throw error;
  }
}
