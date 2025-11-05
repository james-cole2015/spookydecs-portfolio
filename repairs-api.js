/**
 * SpookyDecs Repairs - API Module
 * Handles all API calls to the backend
 */

const API = {
  /**
   * Make a fetch request with error handling
   */
  async request(endpoint, options = {}) {
    const url = `${CONFIG.API_BASE_URL}${endpoint}`;
    
    const defaultOptions = {
      headers: AUTH.getHeaders()
    };

    const mergedOptions = { ...defaultOptions, ...options };

    try {
      const response = await fetch(url, mergedOptions);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Request failed');
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },

  /**
   * List all items needing repair
   */
  async listRepairs(filters = {}) {
    const params = new URLSearchParams();
    
    if (filters.criticality) params.append('criticality', filters.criticality);
    if (filters.status) params.append('status', filters.status);
    if (filters.class_type) params.append('class_type', filters.class_type);

    const queryString = params.toString();
    const endpoint = queryString 
      ? `${CONFIG.ENDPOINTS.LIST_REPAIRS}?${queryString}`
      : CONFIG.ENDPOINTS.LIST_REPAIRS;

    return this.request(endpoint);
  },

  /**
   * Get detailed repair information for a specific item
   */
  async getRepairDetail(itemId) {
    const endpoint = CONFIG.ENDPOINTS.GET_REPAIR.replace('{id}', itemId);
    return this.request(endpoint);
  },

  /**
   * Start repair on an item
   */
  async startRepair(itemId) {
    const endpoint = CONFIG.ENDPOINTS.START_REPAIR.replace('{id}', itemId);
    return this.request(endpoint, {
      method: 'PUT'
    });
  },

  /**
   * Complete repair on an item
   */
  async completeRepair(itemId, repairData) {
    const endpoint = CONFIG.ENDPOINTS.COMPLETE_REPAIR.replace('{id}', itemId);
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(repairData)
    });
  },

  /**
   * Flag an item for repair
   */
  async flagForRepair(itemId, flagData) {
    const endpoint = CONFIG.ENDPOINTS.FLAG_REPAIR.replace('{id}', itemId);
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(flagData)
    });
  },

  /**
   * Retire an item
   */
  async retireItem(itemId, notes) {
    const endpoint = CONFIG.ENDPOINTS.RETIRE_ITEM.replace('{id}', itemId);
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify({ notes })
    });
  }
};