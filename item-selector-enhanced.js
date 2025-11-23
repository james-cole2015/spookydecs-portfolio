// Enhanced Item Selector with Port Availability
// Shows items organized by availability status with port information

const ItemSelectorEnhanced = {
    currentMode: null, // 'source' or 'destination'
    currentLocation: null,
    currentConnections: [],
    allItems: [],
    filteredItems: [],
    
    /**
     * Open the enhanced item selector
     */
    open(mode, location, connections, allItems) {
        this.currentMode = mode;
        this.currentLocation = location;
        this.currentConnections = connections;
        this.allItems = allItems;
        
        // Show modal
        document.getElementById('item-selector-modal').classList.remove('hidden');
        
        // Set modal title
        const title = mode === 'source' ? 'Select Source Item' : 'Select Destination Item';
        document.getElementById('item-selector-title').textContent = title;
        
        // Render items
        this.renderItems();
    },
    
    /**
     * Close the item selector
     */
    close() {
        document.getElementById('item-selector-modal').classList.add('hidden');
        this.currentMode = null;
    },
    
    /**
     * Render items in sections
     */
    renderItems() {
        const container = document.getElementById('item-selector-list');
        container.innerHTML = '';
        
        const portType = this.currentMode === 'source' ? 'female' : 'male';
        const itemsDeployed = this.currentLocation?.items_deployed || [];
        
        // Get items with open connections
        const openConnectionItems = PortTracker.getItemsWithOpenConnections(
            this.currentConnections,
            this.allItems,
            itemsDeployed
        );
        
        // Filter by port type
        const openItems = openConnectionItems.filter(itemInfo => {
            if (portType === 'female') {
                return itemInfo.availableFemale > 0;
            } else {
                return itemInfo.availableMale > 0;
            }
        });
        
        // Get available items (not yet connected)
        const availableItems = this.allItems.filter(item => {
            // Skip if already in open connections
            if (openItems.find(i => i.itemId === item.id)) return false;
            
            // Skip if no ports of required type
            const portCount = portType === 'female' 
                ? parseInt(item.female_ends || '0')
                : parseInt(item.male_ends || '0');
            if (portCount === 0) return false;
            
            // Skip if deployed in current location
            if (itemsDeployed.includes(item.id)) return false;
            
            // Skip if deployed elsewhere
            const usedInLocation = PortTracker.getItemLocationUsage(
                item.id,
                ConnectionWorkflow.currentDeployment?.locations || [],
                this.currentLocation.name
            );
            if (usedInLocation) return false;
            
            return true;
        });
        
        // Get items used elsewhere
        const usedElsewhereItems = this.allItems.filter(item => {
            const portCount = portType === 'female' 
                ? parseInt(item.female_ends || '0')
                : parseInt(item.male_ends || '0');
            if (portCount === 0) return false;
            
            const usedInLocation = PortTracker.getItemLocationUsage(
                item.id,
                ConnectionWorkflow.currentDeployment?.locations || [],
                this.currentLocation.name
            );
            return usedInLocation !== null;
        });
        
        // Render sections
        this.renderSection(
            container,
            '🔥 Latest Open Connections',
            openItems.length > 0 ? null : 'No open connections yet. Start connecting items!',
            openItems.map(itemInfo => ({
                item: itemInfo.item,
                badge: this.getPortBadge(itemInfo, portType),
                isLatest: true
            }))
        );
        
        this.renderSection(
            container,
            '📦 Available Items',
            availableItems.length > 0 ? null : 'No available items',
            availableItems.map(item => ({
                item: item,
                badge: this.getAvailableItemBadge(item, portType),
                isLatest: false
            }))
        );
        
        this.renderSection(
            container,
            '🔒 Used in Other Locations',
            usedElsewhereItems.length > 0 ? null : null,
            usedElsewhereItems.map(item => ({
                item: item,
                badge: this.getUsedElsewhereBadge(item),
                disabled: true
            })),
            true // This section can be collapsed/hidden if empty
        );
    },
    
    /**
     * Render a section of items
     */
    renderSection(container, title, emptyMessage, items, hideIfEmpty = false) {
        if (hideIfEmpty && items.length === 0) return;
        
        const section = document.createElement('div');
        section.className = 'item-selector-section mb-6';
        
        const header = document.createElement('h3');
        header.className = 'text-sm font-semibold text-gray-600 mb-3 uppercase tracking-wide';
        header.textContent = title;
        section.appendChild(header);
        
        if (emptyMessage) {
            const message = document.createElement('p');
            message.className = 'text-sm text-gray-500 italic py-4';
            message.textContent = emptyMessage;
            section.appendChild(message);
        } else {
            const list = document.createElement('div');
            list.className = 'space-y-2';
            
            items.forEach(itemData => {
                const itemEl = this.createItemElement(itemData);
                list.appendChild(itemEl);
            });
            
            section.appendChild(list);
        }
        
        container.appendChild(section);
    },
    
    /**
     * Create an item element
     */
    createItemElement(itemData) {
        const { item, badge, disabled, isLatest } = itemData;
        
        const div = document.createElement('div');
        div.className = `item-card p-4 border rounded-lg cursor-pointer transition-all ${
            disabled 
                ? 'bg-gray-100 border-gray-300 opacity-60 cursor-not-allowed' 
                : 'bg-white border-gray-300 hover:border-orange-500 hover:shadow-md'
        } ${isLatest ? 'border-orange-400' : ''}`;
        
        if (!disabled) {
            div.addEventListener('click', () => this.selectItem(item));
        }
        
        div.innerHTML = `
            <div class="flex justify-between items-start">
                <div class="flex-1">
                    <div class="flex items-center gap-2">
                        <span class="font-semibold text-gray-900">${item.short_name || item.name}</span>
                        ${item.class === 'spotlight' ? '<span class="text-lg">💡</span>' : ''}
                        ${isLatest ? '<span class="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">⚡ Just used</span>' : ''}
                    </div>
                    <div class="text-sm text-gray-600 mt-1">${item.name}</div>
                    <div class="text-xs text-gray-500 mt-1">Class: ${item.class}</div>
                </div>
                <div class="text-sm font-medium text-gray-700">
                    ${badge}
                </div>
            </div>
        `;
        
        return div;
    },
    
    /**
     * Get port badge for items with open connections
     */
    getPortBadge(itemInfo, portType) {
        const count = portType === 'female' ? itemInfo.availableFemale : itemInfo.availableMale;
        const portLabel = portType === 'female' ? 'female' : 'male';
        const plural = count === 1 ? 'port' : 'ports';
        return `<span class="bg-green-100 text-green-800 px-2 py-1 rounded">${count} ${plural}</span>`;
    },
    
    /**
     * Get badge for available items
     */
    getAvailableItemBadge(item, portType) {
        const count = portType === 'female' 
            ? parseInt(item.female_ends || '0')
            : parseInt(item.male_ends || '0');
        const plural = count === 1 ? 'port' : 'ports';
        return `<span class="bg-blue-100 text-blue-800 px-2 py-1 rounded">${count} ${plural}</span>`;
    },
    
    /**
     * Get badge for items used elsewhere
     */
    getUsedElsewhereBadge(item) {
        const location = PortTracker.getItemLocationUsage(
            item.id,
            ConnectionWorkflow.currentDeployment?.locations || [],
            this.currentLocation.name
        );
        return `<span class="bg-gray-200 text-gray-600 px-2 py-1 rounded text-xs">${location}</span>`;
    },
    
    /**
     * Handle item selection
     */
    selectItem(item) {
        this.close();
        
        if (this.currentMode === 'source') {
            ConnectionWorkflow.selectSourceItem(item);
        } else {
            ConnectionWorkflow.selectDestinationItem(item);
        }
    },
    
    /**
     * Filter items by search query
     */
    filterBySearch(query) {
        // TODO: Implement search filtering
        console.log('Search query:', query);
    },
    
    /**
     * Filter items by class type
     */
    filterByClass(classType) {
        // TODO: Implement class filtering
        console.log('Filter by class:', classType);
    }
};