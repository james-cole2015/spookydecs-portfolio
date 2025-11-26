// Connection Builder Functions

async function addConnection() {
    const sourcePort = document.getElementById('source-port').value;
    const notes = document.getElementById('notes').value.trim();

    if (!AppState.sourceItem || !sourcePort || !AppState.destinationItem) {
        UIUtils.showToast('Please select source item, port, and destination item', 'error');
        return;
    }

    const illuminates = AppState.destinationItem.illuminates || [];
    const connectionData = {
        from_item_id: AppState.sourceItem.id,
        from_port: sourcePort,
        to_item_id: AppState.destinationItem.id,
        to_port: 'Male_1',
    };

    if (notes) {
        connectionData.notes = notes;
    }

    if (illuminates.length > 0) {
        connectionData.illuminates = illuminates;
    }

    try {
        const result = await API.addConnection(
            AppState.currentDeploymentId, 
            AppState.currentLocationName, 
            connectionData
        );
        
        // Reload deployment data to get updated session counts
        await reloadDeploymentData();
        
        clearConnectionForm();
        UIUtils.showToast('Connection added successfully');
        
    } catch (error) {
        console.error('Full connection error:', error);
        UIUtils.showToast(`Failed to add connection: ${error.message}`, 'error');
    }
}

function clearConnectionForm() {
    // Reset state only - no DOM manipulation needed for modal workflow
    AppState.sourceItem = null;
    AppState.destinationItem = null;
    
    // Reset workflow state if ItemSelectorEnhanced exists
    if (typeof ItemSelectorEnhanced !== 'undefined' && ItemSelectorEnhanced.workflowState) {
        ItemSelectorEnhanced.workflowState = {
            sourceItem: null,
            sourceItemId: null,
            sourcePort: null,
            destinationItem: null,
            destinationItemId: null,
            illuminatedItems: [],
            notes: '',
            mode: null
        };
    }
}

async function deleteConnection(connectionId) {
    if (!confirm('Are you sure you want to delete this connection?')) {
        return;
    }

    try {
        await API.deleteConnection(
            AppState.currentDeploymentId, 
            AppState.currentLocationName, 
            connectionId
        );
        
        // Reload deployment data to get updated session counts
        await reloadDeploymentData();
        
        UIUtils.showToast('Connection deleted successfully');
    } catch (error) {
        UIUtils.showToast(`Failed to delete connection: ${error.message}`, 'error');
    }
}

async function deleteStaticProp(itemId) {
    if (!confirm('Are you sure you want to remove this static prop from the zone?')) {
        return;
    }

    try {
        await API.removeItemFromLocation(
            AppState.currentDeploymentId,
            AppState.currentLocationName,
            itemId
        );
        
        // Reload deployment data
        await reloadDeploymentData();
        
        UIUtils.showToast('Static prop removed successfully');
    } catch (error) {
        console.error('Error deleting static prop:', error);
        UIUtils.showToast(`Failed to remove static prop: ${error.message}`, 'error');
    }
}

