// Main Application Entry Point

// Event Listeners
function initEventListeners() {
    document.getElementById('start-decorating-btn').addEventListener('click', DeploymentManager.createDeployment);
    document.getElementById('refresh-deployments-btn').addEventListener('click', DeploymentManager.loadInProgressDeployments);
    
    document.getElementById('back-to-deployments-btn').addEventListener('click', DeploymentManager.backToDeployments);
    
    // REMOVED: add-connection-btn and add-static-prop-btn (moved to loadDeploymentIntoBuilder)
    
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
        
    } catch (error) {
        console.error('Failed to initialize app:', error);
        UIUtils.showToast('Failed to load configuration. Please refresh the page.', 'error');
    }
});