/**
 * Router Setup
 * Client-side routing using Navigo
 */

import { renderStorageList } from '../pages/storage-list.js';
import { renderStorageDetail } from '../pages/storage-detail.js';
import { renderCreateWizard } from '../pages/storage-create.js';
import { renderPackingWizard } from '../pages/packing-wizard.js';
import { renderTotePackPage } from '../pages/storage-pack.js';
import { renderEditForm } from '../pages/storage-edit.js';
import { renderStorageLanding } from '../pages/storage-landing.js';
import { renderStorageStatistics } from '../pages/storage-statistics.js';

let router;

/**
 * Initialize router
 */
export function initRouter() {
  // Use global Navigo (loaded via script tag in index.html)
  router = new window.Navigo('/', { hash: false });

  router
    .on('/', () => {
      renderStorageLanding();
    })
    .on('/storage', () => {
      renderStorageList();
    })
    .on('/new', () => {
      renderCreateWizard();
    })
    .on('/storage/create', () => {
      renderCreateWizard();
    })
    .on('/statistics', () => {
      renderStorageStatistics();
    })
    .on('/storage/pack', () => {
      renderPackingWizard();
    })
    .on('/storage/:id/pack', ({ data }) => {
      renderTotePackPage(data.id);
    })
    .on('/storage/:id/edit', ({ data }) => {
      renderEditForm(data.id);
    })
    .on('/storage/:id', ({ data }) => {
      // Only match if id doesn't look like a reserved route
      if (data.id === 'create' || data.id === 'pack') {
        return false; // Don't handle, let other routes match
      }
      renderStorageDetail(data.id);
    })
    .notFound(() => {
      console.log('Route not found, redirecting to /');
      navigate('/');
    });

  // Important: Call resolve() to trigger initial route matching
  router.resolve();

  return router;
}

/**
 * Navigate to a route
 */
export function navigate(path) {
  if (router) {
    router.navigate(path);
  } else {
    console.error('Router not initialized');
  }
}

/**
 * Get current route
 */
export function getCurrentRoute() {
  return router ? router.getCurrentLocation() : null;
}

export default { initRouter, navigate, getCurrentRoute };
