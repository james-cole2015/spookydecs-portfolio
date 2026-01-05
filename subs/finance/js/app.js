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
  
  // Main page (/) uses app-container, all other routes use main-content
  if (path === '/') {
    console.log('Route: Main page - showing app-container');
    if (appContainer) appContainer.style.display = 'block';
    if (mainContent) mainContent.style.display = 'none';
  } else {
    console.log('Route: Secondary page - showing main-content');
    if (appContainer) appContainer.style.display = 'none';
    if (mainContent) mainContent.style.display = 'block';
  }
  
  // Initialize the router - it will handle loading the correct page
  console.log('🚀 Initializing router...');
  initRouter();
  
  console.log('App initialized');
});