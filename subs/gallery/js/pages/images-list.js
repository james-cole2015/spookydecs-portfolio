/**
 * Images List Page
 * 
 * Main page for browsing and managing images
 * Orchestrates TabBar, FilterBar, ImagesTable, and InfiniteScroll
 */

import { renderTabBar } from '../components/TabBar.js';
import { renderFilterBar } from '../components/FilterBar.js';
import { renderImagesTable, clearExpandedRows } from '../components/ImagesTable.js';
import { initInfiniteScroll, cleanup, resetInfiniteScroll, setHasMore } from '../components/TableInfiniteScroll.js';
import { fetchImages } from '../utils/images-api.js';
import { getFiltersFromURL } from '../utils/state.js';
import { showError } from '../shared/toast.js';

let currentPhotos = [];
let nextToken = null;
let isLoading = false;

/**
 * Render the images list page
 */
export async function renderImagesList() {
  console.log('Rendering images list page');
  
  const app = document.getElementById('app');
  
  app.innerHTML = `
    <div class="images-list-page">
      <header class="page-header">
        <h1>📷 Images Management</h1>
      </header>
      
      <div id="tab-bar-container"></div>
      <div id="filter-bar-container"></div>
      
      <div id="images-table-container" class="table-wrapper"></div>
    </div>
  `;
  
  // Render components
  const tabBarContainer = document.getElementById('tab-bar-container');
  const filterBarContainer = document.getElementById('filter-bar-container');
  const tableContainer = document.getElementById('images-table-container');
  
  renderTabBar(tabBarContainer, handleTabChange);
  renderFilterBar(filterBarContainer, handleFilterChange);
  
  // Load initial data
  await loadPhotos(true);
  
  // Initialize infinite scroll
  initInfiniteScroll(tableContainer, handleLoadMore);
}

/**
 * Load photos from API
 * @param {boolean} reset - Reset pagination
 */
async function loadPhotos(reset = false) {
  if (isLoading) return;
  
  isLoading = true;
  
  try {
    // Reset state if needed
    if (reset) {
      currentPhotos = [];
      nextToken = null;
      resetInfiniteScroll();
    }
    
    // Get filters from URL
    const filters = getFiltersFromURL();
    
    // Add pagination token if available
    if (nextToken && !reset) {
      filters.next_token = nextToken;
    }
    
    // Set limit for pagination
    filters.limit = 20;
    
    console.log('Loading photos with filters:', filters);
    
    // Fetch photos
    const response = await fetchImages(filters);
    
    console.log('Photos loaded:', response);
    
    // Append new photos
    if (reset) {
      currentPhotos = response.photos || [];
    } else {
      currentPhotos = [...currentPhotos, ...(response.photos || [])];
    }
    
    // Update pagination token
    nextToken = response.next_token || null;
    
    // Update hasMore state
    setHasMore(!!nextToken);
    
    // Render table
    const tableContainer = document.getElementById('images-table-container');
    if (tableContainer) {
      renderImagesTable(tableContainer, currentPhotos, handlePhotoDeleted);
    }
    
  } catch (error) {
    console.error('Error loading photos:', error);
    showError(`Failed to load photos: ${error.message}`);
  } finally {
    isLoading = false;
  }
}

/**
 * Handle tab change
 * @param {string} photoType - Selected photo type
 */
async function handleTabChange(photoType) {
  console.log('Tab changed to:', photoType);
  
  // Clear expanded rows
  clearExpandedRows();
  
  // Reload photos
  await loadPhotos(true);
}

/**
 * Handle filter change
 */
async function handleFilterChange() {
  console.log('Filters changed');
  
  // Clear expanded rows
  clearExpandedRows();
  
  // Reload photos
  await loadPhotos(true);
}

/**
 * Handle load more (infinite scroll)
 * @returns {boolean} True if more data available
 */
async function handleLoadMore() {
  console.log('Loading more photos...');
  
  if (!nextToken) {
    console.log('No more photos to load');
    return false;
  }
  
  await loadPhotos(false);
  
  return !!nextToken;
}

/**
 * Handle photo deletion
 * @param {string} photoId - Deleted photo ID
 */
function handlePhotoDeleted(photoId) {
  console.log('Photo deleted:', photoId);
  
  // Remove photo from current list
  currentPhotos = currentPhotos.filter(photo => photo.photo_id !== photoId);
  
  // Re-render table
  const tableContainer = document.getElementById('images-table-container');
  if (tableContainer) {
    renderImagesTable(tableContainer, currentPhotos, handlePhotoDeleted);
  }
}

/**
 * Clean up when leaving page
 */
export function cleanupImagesList() {
  cleanup();
  currentPhotos = [];
  nextToken = null;
  isLoading = false;
}
