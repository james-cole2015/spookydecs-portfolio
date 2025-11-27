// Item Filters
// All filtering logic for source and destination item selection

const ItemFilters = {
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
     * DIRECT CHECK - prevents items from being deployed in multiple zones
     */
    getFilteredDestItems(selectedClass, selectedType) {
        const allItems = state.allItems || [];
        const currentLocation = this.getCurrentLocation();
        const connections = currentLocation?.connections || [];
        const itemsDeployed = currentLocation?.items_deployed || [];
        const allLocations = state.currentDeployment?.locations || [];
        
        console.log(`Filtering destination items for ${selectedClass} / ${selectedType}`);
        console.log(`Current location: ${state.currentLocation}`);
        console.log(`Total locations in deployment: ${allLocations.length}`);
        
        return allItems.filter(item => {
            // Filter 1: Class match
            if (item.class !== selectedClass) return false;
            
            // Filter 2: Type match
            if (item.class_type !== selectedType) return false;
            
            // Filter 3: DIRECT CHECK - Is item deployed in ANY zone?
            // Check all locations in deployment
            for (const location of allLocations) {
                // Skip current location - we'll check that separately
                if (location.name === state.currentLocation) continue;
                
                const locationItemsDeployed = location.items_deployed || [];
                if (locationItemsDeployed.includes(item.id)) {
                    console.log(`❌ Item ${item.id} (${item.short_name}) already deployed in ${location.name} - filtering out`);
                    return false;
                }
            }
            
            // Filter 4a: For Decorations/Lights - must have power_inlet and not already deployed in current zone
            if (selectedClass === 'Decoration' || selectedClass === 'Light') {
                // Must have power inlet available
                if (item.power_inlet !== true) return false;
                
                // Must NOT already be deployed in this location (current zone check)
                if (itemsDeployed.includes(item.id)) {
                    console.log(`❌ Item ${item.id} (${item.short_name}) already deployed in current zone - filtering out`);
                    return false;
                }
            }
            
            // Filter 4b: For Accessories - must have available male ports
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
            
            console.log(`✅ Item ${item.id} (${item.short_name}) is available for deployment`);
            return true;
        });
    },

    /**
     * Get items with open connections for source selection (recent items)
     */
    getRecentSourceItems() {
        const currentLocation = this.getCurrentLocation();
        const connections = currentLocation?.connections || [];
        const itemsDeployed = currentLocation?.items_deployed || [];
        const allItems = state.allItems || [];
        
        return PortTracker.getItemsWithOpenConnections(
            connections,
            allItems,
            itemsDeployed
        ).slice(0, 3); // Top 3 most recent
    },

    /**
     * Get ready items (items in zone with available female ports)
     */
    getReadySourceItems() {
        const currentLocation = this.getCurrentLocation();
        const connections = currentLocation?.connections || [];
        const itemsDeployed = currentLocation?.items_deployed || [];
        const allItems = state.allItems || [];
        
        return allItems.filter(item => {
            // Must be deployed in this zone
            if (!itemsDeployed.includes(item.id)) return false;
            
            // Must have female ports
            const femaleEnds = parseInt(item.female_ends || '0');
            if (femaleEnds === 0) return false;
            
            // Must have at least one available port
            return PortTracker.hasAvailablePorts(item, connections, item.id, 'female');
        });
    },

    /**
     * Get items that can be illuminated (for spotlights)
     */
    getIlluminatableItems() {
        const currentLocation = this.getCurrentLocation();
        const itemsDeployed = currentLocation?.items_deployed || [];
        const allItems = state.allItems || [];
        
        return allItems.filter(item => {
            return itemsDeployed.includes(item.id) && 
                   (item.class_type === 'Inflatable' || item.class_type === 'Static Prop');
        });
    },

    /**
     * Get current location object
     */
    getCurrentLocation() {
        if (!state.currentDeployment || !state.currentLocation) return null;
        
        const locations = state.currentDeployment.locations || [];
        return locations.find(loc => loc.name === state.currentLocation);
    }
};

// Export
window.ItemFilters = ItemFilters;