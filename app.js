// Application State
const state = {
    currentDeploymentId: null,
    currentLocationName: null,
    items: [],
    connections: [],
    inProgressDeployments: [],
};

// Utility Functions
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg transform transition-transform duration-300 z-50 ${
        type === 'success' ? 'bg-green-600 text-white' : 
        type === 'error' ? 'bg-red-600 text-white' : 
        'bg-blue-600 text-white'
    }`;
    
    // Show toast
    setTimeout(() => {
        toast.style.transform = 'translateY(0)';
    }, 10);
    
    // Hide toast after 3 seconds
    setTimeout(() => {
        toast.style.transform = 'translateY(8rem)';
    }, 3000);
}

function generateId() {
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function getCurrentYear() {
    return new Date().getFullYear();
}

// Navigation
function initNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    const views = document.querySelectorAll('.view');

    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetView = button.getAttribute('data-view');
            
            // Update button styles
            navButtons.forEach(btn => {
                btn.classList.remove('border-blue-500', 'text-blue-600');
                btn.classList.add('border-transparent', 'text-gray-500');
            });
            button.classList.remove('border-transparent', 'text-gray-500');
            button.classList.add('border-blue-500', 'text-blue-600');
            
            // Show/hide views
            views.forEach(view => {
                if (view.id === `${targetView}-view`) {
                    view.classList.remove('hidden');
                } else {
                    view.classList.add('hidden');
                }
            });

            // Hide connection builder when navigating away
            if (targetView !== 'connection-builder') {
                document.getElementById('connection-builder-view').classList.add('hidden');
            }
        });
    });
}

// Deployment Management Functions
async function createDeployment() {
    const year = document.getElementById('create-year').value;
    const season = document.getElementById('create-season').value;

    if (!season) {
        showToast('Please select a season', 'error');
        return;
    }

    try {
        // Note: We're not passing location anymore since the deployment creates all zones
        const result = await API.createDeploymentAdmin(parseInt(year), season, 'Front Yard');
        
        showToast('Deployment created successfully! Select a zone to continue.');
        
        // Clear form
        document.getElementById('create-season').value = '';
        
        // Refresh deployments list to show the new deployment
        await loadInProgressDeployments();
        
    } catch (error) {
        showToast(`Failed to create deployment: ${error.message}`, 'error');
    }
}

async function loadInProgressDeployments() {
    try {
        const deployments = await API.listDeployments();
        
        // Filter for in-progress deployments only
        state.inProgressDeployments = deployments.filter(d => d.status !== 'complete');
        
        renderDeploymentsList();
    } catch (error) {
        showToast(`Failed to load deployments: ${error.message}`, 'error');
        document.getElementById('deployments-list').innerHTML = `
            <p class="text-red-500 text-center py-8">Error loading deployments. Please try again.</p>
        `;
    }
}

function renderDeploymentsList() {
    const listContainer = document.getElementById('deployments-list');
    
    if (state.inProgressDeployments.length === 0) {
        listContainer.innerHTML = `
            <p class="text-gray-500 text-center py-8">No in-progress deployments found. Start a new deployment above!</p>
        `;
        return;
    }

    listContainer.innerHTML = state.inProgressDeployments.map(deployment => {
        // Get all locations for this deployment
        const locations = deployment.locations || [];
        
        // Calculate total items across all locations
        let totalItems = 0;
        let totalDecorations = 0;
        let totalLights = 0;
        let totalAccessories = 0;
        
        locations.forEach(location => {
            const items = location.items_deployed || [];
            totalItems += items.length;
            // Note: You'd need item details to count by type - this is a placeholder
        });

        return `
            <div class="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                <div class="flex justify-between items-start">
                    <div class="flex-1">
                        <h3 class="text-lg font-semibold text-gray-900">${deployment.id}</h3>
                        <p class="text-sm text-gray-600 mt-1">
                            ${deployment.season} ${deployment.year}
                        </p>
                        <div class="mt-3">
                            <p class="text-sm font-medium text-gray-700 mb-2">Select a zone to work on:</p>
                            <div class="flex flex-wrap gap-2">
                                ${locations.map(location => `
                                    <button 
                                        class="px-3 py-1.5 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm"
                                        onclick="loadDeploymentIntoBuilder('${deployment.id}', '${location.name}')"
                                    >
                                        ${location.name} (${location.items_deployed?.length || 0} items)
                                    </button>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

async function loadDeploymentIntoBuilder(deploymentId, locationName) {
    try {
        const deployment = await API.getDeployment(deploymentId, locationName);
        
        if (!deployment.items || deployment.items.length === 0) {
            showToast('No items found in this zone. Add items first.', 'error');
            return;
        }

        state.currentDeploymentId = deploymentId;
        state.currentLocationName = locationName;
        state.items = deployment.items;
        state.connections = deployment.connections || [];

        // Update UI
        document.getElementById('current-deployment-info').textContent = 
            `${deploymentId} • ${locationName}`;
        
        populateItemDropdowns();
        renderConnections();
        
        // Show connection builder, hide deployments view
        document.getElementById('deployments-view').classList.add('hidden');
        document.getElementById('connection-builder-view').classList.remove('hidden');
        
        showToast('Deployment loaded successfully');
    } catch (error) {
        showToast(`Failed to load deployment: ${error.message}`, 'error');
    }
}

function backToDeployments() {
    // Hide connection builder, show deployments view
    document.getElementById('connection-builder-view').classList.add('hidden');
    document.getElementById('deployments-view').classList.remove('hidden');
    
    // Refresh deployments list
    loadInProgressDeployments();
}

// Connection Builder Functions
function populateItemDropdowns() {
    const fromItemSelect = document.getElementById('from-item');
    const toItemSelect = document.getElementById('to-item');

    // Clear existing options except first
    fromItemSelect.innerHTML = '<option value="">Select item...</option>';
    toItemSelect.innerHTML = '<option value="">Select item...</option>';

    // Add items to dropdowns
    state.items.forEach(item => {
        const option1 = document.createElement('option');
        option1.value = item.item_id;
        option1.textContent = `${item.item_id} (${item.item_type})`;
        fromItemSelect.appendChild(option1);

        const option2 = document.createElement('option');
        option2.value = item.item_id;
        option2.textContent = `${item.item_id} (${item.item_type})`;
        toItemSelect.appendChild(option2);
    });
}

function updatePortDropdown(itemId, portSelectId) {
    const portSelect = document.getElementById(portSelectId);
    const item = state.items.find(i => i.item_id === itemId);

    portSelect.innerHTML = '<option value="">Select port...</option>';
    portSelect.disabled = false;

    if (item && item.ports) {
        item.ports.forEach(port => {
            const option = document.createElement('option');
            option.value = port.port_id;
            option.textContent = `${port.port_id} (${port.port_type})`;
            portSelect.appendChild(option);
        });
    }
}

async function addConnection() {
    const fromItem = document.getElementById('from-item').value;
    const fromPort = document.getElementById('from-port').value;
    const toItem = document.getElementById('to-item').value;
    const toPort = document.getElementById('to-port').value;
    const notes = document.getElementById('notes').value.trim();

    if (!fromItem || !fromPort || !toItem || !toPort) {
        showToast('Please fill in all connection fields', 'error');
        return;
    }

    const connectionData = {
        connection_id: generateId(),
        from_item: fromItem,
        from_port: fromPort,
        to_item: toItem,
        to_port: toPort,
        notes: notes || undefined,
    };

    try {
        await API.addConnection(state.currentDeploymentId, state.currentLocationName, connectionData);
        
        // Add to local state
        state.connections.push(connectionData);
        
        // Clear form
        document.getElementById('from-item').value = '';
        document.getElementById('from-port').value = '';
        document.getElementById('from-port').disabled = true;
        document.getElementById('to-item').value = '';
        document.getElementById('to-port').value = '';
        document.getElementById('to-port').disabled = true;
        document.getElementById('notes').value = '';
        
        renderConnections();
        showToast('Connection added successfully');
    } catch (error) {
        showToast(`Failed to add connection: ${error.message}`, 'error');
    }
}

async function deleteConnection(connectionId) {
    if (!confirm('Are you sure you want to delete this connection?')) {
        return;
    }

    try {
        await API.deleteConnection(state.currentDeploymentId, state.currentLocationName, connectionId);
        
        // Remove from local state
        state.connections = state.connections.filter(c => c.connection_id !== connectionId);
        
        renderConnections();
        showToast('Connection deleted successfully');
    } catch (error) {
        showToast(`Failed to delete connection: ${error.message}`, 'error');
    }
}

function renderConnections() {
    const connectionsList = document.getElementById('connections-list');
    
    if (state.connections.length === 0) {
        connectionsList.innerHTML = '<p class="text-gray-500 text-sm">No connections yet. Add one above to get started.</p>';
        return;
    }

    connectionsList.innerHTML = state.connections.map(conn => `
        <div class="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
            <div class="flex justify-between items-start">
                <div class="flex-1">
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm mb-2">
                        <div>
                            <span class="font-medium text-gray-700">From:</span>
                            <span class="text-gray-600">${conn.from_item}</span>
                            <span class="text-gray-500">(${conn.from_port})</span>
                        </div>
                        <div>
                            <span class="font-medium text-gray-700">To:</span>
                            <span class="text-gray-600">${conn.to_item}</span>
                            <span class="text-gray-500">(${conn.to_port})</span>
                        </div>
                    </div>
                    ${conn.notes ? `<p class="text-sm text-gray-600 mt-2"><span class="font-medium">Notes:</span> ${conn.notes}</p>` : ''}
                </div>
                <button 
                    class="ml-4 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm whitespace-nowrap"
                    onclick="deleteConnection('${conn.connection_id}')"
                >
                    Delete
                </button>
            </div>
        </div>
    `).join('');
}

async function validateConnections() {
    if (state.connections.length === 0) {
        showToast('No connections to validate', 'error');
        return;
    }

    try {
        const result = await API.validateConnections(state.currentDeploymentId, state.currentLocationName);
        
        const resultsDiv = document.getElementById('validation-results');
        const contentDiv = document.getElementById('validation-content');
        
        resultsDiv.classList.remove('hidden');
        
        if (result.valid) {
            contentDiv.innerHTML = `
                <div class="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p class="text-green-800 font-medium">✓ All connections are valid!</p>
                </div>
            `;
        } else {
            const errorsList = result.errors.map(error => `
                <li class="text-red-700">${error}</li>
            `).join('');
            
            contentDiv.innerHTML = `
                <div class="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p class="text-red-800 font-medium mb-2">✗ Validation failed:</p>
                    <ul class="list-disc list-inside space-y-1">
                        ${errorsList}
                    </ul>
                </div>
            `;
        }
        
        showToast(result.valid ? 'Validation passed' : 'Validation failed', result.valid ? 'success' : 'error');
    } catch (error) {
        showToast(`Validation failed: ${error.message}`, 'error');
    }
}

// Event Listeners
function initEventListeners() {
    // Deployment creation
    document.getElementById('start-decorating-btn').addEventListener('click', createDeployment);
    document.getElementById('refresh-deployments-btn').addEventListener('click', loadInProgressDeployments);
    
    // Connection builder
    document.getElementById('back-to-deployments-btn').addEventListener('click', backToDeployments);
    document.getElementById('add-connection-btn').addEventListener('click', addConnection);
    document.getElementById('validate-btn').addEventListener('click', validateConnections);

    document.getElementById('from-item').addEventListener('change', (e) => {
        updatePortDropdown(e.target.value, 'from-port');
    });

    document.getElementById('to-item').addEventListener('change', (e) => {
        updatePortDropdown(e.target.value, 'to-port');
    });
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    // Set current year
    document.getElementById('create-year').value = getCurrentYear();
    
    initNavigation();
    initEventListeners();
    
    // Load in-progress deployments on startup
    loadInProgressDeployments();
});

// Make functions available globally for onclick handlers
window.deleteConnection = deleteConnection;
window.loadDeploymentIntoBuilder = loadDeploymentIntoBuilder;