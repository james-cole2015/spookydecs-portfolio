// App Entry Point

import { initRouter as initItemRouter } from './utils/router.js';
import { FinanceMainPage } from './pages/finance-main.js';
import { NewCostRecordPage } from './pages/new-cost-record.js';

console.log('App.js loaded');

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM ready, initializing app...');
  console.log('Current pathname:', window.location.pathname);
  
  const path = window.location.pathname;
  const appContainer = document.getElementById('app-container');
  const mainContent = document.getElementById('main-content');
  
  // Check if this is an item or cost detail route
  const pathParts = path.split('/').filter(Boolean);
  
  // Routes:
  // / or /finance → FinanceMainPage
  // /new → NewCostRecordPage  
  // /costs/{cost_id} → Cost detail (handled by router)
  // /{item_id} or /{idea_id} or /{record_id} → Aggregated costs (handled by router)
  
  if (pathParts.length === 0 || (pathParts.length === 1 && pathParts[0] === 'finance')) {
    // Main finance page - show app-container, hide main-content
    console.log('Route: Main finance page');
    if (appContainer) appContainer.style.display = 'block';
    if (mainContent) mainContent.style.display = 'none';
    new FinanceMainPage();
  } else if (path === '/new') {
    // New cost form - show app-container, hide main-content
    console.log('Route: New cost form');
    if (appContainer) appContainer.style.display = 'block';
    if (mainContent) mainContent.style.display = 'none';
    new NewCostRecordPage();
  } else if (pathParts.length >= 1) {
    // Cost detail, item costs, idea costs, or record costs - hide app-container, show main-content
    console.log('Route: Cost detail / Item-Idea-Record costs, initializing router');
    if (appContainer) appContainer.style.display = 'none';
    if (mainContent) mainContent.style.display = 'block';
    initItemRouter();
  } else {
    // Unknown route - redirect to main
    console.log('Unknown route, redirecting to /finance');
    window.location.href = '/finance';
  }
  
  console.log('App initialized');
});