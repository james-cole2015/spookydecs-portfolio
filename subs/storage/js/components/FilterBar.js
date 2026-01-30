/**
 * FilterBar Component
 * Search box and collapsible filter dropdowns for storage list
 * Now includes Season filter (replacing TabBar)
 */

import { getFiltersFromUrl, saveFiltersToUrl } from '../utils/state.js';
import STORAGE_CONFIG from '../utils/storage-config.js';

export class FilterBar {
  constructor(options = {}) {
    this.filters = options.filters || getFiltersFromUrl();
    this.onChange = options.onChange || (() => {});
    this.showFilters = options.showFilters || ['season', 'location', 'class_type', 'packed'];
    this.container = null;
    this.debounceTimer = null;
    this.filtersExpanded = false; // Mobile collapse state
  }

  /**
   * Render the filter bar
   */
  render(containerElement) {
    this.container = containerElement;
    
    const filterBar = document.createElement('div');
    filterBar.className = 'filter-bar';
    
    // Search and toggle button row
    const searchRow = document.createElement('div');
    searchRow.className = 'filter-search-row';
    
    // Search input
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.className = 'filter-search-input';
    searchInput.placeholder = '🔍 Search storage units...';
    searchInput.value = this.filters.search || '';
    searchInput.id = 'storage-search';
    searchRow.appendChild(searchInput);
    
    // Filter toggle button (mobile)
    const activeCount = this.getActiveFilterCount();
    const toggleBtn = document.createElement('button');
    toggleBtn.className = `btn-filters-toggle ${this.filtersExpanded ? 'expanded' : ''}`;
    toggleBtn.innerHTML = `
      <span>Filters</span>
      ${activeCount > 0 ? `<span class="filter-badge">${activeCount}</span>` : ''}
      <span class="toggle-arrow">${this.filtersExpanded ? '▲' : '▼'}</span>
    `;
    toggleBtn.addEventListener('click', () => this.toggleFilters());
    searchRow.appendChild(toggleBtn);
    
    filterBar.appendChild(searchRow);
    
    // Filter dropdowns container (collapsible on mobile)
    const filtersContainer = document.createElement('div');
    filtersContainer.className = `filter-dropdowns ${this.filtersExpanded ? 'expanded' : ''}`;
    filtersContainer.id = 'filter-dropdowns';
    
    // Render each filter dropdown
    this.showFilters.forEach(filterKey => {
      const dropdown = this.createFilterDropdown(filterKey);
      filtersContainer.appendChild(dropdown);
    });
    
    // Clear filters button
    if (this.hasActiveFilters()) {
      const clearBtn = document.createElement('button');
      clearBtn.className = 'btn btn-clear-filters';
      clearBtn.textContent = 'Clear All';
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
   * Toggle filters visibility (mobile)
   */
  toggleFilters() {
    this.filtersExpanded = !this.filtersExpanded;
    
    const filtersContainer = document.getElementById('filter-dropdowns');
    const toggleBtn = this.container.querySelector('.btn-filters-toggle');
    
    if (this.filtersExpanded) {
      filtersContainer.classList.add('expanded');
      toggleBtn.classList.add('expanded');
      toggleBtn.querySelector('.toggle-arrow').textContent = '▲';
    } else {
      filtersContainer.classList.remove('expanded');
      toggleBtn.classList.remove('expanded');
      toggleBtn.querySelector('.toggle-arrow').textContent = '▼';
    }
  }

  /**
   * Create filter dropdown
   */
  createFilterDropdown(filterKey) {
    const group = document.createElement('div');
    group.className = 'filter-group';
    
    const label = this.getFilterLabel(filterKey);
    const options = this.getFilterOptions(filterKey);
    const currentValue = this.filters[filterKey] || 'All';
    
    const select = document.createElement('select');
    select.className = 'filter-select';
    select.dataset.filter = filterKey;
    
    // Add "All" option
    const allOption = document.createElement('option');
    allOption.value = 'All';
    allOption.textContent = `${label}: All`;
    allOption.selected = currentValue === 'All';
    select.appendChild(allOption);
    
    // Add other options
    options.forEach(option => {
      if (option !== 'All') {
        const optionEl = document.createElement('option');
        optionEl.value = option;
        optionEl.textContent = `${label}: ${option}`;
        optionEl.selected = option === currentValue;
        select.appendChild(optionEl);
      }
    });
    
    group.appendChild(select);
    return group;
  }

  /**
   * Get filter options based on filter key
   */
  getFilterOptions(filterKey) {
    const optionsMap = {
      season: ['All', 'Halloween', 'Christmas', 'Shared'],
      location: ['All', 'Shed', 'Attic', 'Crawl Space', 'Other'],
      class_type: ['All', 'Tote', 'Self'],
      packed: ['All', 'true', 'false'],
      size: ['All', 'Small', 'Medium', 'Large', 'Extra Large']
    };
    
    return optionsMap[filterKey] || ['All'];
  }

  /**
   * Get human-readable filter label
   */
  getFilterLabel(filterKey) {
    const labels = {
      season: 'Season',
      location: 'Location',
      class_type: 'Type',
      packed: 'Status',
      size: 'Size'
    };
    return labels[filterKey] || filterKey;
  }

  /**
   * Get count of active filters (excluding 'All' and empty search)
   */
  getActiveFilterCount() {
    let count = 0;
    
    if (this.filters.search && this.filters.search.trim() !== '') {
      count++;
    }
    
    this.showFilters.forEach(filterKey => {
      const value = this.filters[filterKey];
      if (value && value !== 'All') {
        count++;
      }
    });
    
    return count;
  }

  /**
   * Check if there are active filters
   */
  hasActiveFilters() {
    return this.getActiveFilterCount() > 0;
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Search input with debounce
    const searchInput = document.getElementById('storage-search');
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
        const value = e.target.value;
        this.handleFilterChange(filterKey, value);
      });
    });
  }

  /**
   * Handle filter change
   */
  handleFilterChange(filterKey, value) {
    // Update filters
    this.filters[filterKey] = value;
    
    // Save to URL
    saveFiltersToUrl(this.filters);
    
    // Re-render to update active filter count
    this.render(this.container);
    
    // Notify parent
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
}

export default FilterBar;