function renderConnections() {
    const connectionsList = document.getElementById('connections-list');
    
    if (AppState.connections.length === 0) {
        connectionsList.innerHTML = '<p class="text-gray-500 text-sm">No connections yet. Add one above to get started.</p>';
        return;
    }

    // Render connections
    const connectionsHtml = AppState.connections.map(conn => {
        const fromItem = AppState.allItems.find(i => i.id === conn.from_item_id);
        const toItem = AppState.allItems.find(i => i.id === conn.to_item_id);
        
        const fromDisplay = fromItem?.short_name || conn.from_item_id;
        const toDisplay = toItem?.short_name || conn.to_item_id;
        const toType = toItem?.class_type || '';
        
        let illuminatesHtml = '';
        if (conn.illuminates && conn.illuminates.length > 0) {
            const illuminatedItems = conn.illuminates.map(id => {
                const item = AppState.allItems.find(i => i.id === id);
                return item ? `${item.short_name}` : id;
            }).join(', ');
            illuminatesHtml = `<span>💡 ${illuminatedItems}</span>`;
        }

        // Check if source item (from_item) has available female ports
        const hasAvailablePorts = fromItem && PortTracker.hasAvailablePorts(
            fromItem,
            AppState.connections,
            fromItem.id,
            'female'
        );

        // Connect From Here button
        const connectButton = hasAvailablePorts
            ? `<button 
                class="bg-green-600 hover:bg-green-700 text-white"
                onclick="event.stopPropagation(); connectFromHere('${fromItem.id}')"
                title="Connect from here"
            >
                ⚙
            </button>`
            : '';

        return `
            <div class="connection-card" data-connection-id="${conn.id}" onclick="ConnectionDetailPanel.open('${conn.id}')">
                <div class="connection-header">
                    <div class="connection-info">
                        <span class="connection-from">${fromDisplay}</span>
                        <span class="connection-arrow">→</span>
                        <span class="connection-to">${toDisplay}</span>
                    </div>
                    <div class="connection-actions">
                        ${connectButton}
                        <button 
                            class="bg-red-600 hover:bg-red-700 text-white"
                            onclick="event.stopPropagation(); deleteConnection('${conn.id}')"
                            title="Delete connection"
                        >
                            ✕
                        </button>
                    </div>
                </div>
                <div class="connection-meta">
                    <span>${conn.from_port} → ${conn.to_port}</span>
                    ${toType ? `<span>${toType}</span>` : ''}
                    ${illuminatesHtml}
                </div>
            </div>
        `;
    }).join('');
    
    // Get static props - ONLY items with class_type === 'Static Prop' that are NOT in connections
    const itemsInConnections = new Set();
    AppState.connections.forEach(conn => {
        itemsInConnections.add(conn.from_item_id);
        itemsInConnections.add(conn.to_item_id);
        if (conn.illuminates) {
            conn.illuminates.forEach(id => itemsInConnections.add(id));
        }
    });
    
    // Get current location's items_deployed from state
    const currentLocation = state.currentDeployment?.locations?.find(
        loc => loc.name === state.currentLocation
    );
    const itemsDeployed = currentLocation?.items_deployed || [];
    
    // Find static props - MUST be class_type === 'Static Prop' AND not in connections
    const staticPropIds = itemsDeployed.filter(itemId => {
        if (itemsInConnections.has(itemId)) return false;
        
        const item = AppState.allItems.find(i => i.id === itemId);
        return item && item.class_type === 'Static Prop';
    });
    
    let staticPropsHtml = '';
    if (staticPropIds.length > 0) {
        const staticPropsItems = staticPropIds.map(itemId => {
            const item = AppState.allItems.find(i => i.id === itemId);
            const displayName = item ? item.short_name : itemId;
            const classType = item ? item.class_type : 'Unknown';
            
            return `
                <div class="connection-card" data-item-id="${itemId}">
                    <div class="connection-header">
                        <div class="connection-info">
                            <span class="connection-from">${displayName}</span>
                        </div>
                        <div class="connection-actions">
                            <button 
                                class="bg-red-600 hover:bg-red-700 text-white"
                                onclick="deleteStaticProp('${itemId}')"
                                title="Delete static prop"
                            >
                                ✕
                            </button>
                        </div>
                    </div>
                    <div class="connection-meta">
                        <span>${classType}</span>
                    </div>
                </div>
            `;
        }).join('');
        
        staticPropsHtml = `
            <div class="mt-6 pt-6 border-t border-gray-200">
                <h3 class="text-lg font-semibold mb-3">Static Props in Zone (${staticPropIds.length})</h3>
                <div class="space-y-3">
                    ${staticPropsItems}
                </div>
            </div>
        `;
    }
    
    connectionsList.innerHTML = connectionsHtml + staticPropsHtml;

    if (typeof renderItemsList === 'function') {
        renderItemsList();
    }
}

// Connect From Here handler
async function connectFromHere(itemId) {
    console.log('Connect from here:', itemId);
    
    const item = AppState.allItems.find(i => i.id === itemId);
    if (!item) {
        UIUtils.showToast('Item not found', 'error');
        return;
    }
    
    // Pre-select this item as source and jump to destination selector
    ItemSelectorEnhanced.workflowState.sourceItem = item;
    ItemSelectorEnhanced.workflowState.sourceItemId = item.id;
    ItemSelectorEnhanced.workflowState.mode = 'source';
    
    // Auto-assign first available port
    const currentLocation = state.currentDeployment?.locations?.find(
        loc => loc.name === state.currentLocation
    );
    const connections = currentLocation?.connections || [];
    const firstAvailablePort = PortTracker.getFirstAvailablePort(
        item,
        connections,
        item.id,
        'female'
    );
    
    if (!firstAvailablePort) {
        UIUtils.showToast('No available ports on this item', 'error');
        return;
    }
    
    ItemSelectorEnhanced.workflowState.sourcePort = firstAvailablePort;
    console.log('Pre-selected source:', item.short_name, 'Port:', firstAvailablePort);
    
    // Open destination selector directly
    ItemSelectorEnhanced.openDestinationSelector();
}

// Export functions
window.ConnectionBuilder = {
    addConnection,
    clearConnectionForm,
    deleteConnection,
    deleteStaticProp,
    renderConnections,
    connectFromHere
};

// Make functions available globally for onclick handlers
window.deleteConnection = deleteConnection;
window.deleteStaticProp = deleteStaticProp;
window.connectFromHere = connectFromHere;