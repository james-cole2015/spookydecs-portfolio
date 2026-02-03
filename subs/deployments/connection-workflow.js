// Connection Workflow Manager
// Manages the step-by-step process of creating connections

const ConnectionWorkflow = {
    // Current workflow state
    state: {
        step: null, // 'select-source', 'select-source-port', 'select-destination', 'select-destination-port', 'select-illumination'
        sourceItem: null,
        sourcePort: null,
        destinationItem: null,
        destinationPort: null,
        illuminatedItems: []
    },
    
    // Current deployment context
    currentDeployment: null,
    currentLocation: null,
    currentConnections: [],
    allItems: [],
    
    /**
     * Initialize workflow with deployment context
     */
    init(deployment, locationName, allItems) {
        this.currentDeployment = deployment;
        this.currentLocation = deployment.locations.find(loc => loc.name === locationName);
        this.currentConnections = this.currentLocation?.connections || [];
        this.allItems = allItems;
        this.reset();
    },
    
    /**
     * Reset workflow state
     */
    reset() {
        this.state = {
            step: null,
            sourceItem: null,
            sourcePort: null,
            destinationItem: null,
            destinationPort: null,
            illuminatedItems: []
        };
    },
    
    /**
     * Start a new connection workflow
     * @param {Object} autoSelectItem - Optional item to auto-select as source
     */
    startNewConnection(autoSelectItem = null) {
        this.reset();
        
        if (autoSelectItem) {
            // Auto-select source item if provided
            this.selectSourceItem(autoSelectItem);
        } else {
            // Start fresh
            this.state.step = 'select-source';
            ItemSelectorEnhanced.open('source', this.currentLocation, this.currentConnections, this.allItems);
        }
    },
    
    /**
     * Handle source item selection
     */
    selectSourceItem(item) {
        this.state.sourceItem = item;
        
        // Check if we should skip port selection
        if (PortTracker.shouldSkipPortSelection(item, this.currentConnections, item.id, 'female')) {
            // Auto-select the only available port
            const port = PortTracker.getFirstAvailablePort(item, this.currentConnections, item.id, 'female');
            this.selectSourcePort(port);
             console.log('✅ sourceItem set:', this.state.sourceItem);
        } else {
            // Show port selector
            this.state.step = 'select-source-port';
            PortSelector.open(item, this.currentConnections, item.id, 'female', (selectedPort) => {
                this.selectSourcePort(selectedPort);
            });
        }
    },
    
    /**
     * Handle source port selection
     */
    selectSourcePort(port) {
        this.state.sourcePort = port;
        this.state.step = 'select-destination';
        
        // Open destination item selector
        ItemSelectorEnhanced.open('destination', this.currentLocation, this.currentConnections, this.allItems);
    },
    
    /**
     * Handle destination item selection
     */
    selectDestinationItem(item) {
        this.state.destinationItem = item;
        
        // Check if we should skip port selection
        if (PortTracker.shouldSkipPortSelection(item, this.currentConnections, item.id, 'male')) {
            // Auto-select the only available port
            const port = PortTracker.getFirstAvailablePort(item, this.currentConnections, item.id, 'male');
            this.selectDestinationPort(port);
        } else {
            // Show port selector
            this.state.step = 'select-destination-port';
            PortSelector.open(item, this.currentConnections, item.id, 'male', (selectedPort) => {
                this.selectDestinationPort(selectedPort);
            });
        }
    },
    
    /**
     * Handle destination port selection
     */
    selectDestinationPort(port) {
        this.state.destinationPort = port;
        
        // Check if destination is a spotlight
        if (this.isSpotlight(this.state.destinationItem)) {
            // Need to select illuminated items
            this.state.step = 'select-illumination';
            IlluminationSelector.open(
                this.currentLocation, 
                this.allItems,
                (illuminatedItems) => {
                    this.selectIlluminatedItems(illuminatedItems);
                }
            );
        } else {
            // Complete the connection
            this.completeConnection();
        }
    },
    
    /**
     * Handle illuminated items selection
     */
    selectIlluminatedItems(illuminatedItems) {
        this.state.illuminatedItems = illuminatedItems;
        this.completeConnection();
    },
    
    /**
     * Complete the connection and submit to backend
     */
    async completeConnection() {
        const connectionData = {
            from_item_id: this.state.sourceItem.id,
            from_port: this.state.sourcePort,
            to_item_id: this.state.destinationItem.id,
            to_port: this.state.destinationPort
        };
        
        // Add illuminated items if spotlight
        if (this.state.illuminatedItems.length > 0) {
            connectionData.illuminates = this.state.illuminatedItems;
        }
        
        try {
            UIUtils.showToast('Creating connection...', 'info');
            
            // Submit to backend
            const response = await fetch(
                `${API_ENDPOINT}/admin/deployments/${this.currentDeployment.id}/locations/${encodeURIComponent(this.currentLocation.name)}/connections`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(connectionData)
                }
            );
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to create connection');
            }
            
            const result = await response.json();
            
            UIUtils.showToast('Connection created successfully!', 'success');
            
            // Reload deployment to get updated data
            await DeploymentManager.loadDeploymentDetail(this.currentDeployment.id);
            
            // Check if destination has more available ports
            const updatedConnections = [...this.currentConnections, result.connection];
            const hasAvailablePorts = PortTracker.hasAvailablePorts(
                this.state.destinationItem,
                updatedConnections,
                this.state.destinationItem.id,
                'female'
            );
            
            if (hasAvailablePorts) {
                // Auto-select destination as new source
                console.log('Auto-selecting destination as new source');
                this.startNewConnection(this.state.destinationItem);
            } else {
                // Reset workflow
                console.log('Destination has no available ports, resetting workflow');
                this.reset();
            }
            
        } catch (error) {
            console.error('Error creating connection:', error);
            UIUtils.showToast(`Error: ${error.message}`, 'error');
        }
    },
    
    /**
     * Check if an item is a spotlight
     */
    isSpotlight(item) {
        return item.class === 'spotlight';
    },
    
    /**
     * Cancel the current workflow
     */
    cancel() {
        this.reset();
        UIUtils.showToast('Connection cancelled', 'info');
    }
};