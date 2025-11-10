// Application State
const state = {
    currentDeploymentId: null,
    currentLocationName: null,
    currentZone: null,
    sourceItem: null,
    destinationItem: null,
    items: [],
    allItems: [],
    connections: [],
    inProgressDeployments: [],
};

// Zone to receptacle mapping
const ZONE_RECEPTACLES = {
    'Front Yard': 'REC-003',
    'Side Yard': 'REC-002',
    'Back Yard': 'REC-001'
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
    
    setTimeout(() => {
        toast.style.transform = 'translateY(0)';
    }, 10);
    
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

// Port Calculation Functions
function getUsedPorts(itemId, connections) {
    const usedPorts = {
        male: [],
        female: []
    };
    
    connections.forEach(conn => {
        if (conn.from_item === itemId) {
            usedPorts.female.push(conn.from_port);
        }
        if (conn.to_item === itemId) {
            usedPorts.male.push(conn.to_port);
        }
    });
    
    return usedPorts;
}

function getAvailableFemalePorts(item, connections) {
    const totalFemale = parseInt(item.female_ends) || 0;
    const usedPorts = getUsedPorts(item.id, connections);
    
    const available = [];
    for (let i = 1; i <= totalFemale; i++) {
        const portName = `Female_${i}`;
        if (!usedPorts.female.includes(portName)) {
            available.push(portName);
        }
    }
    
    return available;
}

function generatePortOptions(item, connections, portType = 'female') {
    if (portType === 'female') {
        const totalFemale = parseInt(item.female_ends) || 0;
        const usedPorts = getUsedPorts(item.id, connections);
        
        const ports = [];
        for (let i = 1; i <= totalFemale; i++) {
            const portName = `Female_${i}`;
            const isUsed = usedPorts.female.includes(portName);
            ports.push({
                name: portName,
                available: !isUsed
            });
        }
        return ports;
    } else {
        // Male ports - items only have 1 male port
        const totalMale = parseInt(item.male_ends) || 0;
        if (totalMale > 0) {
            return [{ name: 'Male_1', available: true }];
        }
        return [];
    }
}

// Navigation
function initNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    const views = document.querySelectorAll('.view');

    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetView = button.getAttribute('data-view');
            
            navButtons.forEach(btn => {
                btn.classList.remove('border-blue-500', 'text-blue-600');
                btn.classList.add('border-transparent', 'text-gray-500');
            });
            button.classList.remove('border-transparent', 'text-gray-500');
            button.classList.add('border-blue-500', 'text-blue-600');
            
            views.forEach(view => {
                if (view.id === `${targetView}-view`) {
                    view.classList.remove('hidden');
                } else {
                    view.classList.add('hidden');
                }
            });

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
        const result = await API.createDeploymentAdmin(parseInt(year), season, 'Front Yard');
        
        showToast('Deployment created successfully! Select a zone to continue.');
        
        document.getElementById('create-season').value = '';
        
        await loadInProgressDeployments();
        
    } catch (error) {
        showToast(`Failed to create deployment: ${error.message}`, 'error');
    }
}

async function loadInProgressDeployments() {
    try {
        const deployments = await API.listDeployments();
        
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
        showToast('Loading available items...', 'info');
        
        const itemsResponse = await API.listItems();
        const allItems = Array.isArray(itemsResponse) ? itemsResponse : (itemsResponse.items || []);
        
        const locationData = await API.getDeployment(deploymentId, locationName);
        
        state.currentDeploymentId = deploymentId;
        state.currentLocationName = locationName;
        state.currentZone = locationName;
        state.allItems = allItems;
        state.connections = locationData.location?.connections || [];
        state.sourceItem = null;
        state.destinationItem = null;
        
        document.getElementById('current-deployment-info').textContent = 
            `${deploymentId} • ${locationName}`;
        
        clearConnectionForm();
        renderConnections();
        
        document.getElementById('deployments-view').classList.add('hidden');
        document.getElementById('connection-builder-view').classList.remove('hidden');
        
        showToast(`Connection builder loaded for ${locationName}`);
    } catch (error) {
        showToast(`Failed to load deployment: ${error.message}`, 'error');
    }
}

