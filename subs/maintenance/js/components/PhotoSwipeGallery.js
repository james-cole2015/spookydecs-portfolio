// PhotoSwipe gallery component for viewing maintenance record photos

export class PhotoSwipeGallery {
  constructor(attachments) {
    this.attachments = attachments || {
      before_photos: [],
      after_photos: [],
      documentation: []
    };
    
    this.photos = this.combinePhotos();
    this.lightbox = null;
  }
  
  combinePhotos() {
    const photos = [];
    
    (this.attachments.before_photos || []).forEach(url => {
      photos.push({ 
        url, 
        type: 'Before', 
        color: '#3B82F6',
        src: url,
        width: 0,  // PhotoSwipe will auto-detect
        height: 0
      });
    });
    
    (this.attachments.after_photos || []).forEach(url => {
      photos.push({ 
        url, 
        type: 'After', 
        color: '#10B981',
        src: url,
        width: 0,
        height: 0
      });
    });
    
    (this.attachments.documentation || []).forEach(url => {
      photos.push({ 
        url, 
        type: 'Documentation', 
        color: '#6B7280',
        src: url,
        width: 0,
        height: 0
      });
    });
    
    return photos;
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
        <img src="${photo.url}" alt="${photo.type} photo">
        <div class="thumbnail-badge" style="background-color: ${photo.color}">
          ${photo.type}
        </div>
      </div>
    `).join('');
  }
  
  attachEventListeners(container) {
    // Check if PhotoSwipe is available (UMD global)
    if (typeof PhotoSwipeLightbox === 'undefined' || typeof PhotoSwipe === 'undefined') {
      console.error('PhotoSwipe library not loaded - make sure photoswipe UMD scripts are loaded in HTML');
      return;
    }
    
    const galleryElement = container.querySelector('#photoswipe-gallery');
    if (!galleryElement) return;
    
    // Initialize PhotoSwipe lightbox using UMD globals
    this.lightbox = new PhotoSwipeLightbox({
      gallery: galleryElement,
      children: '.gallery-thumbnail',
      pswpModule: PhotoSwipe, // Use the global PhotoSwipe from UMD script
      bgOpacity: 0.95,
      padding: { top: 50, bottom: 50, left: 50, right: 50 }
    });
    
    // Provide data source dynamically
    this.lightbox.on('contentLoad', (e) => {
      const index = e.index;
      const photo = this.photos[index];
      
      e.content = {
        src: photo.url,
        width: 1200,
        height: 900
      };
    });
    
    // Add custom caption with photo type
    this.lightbox.on('uiRegister', () => {
      this.lightbox.pswp.ui.registerElement({
        name: 'photo-type-caption',
        order: 9,
        isButton: false,
        appendTo: 'root',
        html: '',
        onInit: (el, pswp) => {
          pswp.on('change', () => {
            const photo = this.photos[pswp.currIndex];
            
            if (photo) {
              el.innerHTML = `
                <div class="pswp__caption" style="
                  position: absolute;
                  bottom: 20px;
                  left: 50%;
                  transform: translateX(-50%);
                  background: rgba(0, 0, 0, 0.7);
                  color: white;
                  padding: 8px 16px;
                  border-radius: 20px;
                  font-size: 14px;
                  font-weight: 500;
                  pointer-events: none;
                ">
                  <span style="
                    display: inline-block;
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    background-color: ${photo.color};
                    margin-right: 8px;
                  "></span>
                  ${photo.type}
                </div>
              `;
            }
          });
        }
      });
    });
    
    // Initialize the lightbox
    this.lightbox.init();
  }
  
  openGallery(index = 0) {
    if (!this.lightbox) {
      console.error('PhotoSwipe lightbox not initialized');
      return;
    }
    
    this.lightbox.loadAndOpen(index);
  }
  
  destroy() {
    if (this.lightbox) {
      this.lightbox.destroy();
      this.lightbox = null;
    }
  }
}
