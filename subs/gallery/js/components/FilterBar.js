/**
 * FilterBar Component
 * 
 * Search input, season filter, year filter, and upload button
 */

import { SEASONS, SEASON_LABELS } from '../utils/images-config.js';
import { getFiltersFromURL, updateFiltersInURL } from '../utils/state.js';
import { navigate } from '../utils/router.js';

/**
 * Render the filter bar
 * @param {HTMLElement} container - Container element
 * @param {Function} onFilterChange - Callback when filters change
 */
export function renderFilterBar(container, onFilterChange) {
  const currentFilters = getFiltersFromURL();
  
  // Get unique years (you might want to fetch this from API)
  const currentYear = new Date().getFullYear();
  const years = [currentYear, currentYear - 1, currentYear - 2];
  
  container.innerHTML = `
    <div class="filter-bar">
      <div class="filter-left">
        <div class="search-box">
          <input 
            type="text" 
            id="search-input" 
            placeholder="Search by caption or tags..." 
            value="${currentFilters.search || ''}"
            class="search-input"
          />
          <button id="search-btn" class="search-button" aria-label="Search">
            🔍
          </button>
          ${currentFilters.search ? '<button id="clear-search-btn" class="clear-button" aria-label="Clear search">✕</button>' : ''}
        </div>
        
        <select id="season-filter" class="filter-select">
          <option value="">All Seasons</option>
          ${Object.values(SEASONS).map(season => `
            <option value="${season}" ${currentFilters.season === season ? 'selected' : ''}>
              ${SEASON_LABELS[season]}
            </option>
          `).join('')}
        </select>
        
        <select id="year-filter" class="filter-select">
          <option value="">All Years</option>
          ${years.map(year => `
            <option value="${year}" ${currentFilters.year == year ? 'selected' : ''}>
              ${year}
            </option>
          `).join('')}
        </select>
        
        <button id="clear-filters-btn" class="btn-secondary">
          Clear Filters
        </button>
      </div>
      
      <div class="filter-right">
        <button id="upload-btn" class="btn-primary">
          📤 Upload Photos
        </button>
      </div>
    </div>
  `;
  
  // Attach event listeners
  attachFilterListeners(container, onFilterChange);
}

/**
 * Attach event listeners to filter elements
 * @param {HTMLElement} container - Container element
 * @param {Function} onFilterChange - Callback when filters change
 */
function attachFilterListeners(container, onFilterChange) {
  const searchInput = container.querySelector('#search-input');
  const searchBtn = container.querySelector('#search-btn');
  const clearSearchBtn = container.querySelector('#clear-search-btn');
  const seasonFilter = container.querySelector('#season-filter');
  const yearFilter = container.querySelector('#year-filter');
  const clearFiltersBtn = container.querySelector('#clear-filters-btn');
  const uploadBtn = container.querySelector('#upload-btn');
  
  // Search functionality
  const handleSearch = () => {
    const searchValue = searchInput.value.trim();
    applyFilters({ search: searchValue || null });
  };
  
  searchBtn.addEventListener('click', handleSearch);
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  });
  
  if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', () => {
      searchInput.value = '';
      applyFilters({ search: null });
    });
  }
  
  // Season filter
  seasonFilter.addEventListener('change', () => {
    applyFilters({ season: seasonFilter.value || null });
  });
  
  // Year filter
  yearFilter.addEventListener('change', () => {
    applyFilters({ year: yearFilter.value || null });
  });
  
  // Clear all filters
  clearFiltersBtn.addEventListener('click', () => {
    searchInput.value = '';
    seasonFilter.value = '';
    yearFilter.value = '';
    
    const currentFilters = getFiltersFromURL();
    updateFiltersInURL({
      photo_type: currentFilters.photo_type, // Keep current tab
      search: null,
      season: null,
      year: null,
      next_token: null
    }, true);
    
    if (onFilterChange) {
      onFilterChange();
    }
  });
  
  // Upload button
  uploadBtn.addEventListener('click', () => {
    navigate('/images/upload');
  });
  
  /**
   * Apply filter changes and trigger callback
   * @param {Object} updates - Filter updates
   */
  function applyFilters(updates) {
    const currentFilters = getFiltersFromURL();
    
    updateFiltersInURL({
      ...currentFilters,
      ...updates,
      next_token: null // Reset pagination when filters change
    }, true);
    
    if (onFilterChange) {
      onFilterChange();
    }
  }
}

/**
 * Get current filter values
 * @param {HTMLElement} container - Container element
 * @returns {Object} Current filter values
 */
export function getFilterValues(container) {
  const searchInput = container.querySelector('#search-input');
  const seasonFilter = container.querySelector('#season-filter');
  const yearFilter = container.querySelector('#year-filter');
  
  return {
    search: searchInput?.value.trim() || null,
    season: seasonFilter?.value || null,
    year: yearFilter?.value || null
  };
}

/**
 * Reset all filters
 * @param {HTMLElement} container - Container element
 */
export function resetFilters(container) {
  const searchInput = container.querySelector('#search-input');
  const seasonFilter = container.querySelector('#season-filter');
  const yearFilter = container.querySelector('#year-filter');
  
  if (searchInput) searchInput.value = '';
  if (seasonFilter) seasonFilter.value = '';
  if (yearFilter) yearFilter.value = '';
}
