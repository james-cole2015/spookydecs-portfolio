/**
 * Storage Subdomain - Main Application Entry Point
 */

import { initRouter } from './utils/router.js';

/**
 * Initialize application
 */
function init() {
  // Initialize router (it imports and registers handlers internally)
  initRouter();
  
  console.log('Storage subdomain initialized');
}

/**
 * Loading indicator helpers
 */
export function showLoading() {
  const loading = document.getElementById('loading');
  if (loading) {
    loading.classList.remove('hidden');
  }
}

export function hideLoading() {
  const loading = document.getElementById('loading');
  if (loading) {
    loading.classList.add('hidden');
  }
}

/**
 * Error handler
 */
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  hideLoading();
});

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}