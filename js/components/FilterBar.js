// FilterBar Component
// Search input + pill-shaped filters

import { SEASON_OPTIONS, STATUS_OPTIONS, REPAIR_STATUS_OPTIONS } from '../utils/item-config.js';

export class FilterBar {
  constructor(containerId, onFilterChange) {
    this.container = document.getElementById(containerId);
    this.onFilterChange = onFilterChange;
    this.filters = {
      search: '',
      season: '',
      class_type: '',
      repair_status: '',
      status: ''
    };
    this.availableClassTypes = [];
    this.searchDebounceTimer = null;
  }
  
  render(filters, availableClassTypes = []) {
    this.filters = { ...filters };
    this.availableClassTypes = availableClassTypes;
    
    if (!this.container) {
      console.error('FilterBar container not found');
      return;
    }
    
    const filterBar = document.createElement('div');
    filterBar.className = 'filter-bar';
    
    // Search input
    const searchContainer = document.createElement('div');
    searchContainer.className = 'filter-search';
    
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Search by name or ID...';
    searchInput.className = 'search-input';
    searchInput.value = this.filters.search;
    
    searchInput.addEventListener('input', (e) => {
      this.handleSearchInput(e.target.value);
    });
    
    searchContainer.appendChild(searchInput);
    filterBar.appendChild(searchContainer);
    
    // Filters container
    const filtersContainer = document.createElement('div');
    filtersContainer.className = 'filters-container';
    
    // Season filter
    filtersContainer.appendChild(
      this.createPillFilter('season', 'Season', SEASON_OPTIONS)
    );
    
    // Class Type filter (dynamic based on current tab)
    if (availableClassTypes.length > 0) {
      filtersContainer.appendChild(
        this.createPillFilter('class_type', 'Type', availableClassTypes)
      );
    }
    
    // Repair Status filter
    const repairOptions = REPAIR_STATUS_OPTIONS
      .filter(opt => opt.value !== '') // Remove "All" option
      .map(opt => opt.label);
    filtersContainer.appendChild(
      this.createPillFilter('repair_status', 'Repair', repairOptions, true)
    );
    
    // Status filter
    filtersContainer.appendChild(
      this.createPillFilter('status', 'Status', STATUS_OPTIONS)
    );
    
    // Clear filters button
    const clearButton = document.createElement('button');
    clearButton.className = 'btn-clear-filters';
    clearButton.textContent = '✕ Clear Filters';
    clearButton.addEventListener('click', () => this.clearAllFilters());
    
    // Only show if filters are active
    const hasActiveFilters = Object.values(this.filters).some(v => v !== '');
    clearButton.style.display = hasActiveFilters ? 'inline-block' : 'none';
    
    filtersContainer.appendChild(clearButton);
    
    filterBar.appendChild(filtersContainer);
    
    this.container.innerHTML = '';
    this.container.appendChild(filterBar);
  }
  
  createPillFilter(key, label, options, isValueBased = false) {
    const filterGroup = document.createElement('div');
    filterGroup.className = 'filter-pill-group';
    
    const filterLabel = document.createElement('span');
    filterLabel.className = 'filter-label';
    filterLabel.textContent = `${label}:`;
    filterGroup.appendChild(filterLabel);
    
    const select = document.createElement('select');
    select.className = 'filter-pill-select';
    select.dataset.filterKey = key;
    
    // Add "All" option
    const allOption = document.createElement('option');
    allOption.value = '';
    allOption.textContent = 'All';
    select.appendChild(allOption);
    
    // Add options
    options.forEach(option => {
      const optionEl = document.createElement('option');
      
      if (isValueBased) {
        // For repair_status: value is "operational" or "needs_repair"
        const valueMap = {
          'Operational': 'operational',
          'Needs Repair': 'needs_repair'
        };
        optionEl.value = valueMap[option] || option.toLowerCase().replace(' ', '_');
        optionEl.textContent = option;
      } else {
        optionEl.value = option;
        optionEl.textContent = option;
      }
      
      select.appendChild(optionEl);
    });
    
    // Set current value
    select.value = this.filters[key] || '';
    
    // Handle change
    select.addEventListener('change', (e) => {
      this.handleFilterChange(key, e.target.value);
    });
    
    filterGroup.appendChild(select);
    
    return filterGroup;
  }
  
  handleSearchInput(value) {
    // Debounce search input
    clearTimeout(this.searchDebounceTimer);
    
    this.searchDebounceTimer = setTimeout(() => {
      this.filters.search = value;
      
      if (this.onFilterChange) {
        this.onFilterChange(this.filters);
      }
    }, 300); // 300ms delay
  }
  
  handleFilterChange(key, value) {
    this.filters[key] = value;
    
    if (this.onFilterChange) {
      this.onFilterChange(this.filters);
    }
    
    // Update clear button visibility
    this.updateClearButtonVisibility();
  }
  
  clearAllFilters() {
    this.filters = {
      search: '',
      season: '',
      class_type: '',
      repair_status: '',
      status: ''
    };
    
    // Clear UI
    const searchInput = this.container.querySelector('.search-input');
    if (searchInput) searchInput.value = '';
    
    this.container.querySelectorAll('.filter-pill-select').forEach(select => {
      select.value = '';
    });
    
    // Hide clear button
    const clearButton = this.container.querySelector('.btn-clear-filters');
    if (clearButton) clearButton.style.display = 'none';
    
    if (this.onFilterChange) {
      this.onFilterChange(this.filters);
    }
  }
  
  updateClearButtonVisibility() {
    const clearButton = this.container.querySelector('.btn-clear-filters');
    if (clearButton) {
      const hasActiveFilters = Object.values(this.filters).some(v => v !== '');
      clearButton.style.display = hasActiveFilters ? 'inline-block' : 'none';
    }
  }
  
  getFilters() {
    return { ...this.filters };
  }
  
  setFilters(filters) {
    this.filters = { ...filters };
    
    // Update UI
    const searchInput = this.container.querySelector('.search-input');
    if (searchInput) searchInput.value = this.filters.search || '';
    
    this.container.querySelectorAll('.filter-pill-select').forEach(select => {
      const key = select.dataset.filterKey;
      select.value = this.filters[key] || '';
    });
    
    this.updateClearButtonVisibility();
  }
}
