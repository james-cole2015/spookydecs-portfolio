/**
 * Filter Management
 * Handles filter controls, search, and filter state
 */

import { getState, setFilter, setFilters, resetFilters, resetPagination } from './state.js';
import { loadPhotos } from './photos.js';
import { debounce } from './helpers.js';

/**
 * Initialize filters
 */
export function initFilters() {
  console.log('[Filters] Initializing filters...');
  
  // Get current filters from state
  const state = getState();
  
  // Set initial filter values in UI
  setFilterValues(state.filters);
  
  // Initialize search input with debounce
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    const debouncedSearch = debounce(handleSearchChange, 500);
    searchInput.addEventListener('input', debouncedSearch);
    searchInput.value = state.filters.search || '';
  }
  
  // Initialize season filter
  const seasonFilter = document.getElementById('season-filter');
  if (seasonFilter) {
    seasonFilter.addEventListener('change', handleSeasonChange);
  }
  
  // Initialize type filter
  const typeFilter = document.getElementById('type-filter');
  if (typeFilter) {
    typeFilter.addEventListener('change', handleTypeChange);
  }
  
  // Initialize year filter
  const yearFilter = document.getElementById('year-filter');
  if (yearFilter) {
    yearFilter.addEventListener('change', handleYearChange);
  }
  
  // Initialize clear filters button
  const clearFiltersBtn = document.getElementById('clear-filters-btn');
  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener('click', clearAllFilters);
  }
  
  // Initialize mobile filter toggle
  const filterToggle = document.getElementById('filter-toggle');
  const filterPanel = document.getElementById('filter-panel');
  
  if (filterToggle && filterPanel) {
    filterToggle.addEventListener('click', () => {
      filterPanel.classList.toggle('active');
      filterToggle.classList.toggle('active');
    });
  }
  
  // Update filter badge count and clear button visibility
  updateFilterBadge();
  updateClearButtonVisibility();
  
  console.log('[Filters] Filters initialized');
}

/**
 * Handle search input change
 * @param {Event} event - Input event
 */
function handleSearchChange(event) {
  const searchQuery = event.target.value;
  console.log('[Filters] Search changed:', searchQuery);
  
  setFilter('search', searchQuery);
  resetPagination();
  updateFilterBadge();
  updateClearButtonVisibility();
  
  // Note: Search is handled client-side in photo-grid rendering
  // Trigger re-render by dispatching custom event
  window.dispatchEvent(new CustomEvent('searchChange'));
}

/**
 * Handle season filter change
 * @param {Event} event - Change event
 */
async function handleSeasonChange(event) {
  const season = event.target.value;
  console.log('[Filters] Season changed:', season);
  
  setFilter('season', season);
  resetPagination();
  updateFilterBadge();
  updateClearButtonVisibility();
  
  // Reload photos
  try {
    await loadPhotos();
  } catch (error) {
    console.error('[Filters] Error loading photos:', error);
  }
}

/**
 * Handle type filter change
 * @param {Event} event - Change event
 */
async function handleTypeChange(event) {
  const type = event.target.value;
  console.log('[Filters] Type changed:', type);
  
  setFilter('class_type', type);
  resetPagination();
  updateFilterBadge();
  updateClearButtonVisibility();
  
  // Type filter is client-side, trigger re-render via state change
  // Photos will be filtered in renderPhotoGrid
}

/**
 * Handle year filter change
 * @param {Event} event - Change event
 */
async function handleYearChange(event) {
  const year = event.target.value;
  console.log('[Filters] Year changed:', year);
  
  setFilter('year', year);
  resetPagination();
  updateFilterBadge();
  updateClearButtonVisibility();
  
  // Year filter is client-side, trigger re-render via state change
  // Photos will be filtered in renderPhotoGrid
}

/**
 * Set filter values in UI from state
 * @param {Object} filters - Filter values
 */
function setFilterValues(filters) {
  const seasonFilter = document.getElementById('season-filter');
  const typeFilter = document.getElementById('type-filter');
  const yearFilter = document.getElementById('year-filter');
  const searchInput = document.getElementById('search-input');
  
  if (seasonFilter) seasonFilter.value = filters.season || '';
  if (typeFilter) typeFilter.value = filters.class_type || '';
  if (yearFilter) yearFilter.value = filters.year || '';
  if (searchInput) searchInput.value = filters.search || '';
}

/**
 * Update filter badge count
 * Shows number of active filters
 */
function updateFilterBadge() {
  const state = getState();
  const filters = state.filters;
  
  let count = 0;
  
  // Count active filters (excluding 'all' and empty values)
  if (filters.season && filters.season !== 'all' && filters.season !== '') count++;
  if (filters.class_type && filters.class_type !== 'all' && filters.class_type !== '') count++;
  if (filters.year && filters.year !== 'all' && filters.year !== '') count++;
  if (filters.search && filters.search.trim() !== '') count++;
  
  // Update badge
  const badge = document.getElementById('filter-badge');
  if (badge) {
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
  }
}

/**
 * Update clear filters button visibility
 * Show button only when filters are active
 */
function updateClearButtonVisibility() {
  const state = getState();
  const filters = state.filters;
  
  let hasActiveFilters = false;
  
  // Check if any filters are active
  if (filters.season && filters.season !== 'all' && filters.season !== '') hasActiveFilters = true;
  if (filters.class_type && filters.class_type !== 'all' && filters.class_type !== '') hasActiveFilters = true;
  if (filters.year && filters.year !== 'all' && filters.year !== '') hasActiveFilters = true;
  if (filters.search && filters.search.trim() !== '') hasActiveFilters = true;
  
  const clearBtn = document.getElementById('clear-filters-btn');
  if (clearBtn) {
    if (hasActiveFilters) {
      clearBtn.classList.remove('hidden');
    } else {
      clearBtn.classList.add('hidden');
    }
  }
}

/**
 * Clear all filters
 */
export async function clearAllFilters() {
  console.log('[Filters] Clearing all filters');
  
  resetFilters();
  resetPagination();
  
  // Reset UI
  const state = getState();
  setFilterValues(state.filters);
  updateFilterBadge();
  updateClearButtonVisibility();
  
  // Reload photos
  try {
    await loadPhotos();
  } catch (error) {
    console.error('[Filters] Error loading photos:', error);
  }
}
