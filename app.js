// Main Application Entry Point

// Event Listeners
function initEventListeners() {
    document.getElementById('start-decorating-btn').addEventListener('click', DeploymentManager.createDeployment);
    document.getElementById('refresh-deployments-btn').addEventListener('click', DeploymentManager.loadInProgressDeployments);
    
    document.getElementById('back-to-deployments-btn').addEventListener('click', DeploymentManager.backToDeployments);
    
    // NEW: Enhanced Connection Workflow Event Listeners
    // Add Connection Button
    document.getElementById('add-connection-btn')?.addEventListener('click', () => {
        console.log('Add Connection button clicked');
        
        // Ensure we have a deployment and location selected
        if (!state.currentDeployment || !state.currentLocation) {
            UI.showToast('Please select a deployment and location first', 'error');
            return;
        }
        
        // Ensure items are loaded
        if (!state.allItems || state.allItems.length === 0) {
            console.log('Items not loaded, fetching...');
            UI.showToast('Loading items...', 'info');
            API.listItems().then(response => {
                state.allItems = response.items || response;
                console.log(`Loaded ${state.allItems.length} items`);
                ItemSelectorEnhanced.openSourceSelector();
            }).catch(error => {
                console.error('Failed to load items:', error);
                UI.showToast('Failed to load items: ' + error.message, 'error');
            });
            return;
        }
        
        // Open the source item selector
        ItemSelectorEnhanced.openSourceSelector();
    });
    
    // Add Static Prop Button
    document.getElementById('add-static-prop-btn')?.addEventListener('click', () => {
        console.log('Add Static Prop button clicked');
        
        // Ensure we have a deployment and location selected
        if (!state.currentDeployment || !state.currentLocation) {
            UI.showToast('Please select a deployment and location first', 'error');
            return;
        }
        
        // Ensure items are loaded
        if (!state.allItems || state.allItems.length === 0) {
            console.log('Items not loaded, fetching...');
            UI.showToast('Loading items...', 'info');
            API.listItems().then(response => {
                state.allItems = response.items || response;
                console.log(`Loaded ${state.allItems.length} items`);
                StaticPropManager.openSelector();
            }).catch(error => {
                console.error('Failed to load items:', error);
                UI.showToast('Failed to load items: ' + error.message, 'error');
            });
            return;
        }
        
        // Open the static prop selector
        StaticPropManager.openSelector();
    });
    
    // OLD MODAL HANDLERS - Keep for backward compatibility during transition
    const closeModalBtn = document.getElementById('close-modal-btn');
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', ItemSelector.closeItemSelector);
    }
    
    const modalClassType = document.getElementById('modal-class-type');
    if (modalClassType) {
        modalClassType.addEventListener('change', ItemSelector.filterItemsByClassType);
    }
    
    const itemSearch = document.getElementById('item-search');
    if (itemSearch) {
        itemSearch.addEventListener('input', ItemSelector.searchItems);
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Load configuration first
        await loadConfig();
        
        // Set global API_ENDPOINT for backward compatibility
        API_ENDPOINT = getApiEndpoint();
        
        console.log('Configuration loaded. API Endpoint:', API_ENDPOINT);
        
        // Now initialize the rest of the app
        document.getElementById('create-year').value = UIUtils.getCurrentYear();
        
        UIUtils.initNavigation();

        console.log('🔧 About to call initEventListeners');
        initEventListeners();
        console.log('✅ initEventListeners called');
        
        DeploymentManager.loadInProgressDeployments();
        
        // Load all items on startup for connection workflow
        console.log('📦 Loading items for connection workflow...');
        API.listItems().then(response => {
            state.allItems = response.items || response;
            console.log(`✅ Loaded ${state.allItems.length} items into state.allItems`);
        }).catch(error => {
            console.error('❌ Failed to load items on startup:', error);
        });
        
    } catch (error) {
        console.error('Failed to initialize app:', error);
        UIUtils.showToast('Failed to load configuration. Please refresh the page.', 'error');
    }
});