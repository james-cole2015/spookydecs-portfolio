/**
 * Community Page
 * 
 * Community-submitted holiday displays
 */

import { galleryAPI } from '../utils/gallery-api.js';
import { state } from '../utils/state.js';
import { FilterTags } from '../components/FilterTags.js';
import { FilterPopover } from '../components/FilterPopover.js';
import { PhotoGrid } from '../components/PhotoGrid.js';
import { PhotoSwipeLightbox } from '../components/PhotoSwipeLightbox.js';

export async function renderCommunity() {
  const app = document.getElementById('app');
  
  app.innerHTML = `
    <div class="community-page">
      <!-- Page Header -->
      <div class="container">
        <div class="page-header">
          <h1>🌟 Community Displays</h1>
          <p class="page-description">
            Amazing holiday displays from our community members around the world
          </p>
        </div>
      </div>
      
      <!-- Filter Section -->
      <div class="filter-section">
        <div class="container">
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
      </div>
      
      <!-- Photo Grid -->
      <div class="photo-grid-container">
        <div class="container">
          <div id="photo-grid"></div>
        </div>
      </div>
    </div>
  `;

  // Get current filters from state
  const filters = state.get();

  // Initialize components
  const filterTagsEl = document.getElementById('filter-tags-container');
  const filterBtnEl = document.querySelector('.filter-btn');
  const filterBtnContainer = document.getElementById('filter-btn-container');
  const photoGridEl = document.getElementById('photo-grid');

  const filterTags = new FilterTags(filterTagsEl);
  const filterPopover = new FilterPopover(filterBtnContainer, filterBtnEl);
  const photoGrid = new PhotoGrid(photoGridEl);

  // Show loading state
  photoGrid.renderLoading();

  try {
    // Fetch photos
    const photos = await galleryAPI.getPhotos('community', filters);

    // Initialize filter tags
    filterTags.init(filters, handleFilterRemove);

    // Initialize filter popover
    filterPopover.init(filters, handleFilterApply);

    // Initialize photo grid with lightbox
    photoGrid.init(photos, (photo) => {
      openLightbox(photo, photos);
    });

  } catch (error) {
    console.error('Error loading community photos:', error);
    photoGrid.renderEmpty();
  }

  /**
   * Handle filter removal
   */
  function handleFilterRemove(filterKey) {
    const currentFilters = state.get();

    if (filterKey === 'all') {
      state.update({ season: null, year: null });
    } else {
      state.update({ [filterKey]: null });
    }

    renderCommunity();
  }

  /**
   * Handle filter apply
   */
  function handleFilterApply(newFilters) {
    state.update(newFilters);
    renderCommunity();
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
