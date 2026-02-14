/**
 * Inspector API Client
 * Handles all API calls to inspector endpoints
 */

const InspectorAPI = {

  async getBaseUrl() {
    const { API_ENDPOINT } = await window.SpookyConfig.get();
    return API_ENDPOINT;
  },

  async request(endpoint, options = {}) {
    const baseUrl = await this.getBaseUrl();
    const url = `${baseUrl}${endpoint}`;

    try {
      const config = {
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      };

      if (options.body) {
        config.body = typeof options.body === 'string'
          ? options.body
          : JSON.stringify(options.body);
      }

      const response = await fetch(url, config);
      const result = await response.json();

      if (result.hasOwnProperty('success') && !result.success) {
        const errorMsg = result.error || 'Request failed';
        const errorDetails = result.details ? ` - ${JSON.stringify(result.details)}` : '';
        throw new Error(`${errorMsg}${errorDetails}`);
      }

      return result.data || result;

    } catch (error) {
      console.error(`API Error (${endpoint}):`, error);
      console.error('Full error details:', {
        endpoint,
        url,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  },

  buildQueryString(params) {
    const filtered = Object.entries(params)
      .filter(([_, value]) => value !== null && value !== undefined)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&');

    return filtered ? `?${filtered}` : '';
  },

  // ==================== RULES ENDPOINTS ====================

  async getRules() {
    return this.request('/admin/inspector/rules', { method: 'GET' });
  },

  async getRule(ruleId) {
    return this.request(`/admin/inspector/rules/${ruleId}`, { method: 'GET' });
  },

  async updateRule(ruleId, updates) {
    return this.request(`/admin/inspector/rules/${ruleId}`, { method: 'PATCH', body: updates });
  },

  async deleteRule(ruleId) {
    return this.request(`/admin/inspector/rules/${ruleId}`, { method: 'DELETE' });
  },

  async executeRule(ruleId, ruleCategory) {
    const categoryConfig = getRuleCategoryConfig(ruleCategory);
    if (!categoryConfig) {
      throw new Error(`Unknown rule category: ${ruleCategory}`);
    }
    return this.request(categoryConfig.endpoint, { method: 'POST', body: { rule_id: ruleId } });
  },

  // ==================== VIOLATIONS ENDPOINTS ====================

  async getViolations(params = {}) {
    const {
      limit = 25,
      lastKey = null,
      status = null,
      severity = null,
      rule_id = null
    } = params;

    const queryString = this.buildQueryString({ limit, lastKey, status, severity, rule_id });
    return this.request(`/admin/inspector/violations${queryString}`, { method: 'GET' });
  },

  async getViolation(violationId) {
    return this.request(`/admin/inspector/violations/${violationId}`, { method: 'GET' });
  },

  async updateViolation(violationId, notes) {
    return this.request(`/admin/inspector/violations/${violationId}`, { method: 'PUT', body: { notes } });
  },

  async dismissViolation(violationId, dismissalNotes) {
    return this.request(`/admin/inspector/violations/${violationId}/dismiss`, {
      method: 'PATCH',
      body: { dismissal_notes: dismissalNotes }
    });
  },

  async deleteViolation(violationId) {
    return this.request(`/admin/inspector/violations/${violationId}`, { method: 'DELETE' });
  },

  // ==================== BATCH OPERATIONS ====================

  async getViolationsForRule(ruleId) {
    const allViolations = [];
    let lastKey = null;
    let hasMore = true;

    while (hasMore) {
      const result = await this.getViolations({ rule_id: ruleId, limit: 100, lastKey });
      allViolations.push(...result.violations);
      lastKey = result.lastKey;
      hasMore = result.hasMore;
    }

    return allViolations;
  },

  async getAllViolations() {
    const allViolations = [];
    let lastKey = null;
    let hasMore = true;

    while (hasMore) {
      const result = await this.getViolations({ limit: 100, lastKey });
      allViolations.push(...result.violations);
      lastKey = result.lastKey;
      hasMore = result.hasMore;
    }

    return allViolations;
  }
};