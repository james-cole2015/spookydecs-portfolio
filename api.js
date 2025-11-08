// API Service Layer
const API = {
    // Helper function for fetch requests
    async request(endpoint, options = {}) {
        const url = `${CONFIG.API_ENDPOINT}${endpoint}`;
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
            },
        };

        try {
            const response = await fetch(url, { ...defaultOptions, ...options });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `HTTP error! status: ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    },

    // Deployment Management
    async createDeploymentAdmin(year, season, location) {
        return this.request('/admin/deployments', {
            method: 'POST',
            body: JSON.stringify({ year, season, location }),
        });
    },

    async getDeployment(deploymentId, locationName) {
        return this.request(`/admin/deployments/${deploymentId}/locations/${locationName}`);
    },

    async createDeployment(deploymentData) {
        return this.request('/admin/deployments', {
            method: 'POST',
            body: JSON.stringify(deploymentData),
        });
    },

    async updateDeployment(deploymentId, locationName, updates) {
        return this.request(`/admin/deployments/${deploymentId}/locations/${locationName}`, {
            method: 'PUT',
            body: JSON.stringify(updates),
        });
    },

    async deleteDeployment(deploymentId, locationName) {
        return this.request(`/admin/deployments/${deploymentId}/locations/${locationName}`, {
            method: 'DELETE',
        });
    },

    async listDeployments() {
        return this.request('/admin/deployments');
    },

    // Session Management
    async getSession(sessionId) {
        return this.request(`/admin/sessions/${sessionId}`);
    },

    async createSession(sessionData) {
        return this.request('/admin/sessions', {
            method: 'POST',
            body: JSON.stringify(sessionData),
        });
    },

    async updateSession(sessionId, updates) {
        return this.request(`/admin/sessions/${sessionId}`, {
            method: 'PUT',
            body: JSON.stringify(updates),
        });
    },

    async deleteSession(sessionId) {
        return this.request(`/admin/sessions/${sessionId}`, {
            method: 'DELETE',
        });
    },

    async listSessions() {
        return this.request('/admin/sessions');
    },

    // Connection Management
    async addConnection(deploymentId, locationName, connectionData) {
        return this.request(`/admin/deployments/${deploymentId}/locations/${locationName}/connections`, {
            method: 'POST',
            body: JSON.stringify(connectionData),
        });
    },

    async deleteConnection(deploymentId, locationName, connectionId) {
        return this.request(`/admin/deployments/${deploymentId}/locations/${locationName}/connections/${connectionId}`, {
            method: 'DELETE',
        });
    },

    async validateConnections(deploymentId, locationName) {
        return this.request(`/admin/deployments/${deploymentId}/locations/${locationName}/validate`);
    },

    // Statistics and Analysis
    async getStatistics(deploymentId, locationName) {
        return this.request(`/admin/deployments/${deploymentId}/locations/${locationName}/statistics`);
    },

    async getUnusedItems(deploymentId, locationName) {
        return this.request(`/admin/deployments/${deploymentId}/locations/${locationName}/unused-items`);
    },

    async getConnectionGraph(deploymentId, locationName) {
        return this.request(`/admin/deployments/${deploymentId}/locations/${locationName}/graph`);
    },
};