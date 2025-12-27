/**
 * Images Management Subdomain - Main Entry Point
 * 
 * Responsibilities:
 * - Load configuration from /config.json
 * - Initialize router
 * - Set up global error handlers
 * - Provide global config access via window.appConfig
 */

import { initRouter } from './utils/router.js';
import { showToast } from './shared/toast.js';

// Global config object
let config = null;

/**
 * Load application configuration from /config.json
 * @returns {Promise<Object>} Configuration object
 */
async function loadConfig() {
  try {
    const response = await fetch('/config.json');
    
    if (!response.ok) {
      throw new Error(`Failed to load config: ${response.status}`);
    }
    
    const configData = await response.json();
    
    // Validate required config fields
    if (!configData.API_ENDPOINT) {
      throw new Error('Missing required config field: API_ENDPOINT');
    }
    
    return configData;
  } catch (error) {
    console.error('Error loading config:', error);
    showToast('Failed to load application configuration', 'error');
    throw error;
  }
}

/**
 * Initialize the application
 * - Load config
 * - Set up global error handlers
 * - Initialize router
 */
async function init() {
  try {
    // Show loading state
    showLoadingScreen();
    
    // Load configuration
    config = await loadConfig();
    
    // Make config globally available
    window.appConfig = config;
    
    console.log('Config loaded:', config);
    
    // Set up global error handlers
    setupErrorHandlers();
    
    // Initialize router
    initRouter();
    
    // Hide loading screen
    hideLoadingScreen();
    
  } catch (error) {
    console.error('Application initialization failed:', error);
    showErrorScreen(error.message);
  }
}

/**
 * Set up global error handlers
 */
function setupErrorHandlers() {
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    showToast('An unexpected error occurred', 'error');
  });
  
  // Handle global errors
  window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
  });
}

/**
 * Show loading screen while app initializes
 */
function showLoadingScreen() {
  const loadingHTML = `
    <div id="app-loading" style="
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #1a1a1a;
      color: #fff;
      z-index: 9999;
    ">
      <div style="text-align: center;">
        <div class="spinner" style="
          border: 3px solid rgba(255, 255, 255, 0.1);
          border-top: 3px solid #ff6b35;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
          margin: 0 auto 20px;
        "></div>
        <p>Loading SpookyDecs Images...</p>
      </div>
    </div>
    <style>
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    </style>
  `;
  
  document.body.insertAdjacentHTML('beforeend', loadingHTML);
}

/**
 * Hide loading screen
 */
function hideLoadingScreen() {
  const loadingElement = document.getElementById('app-loading');
  if (loadingElement) {
    loadingElement.remove();
  }
}

/**
 * Show error screen if initialization fails
 */
function showErrorScreen(message) {
  hideLoadingScreen();
  
  const errorHTML = `
    <div id="app-error" style="
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #1a1a1a;
      color: #fff;
      padding: 20px;
    ">
      <div style="max-width: 500px; text-align: center;">
        <h1 style="color: #ff6b35; margin-bottom: 20px;">⚠️ Error</h1>
        <p style="margin-bottom: 20px;">${message}</p>
        <button onclick="window.location.reload()" style="
          background: #ff6b35;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 16px;
        ">
          Reload Page
        </button>
      </div>
    </div>
  `;
  
  document.body.innerHTML = errorHTML;
}

// Start the application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Export for debugging
export { config };
