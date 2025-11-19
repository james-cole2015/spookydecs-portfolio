// Deployment Management Functions

async function createDeployment() {
    const year = document.getElementById('create-year').value;
    const season = document.getElementById('create-season').value;

    if (!season) {
        UIUtils.showToast('Please select a season', 'error');
        return;
    }

    try {
        const result = await API.createDeploymentAdmin(parseInt(year), season, 'Front Yard');
        
        UIUtils.showToast('Deployment created successfully! Select a zone to continue.');
        
        document.getElementById('create-season').value = '';
        
        await loadInProgressDeployments();
        
    } catch (error) {
        UIUtils.showToast(`Failed to create deployment: ${error.message}`, 'error');
    }
}

async function loadInProgressDeployments() {
    try {
        const deployments = await API.listDeployments();
        
        // Filter for not_started and in_progress deployments only
        AppState.inProgressDeployments = deployments.filter(d => 
            d.status === 'not_started' || d.status === 'in_progress'
        );
        
        renderDeploymentsList();
    } catch (error) {
        UIUtils.showToast(`Failed to load deployments: ${error.message}`, 'error');
        document.getElementById('deployments-list').innerHTML = `
            <p class="text-red-500 text-center py-8">Error loading deployments. Please try again.</p>
        `;
    }
}

function renderDeploymentsList() {
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
                    onclick="handleZoneClick('${deployment.id}', '${location.name}', '${status}')"
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
                    onclick="startSetup('${deployment.id}')"
                >
                    Start Setup
                </button>
            `;
        } else if (status === 'in_progress') {
            actionButtons = `
                <button 
                    class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
                    onclick="loadDeploymentIntoBuilder('${deployment.id}', '${locations[0]?.name || 'Front Yard'}')"
                >
                    Continue Working
                </button>
                <button 
                    class="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 font-medium"
                    onclick="reviewAndFinish('${deployment.id}')"
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
}

function handleZoneClick(deploymentId, locationName, status) {
    if (status === 'not_started') {
        UIUtils.showToast('Please start setup first', 'error');
        return;
    }
    
    loadDeploymentIntoBuilder(deploymentId, locationName);
}

async function startSetup(deploymentId) {
    if (!confirm('Start setup for this deployment? You will be able to build connections across all zones.')) {
        return;
    }
    
    try {
        UIUtils.showToast('Starting setup...', 'info');
        const result = await API.startSetup(deploymentId);
        UIUtils.showToast('Setup started! You can now build connections.');
        await loadInProgressDeployments();
    } catch (error) {
        UIUtils.showToast(`Failed to start setup: ${error.message}`, 'error');
    }
}

async function reviewAndFinish(deploymentId) {
    try {
        UIUtils.showToast('Loading deployment summary...', 'info');
        const reviewData = await API.getReviewData(deploymentId);
        
        // Show review modal
        showReviewModal(reviewData);
    } catch (error) {
        UIUtils.showToast(`Failed to load review data: ${error.message}`, 'error');
    }
}

function showReviewModal(reviewData) {
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
    const warningMessage = !canFinish 
        ? '<div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-4"><p class="text-red-800 text-sm">⚠️ Cannot finish setup with no connections. Please add at least one connection.</p></div>'
        : '<div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4"><p class="text-yellow-800 text-sm">⚠️ Finishing setup will mark all ' + reviewData.total_unique_items + ' items as deployed and this cannot be undone from this interface.</p></div>';
    
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
                        onclick="closeReviewModal()"
                    >
                        Back
                    </button>
                    <button 
                        class="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-medium ${!canFinish ? 'opacity-50 cursor-not-allowed' : ''}"
                        onclick="completeSetup('${reviewData.deployment_id}')"
                        ${!canFinish ? 'disabled' : ''}
                    >
                        Finish Setup
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

function closeReviewModal() {
    const modal = document.getElementById('review-modal');
    if (modal) {
        modal.remove();
    }
}

async function completeSetup(deploymentId) {
    if (!confirm('Are you sure you want to finish setup? This will mark all items as deployed and cannot be undone.')) {
        return;
    }
    
    try {
        UIUtils.showToast('Completing setup...', 'info');
        closeReviewModal();
        
        const result = await API.completeSetup(deploymentId);
        
        UIUtils.showToast(`Setup complete! ${result.items_deployed} items have been deployed.`, 'success');
        
        await loadInProgressDeployments();
    } catch (error) {
        UIUtils.showToast(`Failed to complete setup: ${error.message}`, 'error');
    }
}

async function loadDeploymentIntoBuilder(deploymentId, locationName) {
    try {
        UIUtils.showToast('Loading available items...', 'info');
        
        const itemsResponse = await API.listItems();
        const allItems = Array.isArray(itemsResponse) ? itemsResponse : (itemsResponse.items || []);
        
        const locationData = await API.getDeployment(deploymentId, locationName);
        
        AppState.currentDeploymentId = deploymentId;
        AppState.currentLocationName = locationName;
        AppState.currentZone = locationName;
        AppState.allItems = allItems;
        AppState.connections = locationData.location?.connections || [];
        AppState.sourceItem = null;
        AppState.destinationItem = null;
        
        document.getElementById('current-deployment-info').textContent = 
            `${deploymentId} • ${locationName}`;
        
        clearConnectionForm();
        renderConnections();
        
        document.getElementById('deployments-view').classList.add('hidden');
        document.getElementById('connection-builder-view').classList.remove('hidden');
        
        UIUtils.showToast(`Connection builder loaded for ${locationName}`);
    } catch (error) {
        UIUtils.showToast(`Failed to load deployment: ${error.message}`, 'error');
    }
}

function backToDeployments() {
    document.getElementById('connection-builder-view').classList.add('hidden');
    document.getElementById('deployments-view').classList.remove('hidden');
    
    loadInProgressDeployments();
}

// Export functions
window.DeploymentManager = {
    createDeployment,
    loadInProgressDeployments,
    loadDeploymentIntoBuilder,
    startSetup,
    reviewAndFinish,
    completeSetup,
    backToDeployments
};

// Make functions available globally for onclick handlers
window.handleZoneClick = handleZoneClick;
window.startSetup = startSetup;
window.reviewAndFinish = reviewAndFinish;
window.closeReviewModal = closeReviewModal;
window.completeSetup = completeSetup;
window.loadDeploymentIntoBuilder = loadDeploymentIntoBuilder;