// App Entry Point

import { initRouter } from './utils/router.js';
import { FinanceMainPage } from './pages/finance-main.js';
import { NewCostRecordPage } from './pages/new-cost-record.js';

console.log('App.js loaded');

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM ready, initializing app...');
  console.log('Current pathname:', window.location.pathname);
  
  // Initialize router
  const router = initRouter({
    '/finance': () => {
      console.log('Route /finance matched, creating FinanceMainPage');
      new FinanceMainPage();
    },
    '/finance/costs/new-record': () => {
      console.log('Route /finance/costs/new-record matched, creating NewCostRecordPage');
      new NewCostRecordPage();
    }
  });

  // If we're at root, redirect to /finance
  if (window.location.pathname === '/') {
    console.log('At root, navigating to /finance');
    router.navigate('/finance');
  }
  
  console.log('Router initialized');
});