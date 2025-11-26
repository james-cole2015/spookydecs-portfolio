// Connection Detail Panel Component

const ConnectionDetailPanel = {
    currentConnectionId: null,
    
    open(connectionId) {
        console.log('Opening detail panel for connection:', connectionId);
        
        // Check if mobile
        const isMobile = window.innerWidth < 768;
        if (isMobile) {
            console.log('Mobile device - skipping panel (using accordion)');
            return;
        }
        
        this.currentConnectionId = connectionId;
        
        // Find connection in AppState
        const connection = AppState.connections.find(c => c.id === connectionId);
        if (!connection) {
            console.error('Connection not found:', connectionId);
            UIUtils.showToast('Connection not found', 'error');
            return;
        }
        
        // Populate panel with connection data
        this.populatePanel(connection);
        
        // Show panel and overlay
        const panel = document.getElementById('connection-detail-panel');
        const overlay = document.getElementById('connection-detail-overlay');
        
        panel.classList.remove('hidden');
        overlay.classList.remove('hidden');
        
        // Trigger animation after DOM update
        setTimeout(() => {
            panel.classList.add('open');
            overlay.classList.add('open');
        }, 10);
    },
    
    populatePanel(connection) {
        // Get item details
        const fromItem = AppState.allItems.find(i => i.id === connection.from_item_id);
        const toItem = AppState.allItems.find(i => i.id === connection.to_item_id);
        
        const fromDisplay = fromItem ? `${fromItem.short_name} (${fromItem.class_type})` : connection.from_item_id;
        const toDisplay = toItem ? `${toItem.short_name} (${toItem.class_type})` : connection.to_item_id;
        
        // Populate fields
        document.getElementById('detail-connection-id').textContent = connection.id; 
        document.getElementById('detail-from').textContent = fromDisplay;
        document.getElementById('detail-to').textContent = toDisplay;
        document.getElementById('detail-ports').textContent = `${connection.from_port} → ${connection.to_port}`;
        
        // Format timestamp
        const timestamp = new Date(connection.connected_at).toLocaleString();
        document.getElementById('detail-timestamp').textContent = timestamp;
        
        // Session info
        const sessionText = connection.session_id || 'No session';
        document.getElementById('detail-session').textContent = sessionText;
        
        // Zone info
        document.getElementById('detail-zone').textContent = AppState.currentLocationName || 'Unknown';
        
        // Illuminates section
        const illuminatesSection = document.getElementById('detail-illuminates-section');
        if (connection.illuminates && connection.illuminates.length > 0) {
            const illuminatedItems = connection.illuminates.map(id => {
                const item = AppState.allItems.find(i => i.id === id);
                return item ? item.short_name : id;
            }).join(', ');
            document.getElementById('detail-illuminates').textContent = illuminatedItems;
            illuminatesSection.classList.remove('hidden');
        } else {
            illuminatesSection.classList.add('hidden');
        }
        
        // Notes
        document.getElementById('detail-notes').value = connection.notes || '';
        
        // Configure "Connect From Here" button
        const connectBtn = document.getElementById('detail-connect-btn');
        const hasAvailablePorts = fromItem && PortTracker.hasAvailablePorts(
            fromItem,
            AppState.connections,
            fromItem.id,
            'female'
        );
        
        if (hasAvailablePorts) {
            connectBtn.disabled = false;
            connectBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            connectBtn.onclick = () => this.connectFromHere(connection.from_item_id);
        } else {
            connectBtn.disabled = true;
            connectBtn.classList.add('opacity-50', 'cursor-not-allowed');
            connectBtn.onclick = null;
        }
        
        // Configure delete button
        document.getElementById('detail-delete-btn').onclick = () => this.deleteConnection(connection.id);
    },
    
    close() {
        const panel = document.getElementById('connection-detail-panel');
        const overlay = document.getElementById('connection-detail-overlay');
        
        panel.classList.remove('open');
        overlay.classList.remove('open');
        
        // Hide after animation
        setTimeout(() => {
            panel.classList.add('hidden');
            overlay.classList.add('hidden');
            this.currentConnectionId = null;
        }, 300);
    },
    
    async saveNotes() {
    if (!this.currentConnectionId) {
        console.error('No connection selected');
        return;
    }
    
    const notes = document.getElementById('detail-notes').value.trim();
    
    try {
        UIUtils.showToast('Saving notes...', 'info');
        
        await API.updateConnectionNotes(
            AppState.currentDeploymentId,
            AppState.currentLocationName,
            this.currentConnectionId,
            notes
        );
        
        // Reload deployment data from server to get fresh data
        await reloadDeploymentData();
        
        // Re-populate the panel with fresh connection data
        const updatedConnection = AppState.connections.find(c => c.id === this.currentConnectionId);
        if (updatedConnection) {
            this.populatePanel(updatedConnection);
        }
        
        UIUtils.showToast('Notes saved successfully');
    } catch (error) {
        console.error('Error saving notes:', error);
        UIUtils.showToast(`Failed to save notes: ${error.message}`, 'error');
    }
},
    
    connectFromHere(itemId) {
        // Close panel first
        this.close();
        
        // Delegate to existing connectFromHere function
        if (typeof connectFromHere === 'function') {
            connectFromHere(itemId);
        } else {
            console.error('connectFromHere function not found');
            UIUtils.showToast('Feature not available', 'error');
        }
    },
    
    async deleteConnection(connectionId) {
        if (!confirm('Are you sure you want to delete this connection?')) {
            return;
        }
        
        try {
            // Close panel first
            this.close();
            
            await API.deleteConnection(
                AppState.currentDeploymentId,
                AppState.currentLocationName,
                connectionId
            );
            
            // Reload deployment data
            await reloadDeploymentData();
            
            UIUtils.showToast('Connection deleted successfully');
        } catch (error) {
            console.error('Error deleting connection:', error);
            UIUtils.showToast(`Failed to delete connection: ${error.message}`, 'error');
        }
    }
};

// Make available globally
window.ConnectionDetailPanel = ConnectionDetailPanel;