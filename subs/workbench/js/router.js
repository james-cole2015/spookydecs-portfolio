// Workbench Router Module
// Handles all routing with Navigo (loaded via script tag in index.html)

import { renderKanban } from './kanban-view.js';
import { renderDetail } from './detail-view.js';
import { renderCreateSeason } from './create-season-view.js';
import { getCurrentSeason } from './utils.js';
import { toast } from './toast.js';

let router = null;

export function initRouter() {
  // Navigo is loaded globally via script tag
  router = new window.Navigo('/', { hash: true });

  // Define routes
  router
    .on('/', () => {
      // Redirect to current season kanban
      const currentSeason = getCurrentSeason();
      navigateTo(`/season/${currentSeason}`);
    })
    .on('/workbench', () => {
      // Also redirect to current season
      const currentSeason = getCurrentSeason();
      navigateTo(`/season/${currentSeason}`);
    })
    .on('/season/:seasonId', async (match) => {
      const { seasonId } = match.data;
      try {
        await renderKanban(seasonId);
      } catch (error) {
        console.error('Error rendering kanban:', error);
        toast.error('Failed to load workbench');
      }
    })
    .on('/season/:seasonId/item/:itemId', async (match) => {
      const { seasonId, itemId } = match.data;
      try {
        await renderDetail(seasonId, itemId);
      } catch (error) {
        console.error('Error rendering detail:', error);
        toast.error('Failed to load item details');
      }
    })
    .on('/create-season', async () => {
      try {
        await renderCreateSeason();
      } catch (error) {
        console.error('Error rendering create season:', error);
        toast.error('Failed to load season creation form');
      }
    })
    .notFound(() => {
      toast.error('Page not found');
      navigateTo('/');
    });

  // Resolve initial route
  router.resolve();

  return router;
}

export function navigateTo(path) {
  if (router) {
    router.navigate(path);
  }
}

export function goBack() {
  window.history.back();
}

export function getRouter() {
  return router;
}

// Helper to get current route params
export function getCurrentRoute() {
  return router ? router.getCurrentLocation() : null;
}