function backToDeployments() {
    document.getElementById('connection-builder-view').classList.add('hidden');
    document.getElementById('deployments-view').classList.remove('hidden');
    
    loadInProgressDeployments();
}

// Connection Builder Functions
function openItemSelector(selectorType) {
    const modal = document.getElementById('item-selector-modal');
    const classTypeSelect = document.getElementById('modal-class-type');
    
    modal.dataset.selectorType = selectorType;
    
    // Set class type options based on selector type
    if (selectorType === 'source') {
        classTypeSelect.innerHTML = `
            <option value="">Select class type...</option>
            <option value="Receptacle">Receptacle</option>
            <option value="Outlet">Outlet</option>
            <option value="Plug">Plug</option>
            <option value="Cord">Cord</option>
        `;
    } else {
        classTypeSelect.innerHTML = `
            <option value="">Select class type...</option>
            <option value="Outlet">Outlet</option>
            <option value="Plug">Plug</option>
            <option value="Cord">Cord</option>
            <option value="Inflatable">Inflatable</option>
            <option value="Static Prop">Static Prop</option>
            <option value="Animatronic">Animatronic</option>
            <option value="Spot Light">Spot Light</option>
            <option value="String Light">String Light</option>
        `;
    }
    
    modal.classList.remove('hidden');
    document.getElementById('item-search').value = '';
    document.getElementById('items-table-body').innerHTML = '';
}

function closeItemSelector() {
    document.getElementById('item-selector-modal').classList.add('hidden');
}

function filterItemsByClassType() {
    const classType = document.getElementById('modal-class-type').value;
    const selectorType = document.getElementById('item-selector-modal').dataset.selectorType;
    
    if (!classType) {
        document.getElementById('items-table-body').innerHTML = '<tr><td colspan="4" class="text-center py-4 text-gray-500">Please select a class type</td></tr>';
        return;
    }
    
    let filteredItems = state.allItems.filter(item => item.class_type === classType);
    
    if (selectorType === 'source') {
        // Source items must have female_ends > 0 and available ports
        filteredItems = filteredItems.filter(item => {
            const femaleEnds = parseInt(item.female_ends) || 0;
            if (femaleEnds === 0) return false;
            
            const availablePorts = getAvailableFemalePorts(item, state.connections);
            if (availablePorts.length === 0) return false;
            
            // If receptacle, must be this zone's receptacle
            if (item.class_type === 'Receptacle') {
                const designatedReceptacle = ZONE_RECEPTACLES[state.currentZone];
                return item.id === designatedReceptacle;
            }
            
            return true;
        });
    } else {
        // Destination items - exclude source item (no self-connection)
        if (state.sourceItem) {
            filteredItems = filteredItems.filter(item => item.id !== state.sourceItem.id);
        }
    }
    
    renderItemsTable(filteredItems, selectorType);
}

function searchItems() {
    const searchTerm = document.getElementById('item-search').value.toLowerCase();
    const classType = document.getElementById('modal-class-type').value;
    const selectorType = document.getElementById('item-selector-modal').dataset.selectorType;
    
    if (!classType) return;
    
    let filteredItems = state.allItems.filter(item => {
        return item.class_type === classType && 
               (item.short_name?.toLowerCase().includes(searchTerm) || 
                item.id.toLowerCase().includes(searchTerm));
    });
    
    if (selectorType === 'source') {
        filteredItems = filteredItems.filter(item => {
            const femaleEnds = parseInt(item.female_ends) || 0;
            if (femaleEnds === 0) return false;
            
            const availablePorts = getAvailableFemalePorts(item, state.connections);
            if (availablePorts.length === 0) return false;
            
            if (item.class_type === 'Receptacle') {
                const designatedReceptacle = ZONE_RECEPTACLES[state.currentZone];
                return item.id === designatedReceptacle;
            }
            
            return true;
        });
    } else {
        if (state.sourceItem) {
            filteredItems = filteredItems.filter(item => item.id !== state.sourceItem.id);
        }
    }
    
    renderItemsTable(filteredItems, selectorType);
}

