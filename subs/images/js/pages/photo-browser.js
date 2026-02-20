// Photo Browser Page
import { fetchImages } from '../utils/images-api.js';
import { FilterPanel } from '../components/FilterPanel.js';
import { LightboxGallery } from '../components/LightboxGallery.js';
import { getStateFromUrl, updateUrlState } from '../utils/state.js';
import { navigate } from '../utils/router.js';
import { isOrphaned } from '../utils/images-config.js';

export async function renderPhotoBrowser() {
  const app = document.getElementById('app');
  
  // Get filters from URL
  const filters = getStateFromUrl();
  
  app.innerHTML = `
    <div class="browser-header">
      <div class="browser-title-section">
        <h1>Browse Photos</h1>
        <button class="btn btn-secondary back-to-admin">Back to Admin</button>
      </div>
    </div>
    
    <div id="filter-panel-container"></div>
    
    <div class="photo-browser-container">
      <div class="loading">Loading photos...</div>
    </div>
  `;
  
  // Back to admin button
  const backBtn = app.querySelector('.back-to-admin');
  backBtn.addEventListener('click', () => {
    navigate('/images');
  });
  
  // Render filter panel
  const filterContainer = document.getElementById('filter-panel-container');
  const filterPanel = FilterPanel(filters, async (newFilters) => {
    updateUrlState(newFilters);
    await loadAndRenderPhotos(newFilters);
  });
  filterContainer.appendChild(filterPanel);
  
  // Load and render photos
  await loadAndRenderPhotos(filters);
}

async function loadAndRenderPhotos(filters) {
  const container = document.querySelector('.photo-browser-container');
  container.innerHTML = '<div class="loading">Loading photos...</div>';
  
  try {
    // Convert UI filters to API filters
    const apiFilters = {
      season: filters.season,
      category: filters.category,
      year: filters.year,
      limit: 500
    };
    
    let photos = await fetchImages(apiFilters);
    
    // Exclude receipts
    photos = photos.filter(photo => {
      const category = photo.category || photo.photo_type || '';
      return category !== 'receipts' && category !== 'receipt';
    });
    
    // Apply client-side filtering
    if (filters.isPublic) {
      const isPublic = filters.isPublic === 'true';
      photos = photos.filter(img => img.is_public === isPublic);
    }
    
    if (filters.hasReferences) {
      const hasRefs = filters.hasReferences === 'true';
      photos = photos.filter(img => isOrphaned(img) !== hasRefs);
    }
    
    if (filters.search) {
      const search = filters.search.toLowerCase();
      photos = photos.filter(img => 
        img.photo_id.toLowerCase().includes(search) ||
        (img.caption || '').toLowerCase().includes(search)
      );
    }
    
    // Render photos
    if (photos.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>No photos found</p>
        </div>
      `;
      return;
    }
    
    container.innerHTML = `
      <div class="results-count">${photos.length} photo${photos.length === 1 ? '' : 's'}</div>
      <div class="photo-browser-grid"></div>
    `;
    
    const grid = container.querySelector('.photo-browser-grid');
    
    photos.forEach((photo, index) => {
      const card = createPhotoCard(photo, index, photos);
      grid.appendChild(card);
    });
    
  } catch (error) {
    container.innerHTML = `
      <div class="error-state">
        <p>Error loading photos</p>
        <button class="btn btn-secondary" onclick="location.reload()">Retry</button>
      </div>
    `;
  }
}

function createPhotoCard(photo, index, allPhotos) {
  const card = document.createElement('div');
  card.className = 'photo-browser-card';
  
  // Determine season badge color
  const seasonClass = `season-${photo.season || 'shared'}`;
  
  card.innerHTML = `
    <div class="photo-browser-preview">
      <img 
        src="${photo.thumb_cloudfront_url || photo.cloudfront_url}" 
        alt="${photo.caption || 'Photo'}"
        loading="lazy"
      />
      <div class="photo-browser-overlay">
        <span class="photo-browser-season ${seasonClass}">
          ${(photo.season || 'shared').toUpperCase()}
        </span>
      </div>
    </div>
  `;
  
  // Click to open lightbox
  card.addEventListener('click', () => {
    LightboxGallery(allPhotos, index);
  });
  
  return card;
}