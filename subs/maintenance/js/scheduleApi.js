// API client for maintenance schedule templates

const HEADERS = { 'Content-Type': 'application/json' };

async function getApiEndpoint() {
  const { API_ENDPOINT } = await window.SpookyConfig.get();
  return API_ENDPOINT;
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

export async function fetchSchedules(filters = {}) {
  try {
    const API_ENDPOINT = await getApiEndpoint();
    const queryParams = new URLSearchParams();

    if (filters.class_type) queryParams.append('class_type', filters.class_type);
    if (filters.status) queryParams.append('status', filters.status);
    if (filters.task_type) queryParams.append('task_type', filters.task_type);
    if (filters.enabled !== undefined) queryParams.append('enabled', filters.enabled);
    if (filters.is_default !== undefined) queryParams.append('is_default', filters.is_default);

    const queryString = queryParams.toString();
    const url = `${API_ENDPOINT}/admin/maintenance-schedules${queryString ? '?' + queryString : ''}`;

    const response = await fetch(url, { headers: HEADERS });
    const json = await handleResponse(response);
    return json.data || [];
  } catch (error) {
    console.error('Error fetching schedules:', error);
    throw error;
  }
}

export async function fetchSchedule(scheduleId) {
  try {
    const API_ENDPOINT = await getApiEndpoint();
    const response = await fetch(
      `${API_ENDPOINT}/admin/maintenance-schedules/${scheduleId}`,
      { headers: HEADERS }
    );

    const json = await handleResponse(response);
    return json.data;
  } catch (error) {
    console.error('Error fetching schedule:', error);
    throw error;
  }
}

export async function createSchedule(scheduleData) {
  try {
    const API_ENDPOINT = await getApiEndpoint();
    const response = await fetch(
      `${API_ENDPOINT}/admin/maintenance-schedules`,
      {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify(scheduleData)
      }
    );

    const json = await handleResponse(response);
    return json.data;
  } catch (error) {
    console.error('Error creating schedule:', error);
    throw error;
  }
}

export async function updateSchedule(scheduleId, scheduleData) {
  try {
    const API_ENDPOINT = await getApiEndpoint();
    const response = await fetch(
      `${API_ENDPOINT}/admin/maintenance-schedules/${scheduleId}`,
      {
        method: 'PUT',
        headers: HEADERS,
        body: JSON.stringify(scheduleData)
      }
    );

    const json = await handleResponse(response);
    return json.data;
  } catch (error) {
    console.error('Error updating schedule:', error);
    throw error;
  }
}

export async function deleteSchedule(scheduleId) {
  try {
    const API_ENDPOINT = await getApiEndpoint();
    const response = await fetch(
      `${API_ENDPOINT}/admin/maintenance-schedules/${scheduleId}`,
      {
        method: 'DELETE',
        headers: HEADERS
      }
    );

    const json = await handleResponse(response);
    return json.data;
  } catch (error) {
    console.error('Error deleting schedule:', error);
    throw error;
  }
}

export async function fetchScheduleRecords(scheduleId) {
  try {
    const API_ENDPOINT = await getApiEndpoint();
    const response = await fetch(
      `${API_ENDPOINT}/admin/maintenance-schedules/${scheduleId}/records`,
      { headers: HEADERS }
    );

    const json = await handleResponse(response);
    return json.data || [];
  } catch (error) {
    console.error('Error fetching schedule records:', error);
    throw error;
  }
}

export async function generateScheduleRecords(scheduleId, count = 2) {
  try {
    const API_ENDPOINT = await getApiEndpoint();
    const response = await fetch(
      `${API_ENDPOINT}/admin/maintenance-schedules/${scheduleId}/generate`,
      {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify({ count })
      }
    );

    const json = await handleResponse(response);
    return json.data;
  } catch (error) {
    console.error('Error generating schedule records:', error);
    throw error;
  }
}

export async function applyTemplateToItems(scheduleId, data) {
  try {
    const API_ENDPOINT = await getApiEndpoint();
    const response = await fetch(
      `${API_ENDPOINT}/admin/maintenance-schedules/${scheduleId}/apply`,
      {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify(data)
      }
    );

    const json = await handleResponse(response);
    return json.data;
  } catch (error) {
    console.error('Error applying template to items:', error);
    throw error;
  }
}