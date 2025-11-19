// Main Application Entry Point

// Event Listeners
function initEventListeners() {
    document.getElementById('start-decorating-btn').addEventListener('click', DeploymentManager.createDeployment);
    document.getElementById('refresh-deployments-btn').addEventListener('click', DeploymentManager.loadInProgressDeployments);
    
    document.getElementById('back-to-deployments-btn').addEventListener('click', DeploymentManager.backToDeployments);
    document.getElementById('add-connection-btn').addEventListener('click', ConnectionBuilder.addConnection);
    
    document.getElementById('source-item-selector').addEventListener('click', () => ItemSelector.openItemSelector('source'));
    document.getElementById('destination-item-selector').addEventListener('click', () => ItemSelector.openItemSelector('destination'));
    document.getElementById('close-modal-btn').addEventListener('click', ItemSelector.closeItemSelector);
    document.getElementById('modal-class-type').addEventListener('change', ItemSelector.filterItemsByClassType);
    document.getElementById('item-search').addEventListener('input', ItemSelector.searchItems);
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
        initEventListeners();
        
        DeploymentManager.loadInProgressDeployments();
        
    } catch (error) {
        console.error('Failed to initialize app:', error);
        UIUtils.showToast('Failed to load configuration. Please refresh the page.', 'error');
    }
});