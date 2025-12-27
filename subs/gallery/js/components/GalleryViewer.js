/**
 * GalleryViewer Component
 * 
 * PhotoSwipe 4 integration for viewing photos in a lightbox
 */

import { fetchImages } from '../utils/images-api.js';
import { getPhotoTypeLabel, getSeasonLabel, formatDate } from '../utils/images-config.js';

/**
 * Render gallery grid
 * @param {HTMLElement} container - Container element
 * @param {Array} photos - Array of photo objects
 * @param {Function} onPhotoClick - Click callback
 */
export function renderGalleryGrid(container, photos, onPhotoClick) {
  if (!photos || photos.length === 0) {
    container.innerHTML = `
      <div class="gallery-empty">
        <div class="empty-icon">🖼️</div>
        <h3>No Photos Found</h3>
        <p>There are no photos in this gallery yet.</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = `
    <div class="gallery-grid">
      ${photos.map((photo, index) => `
        <div class="gallery-item" data-index="${index}">
          <img 
            src="${photo.thumb_cloudfront_url || photo.cloudfront_url}" 
            alt="${photo.caption || photo.photo_id}"
            class="gallery-thumb"
            loading="lazy"
          />
          ${photo.caption ? `
            <div class="gallery-caption">${photo.caption}</div>
          ` : ''}
        </div>
      `).join('')}
    </div>
  `;
  
  // Attach click handlers
  container.querySelectorAll('.gallery-item').forEach(item => {
    item.addEventListener('click', () => {
      const index = parseInt(item.dataset.index);
      if (onPhotoClick) {
        onPhotoClick(index);
      }
    });
  });
}

/**
 * Initialize PhotoSwipe gallery
 * @param {Array} photos - Array of photo objects
 * @param {number} index - Starting index
 * @returns {Object} PhotoSwipe instance
 */
export function initPhotoSwipe(photos, index = 0) {
  // Build items array for PhotoSwipe
  const items = photos.map(photo => ({
    src: photo.cloudfront_url,
    w: photo.metadata?.width || 1200,
    h: photo.metadata?.height || 800,
    title: buildPhotoTitle(photo)
  }));
  
  // PhotoSwipe options
  const options = {
    index: index,
    bgOpacity: 0.9,
    showHideOpacity: true,
    loop: true,
    pinchToClose: true,
    closeOnScroll: false,
    closeOnVerticalDrag: true,
    mouseUsed: false,
    escKey: true,
    arrowKeys: true,
    history: false,
    shareEl: false,
    fullscreenEl: true,
    zoomEl: true,
    counterEl: true,
    arrowEl: true,
    preloaderEl: true,
    tapToClose: false,
    tapToToggleControls: true,
    clickToCloseNonZoomable: false
  };
  
  // Get PhotoSwipe element
  const pswpElement = document.querySelector('.pswp');
  
  if (!pswpElement) {
    console.error('PhotoSwipe element not found');
    return null;
  }
  
  // Initialize PhotoSwipe
  const gallery = new PhotoSwipe(pswpElement, PhotoSwipeUI_Default, items, options);
  
  // Start gallery
  gallery.init();
  
  return gallery;
}

/**
 * Build photo title for PhotoSwipe
 * @param {Object} photo - Photo object
 * @returns {string} HTML title
 */
function buildPhotoTitle(photo) {
  const parts = [];
  
  if (photo.caption) {
    parts.push(`<strong>${photo.caption}</strong>`);
  }
  
  if (photo.tags && photo.tags.length > 0) {
    parts.push(`Tags: ${photo.tags.join(', ')}`);
  }
  
  parts.push(`Uploaded: ${formatDate(photo.upload_date)}`);
  
  return parts.join(' • ');
}

/**
 * Render gallery header
 * @param {HTMLElement} container - Container element
 * @param {string} photoType - Photo type
 * @param {string} season - Season
 * @param {number} count - Photo count
 */
export function renderGalleryHeader(container, photoType, season, count) {
  container.innerHTML = `
    <div class="gallery-header">
      <div class="gallery-info">
        <h2>
          ${getPhotoTypeLabel(photoType)} - ${getSeasonLabel(season)}
        </h2>
        <p class="gallery-count">${count} photo${count !== 1 ? 's' : ''}</p>
      </div>
      <button class="back-btn" id="back-btn">
        ← Back to Images
      </button>
    </div>
  `;
}

/**
 * Load more photos for infinite scroll
 * @param {string} photoType - Photo type
 * @param {string} season - Season
 * @param {string} nextToken - Pagination token
 * @returns {Promise<Object>} Response with photos and next token
 */
export async function loadMorePhotos(photoType, season, nextToken) {
  const filters = {
    photo_type: photoType,
    season: season,
    limit: 20
  };
  
  if (nextToken) {
    filters.next_token = nextToken;
  }
  
  return await fetchImages(filters);
}

/**
 * Create PhotoSwipe HTML structure (call once on page load)
 * @returns {HTMLElement} PhotoSwipe element
 */
export function createPhotoSwipeElement() {
  const pswpElement = document.createElement('div');
  pswpElement.className = 'pswp';
  pswpElement.setAttribute('tabindex', '-1');
  pswpElement.setAttribute('role', 'dialog');
  pswpElement.setAttribute('aria-hidden', 'true');
  
  pswpElement.innerHTML = `
    <div class="pswp__bg"></div>
    <div class="pswp__scroll-wrap">
      <div class="pswp__container">
        <div class="pswp__item"></div>
        <div class="pswp__item"></div>
        <div class="pswp__item"></div>
      </div>
      
      <div class="pswp__ui pswp__ui--hidden">
        <div class="pswp__top-bar">
          <div class="pswp__counter"></div>
          <button class="pswp__button pswp__button--close" title="Close (Esc)"></button>
          <button class="pswp__button pswp__button--fs" title="Toggle fullscreen"></button>
          <button class="pswp__button pswp__button--zoom" title="Zoom in/out"></button>
          <div class="pswp__preloader">
            <div class="pswp__preloader__icn">
              <div class="pswp__preloader__cut">
                <div class="pswp__preloader__donut"></div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="pswp__share-modal pswp__share-modal--hidden pswp__single-tap">
          <div class="pswp__share-tooltip"></div>
        </div>
        
        <button class="pswp__button pswp__button--arrow--left" title="Previous (arrow left)"></button>
        <button class="pswp__button pswp__button--arrow--right" title="Next (arrow right)"></button>
        
        <div class="pswp__caption">
          <div class="pswp__caption__center"></div>
        </div>
      </div>
    </div>
  `;
  
  return pswpElement;
}
