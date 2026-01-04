// App Entry Point

import { initRouter } from './utils/router.js';

console.log('App.js loaded');

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM ready, initializing app...');
  console.log('Current pathname:', window.location.pathname);
  
  const path = window.location.pathname;
  const appContainer = document.getElementById('app-container');
  const mainContent = document.getElementById('main-content');
  
  // Check which container to show based on route
  const pathParts = path.split('/').filter(Boolean);
  
  // Main finance page uses app-container, all other routes use main-content
  if (pathParts.length === 0 || (pathParts.length === 1 && pathParts[0] === 'finance')) {
    // Main finance page
    console.log('Route: Main finance page - showing app-container');
    if (appContainer) appContainer.style.display = 'block';
    if (mainContent) mainContent.style.display = 'none';
  } else {
    // All other routes (cost detail, item costs, new cost, etc.)
    console.log('Route: Secondary page - showing main-content');
    if (appContainer) appContainer.style.display = 'none';
    if (mainContent) mainContent.style.display = 'block';
  }
  
  // ALWAYS initialize the router - it will handle loading the correct page
  console.log('🚀 Initializing router...');
  initRouter();
  
  console.log('App initialized');
});