// Main App Entry Point
import { initRouter } from './utils/router.js';
import { renderImagesList } from './pages/images-list.js';
import { renderImageDetail } from './pages/image-detail.js';
import { renderImageUpload } from './pages/image-upload.js';
import { renderPhotoBrowser } from './pages/photo-browser.js';
import { renderGalleryManager } from './pages/gallery-manager.js';

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await window.SpookyConfig.get();

    const router = initRouter({
      '/images': renderImagesList,
      '/images/gallery': renderGalleryManager,
      '/images/browse': renderPhotoBrowser,
      '/images/upload': renderImageUpload,
      '/images/:photoId': renderImageDetail,
      '/images/:photoId/edit': renderImageDetail
    });

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