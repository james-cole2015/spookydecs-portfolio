/**
 * Router Configuration
 * 
 * Handles all client-side routing using Navigo
 * CloudFront redirects 404/403 to /index.html for SPA support
 */

import Navigo from 'https://cdn.jsdelivr.net/npm/navigo@8.11.1/lib/navigo.min.js';
import { renderImagesList } from '../pages/images-list.js';
import { renderImageDetail } from '../pages/image-detail.js';
import { renderImageUpload } from '../pages/image-upload.js';
import { renderImageEdit } from '../pages/image-edit.js';
import { renderGalleryViewer } from '../pages/gallery-viewer.js';

let router = null;

/**
 * Initialize the router with all route definitions
 */
export function initRouter() {
  // Create router instance
  router = new Navigo('/', { hash: false });
  
  // Define routes
  router
    // Gallery viewer - must come before :photo_id to avoid conflicts
    .on('/images/gallery/:photo_type/:season', ({ data }) => {
      console.log('Route: Gallery viewer', data);
      renderGalleryViewer(data.photo_type, data.season);
    })
    
    // Upload page
    .on('/images/upload', () => {
      console.log('Route: Upload');
      renderImageUpload();
    })
    
    // Edit page
    .on('/images/:photo_id/edit', ({ data }) => {
      console.log('Route: Edit', data.photo_id);
      renderImageEdit(data.photo_id);
    })
    
    // Detail page
    .on('/images/:photo_id', ({ data }) => {
      console.log('Route: Detail', data.photo_id);
      renderImageDetail(data.photo_id);
    })
    
    // List page (default)
    .on('/images', () => {
      console.log('Route: List');
      renderImagesList();
    })
    
    // Root redirect
    .on('/', () => {
      console.log('Route: Root -> redirecting to /images');
      router.navigate('/images');
    })
    
    // Not found handler
    .notFound(() => {
      console.log('Route: Not found -> redirecting to /images');
      router.navigate('/images');
    });
  
  // Resolve current route
  router.resolve();
  
  console.log('Router initialized');
}

/**
 * Navigate to a new route programmatically
 * @param {string} path - Path to navigate to
 */
export function navigate(path) {
  if (!router) {
    console.error('Router not initialized');
    return;
  }
  
  router.navigate(path);
}

/**
 * Get current route information
 * @returns {Object} Current route data
 */
export function getCurrentRoute() {
  if (!router) {
    return null;
  }
  
  return router.getCurrentLocation();
}

/**
 * Update URL without triggering route change
 * Useful for updating query parameters
 * @param {string} url - New URL
 */
export function updateURL(url) {
  window.history.pushState({}, '', url);
}

/**
 * Get router instance (for debugging)
 * @returns {Navigo} Router instance
 */
export function getRouter() {
  return router;
}
