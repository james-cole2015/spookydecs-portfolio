/**
 * HeroCarousel Component - Continuous Scrolling Display
 * 
 * Continuous horizontal scrolling photo strip
 * - Slow crawl animation left to right
 * - Pause on hover with overlay
 * - Manual navigation pauses and centers photo
 * - Seamless infinite loop
 * - Edge-to-edge photos maintaining aspect ratios
 */

export class HeroCarousel {
  constructor(container) {
    this.container = container;
    this.photos = [];
    this.track = null;
    this.photoWidths = [];
    this.totalWidth = 0;
    this.currentIndex = 0;
    this.isAutoScrolling = true;
    this.isPaused = false;
    this.resumeTimeout = null;
    this.animationSpeed = 30; // pixels per second (default: normal speed)
    this.minSpeed = 10; // slowest
    this.maxSpeed = 50; // fastest
    this.speedStep = 10; // increment per click
    this.animationDuration = 0;
    this.hoveredSlide = null;
  }

  /**
   * Initialize carousel with featured photos
   */
  async init(photos) {
    this.photos = photos.filter(p => p.is_featured);
    
    if (this.photos.length === 0) {
      this.renderEmpty();
      return;
    }

    this.render();
    await this.calculateDimensions();
    this.attachEventListeners();
    this.startAutoScroll();
  }

  /**
   * Calculate photo widths and animation duration
   */
  async calculateDimensions() {
    const containerHeight = this.container.querySelector('.hero-carousel-container').offsetHeight;
    this.photoWidths = [];
    this.totalWidth = 0;

    // Get all original slides (not clones)
    const originalSlides = this.track.querySelectorAll('.hero-slide[data-is-clone="false"]');
    
    for (let slide of originalSlides) {
      const img = slide.querySelector('.hero-slide-image');
      
      // Wait for image to load
      if (!img.complete) {
        await new Promise(resolve => {
          img.onload = resolve;
          img.onerror = resolve;
        });
      }

      const aspectRatio = img.naturalWidth / img.naturalHeight || 16/9;
      const width = containerHeight * aspectRatio;
      this.photoWidths.push(width);
      this.totalWidth += width;
    }

    // Calculate animation duration based on total width and speed
    // Duration = distance / speed
    this.animationDuration = this.totalWidth / this.animationSpeed;

    // Apply width to track and set CSS custom property
    this.track.style.setProperty('--strip-width', `${this.totalWidth}px`);
    this.track.style.setProperty('--animation-duration', `${this.animationDuration}s`);
  }

  /**
   * Render carousel HTML with tripled photos for infinite loop
   */
  render() {
    // Create three copies of the photo strip for seamless looping
    const createSlides = (cloneSet = 0) => {
      return this.photos.map((photo, index) => `
        <div class="hero-slide" 
             data-index="${index}"
             data-clone-set="${cloneSet}"
             data-is-clone="${cloneSet !== 1}">
          <img 
            src="${photo.cloudfront_url}" 
            alt="${photo.display_name || 'Featured display'}"
            class="hero-slide-image"
            loading="${cloneSet === 1 && index < 3 ? 'eager' : 'lazy'}"
          />
          <div class="hero-slide-overlay">
            <div class="hero-slide-content">
              <div class="hero-slide-featured-badge">
                <span>⭐</span>
                <span>Featured Display</span>
              </div>
              <h2 class="hero-slide-title">${photo.display_name || 'Untitled Display'}</h2>
              ${photo.location ? `
                <div class="hero-slide-location">${photo.location}</div>
              ` : ''}
            </div>
          </div>
        </div>
      `).join('');
    };

    // Three strips: clone, original, clone
    const allSlides = createSlides(0) + createSlides(1) + createSlides(2);

    this.container.innerHTML = `
      <div class="hero-carousel-container">
        <div class="hero-carousel-track">
          ${allSlides}
        </div>
        
        ${this.photos.length > 1 ? `
          <div class="hero-carousel-controls">
            <button class="hero-carousel-btn hero-carousel-prev" aria-label="Previous photo">
              <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
              </svg>
            </button>
            <button class="hero-carousel-btn hero-carousel-next" aria-label="Next photo">
              <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
              </svg>
            </button>
          </div>
          
          <div class="hero-carousel-speed-control">
            <button class="hero-carousel-speed-btn hero-carousel-speed-down" aria-label="Decrease speed">
              <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 13H5v-2h14v2z"/>
              </svg>
            </button>
            <div class="hero-carousel-speed-indicator">
              <div class="hero-carousel-speed-dots">
                <span class="hero-carousel-speed-dot active"></span>
                <span class="hero-carousel-speed-dot active"></span>
                <span class="hero-carousel-speed-dot active"></span>
                <span class="hero-carousel-speed-dot"></span>
                <span class="hero-carousel-speed-dot"></span>
              </div>
              <div class="hero-carousel-speed-label">Speed Control</div>
            </div>
            <button class="hero-carousel-speed-btn hero-carousel-speed-up" aria-label="Increase speed">
              <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
              </svg>
            </button>
          </div>
        ` : ''}
      </div>
    `;

    this.track = this.container.querySelector('.hero-carousel-track');
  }

  /**
   * Start continuous auto-scroll animation
   */
  startAutoScroll() {
    if (this.photos.length <= 1) return;
    
    this.isAutoScrolling = true;
    this.track.classList.add('auto-scrolling');
  }

