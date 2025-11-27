// Deployment Lifecycle Management
// Handles deployment creation, starting setup, review, and completion

const DeploymentLifecycle = {
    /**
     * Create a new deployment
     */
    async createDeployment() {
        const year = document.getElementById('create-year').value;
        const season = document.getElementById('create-season').value;
        const zone = document.getElementById('create-zone').value;

        if (!season) {
            UIUtils.showToast('Please select a season', 'error');
            return;
        }

        if (!zone) {
            UIUtils.showToast('Please select a zone', 'error');
            return;
        }

        try {
            const result = await API.createDeploymentAdmin(parseInt(year), season, zone);
            
            UIUtils.showToast('Deployment created successfully! Select a zone to continue.');
            
            document.getElementById('create-season').value = '';
            document.getElementById('create-zone').value = '';
            
            await this.loadInProgressDeployments();
            
        } catch (error) {
            UIUtils.showToast(`Failed to create deployment: ${error.message}`, 'error');
        }
    },

    /**
     * Load in-progress deployments
     */
    async loadInProgressDeployments() {
        try {
            const deployments = await API.listDeployments();
            
            // Filter for not_started and in_progress deployments only
            AppState.inProgressDeployments = deployments.filter(d => 
                d.status === 'not_started' || d.status === 'in_progress'
            );
            
            this.renderDeploymentsList();
        } catch (error) {
            UIUtils.showToast(`Failed to load deployments: ${error.message}`, 'error');
            document.getElementById('deployments-list').innerHTML = `
                <p class="text-red-500 text-center py-8">Error loading deployments. Please try again.</p>
            `;
        }
    },

    /**
     * Render deployments list
     */
    renderDeploymentsList() {
        const listContainer = document.getElementById('deployments-list');
        
        if (AppState.inProgressDeployments.length === 0) {
            listContainer.innerHTML = `
                <p class="text-gray-500 text-center py-8">No in-progress deployments found. Start a new deployment above!</p>
            `;
            return;
        }

        listContainer.innerHTML = AppState.inProgressDeployments.map(deployment => {
            const locations = deployment.locations || [];
            const status = deployment.status || 'not_started';
            
            // Calculate item counts per zone
            const locationButtons = locations.map(location => {
                const itemCount = location.items_deployed?.length || 0;
                return `
                    <button 
                        class="px-3 py-1.5 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm"
                        onclick="DeploymentLifecycle.handleZoneClick('${deployment.id}', '${location.name}', '${status}')"
                    >
                        ${location.name} (${itemCount} items)
                    </button>
                `;
            }).join('');
            
            // Status badge
            const statusBadge = status === 'not_started' 
                ? '<span class="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">Not Started</span>'
                : '<span class="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">In Progress</span>';
            
            // Action buttons based on status
            let actionButtons = '';
            if (status === 'not_started') {
                actionButtons = `
                    <button 
                        class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-medium"
                        onclick="DeploymentLifecycle.startSetup('${deployment.id}')"
                    >
                        Start Setup
                    </button>
                `;
            } else if (status === 'in_progress') {
                actionButtons = `
                    <button 
                        class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
                        onclick="DeploymentLifecycle.loadDeploymentIntoBuilder('${deployment.id}', '${locations[0]?.name || 'Front Yard'}')"
                    >
                        Continue Working
                    </button>
                    <button 
                        class="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 font-medium"
                        onclick="DeploymentLifecycle.reviewAndFinish('${deployment.id}')"
                    >
                        Review & Finish Setup
                    </button>
                `;
            }
            
            // Show start date if setup has started
            const startedInfo = deployment.setup_started_at 
                ? `<p class="text-sm text-gray-600 mt-1">Started: ${new Date(deployment.setup_started_at).toLocaleString()}</p>`
                : '';

            return `
                <div class="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                    <div class="flex justify-between items-start mb-3">
                        <div class="flex-1">
                            <div class="flex items-center gap-2">
                                <h3 class="text-lg font-semibold text-gray-900">${deployment.id}</h3>
                                ${statusBadge}
                            </div>
                            <p class="text-sm text-gray-600 mt-1">
                                ${deployment.season} ${deployment.year}
                            </p>
                            ${startedInfo}
                        </div>
                    </div>
                    <div class="mt-3">
                        <p class="text-sm font-medium text-gray-700 mb-2">Zones:</p>
                        <div class="flex flex-wrap gap-2 mb-3">
                            ${locationButtons}
                        </div>
                    </div>
                    <div class="flex gap-2 mt-4">
                        ${actionButtons}
                    </div>
                </div>
            `;
        }).join('');
    },

    /**
     * Handle zone click
     */
    handleZoneClick(deploymentId, locationName, status) {
        if (status === 'not_started') {
            UIUtils.showToast('Please start setup first', 'error');
            return;
        }
        
        this.loadDeploymentIntoBuilder(deploymentId, locationName);
    },

    /**
     * Start setup for a deployment
     */
    async startSetup(deploymentId) {
        if (!confirm('Start setup for this deployment? This will create your first work session.')) {
            return;
        }
        
        try {
            UIUtils.showToast('Starting setup...', 'info');
            
            // Start setup (changes status to in_progress)
            const result = await API.startSetup(deploymentId);
            
            // Auto-start first session for Front Yard (default location)
            const firstLocation = 'Front Yard';
            const sessionResult = await API.startSession(deploymentId, firstLocation, {
                notes: 'Initial setup session'
            });
            
            UIUtils.showToast(`Setup started! Session ${sessionResult.session.id} is now active.`);
            
            // Load the deployment into builder
            await this.loadDeploymentIntoBuilder(deploymentId, firstLocation);
            
        } catch (error) {
            UIUtils.showToast(`Failed to start setup: ${error.message}`, 'error');
        }
    },

    /**
     * Review and finish deployment
     */
   /**
 * Review and finish deployment
 */
async reviewAndFinish(deploymentId) {
    try {
        UIUtils.showToast('Loading deployment summary...', 'info');
        const reviewData = await API.getReviewData(deploymentId);
        
        // Check if there's an active session
        const deployments = await API.listDeployments();
        const deployment = deployments.find(d => d.id === deploymentId);
        
        if (!deployment) {
            throw new Error(`Deployment ${deploymentId} not found`);
        }
        
        const hasActiveSession = deployment.locations.some(loc => {
            const sessions = loc.work_sessions || [];
            return sessions.some(s => !s.end_time);
        });
        
        if (hasActiveSession) {
            reviewData.hasActiveSession = true;
        }
        
        // Show review modal
        this.showReviewModal(reviewData);
    } catch (error) {
        UIUtils.showToast(`Failed to load review data: ${error.message}`, 'error');
    }
},

    /**
     * Show review modal
     */
    showReviewModal(reviewData) {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto';
        modal.id = 'review-modal';
        
        const startedDate = new Date(reviewData.setup_started_at).toLocaleString();
        const currentDate = new Date().toLocaleString();
        const durationMinutes = reviewData.setup_duration_minutes || 0;
        const hours = Math.floor(durationMinutes / 60);
        const minutes = durationMinutes % 60;
        const durationText = hours > 0 ? `${hours} hour${hours > 1 ? 's' : ''} ${minutes} minutes` : `${minutes} minutes`;
        
        const locationRows = reviewData.locations.map(loc => `
            <tr class="border-b border-gray-200">
                <td class="px-4 py-3 text-sm font-medium">${loc.name}</td>
                <td class="px-4 py-3 text-sm text-center">${loc.unique_items_count}</td>
                <td class="px-4 py-3 text-sm text-center">${loc.connections_count}</td>
            </tr>
        `).join('');
        
        const canFinish = reviewData.total_connections > 0;
        
        let warningMessage = '';
        if (reviewData.hasActiveSession) {
            warningMessage = '<div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4"><p class="text-blue-800 text-sm">ℹ️ You have an active session. It will be automatically ended when you finish setup.</p></div>';
        }
        
        if (!canFinish) {
            warningMessage += '<div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-4"><p class="text-red-800 text-sm">⚠️ Cannot finish setup with no connections. Please add at least one connection.</p></div>';
        } else {
            warningMessage += '<div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4"><p class="text-yellow-800 text-sm">⚠️ Finishing setup will mark all ' + reviewData.total_unique_items + ' items as deployed and this cannot be undone from this interface.</p></div>';
        }
        
        modal.innerHTML = `
            <div class="min-h-screen px-4 flex items-center justify-center">
                <div class="bg-white rounded-lg w-full max-w-2xl mx-auto my-8">
                    <div class="p-6 border-b">
                        <h2 class="text-2xl font-semibold">Review Deployment Setup</h2>
                        <p class="text-gray-600 mt-1">${reviewData.deployment_id} - ${reviewData.season} ${reviewData.year}</p>
                    </div>
                    
                    <div class="p-6">
                        <div class="space-y-4 mb-6">
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <p class="text-sm text-gray-600">Setup Started</p>
                                    <p class="font-medium">${startedDate}</p>
                                </div>
                                <div>
                                    <p class="text-sm text-gray-600">Current Time</p>
                                    <p class="font-medium">${currentDate}</p>
                                </div>
                            </div>
                            <div>
                                <p class="text-sm text-gray-600">Duration</p>
                                <p class="font-medium">${durationText}</p>
                            </div>
                        </div>
                        
                        <div class="mb-6">
                            <h3 class="font-semibold mb-3">Zone Summary</h3>
                            <div class="border border-gray-200 rounded-lg overflow-hidden">
                                <table class="w-full">
                                    <thead class="bg-gray-50">
                                        <tr>
                                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Zone</th>
                                            <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Items</th>
                                            <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Connections</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${locationRows}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        
                        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <p class="text-sm text-blue-600">Total Items to Deploy</p>
                                    <p class="text-2xl font-bold text-blue-900">${reviewData.total_unique_items}</p>
                                </div>
                                <div>
                                    <p class="text-sm text-blue-600">Total Connections</p>
                                    <p class="text-2xl font-bold text-blue-900">${reviewData.total_connections}</p>
                                </div>
                            </div>
                        </div>
                        
                        ${warningMessage}
                    </div>
                    
                    <div class="p-6 border-t flex justify-end space-x-2">
                        <button 
                            class="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                            onclick="DeploymentLifecycle.closeReviewModal()"
                        >
                            Back
                        </button>
                        <button 
                            class="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-medium ${!canFinish ? 'opacity-50 cursor-not-allowed' : ''}"
                            onclick="DeploymentLifecycle.completeSetup('${reviewData.deployment_id}')"
                            ${!canFinish ? 'disabled' : ''}
                        >
                            Finish Setup
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    },

    /**
     * Close review modal
     */
    closeReviewModal() {
        const modal = document.getElementById('review-modal');
        if (modal) {
            modal.remove();
        }
    },

    /**
     * Complete setup
     */
    async completeSetup(deploymentId) {
        if (!confirm('Are you sure you want to finish setup? This will mark all items as deployed and cannot be undone.')) {
            return;
        }
        
        try {
            UIUtils.showToast('Completing setup...', 'info');
            this.closeReviewModal();
            
            const result = await API.completeSetup(deploymentId);
            
            UIUtils.showToast(`Setup complete! ${result.items_deployed} items have been deployed.`, 'success');
            
            await this.loadInProgressDeployments();
        } catch (error) {
            UIUtils.showToast(`Failed to complete setup: ${error.message}`, 'error');
        }
    },

    /**
     * Load deployment into builder
     */
    async loadDeploymentIntoBuilder(deploymentId, locationName) {
        console.log('🔍 loadDeploymentIntoBuilder called with:', { deploymentId, locationName });
        try {
            UIUtils.showToast('Loading available items...', 'info');
            
            const itemsResponse = await API.listItems();
            const allItems = Array.isArray(itemsResponse) ? itemsResponse : (itemsResponse.items || []);
            
            // Get the FULL deployment with all locations
            const deploymentsResponse = await API.listDeployments();
            const fullDeployment = deploymentsResponse.find(d => d.id === deploymentId);
            
            if (!fullDeployment) {
                throw new Error(`Deployment ${deploymentId} not found`);
            }
            
            // Find the current location within the full deployment
            const currentLocationData = fullDeployment.locations.find(loc => loc.name === locationName);
            
            if (!currentLocationData) {
                throw new Error(`Location ${locationName} not found in deployment`);
            }
            
            AppState.currentDeploymentId = deploymentId;
            AppState.currentLocationName = locationName;
            AppState.currentZone = locationName;
            AppState.allItems = allItems;
            AppState.connections = currentLocationData.connections || [];
            AppState.sourceItem = null;
            AppState.destinationItem = null;
            
            // Check for active session
            const sessions = currentLocationData.work_sessions || [];
            AppState.activeSession = sessions.find(s => !s.end_time) || null;
            
            // Initialize workflow components with FULL deployment (all locations)
            state.currentDeployment = fullDeployment;
            state.currentLocation = locationName;
            state.allItems = allItems;
            
            // Update deployment info with mobile-friendly format
            const deploymentInfo = document.getElementById('current-deployment-info');
            deploymentInfo.innerHTML = `
                <span>Deployment: ${deploymentId}</span>
                <span>Zone: ${locationName}</span>
            `;
            
            clearConnectionForm();
            renderConnections();
            DeploymentSessions.renderSessionWidget();
            DeploymentSessions.updateConnectionFormState();
            renderItemsList();
            
            document.getElementById('deployments-view').classList.add('hidden');
            document.getElementById('connection-builder-view').classList.remove('hidden');
            
            
            UIUtils.showToast(`Connection builder loaded for ${locationName}`);
        } catch (error) {
            UIUtils.showToast(`Failed to load deployment: ${error.message}`, 'error');
        }
    },

    /**
     * Reload deployment data
     */
    async reloadDeploymentData() {
        if (!AppState.currentDeploymentId || !AppState.currentLocationName) {
            console.warn('Cannot reload: no active deployment');
            return;
        }
        
        try {
            // Get full deployment
            const deploymentsResponse = await API.listDeployments();
            const fullDeployment = deploymentsResponse.find(d => d.id === AppState.currentDeploymentId);
            
            if (!fullDeployment) {
                throw new Error(`Deployment ${AppState.currentDeploymentId} not found`);
            }
            
            // Find current location
            const currentLocationData = fullDeployment.locations.find(
                loc => loc.name === AppState.currentLocationName
            );
            
            if (!currentLocationData) {
                throw new Error(`Location ${AppState.currentLocationName} not found`);
            }
            
            console.log('🔍 locationData received:', currentLocationData);
            
            // Update connections
            AppState.connections = currentLocationData.connections || [];
            
            // Update active session
            const sessions = currentLocationData.work_sessions || [];
            AppState.activeSession = sessions.find(s => !s.end_time) || null;
            DeploymentSessions.updateConnectionFormState();
            
            // Update state.currentDeployment with fresh full deployment
            state.currentDeployment = fullDeployment;
            
            // Re-render everything
            renderConnections();
            DeploymentSessions.renderSessionWidget();
            renderItemsList();
            
            console.log('Deployment data reloaded successfully');
        } catch (error) {
            console.error('Failed to reload deployment data:', error);
        }
    },

    /**
     * Render items list
     */
    renderItemsList() {
        const listContainer = document.getElementById('items-deployed-list');
        if (!listContainer) return;
        
        // Get items from current location's connections
        const itemsSet = new Set();
        
        AppState.connections.forEach(conn => {
            itemsSet.add(conn.from_item_id);
            itemsSet.add(conn.to_item_id);
            // Add illuminated items
            if (conn.illuminates) {
                conn.illuminates.forEach(id => itemsSet.add(id));
            }
        });
        
        const itemsArray = Array.from(itemsSet);
        
        if (itemsArray.length === 0) {
            listContainer.innerHTML = '<p class="text-gray-400 italic text-xs">No items deployed yet</p>';
            return;
        }
        
        // Build list with item names
        const itemsList = itemsArray.map(itemId => {
            const item = AppState.allItems.find(i => i.id === itemId);
            const displayName = item ? item.short_name : itemId;
            const className = item ? item.class_type : 'Unknown';
            return `
                <li class="text-xs">
                    <div class="font-medium text-gray-800">${displayName}</div>
                    <div class="text-gray-500">${className}</div>
                </li>
            `;
        }).join('');
        
        listContainer.innerHTML = `
            <div class="mb-2 text-xs font-medium text-gray-600">
                ${itemsArray.length} item${itemsArray.length !== 1 ? 's' : ''}
            </div>
            <ul class="space-y-2">
                ${itemsList}
            </ul>
        `;
    },

    /**
     * Back to deployments view
     */
    backToDeployments() {
        // Clear session timer
        DeploymentSessions.clearTimer();
        
        document.getElementById('connection-builder-view').classList.add('hidden');
        document.getElementById('deployments-view').classList.remove('hidden');
        
        this.loadInProgressDeployments();
    }
};

// Make functions available globally for onclick handlers
window.DeploymentLifecycle = DeploymentLifecycle;
window.handleZoneClick = DeploymentLifecycle.handleZoneClick.bind(DeploymentLifecycle);
window.startSetup = DeploymentLifecycle.startSetup.bind(DeploymentLifecycle);
window.reviewAndFinish = DeploymentLifecycle.reviewAndFinish.bind(DeploymentLifecycle);
window.closeReviewModal = DeploymentLifecycle.closeReviewModal.bind(DeploymentLifecycle);
window.completeSetup = DeploymentLifecycle.completeSetup.bind(DeploymentLifecycle);
window.loadDeploymentIntoBuilder = DeploymentLifecycle.loadDeploymentIntoBuilder.bind(DeploymentLifecycle);
window.reloadDeploymentData = DeploymentLifecycle.reloadDeploymentData.bind(DeploymentLifecycle);
window.renderItemsList = DeploymentLifecycle.renderItemsList.bind(DeploymentLifecycle);