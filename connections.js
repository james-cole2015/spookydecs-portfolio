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

    console.log('Sending connection data:', connectionData);

    try {
        const result = await API.addConnection(AppState.currentDeploymentId, AppState.currentLocationName, connectionData);
        
        // Add to local state with the returned connection
        AppState.connections.push(result.connection);
        
        clearConnectionForm();
        renderConnections();
        UIUtils.showToast('Connection added successfully');
        
        await DeploymentManager.loadDeploymentIntoBuilder(AppState.currentDeploymentId, AppState.currentLocationName);
    } catch (error) {
        console.error('Full connection error:', error);
        UIUtils.showToast(`Failed to add connection: ${error.message}`, 'error');
    }
}

function clearConnectionForm() {
    AppState.sourceItem = null;
    AppState.destinationItem = null;
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
        await API.deleteConnection(AppState.currentDeploymentId, AppState.currentLocationName, connectionId);
        
        AppState.connections = AppState.connections.filter(c => c.connection_id !== connectionId);
        
        renderConnections();
        UIUtils.showToast('Connection deleted successfully');
    } catch (error) {
        UIUtils.showToast(`Failed to delete connection: ${error.message}`, 'error');
    }
}

function renderConnections() {
    const connectionsList = document.getElementById('connections-list');
    
    if (AppState.connections.length === 0) {
        connectionsList.innerHTML = '<p class="text-gray-500 text-sm">No connections yet. Add one above to get started.</p>';
        return;
    }

    connectionsList.innerHTML = AppState.connections.map(conn => {
        const fromItem = AppState.allItems.find(i => i.id === conn.from_item_id);
        const toItem = AppState.allItems.find(i => i.id === conn.to_item_id);
        
        const fromDisplay = fromItem ? `${fromItem.short_name} (${conn.from_port})` : `${conn.from_item_id} (${conn.from_port})`;
        const toDisplay = toItem ? `${toItem.short_name} - ${toItem.class_type}` : conn.to_item_id;
        
        let illuminatesHtml = '';
        if (conn.illuminates && conn.illuminates.length > 0) {
            const illuminatedItems = conn.illuminates.map(id => {
                const item = AppState.allItems.find(i => i.id === id);
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
                        onclick="deleteConnection('${conn.id}')"
                    >
                        Delete
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Export functions
window.ConnectionBuilder = {
    addConnection,
    clearConnectionForm,
    deleteConnection,
    renderConnections
};

// Make functions available globally for onclick handlers
window.deleteConnection = deleteConnection;