  /**
   * Pause auto-scroll
   */
  pauseAutoScroll() {
    this.isPaused = true;
    this.track.classList.add('paused');
  }

  /**
   * Resume auto-scroll
   */
  resumeAutoScroll() {
    this.isPaused = false;
    this.track.classList.remove('paused');
  }

  /**
   * Stop auto-scroll (for manual navigation)
   */
  stopAutoScroll() {
    this.isAutoScrolling = false;
    this.track.classList.remove('auto-scrolling');
    this.track.classList.add('paused');
  }

  /**
   * Navigate to specific photo index
   */
  goToPhoto(index) {
    // Stop auto-scroll
    this.stopAutoScroll();
    
    // Clear any existing resume timeout
    if (this.resumeTimeout) {
      clearTimeout(this.resumeTimeout);
    }

    // Calculate position to center this photo
    let offset = 0;
    for (let i = 0; i < index; i++) {
      offset += this.photoWidths[i];
    }
    
    // Add half of current photo width to center it
    offset += this.photoWidths[index] / 2;
    
    // Subtract half container width
    const containerWidth = this.container.offsetWidth;
    offset -= containerWidth / 2;

    // Apply position with smooth transition
    this.track.style.transition = 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
    this.track.style.transform = `translateX(${-offset}px)`;

    // Update current index
    this.currentIndex = index;

    // Resume auto-scroll after 3 seconds
    this.resumeTimeout = setTimeout(() => {
      // Reset to auto-scroll animation
      this.track.style.transition = 'none';
      this.track.style.transform = '';
      
      // Restart animation
      requestAnimationFrame(() => {
        this.startAutoScroll();
      });
    }, 3000);
  }

  /**
   * Go to next photo
   */
  next() {
    const nextIndex = (this.currentIndex + 1) % this.photos.length;
    this.goToPhoto(nextIndex);
  }

  /**
   * Go to previous photo
   */
  prev() {
    const prevIndex = (this.currentIndex - 1 + this.photos.length) % this.photos.length;
    this.goToPhoto(prevIndex);
  }

  /**
   * Change animation speed
   */
  changeSpeed(delta) {
    // Update speed within bounds
    this.animationSpeed = Math.max(
      this.minSpeed,
      Math.min(this.maxSpeed, this.animationSpeed + delta)
    );

    // Recalculate animation duration
    this.animationDuration = this.totalWidth / this.animationSpeed;
    this.track.style.setProperty('--animation-duration', `${this.animationDuration}s`);

    // Update speed indicator dots
    this.updateSpeedIndicator();
  }

  /**
   * Update speed indicator visual
   */
  updateSpeedIndicator() {
    const speedLevel = Math.round((this.animationSpeed - this.minSpeed) / this.speedStep);
    const dots = this.container.querySelectorAll('.hero-carousel-speed-dot');
    
    dots.forEach((dot, index) => {
      dot.classList.toggle('active', index < speedLevel + 1);
    });
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Previous button
    const prevBtn = this.container.querySelector('.hero-carousel-prev');
    if (prevBtn) {
      prevBtn.addEventListener('click', () => this.prev());
    }

    // Next button
    const nextBtn = this.container.querySelector('.hero-carousel-next');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => this.next());
    }

    // Speed control buttons
    const speedDownBtn = this.container.querySelector('.hero-carousel-speed-down');
    if (speedDownBtn) {
      speedDownBtn.addEventListener('click', () => this.changeSpeed(-this.speedStep));
    }

    const speedUpBtn = this.container.querySelector('.hero-carousel-speed-up');
    if (speedUpBtn) {
      speedUpBtn.addEventListener('click', () => this.changeSpeed(this.speedStep));
    }

    // Hover on individual slides
    const slides = this.track.querySelectorAll('.hero-slide');
    slides.forEach(slide => {
      slide.addEventListener('mouseenter', () => {
        this.hoveredSlide = slide;
        this.pauseAutoScroll();
        slide.classList.add('hovered');
      });

      slide.addEventListener('mouseleave', () => {
        this.hoveredSlide = null;
        this.resumeAutoScroll();
        slide.classList.remove('hovered');
      });
    });

    // Keyboard navigation
    this.handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') this.prev();
      else if (e.key === 'ArrowRight') this.next();
    };
    document.addEventListener('keydown', this.handleKeyDown);

    // Resize observer
    this.resizeObserver = new ResizeObserver(() => {
      this.calculateDimensions();
    });
    this.resizeObserver.observe(this.container);
  }

  /**
   * Render loading state
   */
  renderLoading() {
    this.container.innerHTML = `
      <div class="hero-carousel-loading">
        <div class="hero-carousel-skeleton"></div>
      </div>
    `;
  }

  /**
   * Render empty state
   */
  renderEmpty() {
    this.container.innerHTML = `
      <div class="hero-carousel-empty">
        <div class="hero-carousel-empty-content">
          <div class="hero-carousel-empty-icon">🎃</div>
          <div class="hero-carousel-empty-text">No featured displays yet</div>
        </div>
      </div>
    `;
  }

  /**
   * Destroy carousel
   */
  destroy() {
    if (this.resumeTimeout) {
      clearTimeout(this.resumeTimeout);
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    if (this.handleKeyDown) {
      document.removeEventListener('keydown', this.handleKeyDown);
    }
    this.container.innerHTML = '';
  }
}