function renderItemsTable(items, selectorType) {
    const tbody = document.getElementById('items-table-body');
    
    if (items.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-gray-500">No items found</td></tr>';
        return;
    }
    
    tbody.innerHTML = items.map(item => {
        const availablePorts = getAvailableFemalePorts(item, state.connections);
        const deployed = item.deployment_data?.deployed || false;
        
        let statusBadge = '';
        if (item.class_type === 'Receptacle' && item.id === ZONE_RECEPTACLES[state.currentZone]) {
            statusBadge = '<span class="text-yellow-600">⭐ Zone receptacle</span>';
        } else if (deployed && availablePorts.length > 0) {
            statusBadge = `<span class="text-blue-600">⚡ ${availablePorts.length} ports</span>`;
        }
        
        return `
            <tr class="hover:bg-gray-50 cursor-pointer" onclick="selectItem('${item.id}', '${selectorType}')">
                <td class="px-4 py-3 text-sm">${item.short_name || 'N/A'}</td>
                <td class="px-4 py-3 text-sm">${item.id}</td>
                <td class="px-4 py-3 text-sm">${item.class_type}</td>
                <td class="px-4 py-3 text-sm">${statusBadge}</td>
            </tr>
        `;
    }).join('');
}

function selectItem(itemId, selectorType) {
    const item = state.allItems.find(i => i.id === itemId);
    
    if (selectorType === 'source') {
        state.sourceItem = item;
        updateSourceDisplay();
        populateSourcePortDropdown();
    } else {
        state.destinationItem = item;
        updateDestinationDisplay();
        
        // Check if spotlight
        if (item.class_type === 'Spot Light') {
            setTimeout(() => promptSpotlightIllumination(), 300);
        }
    }
    
    closeItemSelector();
}

function updateSourceDisplay() {
    const display = document.getElementById('source-item-display');
    if (state.sourceItem) {
        display.textContent = `${state.sourceItem.short_name} (${state.sourceItem.id}) - ${state.sourceItem.class_type}`;
    } else {
        display.textContent = 'Click to select';
    }
}

function updateDestinationDisplay() {
    const display = document.getElementById('destination-item-display');
    if (state.destinationItem) {
        display.textContent = `${state.destinationItem.short_name} (${state.destinationItem.id}) - ${state.destinationItem.class_type}`;
    } else {
        display.textContent = 'Click to select';
    }
}

function populateSourcePortDropdown() {
    const portSelect = document.getElementById('source-port');
    
    if (!state.sourceItem) {
        portSelect.innerHTML = '<option value="">Select source item first</option>';
        portSelect.disabled = true;
        return;
    }
    
    const ports = generatePortOptions(state.sourceItem, state.connections, 'female');
    
    if (ports.length === 0) {
        portSelect.innerHTML = '<option value="">No output ports available</option>';
        portSelect.disabled = true;
        return;
    }
    
    portSelect.disabled = false;
    portSelect.innerHTML = '<option value="">Select port...</option>' + 
        ports.map(port => {
            const status = port.available ? '✓ Available' : '⚠️ In use';
            return `<option value="${port.name}" ${!port.available ? 'disabled' : ''}>${port.name} ${status}</option>`;
        }).join('');
}

