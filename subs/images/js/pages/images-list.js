// Images List Page
import { fetchImages } from '../utils/images-api.js';
import { ImageCard } from '../components/ImageCard.js';
import { FilterPanel } from '../components/FilterPanel.js';
import { getStateFromUrl, updateUrlState } from '../utils/state.js';
import { navigate } from '../utils/router.js';
import { showToast } from '../shared/toast.js';
import { isOrphaned } from '../utils/images-config.js';

export async function renderImagesList() {
  const app = document.getElementById('app');
  
  // Get filters from URL
  const filters = getStateFromUrl();
  
  app.innerHTML = `
    <div class="page-header">
      <h1>Images</h1>
      <div class="header-actions">
        <button class="btn btn-secondary" id="browse-btn">Browse Photos</button>
        <button class="btn btn-primary" id="upload-btn">Upload Images</button>
      </div>
    </div>
    
    <div id="filter-panel-container"></div>
    
    <div class="images-grid-container">
      <div class="loading">Loading images...</div>
    </div>
  `;
  
  // Setup buttons
  const browseBtn = document.getElementById('browse-btn');
  const uploadBtn = document.getElementById('upload-btn');
  
  browseBtn.addEventListener('click', () => {
    navigate('/images/browse');
  });
  
  uploadBtn.addEventListener('click', () => {
    navigate('/images/upload');
  });
  
  // Render filter panel
  const filterContainer = document.getElementById('filter-panel-container');
  const filterPanel = FilterPanel(filters, async (newFilters) => {
    updateUrlState(newFilters);
    await loadAndRenderImages(newFilters);
  });
  filterContainer.appendChild(filterPanel);
  
  // Load and render images
  await loadAndRenderImages(filters);
}

async function loadAndRenderImages(filters) {
  const container = document.querySelector('.images-grid-container');
  container.innerHTML = '<div class="loading">Loading images...</div>';
  
  try {
    // Convert UI filters to API filters
    const apiFilters = {
      season: filters.season,
      photo_type: filters.category,
      year: filters.year,
      limit: 200
    };
    
    let images = await fetchImages(apiFilters);
    
    // Apply client-side filtering for features not supported by API
    if (filters.isPublic) {
      const isPublic = filters.isPublic === 'true';
      images = images.filter(img => img.is_public === isPublic);
    }
    
    if (filters.hasReferences) {
      const hasRefs = filters.hasReferences === 'true';
      images = images.filter(img => isOrphaned(img) !== hasRefs);
    }
    
    if (filters.search) {
      const search = filters.search.toLowerCase();
      images = images.filter(img => 
        img.photo_id.toLowerCase().includes(search) ||
        (img.caption || '').toLowerCase().includes(search)
      );
    }
    
    // Render images
    if (images.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>No images found</p>
          <button class="btn btn-primary" onclick="window.location.href='/images/upload'">
            Upload Images
          </button>
        </div>
      `;
      return;
    }
    
    container.innerHTML = `
      <div class="results-count">${images.length} image${images.length === 1 ? '' : 's'} found</div>
      <div class="images-grid"></div>
    `;
    
    const grid = container.querySelector('.images-grid');
    images.forEach(photo => {
      grid.appendChild(ImageCard(photo));
    });
    
  } catch (error) {
    container.innerHTML = `
      <div class="error-state">
        <p>Error loading images</p>
        <button class="btn btn-secondary" onclick="location.reload()">Retry</button>
      </div>
    `;
  }
}