// Photo carousel component for viewing maintenance record photos

export class PhotoCarousel {
  constructor(attachments) {
    this.attachments = attachments || {
      before_photos: [],
      after_photos: [],
      documentation: []
    };
    
    this.photos = this.combinePhotos();
    this.currentIndex = 0;
  }
  
  combinePhotos() {
    const photos = [];
    
    (this.attachments.before_photos || []).forEach(url => {
      photos.push({ url, type: 'Before', color: '#3B82F6' });
    });
    
    (this.attachments.after_photos || []).forEach(url => {
      photos.push({ url, type: 'After', color: '#10B981' });
    });
    
    (this.attachments.documentation || []).forEach(url => {
      photos.push({ url, type: 'Documentation', color: '#6B7280' });
    });
    
    return photos;
  }
  
  render() {
    if (this.photos.length === 0) {
      return `
        <div class="photo-carousel-empty">
          <p>No photos available</p>
        </div>
      `;
    }
    
    return `
      <div class="photo-carousel">
        <div class="carousel-main">
          <button class="carousel-nav prev" data-action="prev">‹</button>
          <div class="carousel-image-container">
            ${this.renderMainImage()}
          </div>
          <button class="carousel-nav next" data-action="next">›</button>
        </div>
        
        <div class="carousel-thumbnails">
          ${this.renderThumbnails()}
        </div>
        
        <div class="carousel-counter">
          ${this.currentIndex + 1} / ${this.photos.length}
        </div>
      </div>
    `;
  }
  
  renderMainImage() {
    const photo = this.photos[this.currentIndex];
    
    return `
      <img 
        src="${photo.url}" 
        alt="${photo.type} photo" 
        class="carousel-main-image"
        data-index="${this.currentIndex}"
      >
      <div class="carousel-badge" style="background-color: ${photo.color}">
        ${photo.type}
      </div>
    `;
  }
  
  renderThumbnails() {
    return this.photos.map((photo, index) => `
      <div 
        class="carousel-thumbnail ${index === this.currentIndex ? 'active' : ''}" 
        data-index="${index}"
      >
        <img src="${photo.url}" alt="${photo.type}">
        <div class="thumbnail-label">${photo.type}</div>
      </div>
    `).join('');
  }
  
  attachEventListeners(container) {
    // Previous button
    const prevBtn = container.querySelector('.carousel-nav.prev');
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        this.currentIndex = (this.currentIndex - 1 + this.photos.length) % this.photos.length;
        this.updateCarousel(container);
      });
    }
    
    // Next button
    const nextBtn = container.querySelector('.carousel-nav.next');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        this.currentIndex = (this.currentIndex + 1) % this.photos.length;
        this.updateCarousel(container);
      });
    }
    
    // Thumbnails
    const thumbnails = container.querySelectorAll('.carousel-thumbnail');
    thumbnails.forEach(thumb => {
      thumb.addEventListener('click', () => {
        const index = parseInt(thumb.getAttribute('data-index'));
        this.currentIndex = index;
        this.updateCarousel(container);
      });
    });
    
    // Full screen on main image click
    const mainImage = container.querySelector('.carousel-main-image');
    if (mainImage) {
      mainImage.addEventListener('click', () => {
        this.openFullscreen(mainImage.src);
      });
    }
    
    // Keyboard navigation
    const handleKeyboard = (e) => {
      if (e.key === 'ArrowLeft') {
        prevBtn?.click();
      } else if (e.key === 'ArrowRight') {
        nextBtn?.click();
      } else if (e.key === 'Escape') {
        this.closeFullscreen();
      }
    };
    
    container.addEventListener('keydown', handleKeyboard);
  }
  
  updateCarousel(container) {
    const imageContainer = container.querySelector('.carousel-image-container');
    const counter = container.querySelector('.carousel-counter');
    const thumbnails = container.querySelectorAll('.carousel-thumbnail');
    
    if (imageContainer) {
      imageContainer.innerHTML = this.renderMainImage();
      
      // Re-attach click handler for new image
      const mainImage = imageContainer.querySelector('.carousel-main-image');
      if (mainImage) {
        mainImage.addEventListener('click', () => {
          this.openFullscreen(mainImage.src);
        });
      }
    }
    
    if (counter) {
      counter.textContent = `${this.currentIndex + 1} / ${this.photos.length}`;
    }
    
    thumbnails.forEach((thumb, index) => {
      if (index === this.currentIndex) {
        thumb.classList.add('active');
      } else {
        thumb.classList.remove('active');
      }
    });
  }
  
  openFullscreen(imageUrl) {
    const fullscreenDiv = document.createElement('div');
    fullscreenDiv.className = 'photo-fullscreen';
    fullscreenDiv.innerHTML = `
      <div class="fullscreen-overlay">
        <button class="fullscreen-close">×</button>
        <img src="${imageUrl}" alt="Fullscreen photo">
      </div>
    `;
    
    document.body.appendChild(fullscreenDiv);
    
    const closeBtn = fullscreenDiv.querySelector('.fullscreen-close');
    const overlay = fullscreenDiv.querySelector('.fullscreen-overlay');
    
    const closeFullscreen = () => {
      fullscreenDiv.remove();
    };
    
    closeBtn.addEventListener('click', closeFullscreen);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeFullscreen();
      }
    });
    
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeFullscreen();
      }
    });
  }
  
  closeFullscreen() {
    const fullscreen = document.querySelector('.photo-fullscreen');
    if (fullscreen) {
      fullscreen.remove();
    }
  }
}