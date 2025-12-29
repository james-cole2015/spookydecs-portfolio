// App Entry Point

import { initRouter } from './utils/router.js';
import { FinanceMainPage } from './pages/finance-main.js';

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
  // Initialize router
  const router = initRouter({
    '/finance': () => {
      new FinanceMainPage();
    }
  });

  // If we're at root, redirect to /finance
  if (window.location.pathname === '/') {
    router.navigate('/finance');
  }
});
