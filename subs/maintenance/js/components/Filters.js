// Filters component with pill-style multi-select and autocomplete

import { appState } from '../state.js';
import { searchItems } from '../api.js';
import { debounce } from '../utils/helpers.js';

export class Filters {
  constructor(onFilterChange) {
    this.onFilterChange = onFilterChange;
    this.autocompleteResults = [];
    
    this.filterOptions = {
      season: ['Halloween', 'Christmas', 'Shared'],
      status: ['scheduled', 'in_progress', 'completed', 'cancelled', 'pending'],
      criticality: ['low', 'medium', 'high', 'none']
    };
    
    this.debouncedSearch = debounce(this.performItemSearch.bind(this), 300);
  }
  
  render() {
    const state = appState.getState();
    const filters = state.filters;
    
    return `
      <div class="filters-container">
        <div class="filters-header">
          <h3>Record Filters</h3>
          ${this.hasActiveFilters() ? this.renderClearButton() : ''}
        </div>
        
        <div class="filters-grid">
          <!-- Season Filter -->
          <div class="filter-group">
            <label>Season</label>
            <div class="filter-dropdown">
              <button class="filter-dropdown-btn" data-filter="season">
                Select Season
                ${filters.season.length > 0 ? `<span class="filter-badge">${filters.season.length}</span>` : ''}
              </button>
              <div class="filter-dropdown-menu" data-menu="season">
                ${this.renderDropdownOptions('season', filters.season)}
              </div>
            </div>
            <div class="filter-pills">
              ${this.renderPills(filters.season, 'season')}
            </div>
          </div>
          
          <!-- Status Filter -->
          <div class="filter-group">
            <label>Status</label>
            <div class="filter-dropdown">
              <button class="filter-dropdown-btn" data-filter="status">
                Select Status
                ${filters.status.length > 0 ? `<span class="filter-badge">${filters.status.length}</span>` : ''}
              </button>
              <div class="filter-dropdown-menu" data-menu="status">
                ${this.renderDropdownOptions('status', filters.status)}
              </div>
            </div>
            <div class="filter-pills">
              ${this.renderPills(filters.status, 'status')}
            </div>
          </div>
          
          <!-- Criticality Filter -->
          <div class="filter-group">
            <label>Criticality</label>
            <div class="filter-dropdown">
              <button class="filter-dropdown-btn" data-filter="criticality">
                Select Criticality
                ${filters.criticality.length > 0 ? `<span class="filter-badge">${filters.criticality.length}</span>` : ''}
              </button>
              <div class="filter-dropdown-menu" data-menu="criticality">
                ${this.renderDropdownOptions('criticality', filters.criticality)}
              </div>
            </div>
            <div class="filter-pills">
              ${this.renderPills(filters.criticality, 'criticality')}
            </div>
          </div>
          
          <!-- Item ID Autocomplete -->
          <div class="filter-group">
            <label>Item ID</label>
            <div class="autocomplete-container">
              <input 
                type="text" 
                class="autocomplete-input" 
                placeholder="Search items..."
                data-autocomplete="itemId"
                value="${filters.itemId || ''}"
              >
              <div class="autocomplete-results" data-results="itemId"></div>
            </div>
          </div>
          
          <!-- Date Range -->
          <div class="filter-group">
            <label>Created Date Range</label>
            <div class="date-range">
              <input 
                type="date" 
                class="date-input" 
                data-date="start"
                value="${filters.dateRange.start || ''}"
              >
              <span>to</span>
              <input 
                type="date" 
                class="date-input" 
                data-date="end"
                value="${filters.dateRange.end || ''}"
              >
            </div>
          </div>
        </div>
      </div>
    `;
  }
  
  renderDropdownOptions(filterType, selected) {
    return this.filterOptions[filterType].map(option => {
      const isSelected = selected.includes(option);
      const displayName = option.replace('_', ' ');
      
      return `
        <div class="filter-option ${isSelected ? 'selected' : ''}" data-filter-type="${filterType}" data-value="${option}">
          <input type="checkbox" ${isSelected ? 'checked' : ''}>
          <span>${displayName.charAt(0).toUpperCase() + displayName.slice(1)}</span>
        </div>
      `;
    }).join('');
  }
  
  renderPills(values, filterType) {
    return values.map(value => {
      const displayName = value.replace('_', ' ');
      return `
        <span class="filter-pill" data-filter-type="${filterType}" data-value="${value}">
          ${displayName.charAt(0).toUpperCase() + displayName.slice(1)}
          <button class="pill-remove">×</button>
        </span>
      `;
    }).join('');
  }
  
  renderClearButton() {
    return `
      <button class="clear-filters-btn">
        Clear All Filters
      </button>
    `;
  }
  
