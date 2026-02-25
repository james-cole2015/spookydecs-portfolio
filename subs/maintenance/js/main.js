// Main application entry point

import { initRouter } from './router.js';
import { appState } from './state.js';

class MaintenanceApp {
  constructor() {
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;

    try {
      // Initialize header
      this.initHeader();

      // Initialize toast notifications
      this.initToast();

      // Initialize router
      console.log('Initializing router...');
      initRouter();

      // Load initial data
      console.log('Loading initial data...');
      await appState.loadAllRecords();
      console.log('Initial data loaded successfully');

      // Load items in background for class/season filtering
      appState.loadAllItems();

      // Set up global error handler
      window.addEventListener('error', (event) => {
        console.error('Global error:', event.error);
        this.showError('An unexpected error occurred');
      });

      // Set up unhandled promise rejection handler
      window.addEventListener('unhandledrejection', (event) => {
        console.error('Unhandled promise rejection:', event.reason);
        this.showError('An unexpected error occurred');
      });

      this.initialized = true;
      console.log('App initialized successfully');

    } catch (error) {
      console.error('Failed to initialize app:', error);
      this.showError('Failed to initialize application');
    }
  }

  initHeader() {
    console.log('Header loaded via custom element');
  }

  initToast() {
    if (window.toast) {
      console.log('Toast notifications initialized');
    } else {
      console.warn('Toast component not available');
      window.toast = {
        success: (title, message) => alert(`${title}: ${message}`),
        error: (title, message) => alert(`${title}: ${message}`),
        info: (title, message) => alert(`${title}: ${message}`)
      };
    }
  }

  showError(message) {
    if (window.toast) {
      window.toast.error('Error', message);
    } else {
      alert('Error: ' + message);
    }
  }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    const app = new MaintenanceApp();
    app.init();
  });
} else {
  const app = new MaintenanceApp();
  app.init();
}