async function promptSpotlightIllumination() {
    const deployedDecorations = state.allItems.filter(item => {
        const deployed = item.deployment_data?.deployed || false;
        const itemClass = item.class_type || '';
        return deployed && ['Inflatable', 'Static Prop', 'Animatronic'].includes(itemClass);
    });

    if (deployedDecorations.length === 0) {
        return null;
    }

    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
        modal.innerHTML = `
            <div class="bg-white rounded-lg p-6 max-w-md w-full mx-auto max-h-[80vh] overflow-y-auto">
                <h3 class="text-lg font-semibold mb-2">What does this spotlight illuminate?</h3>
                <p class="text-sm text-gray-600 mb-4">Select up to 2 decorations (optional)</p>
                <div class="space-y-2 mb-4">
                    ${deployedDecorations.map(dec => `
                        <label class="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                            <input type="checkbox" value="${dec.id}" class="spotlight-decoration-check w-5 h-5">
                            <span class="text-sm">${dec.short_name} (${dec.id}) - ${dec.class_type}</span>
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
    const sourcePort = document.getElementById('source-port').value;
    const notes = document.getElementById('notes').value.trim();

    if (!state.sourceItem || !sourcePort || !state.destinationItem) {
        showToast('Please select source item, port, and destination item', 'error');
        return;
    }

    const illuminates = state.destinationItem.illuminates || [];

    const connectionData = {
        connection_id: generateId(),
        from_item: state.sourceItem.id,
        from_port: sourcePort,
        to_item: state.destinationItem.id,
        to_port: 'Male_1',
        notes: notes || undefined,
    };

    if (illuminates.length > 0) {
        connectionData.illuminates = illuminates;
    }

    console.log('Sending connection data:', connectionData); // DEBUG

    try {
        await API.addConnection(state.currentDeploymentId, state.currentLocationName, connectionData);
        
        state.connections.push(connectionData);
        
        clearConnectionForm();
        renderConnections();
        showToast('Connection added successfully');
        
        await loadDeploymentIntoBuilder(state.currentDeploymentId, state.currentLocationName);
    } catch (error) {
        console.error('Full connection error:', error); // DEBUG
        showToast(`Failed to add connection: ${error.message}`, 'error');
    }
}

function clearConnectionForm() {
    state.sourceItem = null;
    state.destinationItem = null;
    document.getElementById('source-item-display').textContent = 'Click to select';
    document.getElementById('destination-item-display').textContent = 'Click to select';
    document.getElementById('source-port').innerHTML = '<option value="">Select source item first</option>';
    document.getElementById('source-port').disabled = true;
    document.getElementById('notes').value = '';
}

async function deleteConnection(connectionId) {
    if (!confirm('Are you sure you want to delete this connection?')) {
        return;
    }

    try {
        await API.deleteConnection(state.currentDeploymentId, state.currentLocationName, connectionId);
        
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
        const fromItem = state.allItems.find(i => i.id === conn.from_item);
        const toItem = state.allItems.find(i => i.id === conn.to_item);
        
        const fromDisplay = fromItem ? `${fromItem.short_name} (${conn.from_port})` : `${conn.from_item} (${conn.from_port})`;
        const toDisplay = toItem ? `${toItem.short_name} - ${toItem.class_type}` : conn.to_item;
        
        let illuminatesHtml = '';
        if (conn.illuminates && conn.illuminates.length > 0) {
            const illuminatedItems = conn.illuminates.map(id => {
                const item = state.allItems.find(i => i.id === id);
                return item ? `${item.short_name}` : id;
            }).join(', ');
            illuminatesHtml = `<p class="text-sm text-gray-600 mt-2"><span class="font-medium">Illuminates:</span> ${illuminatedItems}</p>`;
        }

        return `
            <div class="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                <div class="flex justify-between items-start">
                    <div class="flex-1">
                        <div class="text-sm mb-2">
                            <span class="font-medium text-gray-900">${fromDisplay}</span>
                            <span class="text-gray-500"> → </span>
                            <span class="font-medium text-gray-900">${toDisplay}</span>
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
    document.getElementById('start-decorating-btn').addEventListener('click', createDeployment);
    document.getElementById('refresh-deployments-btn').addEventListener('click', loadInProgressDeployments);
    
    document.getElementById('back-to-deployments-btn').addEventListener('click', backToDeployments);
    document.getElementById('add-connection-btn').addEventListener('click', addConnection);
    document.getElementById('validate-btn').addEventListener('click', validateConnections);
    
    document.getElementById('source-item-selector').addEventListener('click', () => openItemSelector('source'));
    document.getElementById('destination-item-selector').addEventListener('click', () => openItemSelector('destination'));
    document.getElementById('close-modal-btn').addEventListener('click', closeItemSelector);
    document.getElementById('modal-class-type').addEventListener('change', filterItemsByClassType);
    document.getElementById('item-search').addEventListener('input', searchItems);
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('create-year').value = getCurrentYear();
    
    initNavigation();
    initEventListeners();
    
    loadInProgressDeployments();
});

// Make functions available globally for onclick handlers
window.deleteConnection = deleteConnection;
window.loadDeploymentIntoBuilder = loadDeploymentIntoBuilder;
window.selectItem = selectItem;