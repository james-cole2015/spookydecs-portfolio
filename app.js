// Application State
const state = {
    currentDeploymentId: null,
    currentLocationName: null,
    items: [],
    allItems: [], // All items from the database
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
        // Note: We're passing location but backend creates all zones
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
        // Load all items from the database
        showToast('Loading available items...', 'info');
        const itemsResponse = await API.listItems();
        
        // Handle response structure - could be array or object with items property
        const allItems = Array.isArray(itemsResponse) ? itemsResponse : (itemsResponse.items || []);
        
        // Filter for available items: deployed=false AND class NOT IN ['Storage', 'Deployment']
        const availableItems = allItems.filter(item => {
            const deployed = item.deployment_data?.deployed || false;
            const itemClass = item.class || '';
            return !deployed && itemClass !== 'Storage' && itemClass !== 'Deployment';
        });

        if (availableItems.length === 0) {
            showToast('No available items to deploy. All items are currently deployed or in storage.', 'error');
            return;
        }

        // Load the deployment location data
        const locationData = await API.getDeployment(deploymentId, locationName);
        
        state.currentDeploymentId = deploymentId;
        state.currentLocationName = locationName;
        state.items = availableItems;
        state.allItems = allItems; // Keep all items for reference
        state.connections = locationData.location?.connections || [];

        // Update UI
        document.getElementById('current-deployment-info').textContent = 
            `${deploymentId} • ${locationName}`;
        
        populateItemDropdowns();
        renderConnections();
        
        // Show connection builder, hide deployments view
        document.getElementById('deployments-view').classList.add('hidden');
        document.getElementById('connection-builder-view').classList.remove('hidden');
        
        showToast(`Loaded ${availableItems.length} available items`);
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
        option1.value = item.id;
        option1.textContent = `${item.id} - ${item.name} (${item.class})`;
        fromItemSelect.appendChild(option1);

        const option2 = document.createElement('option');
        option2.value = item.id;
        option2.textContent = `${item.id} - ${item.name} (${item.class})`;
        toItemSelect.appendChild(option2);
    });
}

function updatePortDropdown(itemId, portSelectId) {
    const portSelect = document.getElementById(portSelectId);
    const item = state.items.find(i => i.id === itemId);

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

async function promptSpotlightIllumination() {
    // Get deployed decorations that can be illuminated (Inflatables, Static Props, Animatronics)
    const decorations = state.allItems.filter(item => {
        const deployed = item.deployment_data?.deployed || false;
        const itemClass = item.class || '';
        return deployed && ['Inflatable', 'Static Prop', 'Animatronic'].includes(itemClass);
    });

    if (decorations.length === 0) {
        return null; // No decorations to illuminate
    }

    // Create modal for selection
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                <h3 class="text-lg font-semibold mb-4">What does this spotlight illuminate?</h3>
                <p class="text-sm text-gray-600 mb-4">Select up to 2 decorations (optional)</p>
                <div class="space-y-2 max-h-64 overflow-y-auto mb-4">
                    ${decorations.map(dec => `
                        <label class="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                            <input type="checkbox" value="${dec.id}" class="spotlight-decoration-check">
                            <span class="text-sm">${dec.id} - ${dec.name} (${dec.class})</span>
                        </label>
                    `).join('')}
                </div>
                <div class="flex justify-end space-x-2">
                    <button class="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300" onclick="this.closest('.fixed').remove(); window.resolveSpotlight(null);">
                        Skip
                    </button>
                    <button class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700" onclick="window.confirmSpotlight()">
                        Confirm
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Store resolve function globally so buttons can access it
        window.resolveSpotlight = resolve;
        window.confirmSpotlight = () => {
            const checkboxes = modal.querySelectorAll('.spotlight-decoration-check:checked');
            
            if (checkboxes.length > 2) {
                showToast('Maximum 2 decorations can be illuminated', 'error');
                return;
            }
            
            const selected = Array.from(checkboxes).map(cb => cb.value);
            modal.remove();
            resolve(selected.length > 0 ? selected : null);
        };
    });
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

    // Check if either item is a spotlight
    const fromItemObj = state.items.find(i => i.id === fromItem);
    const toItemObj = state.items.find(i => i.id === toItem);
    
    let illuminates = null;
    
    if (fromItemObj?.class === 'Spotlight' || toItemObj?.class === 'Spotlight') {
        illuminates = await promptSpotlightIllumination();
    }

    const connectionData = {
        connection_id: generateId(),
        from_item: fromItem,
        from_port: fromPort,
        to_item: toItem,
        to_port: toPort,
        notes: notes || undefined,
    };

    // Add illuminates array if spotlight selected decorations
    if (illuminates && illuminates.length > 0) {
        connectionData.illuminates = illuminates;
    }

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
        
        // Reload deployment to refresh available items (since items are now deployed)
        await loadDeploymentIntoBuilder(state.currentDeploymentId, state.currentLocationName);
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

    connectionsList.innerHTML = state.connections.map(conn => {
        let illuminatesHtml = '';
        if (conn.illuminates && conn.illuminates.length > 0) {
            const illuminatedItems = conn.illuminates.map(id => {
                const item = state.allItems.find(i => i.id === id);
                return item ? `${item.id} - ${item.name}` : id;
            }).join(', ');
            illuminatesHtml = `<p class="text-sm text-gray-600 mt-2"><span class="font-medium">Illuminates:</span> ${illuminatedItems}</p>`;
        }

        return `
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
                        ${illuminatesHtml}
                    </div>
                    <button 
                        class="ml-4 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm whitespace-nowrap"
                        onclick="deleteConnection('${conn.connection_id}')"
                    >
                        Delete
                    </button>
                </div>
            </div>
        `;
    }).join('');
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