/**
 * Inspector App - Main Entry Point
 * Initializes config, header, and router
 */

let appConfig = null;

/**
 * Load configuration from /config.json
 */
async function loadConfig() {
    try {
        const response = await fetch('/config.json');
        if (!response.ok) {
            throw new Error(`Failed to load config: ${response.status} ${response.statusText}`);
        }
        appConfig = await response.json();
        console.log('Config loaded:', appConfig);
        return appConfig;
    } catch (error) {
        console.error('Error loading config:', error);
        // For development, use a default config if file not found
        if (error.message.includes('404')) {
            console.warn('Config file not found, using default config');
            appConfig = {
                API_ENDPOINT: 'http://localhost:3000' // Default for local development
            };
            return appConfig;
        }
        throw error;
    }
}

/**
 * Initialize the application
 */
async function initializeApp() {
    const container = document.getElementById('app-container');
    
    try {
        // Show loading state
        container.innerHTML = '<div class="loading">Loading Inspector...</div>';
        
        console.log('Step 1: Loading config...');
        // Load config
        await loadConfig();
        console.log('Config loaded successfully');
        
        console.log('Step 2: Initializing router...');
        // Initialize router (from router.js)
        if (typeof initRouter === 'function') {
            initRouter();
            console.log('Router initialized successfully');
        } else {
            throw new Error('Router initialization function not found');
        }
        
        console.log('Inspector app initialized successfully');
        
    } catch (error) {
        console.error('Failed to initialize app:', error);
        console.error('Error stack:', error.stack);
        container.innerHTML = `
            <div class="error-container">
                <h2>Failed to Initialize Application</h2>
                <p><strong>Error:</strong> ${error.message}</p>
                <p><strong>Check browser console for details</strong></p>
                <button onclick="location.reload()">Retry</button>
            </div>
        `;
    }
}

/**
 * Get API endpoint from config
 */
function getApiEndpoint() {
    if (!appConfig || !appConfig.API_ENDPOINT) {
        console.error('API_ENDPOINT not found in config');
        return '';
    }
    return appConfig.API_ENDPOINT;
}

// Start the app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}