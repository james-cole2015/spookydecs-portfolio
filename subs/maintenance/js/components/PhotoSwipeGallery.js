// PhotoSwipe gallery component for viewing maintenance record photos
// Uses PhotoSwipe v4 (loaded globally via script tags)

let pswpElement = null;

/**
 * PhotoSwipe Gallery Class
 * Accepts an array of photo objects: [{url, w, h, title, type, color}]
 */
export class PhotoSwipeGallery {
  constructor(photos) {
    // Expect a simple array of photos
    if (!Array.isArray(photos)) {
      console.error('PhotoSwipeGallery expects an array of photos');
      this.photos = [];
    } else {
      this.photos = photos;
    }
    
    this.lightbox = null;
  }
  
  render() {
    if (this.photos.length === 0) {
      return `
        <div class="photo-gallery-empty">
          <p>No photos available</p>
        </div>
      `;
    }
    
    return `
      <div class="photo-gallery">
        <div class="gallery-grid" id="photoswipe-gallery">
          ${this.renderThumbnails()}
        </div>
        
        <div class="gallery-info">
          ${this.photos.length} photo${this.photos.length !== 1 ? 's' : ''} • Click to view
        </div>
      </div>
    `;
  }
  
  renderThumbnails() {
    return this.photos.map((photo, index) => `
      <div 
        class="gallery-thumbnail" 
        data-index="${index}"
      >
        <img src="${photo.url}" alt="${photo.title || 'Photo'}">
        ${photo.type ? `
          <div class="thumbnail-badge" style="background-color: ${photo.color || '#6B7280'}">
            ${photo.type}
          </div>
        ` : ''}
      </div>
    `).join('');
  }
  
  attachEventListeners(container) {
    // Ensure PhotoSwipe v4 library is loaded
    if (typeof PhotoSwipe === 'undefined' || typeof PhotoSwipeUI_Default === 'undefined') {
      console.error('PhotoSwipe library not loaded');
      alert('Photo viewer not available. Please refresh the page.');
      return;
    }
    
    // Create PhotoSwipe element if it doesn't exist
    if (!pswpElement) {
      createPhotoSwipeElement();
    }
    
    // Attach click handlers to thumbnails
    const galleryElement = container.querySelector('#photoswipe-gallery');
    if (!galleryElement) return;
    
    const thumbnails = galleryElement.querySelectorAll('.gallery-thumbnail');
    thumbnails.forEach((thumbnail, index) => {
      thumbnail.addEventListener('click', () => {
        this.openGallery(index);
      });
    });
  }
  
  openGallery(startIndex = 0) {
    if (!pswpElement) {
      console.error('PhotoSwipe element not initialized');
      return;
    }
    
    // Format images for PhotoSwipe
    const galleryItems = this.photos.map(photo => ({
      src: photo.url,
      w: photo.w || 0,
      h: photo.h || 0,
      title: this.createPhotoCaption(photo)
    }));
    
    // PhotoSwipe options
    const options = {
      index: startIndex,
      bgOpacity: 0.95,
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
      clickToCloseNonZoomable: false,
      maxSpreadZoom: 2,
      getDoubleTapZoom: function(isMouseClick, item) {
        return item.initialZoomLevel < 1 ? 1 : 1.5;
      },
      barsSize: {top: 44, bottom: 'auto'},
      timeToIdle: 4000,
      timeToIdleOutside: 1000,
    };
    
    // Initialize PhotoSwipe
    const gallery = new PhotoSwipe(pswpElement, PhotoSwipeUI_Default, galleryItems, options);
    
    // Load image dimensions dynamically
    gallery.listen('gettingData', function(index, item) {
      if (!item.w || !item.h) {
        const img = new Image();
        img.onload = function() {
          item.w = this.width;
          item.h = this.height;
          gallery.updateSize(true);
        };
        img.src = item.src;
      }
    });
    
    // Open the gallery
    gallery.init();
    this.lightbox = gallery;
  }
  
  /**
   * Create a caption for the photo with type badge
   */
  createPhotoCaption(photo) {
    if (!photo.type && !photo.title) return '';
    
    let caption = '';
    
    if (photo.type) {
      const color = photo.color || '#6B7280';
      caption += `<span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: ${color}; margin-right: 8px;"></span>`;
      caption += `<strong>${photo.type}</strong>`;
    }
    
    if (photo.title && photo.type) {
      caption += ` - ${photo.title}`;
    } else if (photo.title) {
      caption += photo.title;
    }
    
    return caption;
  }
  
  destroy() {
    if (this.lightbox) {
      this.lightbox.close();
      this.lightbox = null;
    }
  }
}

/**
 * Create the PhotoSwipe DOM element (PhotoSwipe v4 structure)
 */
function createPhotoSwipeElement() {
  const pswpHTML = `
    <div class="pswp" tabindex="-1" role="dialog" aria-hidden="true">
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
    </div>
  `;

  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = pswpHTML;
  pswpElement = tempDiv.firstElementChild;
  document.body.appendChild(pswpElement);
}

/**
 * Helper function to prepare images from URLs
 * @param {Array} imageUrls - Array of image URL strings or objects
 * @param {string} category - Category/type for the images
 * @param {string} color - Color for the type badge
 * @returns {Array} Formatted image objects
 */
export function prepareImagesForGallery(imageUrls, category = '', color = '#6B7280') {
  if (!Array.isArray(imageUrls)) {
    return [];
  }

  return imageUrls.map((urlOrObj, index) => {
    const url = typeof urlOrObj === 'string' ? urlOrObj : urlOrObj.url;
    const title = typeof urlOrObj === 'object' ? urlOrObj.title : '';
    
    return {
      url: url,
      w: 0,  // Will be detected dynamically
      h: 0,  // Will be detected dynamically
      title: title || `Image ${index + 1}`,
      type: category,
      color: color
    };
  });
}
