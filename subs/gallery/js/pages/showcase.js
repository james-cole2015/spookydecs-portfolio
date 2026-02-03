/**
 * Showcase Page
 * 
 * Main gallery showcase with:
 * - Hero carousel for featured photos
 * - Filter tags for active filters
 * - Filter popover for selecting filters
 * - Photo grid with infinite scroll
 */

import { galleryAPI } from '../utils/gallery-api.js';
import { state } from '../utils/state.js';
import { HeroCarousel } from '../components/HeroCarousel.js';
import { FilterTags } from '../components/FilterTags.js';
import { FilterPopover } from '../components/FilterPopover.js';
import { PhotoGrid } from '../components/PhotoGrid.js';
import { PhotoSwipeLightbox } from '../components/PhotoSwipeLightbox.js';

export async function renderShowcase() {
  const app = document.getElementById('app');
  
  app.innerHTML = `
    <div class="showcase-page">
      <!-- Hero Carousel -->
      <div id="hero-carousel" class="hero-carousel"></div>
      
      <!-- Filter Section -->
      <div class="filter-section">
        <div class="filter-header">
          <div id="filter-tags-container"></div>
          <div id="filter-btn-container" class="filter-btn-container">
            <button class="filter-btn">
              <span class="filter-btn-icon">⚙️</span>
              <span>Filter</span>
            </button>
          </div>
        </div>
      </div>
      
      <!-- Browse All Section -->
      <div class="browse-section">
        <h2 class="browse-section-title">Browse All Displays</h2>
      </div>
      
      <!-- Photo Grid -->
      <div class="photo-grid-container">
        <div id="photo-grid"></div>
      </div>
    </div>
  `;

  // Get current filters from state
  const filters = state.get();

  // Initialize components
  const heroCarouselEl = document.getElementById('hero-carousel');
  const filterTagsEl = document.getElementById('filter-tags-container');
  const filterBtnEl = document.querySelector('.filter-btn');
  const filterBtnContainer = document.getElementById('filter-btn-container');
  const photoGridEl = document.getElementById('photo-grid');

  const heroCarousel = new HeroCarousel(heroCarouselEl);
  const filterTags = new FilterTags(filterTagsEl);
  const filterPopover = new FilterPopover(filterBtnContainer, filterBtnEl);
  const photoGrid = new PhotoGrid(photoGridEl);

  // Show loading states
  heroCarousel.renderLoading();
  photoGrid.renderLoading();

  try {
    //console.log('Fetching showcase photos with filters:', filters);
    
    // Fetch photos
    const photos = await galleryAPI.getPhotos('showcase', filters);
    
    //console.log('Received photos:', photos.length);

    // Initialize hero carousel with featured photos only
    await heroCarousel.init(photos);

    // Initialize filter tags
    filterTags.init(filters, handleFilterRemove);

    // Initialize filter popover
    filterPopover.init(filters, handleFilterApply);

    // Initialize photo grid with ALL photos (including featured)
    if (photos.length === 0) {
      photoGrid.renderEmpty();
    } else {
      photoGrid.init(photos, (photo) => {
        openLightbox(photo, photos);
      });
    }

  } catch (error) {
    console.error('Error loading showcase:', error);
    console.error('Error details:', error.message, error.stack);
    
    // Show error message to user
    photoGridEl.innerHTML = `
      <div class="photo-grid-empty">
        <div class="photo-grid-empty-icon">⚠️</div>
        <div class="photo-grid-empty-title">Error loading photos</div>
        <div class="photo-grid-empty-text">${error.message || 'Please check console for details'}</div>
      </div>
    `;
  }

  /**
   * Handle filter removal
   */
  function handleFilterRemove(filterKey) {
    const currentFilters = state.get();

    if (filterKey === 'all') {
      // Clear all filters
      state.update({ season: null, year: null });
    } else {
      // Clear specific filter
      state.update({ [filterKey]: null });
    }

    // Reload page with new filters
    renderShowcase();
  }

  /**
   * Handle filter apply
   */
  function handleFilterApply(newFilters) {
    state.update(newFilters);
    renderShowcase();
  }

  /**
   * Open lightbox for photo
   */
  function openLightbox(photo, allPhotos) {
    const lightbox = new PhotoSwipeLightbox();
    const photoIndex = allPhotos.findIndex(p => p.photo_id === photo.photo_id);
    lightbox.open(allPhotos, photoIndex);
  }
}