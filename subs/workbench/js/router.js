// Workbench Router Module

import { renderSeasonalView } from './seasonal-view.js';
import { toast } from './toast.js';

let router = null;

export function initRouter() {
  router = new window.Navigo('/', { hash: true });

  router
    .on('/', async () => {
      try {
        await renderSeasonalView();
      } catch (error) {
        console.error('Error rendering seasonal view:', error);
        toast.error('Failed to load workbench');
      }
    })
    .notFound(() => {
      navigateTo('/');
    });

  router.resolve();
  return router;
}

export function navigateTo(path) {
  if (router) {
    router.navigate(path);
  }
}

export function getRouter() {
  return router;
}
