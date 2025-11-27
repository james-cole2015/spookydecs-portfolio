// Static Prop Manager
// Handles adding static props to zones (no power connection needed)

const StaticPropManager = {
    /**
     * Open static prop selector
     */
    openSelector() {
        console.log('Opening static prop selector');
        
        const modal = document.getElementById('static-prop-selector-modal');
        const listContainer = document.getElementById('static-prop-selector-list');
        
        // Get all static props that aren't deployed anywhere
        const allItems = state.allItems || [];
        const allLocations = state.currentDeployment?.locations || [];
        const currentLocation = state.currentLocation;
        
        const availableStaticProps = allItems.filter(item => {
            // Must be a static prop
            if (item.class !== 'Decoration' || item.class_type !== 'Static Prop') {
                return false;
            }
            
            // Not deployed in any other zone
            const deployedInOtherZone = PortTracker.getItemLocationUsage(
                item.id,
                allLocations,
                currentLocation
            );
            
            if (deployedInOtherZone) {
                return false;
            }
            
            // Not already in current zone
            const currentLoc = allLocations.find(loc => loc.name === currentLocation);
            const itemsDeployed = currentLoc?.items_deployed || [];
            
            if (itemsDeployed.includes(item.id)) {
                return false;
            }
            
            return true;
        });
        
        if (availableStaticProps.length === 0) {
            listContainer.innerHTML = `
                <p class="text-gray-500 text-sm text-center py-8">
                    No static props available. All static props are already deployed.
                </p>
            `;
        } else {
            listContainer.innerHTML = availableStaticProps.map(item => `
                <div 
                    id="static-prop-card-${item.id}" 
                    class="static-prop-card border border-gray-300 rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                >
                    <div class="flex justify-between items-center">
                        <div>
                            <div class="font-semibold text-lg">${item.short_name || item.id}</div>
                            <div class="text-sm text-gray-600">${item.class_type}</div>
                        </div>
                        <button 
                            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                            onclick="StaticPropManager.addStaticProp('${item.id}')"
                        >
                            Add to Zone
                        </button>
                    </div>
                </div>
            `).join('');
        }
        
        modal.classList.remove('hidden');
    },

    /**
     * Add a static prop to the current zone
     */
async addStaticProp(itemId) {
    console.log('=== ADD STATIC PROP START ===');
    console.log('Adding item:', itemId);
    
    try {
        const item = state.allItems.find(i => i.id === itemId);
        const itemName = item?.short_name || itemId;
        
        // Call API to add item to location
        const response = await API.addItemToLocation(
            state.currentDeployment.id,
            state.currentLocation,
            itemId
        );
        
        console.log('API response:', response);
        
        // Show success toast
        UIUtils.showToast(`${itemName} added to zone`, 'success');
        
        // Close modal first
        this.closeSelector();
        
        console.log('BEFORE reload - items_deployed:', 
            state.currentDeployment?.locations?.find(l => l.name === state.currentLocation)?.items_deployed
        );
        
        // Refresh the deployment data
        if (typeof DeploymentManager !== 'undefined' && DeploymentManager.reloadDeploymentData) {
            await DeploymentManager.reloadDeploymentData();
        }
        
        console.log('AFTER reload - items_deployed:', 
            state.currentDeployment?.locations?.find(l => l.name === state.currentLocation)?.items_deployed
        );
        
        // Re-open the selector with fresh data
        console.log('Re-opening selector...');
        this.openSelector();
        console.log('=== ADD STATIC PROP END ===');
        
    } catch (error) {
        console.error('Error adding static prop:', error);
        UIUtils.showToast('Failed to add static prop: ' + error.message, 'error');
    }
},

    /**
     * Close the static prop selector modal
     */
    closeSelector() {
        const modal = document.getElementById('static-prop-selector-modal');
        modal.classList.add('hidden');
    }
};

// Expose to global scope
window.StaticPropManager = StaticPropManager;