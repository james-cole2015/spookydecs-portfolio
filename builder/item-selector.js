// Item Selector - Core Workflow
// Orchestrates the item selection workflow using ItemFilters and ItemRenderers

const ItemSelector = {
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
        
        const currentLocation = ItemFilters.getCurrentLocation();
        const connections = currentLocation?.connections || [];
        
        // Check if this is the first connection (no connections exist yet)
        if (connections.length === 0) {
            listContainer.innerHTML = ItemRenderers.renderFirstConnectionView();
        } else {
            listContainer.innerHTML = ItemRenderers.renderSourceItemsView();
        }
        
        modal.classList.remove('hidden');
        
        // Attach click handlers
        this.attachSourceItemHandlers();
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
        
        // Render class/type selectors for destination
        listContainer.innerHTML = ItemRenderers.renderDestinationFilters();
        
        modal.classList.remove('hidden');
        
        // Attach event listeners
        this.attachDestinationFilterListeners();
    },

    /**
     * Attach event listeners to destination filter dropdowns
     */
    attachDestinationFilterListeners() {
        const classSelect = document.getElementById('filter-class');
        const typeSelect = document.getElementById('filter-type');
        
        classSelect.addEventListener('change', (e) => {
            const selectedClass = e.target.value;
            
            if (!selectedClass) {
                typeSelect.disabled = true;
                typeSelect.innerHTML = '<option value="">Select class first...</option>';
                this.updateDestinationItemsList('', '');
                return;
            }
            
            // Populate type dropdown
            typeSelect.disabled = false;
            const types = this.classTypeMap[selectedClass] || [];
            typeSelect.innerHTML = '<option value="">Select type...</option>' + 
                types.map(type => `<option value="${type}">${type}</option>`).join('');
            
            // Clear items list
            this.updateDestinationItemsList(selectedClass, '');
        });
        
        typeSelect.addEventListener('change', (e) => {
            const selectedClass = classSelect.value;
            const selectedType = e.target.value;
            
            this.updateDestinationItemsList(selectedClass, selectedType);
        });
    },

    /**
     * Update destination items list based on selected filters
     */
    updateDestinationItemsList(selectedClass, selectedType) {
        const container = document.getElementById('filtered-items-container');
        
        if (!selectedClass || !selectedType) {
            container.innerHTML = '<p class="text-gray-500 text-sm text-center py-8">Select class and type to see available items</p>';
            return;
        }
        
        const items = ItemFilters.getFilteredDestItems(selectedClass, selectedType);
        
        // Render items
        if (items.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-sm text-center py-8">No available items match these filters</p>';
            return;
        }
        
        container.innerHTML = items.map(item => ItemRenderers.renderDestinationItemCard(item)).join('');
        
        // Attach click handlers
        items.forEach(item => {
            const card = document.getElementById(`item-card-${item.id}`);
            if (card) {
                card.addEventListener('click', () => {
                    this.handleDestItemClick(item);
                });
            }
        });
    },

    /**
     * Attach click handlers to source items
     */
    attachSourceItemHandlers() {
        const itemCards = document.querySelectorAll('.item-card[data-item-id]');
        itemCards.forEach(card => {
            card.addEventListener('click', () => {
                const itemId = card.dataset.itemId;
                const item = state.allItems.find(i => i.id === itemId);
                if (item) {
                    this.handleSourceItemClick(item);
                }
            });
        });
    },

    /**
     * Handle source item selection
     */
    handleSourceItemClick(item) {
        console.log('Source item selected:', item.short_name);
        
        this.workflowState.sourceItem = item;
        this.workflowState.sourceItemId = item.id;
        
        // Auto-assign first available port
        const currentLocation = ItemFilters.getCurrentLocation();
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
        
        this.workflowState.sourcePort = firstAvailablePort;
        console.log('Auto-assigned port:', firstAvailablePort);
        
        // Close source selector modal
        this.close();
        
        // Move directly to destination selection
        this.openDestinationSelector();
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
            // Ensure illuminates is empty array for non-spotlights
            this.workflowState.illuminates = [];
            // Show notes modal
            this.openNotesModal();
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
        listContainer.innerHTML = ItemRenderers.renderPortButtons(availablePorts);
        
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
        
        listContainer.innerHTML = ItemRenderers.renderIlluminationItems();
        
        // Attach change handlers to checkboxes
        const illuminatableItems = ItemFilters.getIlluminatableItems();
        illuminatableItems.forEach(item => {
            const checkbox = document.getElementById(`illum-${item.id}`);
            if (checkbox) {
                checkbox.addEventListener('change', () => {
                    this.updateIlluminationSelection();
                });
            }
        });
        
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
        
        // Show notes modal
        this.openNotesModal();
    },

    /**
     * Cancel illumination selection (called from modal button)
     */
    cancelIllumination() {
        this.workflowState.illuminates = [];
        const modal = document.getElementById('illumination-selector-modal');
        modal.classList.add('hidden');
        
        // Show notes modal
        this.openNotesModal();
    },

    /**
     * Open notes modal (final step before connection creation)
     */
    openNotesModal() {
        console.log('Opening notes modal');
        
        const modal = document.getElementById('connection-notes-modal');
        const notesTextarea = document.getElementById('notes');
        
        // Clear previous notes
        if (notesTextarea) {
            notesTextarea.value = '';
        }
        
        // Show modal
        modal.classList.remove('hidden');
    },

    /**
     * Skip notes and create connection
     */
    skipNotes() {
        console.log('Skipping notes');
        
        // Close modal
        const modal = document.getElementById('connection-notes-modal');
        modal.classList.add('hidden');
        
        // Complete connection
        this.completeConnection();
    },

    /**
     * Confirm notes and create connection
     */
    confirmNotes() {
        console.log('Confirming notes');
        
        // Close modal
        const modal = document.getElementById('connection-notes-modal');
        modal.classList.add('hidden');
        
        // Complete connection (notes will be read from #notes element in completeConnection)
        this.completeConnection();
    },

    /**
     * Complete the connection - make API call with better error handling
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
            if (this.workflowState.illuminates && this.workflowState.illuminates.length > 0) {
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
            UIUtils.showToast('Connection added successfully', 'success');
            
            // Clear notes field
            if (notesInput) {
                notesInput.value = '';
            }
            
            // Auto-refresh deployment data
            if (typeof DeploymentManager !== 'undefined' && DeploymentManager.reloadDeploymentData) {
                await DeploymentManager.reloadDeploymentData();
            }
            
            // Reset workflow state
            this.resetWorkflowState();
            
        } catch (error) {
            console.error('Error creating connection:', error);
            
            // Extract the actual error message from the API error
            let errorMessage = error.message || 'Failed to create connection';
            
            // If the error message is "Connection Creation Failed", 
            // it means the backend rejected it - show a more helpful message
            if (errorMessage === 'Connection Creation Failed') {
                errorMessage = 'This item cannot be added. It may already be deployed in another zone.';
            }
            
            UIUtils.showToast(errorMessage, 'error');
        }
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

// Expose to global scope for modal onclick handlers
window.ItemSelectorEnhanced = ItemSelector;
window.ItemSelector = ItemSelector;