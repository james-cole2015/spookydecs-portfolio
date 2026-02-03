/**
 * PhotoGrid Component
 * 
 * Masonry grid with infinite scroll
 * - Automatically loads more photos as user scrolls
 * - Maintains masonry layout
 * - Handles loading states
 */

import { PhotoCard } from './PhotoCard.js';

export class PhotoGrid {
  constructor(container) {
    this.container = container;
    this.photos = [];
    this.displayedPhotos = [];
    this.batchSize = 20;
    this.currentIndex = 0;
    this.isLoading = false;
    this.hasMore = true;
    this.onPhotoClick = null;
    this.observerTarget = null;
    this.intersectionObserver = null;
  }

  /**
   * Initialize grid with photos
   */
  init(photos, onPhotoClick) {
    //console.log('PhotoGrid.init called with', photos.length, 'photos');
    this.photos = photos;
    this.displayedPhotos = [];
    this.currentIndex = 0;
    this.hasMore = photos.length > 0; // Changed: should be true if there are any photos
    this.onPhotoClick = onPhotoClick;
    
    this.render();
    //console.log('PhotoGrid rendered, grid element:', this.grid);
    this.loadNextBatch();
    this.setupIntersectionObserver();
  }

  /**
   * Update photos (e.g., after filter change)
   */
  update(photos) {
    this.destroy();
    this.init(photos, this.onPhotoClick);
  }

  /**
   * Render grid container
   */
  render() {
    this.container.innerHTML = `
      <div class="photo-grid-header">
        <div class="photo-count">
          <strong>${this.photos.length}</strong> ${this.photos.length === 1 ? 'photo' : 'photos'}
        </div>
      </div>
      <div class="photo-grid"></div>
      <div class="infinite-scroll-target"></div>
    `;

    this.grid = this.container.querySelector('.photo-grid');
    this.observerTarget = this.container.querySelector('.infinite-scroll-target');
  }

  /**
   * Render loading state
   */
  renderLoading() {
    this.container.innerHTML = `
      <div class="photo-grid-skeleton">
        ${PhotoCard.createSkeletons(8).map(s => s.outerHTML).join('')}
      </div>
    `;
  }

  /**
   * Render empty state
   */
  renderEmpty() {
    this.container.innerHTML = `
      <div class="photo-grid-empty">
        <div class="photo-grid-empty-icon">🖼️</div>
        <div class="photo-grid-empty-title">No photos found</div>
        <div class="photo-grid-empty-text">Try adjusting your filters or check back later</div>
      </div>
    `;
  }

  /**
   * Load next batch of photos
   */
  loadNextBatch() {
    //console.log('loadNextBatch called - isLoading:', this.isLoading, 'hasMore:', this.hasMore);
    if (this.isLoading || !this.hasMore) return;

    this.isLoading = true;
    this.showBatchLoader();

    // Simulate async loading (in real app, this would be an API call)
    setTimeout(() => {
      const endIndex = Math.min(this.currentIndex + this.batchSize, this.photos.length);
      const batch = this.photos.slice(this.currentIndex, endIndex);

      //console.log('Loading batch:', batch.length, 'photos from index', this.currentIndex, 'to', endIndex);

      batch.forEach(photo => {
        const card = PhotoCard.create(photo, this.onPhotoClick);
        this.grid.appendChild(card);
        this.displayedPhotos.push(photo);
      });

      //console.log('Grid now has', this.grid.children.length, 'cards');

      this.currentIndex = endIndex;
      this.hasMore = this.currentIndex < this.photos.length;
      this.isLoading = false;

      this.hideBatchLoader();

      if (!this.hasMore) {
        this.showEndMessage();
      }

      // Update photo count
      this.updatePhotoCount();
    }, 300);
  }

  /**
   * Show batch loader
   */
  showBatchLoader() {
    if (!this.observerTarget) return;

    this.observerTarget.innerHTML = `
      <div class="infinite-scroll-loader">
        <div class="loader"></div>
      </div>
    `;
  }

  /**
   * Hide batch loader
   */
  hideBatchLoader() {
    if (!this.observerTarget) return;
    this.observerTarget.innerHTML = '';
  }

  /**
   * Show end message
   */
  showEndMessage() {
    if (!this.observerTarget) return;

    this.observerTarget.innerHTML = `
      <div class="infinite-scroll-end">
        You've reached the end! 🎉
      </div>
    `;
  }

  /**
   * Update photo count
   */
  updatePhotoCount() {
    const countEl = this.container.querySelector('.photo-count');
    if (countEl) {
      countEl.innerHTML = `
        <strong>${this.photos.length}</strong> ${this.photos.length === 1 ? 'photo' : 'photos'}
      `;
    }
  }

  /**
   * Setup intersection observer for infinite scroll
   */
  setupIntersectionObserver() {
    if (!this.observerTarget) return;

    const options = {
      root: null,
      rootMargin: '200px',
      threshold: 0
    };

    this.intersectionObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !this.isLoading && this.hasMore) {
          this.loadNextBatch();
        }
      });
    }, options);

    this.intersectionObserver.observe(this.observerTarget);
  }

  /**
   * Get all displayed photos
   */
  getDisplayedPhotos() {
    return this.displayedPhotos;
  }

  /**
   * Get total photo count
   */
  getTotalCount() {
    return this.photos.length;
  }

  /**
   * Get displayed photo count
   */
  getDisplayedCount() {
    return this.displayedPhotos.length;
  }

  /**
   * Check if more photos available
   */
  hasMorePhotos() {
    return this.hasMore;
  }

  /**
   * Destroy grid
   */
  destroy() {
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
      this.intersectionObserver = null;
    }
    this.container.innerHTML = '';
    this.displayedPhotos = [];
    this.currentIndex = 0;
    this.hasMore = true;
  }
}