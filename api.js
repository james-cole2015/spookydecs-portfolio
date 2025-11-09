// API Service Layer
const API = {
    // Helper function for fetch requests
    async request(endpoint, options = {}) {
        const url = `${CONFIG.API_ENDPOINT}${endpoint}`;
        console.log('API Request URL:', url); // DEBUG
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
            },
        };

        try {
            const response = await fetch(url, { ...defaultOptions, ...options });
            console.log('API Response status:', response.status); // DEBUG
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

    // Item Management
    async getItem(itemId) {
        return this.request(`/items/${itemId}`);
    },

    async listItems() {
        return this.request('/items');
    },

    async updateItem(itemId, updates) {
        return this.request(`/admin/items/${itemId}`, {
            method: 'PUT',
            body: JSON.stringify(updates),
        });
    },

    // Deployment Management
    async createDeploymentAdmin(year, season, location) {
        return this.request('/admin/deployments', {
            method: 'POST',
            body: JSON.stringify({ year, season, location }),
        });
    },

    async getDeployment(deploymentId, locationName) {
        const response = await this.request(`/admin/deployments/${deploymentId}/locations/${locationName}`);
        // The response structure from locations-operations Lambda is:
        // { deployment_id, deployment_name, location: { name, connections, work_sessions, notes, last_updated } }
        return response;
    },

    async listDeployments() {
        return this.request('/admin/deployments');
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