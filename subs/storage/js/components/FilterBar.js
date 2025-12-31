/**
 * FilterBar Component
 * Search box and filter dropdowns for storage list
 */

import { getFiltersFromUrl, saveFiltersToUrl } from '../utils/state.js';
import STORAGE_CONFIG from '../utils/storage-config.js';

export class FilterBar {
  constructor(options = {}) {
    this.filters = options.filters || getFiltersFromUrl();
    this.onChange = options.onChange || (() => {});
    this.showFilters = options.showFilters || ['location', 'class_type', 'packed', 'size'];
    this.container = null;
    this.debounceTimer = null;
  }

  /**
   * Render the filter bar
   */
  render(containerElement) {
    this.container = containerElement;
    
    const filterBar = document.createElement('div');
    filterBar.className = 'filter-bar';
    
    // Search box
    const searchGroup = document.createElement('div');
    searchGroup.className = 'filter-group filter-search';
    searchGroup.innerHTML = `
      <input 
        type="text" 
        class="filter-input" 
        placeholder="🔍 Search storage units..."
        value="${this.filters.search || ''}"
        id="storage-search"
      >
    `;
    filterBar.appendChild(searchGroup);
    
    // Filter dropdowns container
    const filtersContainer = document.createElement('div');
    filtersContainer.className = 'filters-container';
    
    // Add filter dropdowns
    this.showFilters.forEach(filterKey => {
      const filterGroup = this.createFilterDropdown(filterKey);
      filtersContainer.appendChild(filterGroup);
    });
    
    filterBar.appendChild(filtersContainer);
    
    // Clear filters button (conditionally rendered)
    if (this.hasActiveFilters()) {
      const clearBtn = document.createElement('button');
      clearBtn.className = 'btn btn-clear-filters';
      clearBtn.textContent = 'Clear Filters';
      clearBtn.addEventListener('click', () => this.clearFilters());
      filterBar.appendChild(clearBtn);
    }
    
    this.container.innerHTML = '';
    this.container.appendChild(filterBar);
    
    // Attach event listeners
    this.attachEventListeners();
  }

  /**
   * Create filter dropdown
   */
  createFilterDropdown(filterKey) {
    const group = document.createElement('div');
    group.className = 'filter-group filter-dropdown';
    
    const label = this.getFilterLabel(filterKey);
    const options = STORAGE_CONFIG.FILTER_OPTIONS[filterKey] || [];
    const currentValue = this.filters[filterKey] || 'All';
    
    group.innerHTML = `
      <select class="filter-select" data-filter="${filterKey}">
        ${options.map(option => `
          <option value="${option}" ${option === currentValue ? 'selected' : ''}>
            ${label}: ${option}
          </option>
        `).join('')}
      </select>
    `;
    
    return group;
  }

  /**
   * Get human-readable filter label
   */
  getFilterLabel(filterKey) {
    const labels = {
      location: 'Location',
      class_type: 'Type',
      packed: 'Status',
      size: 'Size',
      season: 'Season'
    };
    return labels[filterKey] || filterKey;
  }

  /**
   * Check if there are active filters
   */
  hasActiveFilters() {
    return (
      (this.filters.search && this.filters.search !== '') ||
      (this.filters.location && this.filters.location !== 'All') ||
      (this.filters.class_type && this.filters.class_type !== 'All') ||
      (this.filters.packed && this.filters.packed !== 'All') ||
      (this.filters.size && this.filters.size !== 'All')
    );
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Search input with debounce
    const searchInput = this.container.querySelector('#storage-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
          this.handleFilterChange('search', e.target.value);
        }, 300);
      });
    }
    
    // Filter dropdowns
    const selects = this.container.querySelectorAll('.filter-select');
    selects.forEach(select => {
      select.addEventListener('change', (e) => {
        const filterKey = e.target.dataset.filter;
        this.handleFilterChange(filterKey, e.target.value);
      });
    });
  }

  /**
   * Handle filter change
   */
  handleFilterChange(filterKey, value) {
    this.filters[filterKey] = value;
    saveFiltersToUrl(this.filters);
    
    // Re-render to show/hide clear button
    this.render(this.container);
    
    this.onChange(this.filters);
  }

  /**
   * Clear all filters
   */
  clearFilters() {
    this.filters = {
      season: 'All',
      location: 'All',
      class_type: 'All',
      packed: 'All',
      size: 'All',
      search: ''
    };
    
    saveFiltersToUrl(this.filters);
    this.render(this.container);
    this.onChange(this.filters);
  }

  /**
   * Get current filters
   */
  getFilters() {
    return { ...this.filters };
  }

  /**
   * Set filters programmatically
   */
  setFilters(filters) {
    this.filters = { ...this.filters, ...filters };
    saveFiltersToUrl(this.filters);
    
    if (this.container) {
      this.render(this.container);
    }
  }

  /**
   * Update filter values in UI
   */
  updateUI() {
    // Update search input
    const searchInput = this.container.querySelector('#storage-search');
    if (searchInput) {
      searchInput.value = this.filters.search || '';
    }
    
    // Update dropdowns
    const selects = this.container.querySelectorAll('.filter-select');
    selects.forEach(select => {
      const filterKey = select.dataset.filter;
      select.value = this.filters[filterKey] || 'All';
    });
  }
}

export default FilterBar;