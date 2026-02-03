// Item Renderers
// All UI rendering functions for item selection workflow

const ItemRenderers = {
    /**
     * Render destination filter dropdowns
     */
    renderDestinationFilters() {
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
                
                <div id="dest-search-container" class="hidden">
                    <label class="block text-sm font-medium text-gray-700 mb-2">🔍 Search Items</label>
                    <input 
                        type="text" 
                        id="dest-item-search" 
                        placeholder="Type to filter items..."
                        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                </div>
            </div>
            
            <div id="filtered-items-container" class="space-y-3">
                <p class="text-gray-500 text-sm text-center py-8">Select class and type to see available items</p>
            </div>
        `;
    },

    /**
     * Render first connection view (receptacle only)
     */
    renderFirstConnectionView() {
        const currentLocation = state.currentLocation;
        const receptacleId = ZONE_RECEPTACLES[currentLocation];
        
        if (!receptacleId) {
            return '<p class="text-gray-500 text-sm text-center py-8">No receptacle configured for this zone</p>';
        }
        
        const receptacle = state.allItems.find(item => item.id === receptacleId);
        
        if (!receptacle) {
            return '<p class="text-gray-500 text-sm text-center py-8">Receptacle not found</p>';
        }
        
        const femaleEnds = parseInt(receptacle.female_ends || '0');
        
        return `
            <div class="mb-4">
                <h3 class="text-sm font-semibold text-gray-700 mb-3">🏠 Start from Receptacle</h3>
                <p class="text-xs text-gray-600 mb-4">The first connection always starts from your zone's receptacle.</p>
                
                <div 
                    id="source-item-${receptacle.id}" 
                    class="item-card border-2 border-blue-500 bg-blue-50 rounded-lg p-4 cursor-pointer hover:bg-blue-100 transition-colors"
                    data-item-id="${receptacle.id}"
                >
                    <div class="font-semibold text-lg text-gray-900">${receptacle.short_name || receptacle.id}</div>
                    <div class="text-sm text-gray-600 mt-1">${receptacle.class_type} • ${femaleEnds} ports available</div>
                </div>
            </div>
        `;
    },

    /**
     * Render source items view with recent connections and ready items
     */
    renderSourceItemsView() {
        const recentItems = ItemFilters.getRecentSourceItems();
        const readyItems = ItemFilters.getReadySourceItems();
        
        const currentLocation = ItemFilters.getCurrentLocation();
        const connections = currentLocation?.connections || [];
        
        let html = '';
        
        // Add search bar at the top
        html += `
            <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-2">🔍 Search Items</label>
                <input 
                    type="text" 
                    id="source-item-search" 
                    placeholder="Type to filter items..."
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
            </div>
        `;
        
        // Recent connections section
        if (recentItems.length > 0) {
            html += `
                <div class="mb-6" id="recent-items-section">
                    <h3 class="text-sm font-semibold text-gray-700 mb-3">🔥 Continue From Recent (${recentItems.length})</h3>
                    <div class="space-y-2" id="recent-items-list">
                        ${recentItems.map(itemInfo => this.renderSourceItemCard(itemInfo.item, itemInfo.availableFemale)).join('')}
                    </div>
                </div>
            `;
        }
        
        // Ready items section
        html += `
            <div id="ready-items-section">
                <h3 class="text-sm font-semibold text-gray-700 mb-3">📍 Ready Items (${readyItems.length})</h3>
                ${readyItems.length === 0 
                    ? '<p class="text-gray-500 text-sm">No items with available ports</p>'
                    : `<div class="space-y-2" id="ready-items-list">${readyItems.map(item => {
                        const availablePorts = PortTracker.getAvailablePortCount(item, connections, item.id, 'female');
                        return this.renderSourceItemCard(item, availablePorts);
                    }).join('')}</div>`
                }
            </div>
        `;
        
        return html;
    },

    /**
     * Render a single source item card
     */
    renderSourceItemCard(item, availablePortCount) {
        return `
            <div 
                id="source-item-${item.id}" 
                class="item-card source-item-card border border-gray-300 rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                data-item-id="${item.id}"
                data-item-name="${(item.short_name || item.id).toLowerCase()}"
                data-item-type="${(item.class_type || '').toLowerCase()}"
            >
                <div class="font-semibold text-lg text-gray-900">${item.short_name || item.id}</div>
                <div class="text-sm text-gray-600 mt-1">
                    ${item.class_type} • ${availablePortCount} ${availablePortCount === 1 ? 'port' : 'ports'} available
                </div>
            </div>
        `;
    },

    /**
     * Render a single destination item card
     */
    renderDestinationItemCard(item) {
        const currentLocation = ItemFilters.getCurrentLocation();
        const connections = currentLocation?.connections || [];
        
        // Get available ports info
        let portInfo = '';
        if (item.class === 'Decoration' || item.class === 'Light') {
            portInfo = 'Power Inlet Available';
        } else {
            const ports = PortTracker.getAvailablePorts(item, connections, item.id, 'male');
            const available = ports.filter(p => p.available);
            portInfo = available.map(p => p.name.replace('Male_', 'Port ')).join(', ');
        }
        
        return `
            <div 
                id="item-card-${item.id}" 
                class="item-card dest-item-card border border-gray-300 rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                data-item-name="${(item.short_name || item.id).toLowerCase()}"
                data-item-type="${(item.class_type || '').toLowerCase()}"
            >
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
     * Render port selector buttons
     */
    renderPortButtons(availablePorts) {
        return availablePorts.map(port => `
            <button 
                id="port-btn-${port.name}"
                class="port-card w-full text-left border border-gray-300 rounded-lg p-4 hover:bg-gray-50 transition-colors"
            >
                <span class="font-semibold">${port.name.replace('Female_', 'Port ')}</span>
                <span class="text-sm text-gray-600 ml-2">(${port.name})</span>
            </button>
        `).join('');
    },

    /**
     * Render illumination selector items
     */
    renderIlluminationItems() {
        const illuminatableItems = ItemFilters.getIlluminatableItems();
        
        if (illuminatableItems.length === 0) {
            return '<p class="text-gray-500 text-sm text-center py-8">No items available to illuminate in this zone</p>';
        }
        
        return illuminatableItems.map(item => `
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
    }
};

// Export
window.ItemRenderers = ItemRenderers;