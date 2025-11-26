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
        const response = await this.request(`/admin/deployments/${deploymentId}/locations/${encodeURIComponent(locationName)}`);
        // The response structure from locations-operations Lambda is:
        // { deployment_id, deployment_name, location: { name, connections, work_sessions, notes, last_updated } }
        return response;
    },

    async listDeployments() {
        return this.request('/admin/deployments');
    },

    // Connection Management
    async addConnection(deploymentId, locationName, connectionData) {
        return this.request(`/admin/deployments/${deploymentId}/locations/${encodeURIComponent(locationName)}/connections`, {
            method: 'POST',
            body: JSON.stringify(connectionData),
        });
    },

    async deleteConnection(deploymentId, locationName, connectionId) {
        return this.request(`/admin/deployments/${deploymentId}/locations/${encodeURIComponent(locationName)}/connections/${connectionId}`, {
            method: 'DELETE',
        });
    },

    async validateConnections(deploymentId, locationName) {
        return this.request(`/admin/deployments/${deploymentId}/locations/${encodeURIComponent(locationName)}/validate`);
    },

    // Deployment Lifecycle
    async startSetup(deploymentId) {
        return this.request(`/admin/deployments/${deploymentId}/start-setup`, {
            method: 'PUT',
            body: JSON.stringify({})
        });
    },

    async getReviewData(deploymentId) {
        return this.request(`/admin/deployments/${deploymentId}/review`);
    },

    async completeSetup(deploymentId) {
        return this.request(`/admin/deployments/${deploymentId}/setup-complete`, {
            method: 'PUT',
            body: JSON.stringify({})
        });
    },

    // Session Management
    async startSession(deploymentId, locationName, data = {}) {
        return this.request(`/admin/deployments/${deploymentId}/locations/${encodeURIComponent(locationName)}/sessions`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    async endSession(deploymentId, locationName, sessionId, data = {}) {
        return this.request(`/admin/deployments/${deploymentId}/locations/${encodeURIComponent(locationName)}/sessions/${sessionId}`, {
            method: 'PATCH',
            body: JSON.stringify(data)
        });
    },

    // Statistics and Analysis
    async getStatistics(deploymentId, locationName) {
        return this.request(`/admin/deployments/${deploymentId}/locations/${encodeURIComponent(locationName)}/statistics`);
    },

    async getUnusedItems(deploymentId, locationName) {
        return this.request(`/admin/deployments/${deploymentId}/locations/${encodeURIComponent(locationName)}/unused-items`);
    },

    async getConnectionGraph(deploymentId, locationName) {
        return this.request(`/admin/deployments/${deploymentId}/locations/${encodeURIComponent(locationName)}/graph`);
    },

    // Graph Visualization
    async listCompletedDeployments() {
        // Returns list of deployments with status='complete' or 'in_progress'
        const response = await this.request('/admin/deployments');
        // Filter for visualizable deployments (both in_progress and complete)
        return response.filter(d => d.status === 'complete' || d.status === 'in_progress');
    },

    async getVisualization(deploymentId, type = 'network', zone = null) {
        // type: 'network' or 'tree'
        // zone: null (all zones) or specific zone name like 'Front Yard'
        let endpoint = `/admin/deployments/${deploymentId}/visualization?type=${type}`;
        if (zone) {
            endpoint += `&zone=${encodeURIComponent(zone)}`;
        }
        return this.request(endpoint);
    },

    // Item Management in Locations (for static props)
    async addItemToLocation(deploymentId, locationName, itemId) {
        return this.request(`/admin/deployments/${deploymentId}/locations/${encodeURIComponent(locationName)}/items`, {
            method: 'POST',
            body: JSON.stringify({ item_id: itemId })
        });
    },

    async removeItemFromLocation(deploymentId, locationName, itemId) {
        return this.request(`/admin/deployments/${deploymentId}/locations/${encodeURIComponent(locationName)}/items/${itemId}`, {
            method: 'DELETE'
        });
    },

    async updateConnectionNotes(deploymentId, locationName, connectionId, notes) {
    return this.request(`/admin/deployments/${deploymentId}/locations/${encodeURIComponent(locationName)}/connections/${connectionId}`, {
        method: 'PATCH',
        body: JSON.stringify({ notes }),
    });
},
};