  hasActiveFilters() {
    const filters = appState.getState().filters;
    return filters.season.length > 0 ||
           filters.status.length > 0 ||
           filters.criticality.length > 0 ||
           filters.itemId !== '' ||
           filters.dateRange.start !== null ||
           filters.dateRange.end !== null;
  }
  
  attachEventListeners(container) {
    // Dropdown toggle
    const dropdownBtns = container.querySelectorAll('.filter-dropdown-btn');
    dropdownBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const filterType = btn.getAttribute('data-filter');
        const menu = container.querySelector(`[data-menu="${filterType}"]`);
        
        // Close other dropdowns
        container.querySelectorAll('.filter-dropdown-menu').forEach(m => {
          if (m !== menu) m.classList.remove('show');
        });
        
        menu.classList.toggle('show');
      });
    });
    
    // Close dropdowns when clicking outside
    document.addEventListener('click', () => {
      container.querySelectorAll('.filter-dropdown-menu').forEach(m => m.classList.remove('show'));
    });
    
    // Filter options
    const options = container.querySelectorAll('.filter-option');
    options.forEach(option => {
      option.addEventListener('click', () => {
        const filterType = option.getAttribute('data-filter-type');
        const value = option.getAttribute('data-value');
        this.toggleFilter(filterType, value);
      });
    });
    
    // Pill remove buttons
    const pillRemoves = container.querySelectorAll('.pill-remove');
    pillRemoves.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const pill = btn.closest('.filter-pill');
        const filterType = pill.getAttribute('data-filter-type');
        const value = pill.getAttribute('data-value');
        this.toggleFilter(filterType, value);
      });
    });
    
    // Clear all filters
    const clearBtn = container.querySelector('.clear-filters-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        appState.clearFilters();
        if (this.onFilterChange) this.onFilterChange();
      });
    }
    
    // Item ID autocomplete
    const autocompleteInput = container.querySelector('[data-autocomplete="itemId"]');
    if (autocompleteInput) {
      autocompleteInput.addEventListener('input', (e) => {
        const query = e.target.value;
        if (query.length >= 2) {
          this.debouncedSearch(query, container);
        } else {
          this.hideAutocompleteResults(container);
        }
      });
      
      autocompleteInput.addEventListener('change', (e) => {
        appState.setFilter('itemId', e.target.value);
        if (this.onFilterChange) this.onFilterChange();
      });
    }
    
    // Date range inputs
    const dateInputs = container.querySelectorAll('.date-input');
    dateInputs.forEach(input => {
      input.addEventListener('change', (e) => {
        const type = input.getAttribute('data-date');
        const filters = appState.getState().filters;
        const dateRange = { ...filters.dateRange };
        dateRange[type] = e.target.value || null;
        appState.setFilter('dateRange', dateRange);
        if (this.onFilterChange) this.onFilterChange();
      });
    });
  }
  
  toggleFilter(filterType, value) {
    const filters = appState.getState().filters;
    const currentValues = [...filters[filterType]];
    
    const index = currentValues.indexOf(value);
    if (index > -1) {
      currentValues.splice(index, 1);
    } else {
      currentValues.push(value);
    }
    
    appState.setFilter(filterType, currentValues);
    if (this.onFilterChange) this.onFilterChange();
  }
  
  async performItemSearch(query, container) {
    try {
      const result = await searchItems(query);
      this.autocompleteResults = result.items || [];
      this.showAutocompleteResults(container);
    } catch (error) {
      console.error('Search failed:', error);
      this.hideAutocompleteResults(container);
    }
  }
  
  showAutocompleteResults(container) {
    const resultsDiv = container.querySelector('[data-results="itemId"]');
    if (!resultsDiv) return;
    
    if (this.autocompleteResults.length === 0) {
      resultsDiv.innerHTML = '<div class="autocomplete-empty">No items found</div>';
      resultsDiv.classList.add('show');
      return;
    }
    
    const resultsHtml = this.autocompleteResults.map(item => `
      <div class="autocomplete-result" data-item-id="${item.id}">
        <strong>${item.id}</strong> - ${item.short_name || 'Unnamed Item'}
      </div>
    `).join('');
    
    resultsDiv.innerHTML = resultsHtml;
    resultsDiv.classList.add('show');
    
    // Attach click handlers
    const resultItems = resultsDiv.querySelectorAll('.autocomplete-result');
    resultItems.forEach(item => {
      item.addEventListener('click', () => {
        const itemId = item.getAttribute('data-item-id');
        const input = container.querySelector('[data-autocomplete="itemId"]');
        if (input) {
          input.value = itemId;
          appState.setFilter('itemId', itemId);
          if (this.onFilterChange) this.onFilterChange();
        }
        this.hideAutocompleteResults(container);
      });
    });
  }
  
  hideAutocompleteResults(container) {
    const resultsDiv = container.querySelector('[data-results="itemId"]');
    if (resultsDiv) {
      resultsDiv.classList.remove('show');
      resultsDiv.innerHTML = '';
    }
  }
}
