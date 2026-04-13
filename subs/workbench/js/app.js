// Main Application Entry Point

import { initRouter } from './router.js';
import { toast } from './toast.js';

// Global state
export const appState = {
  user: {
    name: 'SpookyDecs Ent',
    role: 'Admin'
  }
};

async function initApp() {
  if (!window.SpookyAuth.enforceEnvAccess()) return;
  try {
    initRouter();
  } catch (error) {
    console.error('Failed to initialize app:', error);
    toast.error('Failed to initialize application. Please refresh the page.');
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

// Export for debugging
window.appState = appState;