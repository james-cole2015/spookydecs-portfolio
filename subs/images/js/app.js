// Main App Entry Point
import { initRouter } from './utils/router.js';
import { renderLandingPage } from './pages/landing.js';
import { renderImagesList } from './pages/images-list.js';
import { renderImageDetail } from './pages/image-detail.js';
import { renderPhotoBrowser } from './pages/photo-browser.js';
import { renderGalleryManager } from './pages/gallery-manager.js';
import { renderItemsPage } from './pages/items.js';
import { renderEntitiesPage } from './pages/entities.js';
import { renderEntityDetail } from './pages/entity-detail.js';

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await window.SpookyConfig.get();

    // Routes registered in order — specific paths must precede generic /:param routes
    const router = initRouter([
      { path: '/images',              handler: renderLandingPage },
      { path: '/images/list',         handler: renderImagesList },
      { path: '/images/gallery',      handler: renderGalleryManager },
      { path: '/images/browse',       handler: renderPhotoBrowser },
      { path: '/images/items',            handler: renderItemsPage },
      { path: '/images/entities',         handler: renderEntitiesPage },
      { path: '/images/entities/:id',     handler: renderEntityDetail },
      { path: '/images/:photoId/edit',    handler: renderImageDetail },
      { path: '/images/:photoId',     handler: renderImageDetail }
    ]);

    console.log('Images app initialized');
  } catch (error) {
    console.error('Failed to initialize app:', error);
    document.getElementById('app').innerHTML = `
      <div class="error-state">
        <h2>Failed to Load</h2>
        <p>Could not load application configuration.</p>
        <p>Please refresh the page and try again.</p>
      </div>
    `;
  }
});
