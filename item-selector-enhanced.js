// Enhanced Item Selector
// Simplified, clean implementation for connection workflow

const ItemSelectorEnhanced = {
    // Workflow state
    workflowState: {
        mode: null, // 'source' or 'destination'
        sourceItem: null,
        sourceItemId: null,
        sourcePort: null,
        destItem: null,
        destItemId: null,
        destPort: 'Male_1',
        illuminates: []
    },

    // Class type mappings
    classTypeMap: {
        'Decoration': ['Inflatable', 'Static Prop', 'Animatronic'],
        'Accessory': ['Outlet', 'Plug', 'Cord', 'Receptacle'],
        'Light': ['Spot Light', 'String Light']
    },

    /**
     * Open source item selector modal
     */
    openSourceSelector() {
        console.log('Opening source item selector');
        this.workflowState.mode = 'source';
        this.resetWorkflowState();
        
        const modal = document.getElementById('item-selector-modal');
        const title = document.getElementById('item-selector-title');
        const listContainer = document.getElementById('item-selector-list');
        
        title.textContent = 'Select Source Item';
        
        // Render class/type selectors and initial empty list
        listContainer.innerHTML = this.renderFilters();
        
        modal.classList.remove('hidden');
        
        // Attach event listeners
        this.attachFilterListeners();
    },

    /**
     * Open destination item selector modal
     */
    openDestinationSelector() {
        console.log('Opening destination item selector');
        this.workflowState.mode = 'destination';
        
        const modal = document.getElementById('item-selector-modal');
        const title = document.getElementById('item-selector-title');
        const listContainer = document.getElementById('item-selector-list');
        
        title.textContent = 'Select Destination Item';
        
        // Render class/type selectors and initial empty list
        listContainer.innerHTML = this.renderFilters();
        
        modal.classList.remove('hidden');
        
        // Attach event listeners
        this.attachFilterListeners();
    },

    /**
     * Render filter dropdowns
     */
    renderFilters() {
        return `
            <div class="mb-6 space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Item Class</label>
                    <select id="filter-class" class="w-full px-4 py-2 border border-gray-300 rounded-lg">
                        <option value="">Select class...</option>
                        <option value="Decoration">Decoration</option>
                        <option value="Accessory">Accessory</option>
                        <option value="Light">Light</option>
                    </select>
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Item Type</label>
                    <select id="filter-type" class="w-full px-4 py-2 border border-gray-300 rounded-lg" disabled>
                        <option value="">Select class first...</option>
                    </select>
                </div>
            </div>
            
            <div id="filtered-items-container" class="space-y-3">
                <p class="text-gray-500 text-sm text-center py-8">Select class and type to see available items</p>
            </div>
        `;
    },

    /**
     * Attach event listeners to filter dropdowns
     */
    attachFilterListeners() {
        const classSelect = document.getElementById('filter-class');
        const typeSelect = document.getElementById('filter-type');
        
        classSelect.addEventListener('change', (e) => {
            const selectedClass = e.target.value;
            
            if (!selectedClass) {
                typeSelect.disabled = true;
                typeSelect.innerHTML = '<option value="">Select class first...</option>';
                this.updateItemsList('', '');
                return;
            }
            
            // Populate type dropdown
            typeSelect.disabled = false;
            const types = this.classTypeMap[selectedClass] || [];
            typeSelect.innerHTML = '<option value="">Select type...</option>' + 
                types.map(type => `<option value="${type}">${type}</option>`).join('');
            
            // Clear items list
            this.updateItemsList(selectedClass, '');
        });
        
        typeSelect.addEventListener('change', (e) => {
            const selectedClass = classSelect.value;
            const selectedType = e.target.value;
            
            this.updateItemsList(selectedClass, selectedType);
        });
    },

    /**
     * Update items list based on selected filters
     */
    updateItemsList(selectedClass, selectedType) {
        const container = document.getElementById('filtered-items-container');
        
        if (!selectedClass || !selectedType) {
            container.innerHTML = '<p class="text-gray-500 text-sm text-center py-8">Select class and type to see available items</p>';
            return;
        }
        
        // Get filtered items based on mode
        let items;
        if (this.workflowState.mode === 'source') {
            items = this.getFilteredSourceItems(selectedClass, selectedType);
        } else {
            items = this.getFilteredDestItems(selectedClass, selectedType);
        }
        
        // Render items
        if (items.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-sm text-center py-8">No available items match these filters</p>';
            return;
        }
        
        container.innerHTML = items.map(item => this.renderItemCard(item)).join('');
        
        // Attach click handlers
        items.forEach(item => {
            const card = document.getElementById(`item-card-${item.id}`);
            if (card) {
                card.addEventListener('click', () => {
                    if (this.workflowState.mode === 'source') {
                        this.handleSourceItemClick(item);
                    } else {
                        this.handleDestItemClick(item);
                    }
                });
            }
        });
    },

    /**
     * Get filtered items for source selection
     */
    getFilteredSourceItems(selectedClass, selectedType) {
        const allItems = state.allItems || [];
        const currentLocation = this.getCurrentLocation();
        const connections = currentLocation?.connections || [];
        const allLocations = state.currentDeployment?.locations || [];
        
        return allItems.filter(item => {
            // Filter 1: Class match
            if (item.class !== selectedClass) return false;
            
            // Filter 2: Type match
            if (item.class_type !== selectedType) return false;
            
            // Filter 3: Must have female ports available
            const femaleEnds = parseInt(item.female_ends || '0');
            if (femaleEnds === 0) return false;
            
            const hasAvailablePorts = PortTracker.hasAvailablePorts(
                item, 
                connections, 
                item.id, 
                'female'
            );
            if (!hasAvailablePorts) return false;
            
            // Filter 4: Not deployed in another zone (but can be in current zone)
            const deployedInOtherZone = PortTracker.getItemLocationUsage(
                item.id, 
                allLocations, 
                state.currentLocation
            );
            if (deployedInOtherZone) return false;
            
            return true;
        });
    },

    /**
     * Get filtered items for destination selection
     */
    getFilteredDestItems(selectedClass, selectedType) {
        const allItems = state.allItems || [];
        const currentLocation = this.getCurrentLocation();
        const connections = currentLocation?.connections || [];
        const itemsDeployed = currentLocation?.items_deployed || [];
        const allLocations = state.currentDeployment?.locations || [];
        
        return allItems.filter(item => {
            // Filter 1: Class match
            if (item.class !== selectedClass) return false;
            
            // Filter 2: Type match
            if (item.class_type !== selectedType) return false;
            
            // Filter 3a: For Decorations/Lights - must have power_inlet = true and not deployed
            if (selectedClass === 'Decoration' || selectedClass === 'Light') {
                // Must have power inlet available
                if (item.power_inlet !== true) return false;
                
                // Must NOT already be deployed in this location
                if (itemsDeployed.includes(item.id)) return false;
            }
            
            // Filter 3b: For Accessories - must have available male ports
            if (selectedClass === 'Accessory') {
                const maleEnds = parseInt(item.male_ends || '0');
                if (maleEnds === 0) return false;
                
                const hasAvailablePorts = PortTracker.hasAvailablePorts(
                    item, 
                    connections, 
                    item.id, 
                    'male'
                );
                if (!hasAvailablePorts) return false;
            }
            
            // Filter 4: Not deployed in another zone
            const deployedInOtherZone = PortTracker.getItemLocationUsage(
                item.id, 
                allLocations, 
                state.currentLocation
            );
            if (deployedInOtherZone) return false;
            
            return true;
        });
    },

    /**
     * Render a single item card
     */
    renderItemCard(item) {
        const currentLocation = this.getCurrentLocation();
        const connections = currentLocation?.connections || [];
        
        // Get available ports info
        let portInfo = '';
        if (this.workflowState.mode === 'source') {
            const ports = PortTracker.getAvailablePorts(item, connections, item.id, 'female');
            const available = ports.filter(p => p.available);
            portInfo = available.map(p => p.name.replace('Female_', 'Port ')).join(', ');
        } else {
            if (item.class === 'Decoration' || item.class === 'Light') {
                portInfo = 'Power Inlet Available';
            } else {
                const ports = PortTracker.getAvailablePorts(item, connections, item.id, 'male');
                const available = ports.filter(p => p.available);
                portInfo = available.map(p => p.name.replace('Male_', 'Port ')).join(', ');
            }
        }
        
        return `
            <div id="item-card-${item.id}" class="item-card border border-gray-300 rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition-colors">
                <div class="item-header">
                    <span class="item-name text-lg font-semibold">${item.short_name || item.id}</span>
                    <span class="item-type text-xs">${item.class_type}</span>
                </div>
                <div class="item-details mt-2">
                    <span class="port-count text-sm text-gray-600">${portInfo}</span>
                </div>
            </div>
        `;
    },

    /**
     * Handle source item selection
     */
    handleSourceItemClick(item) {
        console.log('Source item selected:', item.short_name);
        
        this.workflowState.sourceItem = item;
        this.workflowState.sourceItemId = item.id;
        
        // Close item selector modal
        this.close();
        
        // Check if we need port selection
        const currentLocation = this.getCurrentLocation();
        const connections = currentLocation?.connections || [];
        const availablePorts = PortTracker.getAvailablePorts(
            item, 
            connections, 
            item.id, 
            'female'
        ).filter(p => p.available);
        
        if (availablePorts.length === 1) {
            // Auto-select the only port
            this.workflowState.sourcePort = availablePorts[0].name;
            console.log('Auto-selected port:', availablePorts[0].name);
            
            // Move to destination selection
            this.openDestinationSelector();
        } else {
            // Show port selector
            this.openPortSelector(availablePorts);
        }
    },

    /**
     * Handle destination item selection
     */
    handleDestItemClick(item) {
        console.log('Destination item selected:', item.short_name);
        
        this.workflowState.destItem = item;
        this.workflowState.destItemId = item.id;
        this.workflowState.destPort = 'Male_1'; // Always Male_1 for now
        
        // Close item selector modal
        this.close();
        
        // Check if this is a spotlight - needs illumination selection
        if (item.class_type === 'Spot Light') {
            this.openIlluminationSelector();
        } else {
            // Complete the connection
            this.completeConnection();
        }
    },

    /**
     * Open port selector modal
     */
    openPortSelector(availablePorts) {
        console.log('Opening port selector for', availablePorts.length, 'ports');
        
        const modal = document.getElementById('port-selector-modal');
        const title = document.getElementById('port-selector-title');
        const listContainer = document.getElementById('port-selector-list');
        
        title.textContent = 'Select Source Port';
        
        listContainer.innerHTML = availablePorts.map(port => `
            <button 
                id="port-btn-${port.name}"
                class="port-card w-full text-left border border-gray-300 rounded-lg p-4 hover:bg-gray-50 transition-colors"
            >
                <span class="font-semibold">${port.name.replace('Female_', 'Port ')}</span>
                <span class="text-sm text-gray-600 ml-2">(${port.name})</span>
            </button>
        `).join('');
        
        modal.classList.remove('hidden');
        
        // Attach click handlers
        availablePorts.forEach(port => {
            const btn = document.getElementById(`port-btn-${port.name}`);
            if (btn) {
                btn.addEventListener('click', () => {
                    this.handlePortSelection(port.name);
                });
            }
        });
    },

    /**
     * Handle port selection
     */
    handlePortSelection(portName) {
        console.log('Port selected:', portName);
        
        this.workflowState.sourcePort = portName;
        
        // Close port selector
        const modal = document.getElementById('port-selector-modal');
        modal.classList.add('hidden');
        
        // Move to destination selection
        this.openDestinationSelector();
    },

    /**
     * Open illumination selector for spotlights
     */
    openIlluminationSelector() {
        console.log('Opening illumination selector');
        
        const modal = document.getElementById('illumination-selector-modal');
        const listContainer = document.getElementById('illumination-selector-list');
        const confirmBtn = document.getElementById('illumination-confirm-btn');
        
        // Get items that can be illuminated (Inflatables and Static Props in current zone)
        const currentLocation = this.getCurrentLocation();
        const itemsDeployed = currentLocation?.items_deployed || [];
        const allItems = state.allItems || [];
        
        const illuminatableItems = allItems.filter(item => {
            return itemsDeployed.includes(item.id) && 
                   (item.class_type === 'Inflatable' || item.class_type === 'Static Prop');
        });
        
        if (illuminatableItems.length === 0) {
            listContainer.innerHTML = '<p class="text-gray-500 text-sm text-center py-8">No items available to illuminate in this zone</p>';
        } else {
            listContainer.innerHTML = illuminatableItems.map(item => `
                <div class="illumination-item-card border border-gray-300 rounded-lg p-3 cursor-pointer hover:bg-gray-50 transition-colors">
                    <label class="flex items-center cursor-pointer">
                        <input 
                            type="checkbox" 
                            id="illum-${item.id}" 
                            value="${item.id}"
                            class="mr-3 h-5 w-5"
                        >
                        <div class="flex-1">
                            <div class="font-semibold">${item.short_name || item.id}</div>
                            <div class="text-sm text-gray-600">${item.class_type}</div>
                        </div>
                    </label>
                </div>
            `).join('');
            
            // Attach change handlers
            illuminatableItems.forEach(item => {
                const checkbox = document.getElementById(`illum-${item.id}`);
                if (checkbox) {
                    checkbox.addEventListener('change', () => {
                        this.updateIlluminationSelection();
                    });
                }
            });
        }
        
        // Update confirm button
        confirmBtn.textContent = 'Confirm (0/2)';
        
        modal.classList.remove('hidden');
    },

    /**
     * Update illumination selection state
     */
    updateIlluminationSelection() {
        const checkboxes = document.querySelectorAll('#illumination-selector-list input[type="checkbox"]');
        const selected = Array.from(checkboxes)
            .filter(cb => cb.checked)
            .map(cb => cb.value);
        
        // Limit to 2 selections
        if (selected.length > 2) {
            // Uncheck the last one
            const lastCheckbox = Array.from(checkboxes).find(cb => 
                cb.checked && !this.workflowState.illuminates.includes(cb.value)
            );
            if (lastCheckbox) {
                lastCheckbox.checked = false;
                return;
            }
        }
        
        this.workflowState.illuminates = selected;
        
        // Update button text
        const confirmBtn = document.getElementById('illumination-confirm-btn');
        confirmBtn.textContent = `Confirm (${selected.length}/2)`;
    },

    /**
     * Confirm illumination selection (called from modal button)
     */
    confirmIllumination() {
        console.log('Illumination confirmed:', this.workflowState.illuminates);
        
        // Close illumination modal
        const modal = document.getElementById('illumination-selector-modal');
        modal.classList.add('hidden');
        
        // Complete the connection
        this.completeConnection();
    },

    /**
     * Cancel illumination selection (called from modal button)
     */
    cancelIllumination() {
        this.workflowState.illuminates = [];
        const modal = document.getElementById('illumination-selector-modal');
        modal.classList.add('hidden');
        
        // Still complete connection, just without illuminates
        this.completeConnection();
    },

    /**
     * Complete the connection - make API call
     */
    async completeConnection() {
        console.log('Completing connection:', this.workflowState);
        
        try {
            const connectionData = {
                from_item_id: this.workflowState.sourceItemId,
                from_port: this.workflowState.sourcePort,
                to_item_id: this.workflowState.destItemId,
                to_port: this.workflowState.destPort
            };
            
            // Add notes if present
            const notesInput = document.getElementById('notes');
            if (notesInput && notesInput.value.trim()) {
                connectionData.notes = notesInput.value.trim();
            }
            
            // Add illuminates if present
            if (this.workflowState.illuminates.length > 0) {
                connectionData.illuminates = this.workflowState.illuminates;
            }
            
            // Make API call
            const response = await API.addConnection(
                state.currentDeployment.id,
                state.currentLocation,
                connectionData
            );
            
            console.log('Connection created:', response);
            
            // Show success toast
            UI.showToast('Connection added successfully', 'success');
            
            // Clear notes field
            if (notesInput) {
                notesInput.value = '';
            }
            
            // Refresh the deployment data
            if (typeof ConnectionBuilder !== 'undefined' && ConnectionBuilder.loadDeployment) {
                await ConnectionBuilder.loadDeployment(state.currentDeployment.id, state.currentLocation);
            }
            
            // Reset workflow state
            this.resetWorkflowState();
            
        } catch (error) {
            console.error('Error creating connection:', error);
            UI.showToast('Failed to create connection: ' + error.message, 'error');
        }
    },

    /**
     * Get current location object
     */
    getCurrentLocation() {
        if (!state.currentDeployment || !state.currentLocation) return null;
        
        const locations = state.currentDeployment.locations || [];
        return locations.find(loc => loc.name === state.currentLocation);
    },

    /**
     * Reset workflow state
     */
    resetWorkflowState() {
        this.workflowState = {
            mode: null,
            sourceItem: null,
            sourceItemId: null,
            sourcePort: null,
            destItem: null,
            destItemId: null,
            destPort: 'Male_1',
            illuminates: []
        };
    },

    /**
     * Close item selector modal
     */
    close() {
        const modal = document.getElementById('item-selector-modal');
        modal.classList.add('hidden');
    },

    /**
     * Close port selector modal
     */
    closePortSelector() {
        const modal = document.getElementById('port-selector-modal');
        modal.classList.add('hidden');
    },

    /**
     * Close illumination selector modal
     */
    closeIlluminationSelector() {
        const modal = document.getElementById('illumination-selector-modal');
        modal.classList.add('hidden');
    }
};

// Expose methods to global scope for modal onclick handlers
window.ItemSelectorEnhanced = ItemSelectorEnhanced;