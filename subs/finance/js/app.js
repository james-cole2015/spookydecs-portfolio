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
  
  // Check if this is an item or cost detail route
  const pathParts = path.split('/').filter(Boolean);
  
  // Routes:
  // / or /finance → FinanceMainPage
  // /finance/new or /new → NewCostRecordPage  
  // /{item_id} → Item costs (handled by router)
  // /{item_id}/{cost_id} → Cost detail (handled by router)
  
  if (pathParts.length === 0 || (pathParts.length === 1 && pathParts[0] === 'finance')) {
    // Main finance page
    console.log('Route: Main finance page');
    new FinanceMainPage();
  } else if (path === '/new' || path === '/finance/new') {
    // New cost form
    console.log('Route: New cost form');
    new NewCostRecordPage();
  } else if (pathParts.length >= 1) {
    // Item costs or cost detail - let the router handle it
    console.log('Route: Item/Cost detail, initializing router');
    initItemRouter();
  } else {
    // Unknown route - redirect to main
    console.log('Unknown route, redirecting to /finance');
    window.location.href = '/finance';
  }
  
  console.log('App initialized');
});