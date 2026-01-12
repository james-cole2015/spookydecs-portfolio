/**
 * FilterBar Component
 * Search box and collapsible filter dropdowns for storage list
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
    this.filtersExpanded = false; // Track collapse state
  }

  /**
   * Render the filter bar
   */
  render(containerElement) {
    this.container = containerElement;
    
    const filterBar = document.createElement('div');
    filterBar.className = 'filter-bar';
    
    // Top row with search and toggle button
    const topRow = document.createElement('div');
    topRow.className = 'filter-bar-top';
    
    // Search box
    const searchGroup = document.createElement('div');
    searchGroup.className = 'filter-search';
    searchGroup.innerHTML = `
      <input 
        type="text" 
        class="filter-input" 
        placeholder="🔍 Search storage units..."
        value="${this.filters.search || ''}"
        id="storage-search"
      >
    `;
    topRow.appendChild(searchGroup);
    
    // Filter toggle button with active count
    const activeFilterCount = this.getActiveFilterCount();
    const toggleBtn = document.createElement('button');
    toggleBtn.className = `btn-toggle-filters ${this.filtersExpanded ? 'expanded' : ''}`;
    toggleBtn.innerHTML = `
      <span>Filters</span>
      ${activeFilterCount > 0 ? `<span class="filter-count">${activeFilterCount}</span>` : ''}
      <span class="toggle-icon">▼</span>
    `;
    toggleBtn.addEventListener('click', () => this.toggleFilters());
    topRow.appendChild(toggleBtn);
    
    filterBar.appendChild(topRow);
    
    // Filter dropdowns container (collapsible)
    const filtersContainer = document.createElement('div');
    filtersContainer.className = `filters-container ${this.filtersExpanded ? 'expanded' : ''}`;
    filtersContainer.id = 'filters-container';
    
    // Add filter dropdowns
    this.showFilters.forEach(filterKey => {
      const filterGroup = this.createFilterDropdown(filterKey);
      filtersContainer.appendChild(filterGroup);
    });
    
    // Clear filters button (conditionally rendered)
    if (this.hasActiveFilters()) {
      const clearBtn = document.createElement('button');
      clearBtn.className = 'btn btn-clear-filters';
      clearBtn.textContent = 'Clear Filters';
      clearBtn.addEventListener('click', () => this.clearFilters());
      filtersContainer.appendChild(clearBtn);
    }
    
    filterBar.appendChild(filtersContainer);
    
    this.container.innerHTML = '';
    this.container.appendChild(filterBar);
    
    // Attach event listeners
    this.attachEventListeners();
  }

  /**
   * Toggle filters visibility
   */
  toggleFilters() {
    this.filtersExpanded = !this.filtersExpanded;
    
    const filtersContainer = this.container.querySelector('#filters-container');
    const toggleBtn = this.container.querySelector('.btn-toggle-filters');
    
    if (this.filtersExpanded) {
      filtersContainer.classList.add('expanded');
      toggleBtn.classList.add('expanded');
    } else {
      filtersContainer.classList.remove('expanded');
      toggleBtn.classList.remove('expanded');
    }
  }

  /**
   * Get count of active filters (excluding 'All' and empty search)
   */
  getActiveFilterCount() {
    let count = 0;
    
    if (this.filters.search && this.filters.search !== '') {
      count++;
    }
    
    this.showFilters.forEach(filterKey => {
      if (this.filters[filterKey] && this.filters[filterKey] !== 'All') {
        count++;
      }
    });
    
    return count;
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
    
    // Re-render to update active filter count and clear button
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