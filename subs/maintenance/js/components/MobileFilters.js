// Mobile filters component - slide-up drawer with all filter controls

import { appState } from '../state.js';
import { searchItems } from '../api.js';
import { debounce } from '../utils/helpers.js';

export class MobileFilters {
  constructor(onFilterChange) {
    this.onFilterChange = onFilterChange;
    this.isOpen = false;
    this.autocompleteResults = [];
    
    this.filterOptions = {
      season: ['Halloween', 'Christmas', 'Shared'],
      status: ['scheduled', 'in_progress', 'completed', 'cancelled', 'pending'],
      criticality: ['low', 'medium', 'high', 'none'],
      classType: ['Decoration', 'Light', 'Accessory']
    };
    
    this.debouncedSearch = debounce(this.performItemSearch.bind(this), 300);
  }
  
  render() {
    const filters = appState.getState().filters;
    const activeFilterCount = this.getActiveFilterCount();
    
    return `
      <!-- Mobile Filter Trigger Button -->
      <button class="filters-mobile-trigger" id="mobile-filters-trigger">
        <span class="filter-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 4.5H21V6.5H3V4.5Z" fill="currentColor"/>
            <path d="M6 9.5H18V11.5H6V9.5Z" fill="currentColor"/>
            <path d="M9 14.5H15V16.5H9V14.5Z" fill="currentColor"/>
            <path d="M11 19.5H13V21.5H11V19.5Z" fill="currentColor"/>
          </svg>
        </span>
        <span>Filters</span>
        ${activeFilterCount > 0 ? `<span class="filter-count">${activeFilterCount}</span>` : ''}
      </button>
      
      <!-- Filter Overlay -->
      <div class="filters-mobile-overlay" id="mobile-filters-overlay"></div>
      
      <!-- Filter Drawer -->
      <div class="filters-mobile-drawer" id="mobile-filters-drawer">
        <div class="filters-mobile-drawer-header">
          <h3>Filters</h3>
          <button class="filters-mobile-close" id="mobile-filters-close">✕</button>
        </div>
        
        <div class="filters-mobile-drawer-content">
          ${this.renderFilterGroups(filters)}
        </div>
        
        <div class="filters-mobile-drawer-footer">
          <button class="filters-clear-btn" id="mobile-filters-clear">Clear All</button>
          <button class="filters-apply-btn" id="mobile-filters-apply">Apply</button>
        </div>
      </div>
    `;
  }
  
  renderFilterGroups(filters) {
    return `
      <!-- Season Filter -->
      <div class="filter-group">
        <label>Season</label>
        <div class="filter-options">
          ${this.renderCheckboxOptions('season', filters.season)}
        </div>
      </div>
      
      <!-- Status Filter -->
      <div class="filter-group">
        <label>Status</label>
        <div class="filter-options">
          ${this.renderCheckboxOptions('status', filters.status)}
        </div>
      </div>
      
      <!-- Criticality Filter -->
      <div class="filter-group">
        <label>Criticality</label>
        <div class="filter-options">
          ${this.renderCheckboxOptions('criticality', filters.criticality)}
        </div>
      </div>
      
      <!-- Class Type Filter -->
      <div class="filter-group">
        <label>Class</label>
        <div class="filter-options">
          ${this.renderCheckboxOptions('classType', filters.classType)}
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
    `;
  }
  
  renderCheckboxOptions(filterType, selected) {
    return this.filterOptions[filterType].map(option => {
      const isSelected = selected.includes(option);
      const displayName = option.replace('_', ' ');
      const formattedName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
      
      return `
        <div class="filter-option ${isSelected ? 'selected' : ''}" data-filter-type="${filterType}" data-value="${option}">
          <input type="checkbox" ${isSelected ? 'checked' : ''} id="filter-${filterType}-${option}">
          <label for="filter-${filterType}-${option}">${formattedName}</label>
        </div>
      `;
    }).join('');
  }
  
  getActiveFilterCount() {
    const filters = appState.getState().filters;
    let count = 0;
    
    count += filters.season.length;
    count += filters.status.length;
    count += filters.criticality.length;
    count += filters.classType.length;
    if (filters.itemId) count++;
    if (filters.dateRange.start) count++;
    if (filters.dateRange.end) count++;
    
    return count;
  }
  
