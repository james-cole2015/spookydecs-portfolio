/**
 * Gallery Viewer Page
 * 
 * PhotoSwipe 4 gallery for viewing photos
 * Will be implemented in Phase 5
 */

/**
 * Render the gallery viewer page
 * @param {string} photoType - Photo type
 * @param {string} season - Season
 */
export async function renderGalleryViewer(photoType, season) {
  console.log('Rendering gallery viewer:', photoType, season);
  
  const app = document.getElementById('app');
  
  app.innerHTML = `
    <div class="gallery-viewer-page">
      <header class="page-header">
        <h1>🖼️ Gallery Viewer</h1>
      </header>
      
      <div class="placeholder">
        <p>Gallery Viewer Page - Coming in Phase 5</p>
        <p>Photo Type: ${photoType}</p>
        <p>Season: ${season}</p>
        <button onclick="history.back()" class="btn-primary">← Back to List</button>
      </div>
    </div>
  `;
}
