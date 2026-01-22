/**
 * Inspector API Client
 * Handles all API calls to inspector endpoints
 */

const InspectorAPI = {
    /**
     * Get base API URL
     */
    getBaseUrl() {
        if (typeof window.getApiEndpoint === 'function') {
            return window.getApiEndpoint();
        }
        console.error('API endpoint not available');
        return '';
    },

    /**
     * Make API request with error handling
     */
    async request(endpoint, options = {}) {
        const url = `${this.getBaseUrl()}${endpoint}`;
        
        try {
            const config = {
                method: options.method || 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                }
            };

            // Stringify body if present
            if (options.body) {
                config.body = typeof options.body === 'string' 
                    ? options.body 
                    : JSON.stringify(options.body);
            }

            const response = await fetch(url, config);
            const result = await response.json();

            // Handle responses with explicit success field
            if (result.hasOwnProperty('success') && !result.success) {
                const errorMsg = result.error || 'Request failed';
                const errorDetails = result.details ? ` - ${JSON.stringify(result.details)}` : '';
                throw new Error(`${errorMsg}${errorDetails}`);
            }

            // Return data if present, otherwise return the whole result
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

    /**
     * Build query string from params object
     */
    buildQueryString(params) {
        const filtered = Object.entries(params)
            .filter(([_, value]) => value !== null && value !== undefined)
            .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
            .join('&');
        
        return filtered ? `?${filtered}` : '';
    },

    // ==================== RULES ENDPOINTS ====================

    /**
     * Get all rules
     */
    async getRules() {
        return this.request('/admin/inspector/rules', {
            method: 'GET'
        });
    },

    /**
     * Get single rule by ID
     */
    async getRule(ruleId) {
        return this.request(`/admin/inspector/rules/${ruleId}`, {
            method: 'GET'
        });
    },

    /**
     * Update a rule
     */
    async updateRule(ruleId, updates) {
        return this.request(`/admin/inspector/rules/${ruleId}`, {
            method: 'PATCH',
            body: updates
        });
    },

    /**
     * Deactivate rule (DELETE)
     */
    async deleteRule(ruleId) {
        return this.request(`/admin/inspector/rules/${ruleId}`, {
            method: 'DELETE'
        });
    },

    /**
     * Execute rule (trigger evaluation)
     */
    async executeRule(ruleId, ruleCategory) {
        const categoryConfig = getRuleCategoryConfig(ruleCategory);
        if (!categoryConfig) {
            throw new Error(`Unknown rule category: ${ruleCategory}`);
        }

        return this.request(categoryConfig.endpoint, {
            method: 'POST',
            body: { rule_id: ruleId }
        });
    },

    // ==================== VIOLATIONS ENDPOINTS ====================

    /**
     * Get violations with pagination and filters
     */
    async getViolations(params = {}) {
        const {
            limit = 25,
            lastKey = null,
            status = null,
            severity = null,
            rule_id = null
        } = params;

        const queryParams = {
            limit,
            lastKey,
            status,
            severity,
            rule_id
        };

        const queryString = this.buildQueryString(queryParams);
        return this.request(`/admin/inspector/violations${queryString}`, {
            method: 'GET'
        });
    },

    /**
     * Get single violation by ID
     */
    async getViolation(violationId) {
        return this.request(`/admin/inspector/violations/${violationId}`, {
            method: 'GET'
        });
    },

    /**
     * Update violation notes
     */
    async updateViolation(violationId, notes) {
        return this.request(`/admin/inspector/violations/${violationId}`, {
            method: 'PUT',
            body: { notes }
        });
    },

    /**
     * Dismiss violation
     */
    async dismissViolation(violationId, dismissalNotes) {
        return this.request(`/admin/inspector/violations/${violationId}/dismiss`, {
            method: 'PATCH',
            body: { dismissal_notes: dismissalNotes }
        });
    },

    /**
     * Delete violation
     */
    async deleteViolation(violationId) {
        return this.request(`/admin/inspector/violations/${violationId}`, {
            method: 'DELETE'
        });
    },

    // ==================== BATCH OPERATIONS ====================

    /**
     * Get all violations for a specific rule
     */
    async getViolationsForRule(ruleId) {
        const allViolations = [];
        let lastKey = null;
        let hasMore = true;

        while (hasMore) {
            const result = await this.getViolations({
                rule_id: ruleId,
                limit: 100,
                lastKey
            });

            allViolations.push(...result.violations);
            lastKey = result.lastKey;
            hasMore = result.hasMore;
        }

        return allViolations;
    },

    /**
     * Get all violations (no filters, paginated)
     */
    async getAllViolations() {
        const allViolations = [];
        let lastKey = null;
        let hasMore = true;

        while (hasMore) {
            const result = await this.getViolations({
                limit: 100,
                lastKey
            });

            allViolations.push(...result.violations);
            lastKey = result.lastKey;
            hasMore = result.hasMore;
        }

        return allViolations;
    }
};