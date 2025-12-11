/**
 * Main Application Entry Point
 * Initializes all modules and coordinates app startup
 */

import { initTabs } from './tabs.js';
import { initFilters } from './filters.js';
import { initUI } from './ui.js';
import { loadPhotos, loadStats } from './photos.js';
import { getState } from './state.js';
import { showToast } from './ui.js';

/**
 * Wait for config to be loaded
 */
async function waitForConfig() {
  // If config already loaded, return immediately
  if (window.config && window.config.API_ENDPOINT) {
    return window.config;
  }
  
  // Wait for config to load (max 5 seconds)
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const maxAttempts = 50; // 5 seconds (50 * 100ms)
    
    const checkConfig = setInterval(() => {
      attempts++;
      
      if (window.config && window.config.API_ENDPOINT) {
        clearInterval(checkConfig);
        resolve(window.config);
      } else if (attempts >= maxAttempts) {
        clearInterval(checkConfig);
        reject(new Error('Configuration failed to load'));
      }
    }, 100);
  });
}

/**
 * Initialize the application
 */
async function initApp() {
  console.log('[App] Starting application initialization...');
  
  try {
    // Wait for config to be loaded
    console.log('[App] Waiting for config...');
    await waitForConfig();
    console.log('[App] Config loaded:', window.config.API_ENDPOINT);
    
    // Initialize UI components
    initUI();
    console.log('[App] ✓ UI initialized');
    
    // Initialize tabs
    initTabs();
    console.log('[App] ✓ Tabs initialized');
    
    // Initialize filters
    initFilters();
    console.log('[App] ✓ Filters initialized');
    
    // Load initial data
    console.log('[App] Loading initial data...');
    
    // Load stats
    try {
      await loadStats();
      console.log('[App] ✓ Stats loaded');
    } catch (error) {
      console.error('[App] Failed to load stats:', error);
      showToast('Failed to load statistics', 'warning');
    }
    
    // Load photos for current tab
    try {
      const state = getState();
      console.log('[App] Loading photos for tab:', state.currentTab);
      await loadPhotos();
      console.log('[App] ✓ Photos loaded');
    } catch (error) {
      console.error('[App] Failed to load photos:', error);
      showToast(`Failed to load photos: ${error.message}`, 'error');
    }
    
    console.log('[App] ✅ Application initialized successfully');
    
  } catch (error) {
    console.error('[App] ❌ Application initialization failed:', error);
    showToast(`App initialization failed: ${error.message}`, 'error');
  }
}

/**
 * Setup error handlers
 */
function setupErrorHandlers() {
  // Global error handler
  window.addEventListener('error', (event) => {
    console.error('[App] Global error:', event.error);
  });
  
  // Unhandled promise rejection handler
  window.addEventListener('unhandledrejection', (event) => {
    console.error('[App] Unhandled promise rejection:', event.reason);
  });
}

/**
 * Wait for DOM to be ready, then initialize
 */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setupErrorHandlers();
    initApp();
  });
} else {
  // DOM already loaded
  setupErrorHandlers();
  initApp();
}

// Export for debugging
window.appDebug = {
  getState,
  loadPhotos,
  loadStats
};