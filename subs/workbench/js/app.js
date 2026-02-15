// Main Application Entry Point

import { initRouter } from './router.js';
import { toast } from './toast.js';
import { spinner } from './spinner.js';

// Global state
export const appState = {
  currentSeason: null,
  seasons: [],
  user: {
    name: 'SpookyDecs Ent',
    role: 'Admin'
  }
};

async function initApp() {
  try {
    spinner.show('Initializing Workbench...');

    // Set up spookydecs-header
    const header = document.querySelector('spookydecs-header');
    if (header) {
      header.setAttribute('page-title', 'Workbench');
      header.setAttribute('user-name', appState.user.name);
      header.setAttribute('user-role', appState.user.role);
    }

    // Initialize router
    initRouter();

    spinner.hide();
  } catch (error) {
    spinner.hide();
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