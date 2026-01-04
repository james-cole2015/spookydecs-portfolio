// App Entry Point

import { initRouter } from './utils/router.js';

console.log('App.js loaded');

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM ready, initializing app...');
  console.log('Current pathname:', window.location.pathname);
  
  // ALWAYS initialize the router first
  console.log('🚀 Initializing router...');
  initRouter();
  
  console.log('App initialized');
});