  attachEventListeners(container) {
    const trigger = container.querySelector('#mobile-filters-trigger');
    const overlay = container.querySelector('#mobile-filters-overlay');
    const drawer = container.querySelector('#mobile-filters-drawer');
    const closeBtn = container.querySelector('#mobile-filters-close');
    const applyBtn = container.querySelector('#mobile-filters-apply');
    const clearBtn = container.querySelector('#mobile-filters-clear');
    
    // Open drawer
    if (trigger) {
      trigger.addEventListener('click', () => {
        this.openDrawer(overlay, drawer);
      });
    }
    
    // Close drawer
    const closeDrawer = () => {
      this.closeDrawer(overlay, drawer);
    };
    
    if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
    if (overlay) overlay.addEventListener('click', closeDrawer);
    
    // Apply filters
    if (applyBtn) {
      applyBtn.addEventListener('click', () => {
        closeDrawer();
        if (this.onFilterChange) this.onFilterChange();
      });
    }
    
    // Clear all filters
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        appState.clearFilters();
        // Re-render drawer content
        const drawerContent = drawer.querySelector('.filters-mobile-drawer-content');
        if (drawerContent) {
          const filters = appState.getState().filters;
          drawerContent.innerHTML = this.renderFilterGroups(filters);
          this.attachDrawerContentListeners(container);
        }
      });
    }
    
    // Attach filter control listeners
    this.attachDrawerContentListeners(container);
  }
  
  attachDrawerContentListeners(container) {
    const drawer = container.querySelector('#mobile-filters-drawer');
    if (!drawer) return;
    
    // Checkbox filter options
    const options = drawer.querySelectorAll('.filter-option');
    options.forEach(option => {
      option.addEventListener('click', (e) => {
        // Prevent double-triggering if clicking the checkbox directly
        if (e.target.tagName === 'INPUT') return;
        
        const checkbox = option.querySelector('input[type="checkbox"]');
        if (checkbox) {
          checkbox.checked = !checkbox.checked;
          const filterType = option.getAttribute('data-filter-type');
          const value = option.getAttribute('data-value');
          this.toggleFilter(filterType, value, checkbox.checked);
        }
      });
      
      // Also handle direct checkbox clicks
      const checkbox = option.querySelector('input[type="checkbox"]');
      if (checkbox) {
        checkbox.addEventListener('change', (e) => {
          const filterType = option.getAttribute('data-filter-type');
          const value = option.getAttribute('data-value');
          this.toggleFilter(filterType, value, e.target.checked);
        });
      }
    });
    
    // Item ID autocomplete
    const autocompleteInput = drawer.querySelector('[data-autocomplete="itemId"]');
    if (autocompleteInput) {
      autocompleteInput.addEventListener('input', (e) => {
        const query = e.target.value;
        if (query.length >= 2) {
          this.debouncedSearch(query, drawer);
        } else {
          this.hideAutocompleteResults(drawer);
        }
      });
      
      autocompleteInput.addEventListener('change', (e) => {
        appState.setFilter('itemId', e.target.value);
      });
    }
    
    // Date range inputs
    const dateInputs = drawer.querySelectorAll('.date-input');
    dateInputs.forEach(input => {
      input.addEventListener('change', (e) => {
        const type = input.getAttribute('data-date');
        const filters = appState.getState().filters;
        const dateRange = { ...filters.dateRange };
        dateRange[type] = e.target.value || null;
        appState.setFilter('dateRange', dateRange);
      });
    });
  }
  
  toggleFilter(filterType, value, isChecked) {
    const filters = appState.getState().filters;
    const currentValues = [...filters[filterType]];
    
    if (isChecked) {
      if (!currentValues.includes(value)) {
        currentValues.push(value);
      }
    } else {
      const index = currentValues.indexOf(value);
      if (index > -1) {
        currentValues.splice(index, 1);
      }
    }
    
    appState.setFilter(filterType, currentValues);
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
    
    // Attach mousedown handlers (mousedown fires before blur/change, preventing focus loss)
    const resultItems = resultsDiv.querySelectorAll('.autocomplete-result');
    resultItems.forEach(item => {
      item.addEventListener('mousedown', (e) => {
        e.preventDefault();
        const itemId = item.getAttribute('data-item-id');
        const input = container.querySelector('[data-autocomplete="itemId"]');
        if (input) {
          input.value = itemId;
          appState.getState().filters.itemId = itemId;
          appState.applyFilters();
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
  
  openDrawer(overlay, drawer) {
    this.isOpen = true;
    overlay.classList.add('show');
    drawer.classList.add('show');
    document.body.style.overflow = 'hidden'; // Prevent background scroll
  }
  
  closeDrawer(overlay, drawer) {
    this.isOpen = false;
    overlay.classList.remove('show');
    drawer.classList.remove('show');
    document.body.style.overflow = ''; // Restore scroll
  }
}