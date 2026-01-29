// items/js/app.js
// Main Application Entry Point
// Initializes router and page handlers

import { initRouter } from './utils/router.js';
import { renderItemsList } from './pages/items-list.js';
import { renderItemDetail } from './pages/item-detail.js';
import { renderItemForm } from './pages/item-form.js';
import { renderItemEdit } from './pages/item-edit.js';

// Initialize router with routes
// IMPORTANT: Specific routes MUST come before parameterized routes
document.addEventListener('DOMContentLoaded', () => {
  initRouter({
    '/': () => renderItemsList(),
    '/create': () => renderItemForm(),                    // Must be before /:id
    '/:id/edit': ({ data }) => renderItemEdit(data.id),  // Must be before /:id
    '/:id': ({ data }) => renderItemDetail(data.id)      // Catch-all last
  });
});