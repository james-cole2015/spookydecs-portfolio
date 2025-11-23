// Enhanced Item Selector with Latest Open Connections
// Displays items grouped by: Latest Open Connections, Available Items, No Ports Available

const ItemSelectorEnhanced = {
    currentMode: null, // 'source' or 'destination'
    currentLocation: null,
    currentConnections: [],
    allItems: [],
    filteredItems: [],
    
    /**
     * Open the enhanced item selector modal
     */
    open(mode, locationName, allItems) {
        this.currentMode = mode;
        this.currentLocation = locationName;
        this.allItems = allItems;
        this.currentConnections = ConnectionWorkflow.currentConnections;
        
        // ✅ FIX: Use correct function name - getAvailableItems
// Build filtered items list with port availability
this.filteredItems = allItems
    .map(item => {
        const portType = mode === 'source' ? 'female' : 'male';
        const availablePorts = PortTracker.getAvailablePorts(item, this.currentConnections, item.id, portType)
            .filter(p => p.available)
            .map(p => p.name);
        
        return {
            item: item,
            availablePorts: availablePorts,
            availablePortCount: availablePorts.length
        };
    })
.filter(itemData => {
    // Only show items deployed in this location
    const deployment = ConnectionWorkflow.currentDeployment;
    const location = deployment?.locations?.find(loc => loc.name === locationName);
    const itemsDeployed = location?.items_deployed || [];
    return itemsDeployed.length === 0 || itemsDeployed.includes(itemData.item.id);
});
        this.render();
        this.attachEventListeners();
        
        // Show modal
        const modal = document.getElementById('item-selector-modal');
        if (modal) {
            modal.style.display = 'flex';
        }
    },
    
    /**
     * Close the modal
     */
    close() {
        const modal = document.getElementById('item-selector-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    },
    
    /**
     * Render the modal content with sections
     */
    render() {
        const container = document.getElementById('item-selector-list');
        if (!container) return;
        
        const title = document.getElementById('item-selector-title');
        if (title) {
            title.textContent = this.currentMode === 'source' 
                ? 'Select Source Item' 
                : 'Select Destination Item';
        }
        
        // Group items into sections
        const sections = this.groupItemsIntoSections();
        
        // Build HTML
        let html = '';
        
        // Latest Open Connections section
        if (sections.latestOpen.length > 0) {
            html += this.renderSection(
                'Latest Open Connections',
                sections.latestOpen,
                'priority-section'
            );
        }
        
        // Available Items section
        if (sections.available.length > 0) {
            html += this.renderSection(
                'Available Items',
                sections.available,
                'available-section'
            );
        }
        
        // No Ports Available section (view only)
        if (sections.unavailable.length > 0) {
            html += this.renderSection(
                'No Ports Available',
                sections.unavailable,
                'unavailable-section',
                true // disabled
            );
        }
        
        container.innerHTML = html || '<p class="no-items">No items available</p>';
    },
    
    /**
     * Group items into sections based on availability and recency
     */
    groupItemsIntoSections() {
        const latestOpen = [];
        const available = [];
        const unavailable = [];
        
        // Get items that were recently connected (have at least one connection)
        const recentlyConnectedIds = new Set();
        this.currentConnections.forEach(conn => {
            recentlyConnectedIds.add(conn.from_item_id);
            recentlyConnectedIds.add(conn.to_item_id);
        });
        
        this.filteredItems.forEach(itemData => {
            const item = itemData.item;
            const hasAvailablePorts = itemData.availablePortCount > 0;
            const isRecentlyConnected = recentlyConnectedIds.has(item.id);
            
            if (hasAvailablePorts && isRecentlyConnected) {
                latestOpen.push(itemData);
            } else if (hasAvailablePorts) {
                available.push(itemData);
            } else {
                unavailable.push(itemData);
            }
        });
        
        return { latestOpen, available, unavailable };
    },
    
    /**
     * Render a section of items
     */
    renderSection(title, items, cssClass, disabled = false) {
        let html = `<div class="item-section ${cssClass}">`;
        html += `<h3 class="section-title">${title}</h3>`;
        html += '<div class="section-items">';
        
        items.forEach(itemData => {
            const item = itemData.item;
            const availablePorts = itemData.availablePorts;
            const portCount = itemData.availablePortCount;
            
            const disabledAttr = disabled ? 'disabled' : '';
            const disabledClass = disabled ? 'disabled' : '';
            
            html += `
                <div class="enhanced-item-card ${disabledClass}" 
                     data-item-id="${item.id}" 
                     ${disabledAttr}>
                    <div class="item-header">
                        <span class="item-name">${this.escapeHtml(item.short_name)}</span>
                        <span class="item-type">${this.escapeHtml(item.class_type)}</span>
                    </div>
                    <div class="item-details">
                        <span class="item-zone">${this.escapeHtml(item.zone || 'No zone')}</span>
                        ${!disabled ? `<span class="port-count">${portCount} port${portCount !== 1 ? 's' : ''} available</span>` : '<span class="port-count no-ports">No ports</span>'}
                    </div>
                    ${!disabled && availablePorts.length > 0 ? `
                        <div class="available-ports">
                            ${availablePorts.map(port => `<span class="port-badge">${port}</span>`).join('')}
                        </div>
                    ` : ''}
                </div>
            `;
        });
        
        html += '</div></div>';
        return html;
    },
    
    /**
     * Attach event listeners to item cards
     */
    attachEventListeners() {
        const container = document.getElementById('item-selector-list');
        if (!container) return;
        
        // Close button
        const closeBtn = document.querySelector('#item-selector-modal .modal-close');
        if (closeBtn) {
            closeBtn.onclick = () => this.close();
        }
        
        // Cancel button
        const cancelBtn = document.querySelector('#item-selector-modal .btn-cancel');
        if (cancelBtn) {
            cancelBtn.onclick = () => this.close();
        }
        
        // Item cards
        const itemCards = container.querySelectorAll('.enhanced-item-card:not(.disabled)');
        itemCards.forEach(card => {
            card.addEventListener('click', async () => {
                const itemId = card.dataset.itemId;
                const item = this.allItems.find(i => i.id === itemId);
                if (item) {
                    await this.selectItem(item);
                }
            });
        });
    },
    
    /**
     * Handle item selection - Route to correct workflow method based on step
     */
    async selectItem(item) {
        this.close();
        
        // Check the current workflow step and call the appropriate method
        const currentStep = ConnectionWorkflow.state.step;
        
        if (currentStep === 'select-source') {
            // We're selecting the SOURCE item
            await ConnectionWorkflow.selectSourceItem(item);
        } else if (currentStep === 'select-destination') {
            // We're selecting the DESTINATION item
            await ConnectionWorkflow.selectDestinationItem(item);
        } else {
            console.error('Invalid workflow step:', currentStep);
        }
    },
    
    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};