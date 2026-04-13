// App Entry Point

import { initRouter } from './utils/router.js';

console.log('App.js loaded');

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
  if (!window.SpookyAuth.enforceEnvAccess()) return;
  console.log('DOM ready, initializing app...');
  console.log('Current pathname:', window.location.pathname);
  
  // Initialize the router - it will handle loading the correct page
  console.log('🚀 Initializing router...');
  initRouter();
  
  console.log('App initialized');
});