// FilterBar Component
// Search and filter controls for items list

import { CLASS_HIERARCHY, SEASONS, ITEM_STATUS } from '../utils/item-config.js';
import { updateUrlParams, getUrlParams } from '../utils/state.js';

export class FilterBar {
  constructor(containerId, onFilterChange) {
    this.container = document.getElementById(containerId);
    this.onFilterChange = onFilterChange;
    this.filters = this.loadFiltersFromUrl();
  }
  
  loadFiltersFromUrl() {
    const params = getUrlParams();
    return {
      search: params.search || '',
      season: params.season || '',
      class: params.class || '',
      class_type: params.class_type || '',
      status: params.status || ''
    };
  }
  
  render() {
    if (!this.container) return;
    
    // Get available class types based on selected class
    const classTypes = this.filters.class ? 
      CLASS_HIERARCHY[this.filters.class]?.types || [] : [];
    
    this.container.innerHTML = `
      <div class="filter-bar">
        <div class="filter-row">
          <div class="filter-group">
            <label class="filter-label">Status</label>
            <select class="filter-select" id="filter-status">
              <option value="">All Status</option>
              ${ITEM_STATUS.map(s => `
                <option value="${s.value}" ${this.filters.status === s.value ? 'selected' : ''}>
                  ${s.label}
                </option>
              `).join('')}
            </select>
          </div>

          <div class="filter-group">
            <label class="filter-label">Season</label>
            <select class="filter-select" id="filter-season">
              <option value="">All Seasons</option>
              ${SEASONS.map(s => `
                <option value="${s.value}" ${this.filters.season === s.value ? 'selected' : ''}>
                  ${s.icon} ${s.label}
                </option>
              `).join('')}
            </select>
          </div>

          <div class="filter-group">
            <label class="filter-label">Class</label>
            <select class="filter-select" id="filter-class">
              <option value="">All Classes</option>
              ${Object.keys(CLASS_HIERARCHY).map(cls => `
                <option value="${cls}" ${this.filters.class === cls ? 'selected' : ''}>
                  ${CLASS_HIERARCHY[cls].icon} ${cls}
                </option>
              `).join('')}
            </select>
          </div>

          <div class="filter-group">
            <label class="filter-label">Type</label>
            <select class="filter-select" id="filter-class-type" ${!this.filters.class ? 'disabled' : ''}>
              <option value="">All Types</option>
              ${classTypes.map(type => `
                <option value="${type}" ${this.filters.class_type === type ? 'selected' : ''}>
                  ${type}
                </option>
              `).join('')}
            </select>
          </div>
        </div>

        <div class="filter-row filter-row-search">
          <div class="filter-group filter-group-search">
            <label class="filter-label">Search</label>
            <input
              type="text"
              class="filter-input"
              id="filter-search"
              placeholder="Search by name..."
              value="${this.filters.search}"
            >
          </div>

          <div class="filter-actions">
            <button class="btn-clear-filters" id="btn-clear-filters">
              Clear Filters
            </button>
          </div>
        </div>
      </div>
    `;
    
    this.attachEventListeners();
  }
  
  attachEventListeners() {
    // Search input - debounced
    const searchInput = document.getElementById('filter-search');
    if (searchInput) {
      let debounceTimer;
      searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          this.filters.search = e.target.value.trim();
          this.updateFilters();
        }, 300);
      });
    }
    
    // Season select
    const seasonSelect = document.getElementById('filter-season');
    if (seasonSelect) {
      seasonSelect.addEventListener('change', (e) => {
        this.filters.season = e.target.value;
        this.updateFilters();
      });
    }
    
    // Class select
    const classSelect = document.getElementById('filter-class');
    if (classSelect) {
      classSelect.addEventListener('change', (e) => {
        this.filters.class = e.target.value;
        // Reset class_type when class changes
        this.filters.class_type = '';
        this.render(); // Re-render to update class_type options
        this.updateFilters();
      });
    }
    
    // Class type select
    const classTypeSelect = document.getElementById('filter-class-type');
    if (classTypeSelect) {
      classTypeSelect.addEventListener('change', (e) => {
        this.filters.class_type = e.target.value;
        this.updateFilters();
      });
    }
    
    // Status select
    const statusSelect = document.getElementById('filter-status');
    if (statusSelect) {
      statusSelect.addEventListener('change', (e) => {
        this.filters.status = e.target.value;
        this.updateFilters();
      });
    }
    
    // Clear filters button
    const clearBtn = document.getElementById('btn-clear-filters');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        this.clearFilters();
      });
    }
  }
  
  updateFilters() {
    // Update URL
    updateUrlParams(this.filters, true);
    
    // Notify parent
    if (this.onFilterChange) {
      this.onFilterChange(this.filters);
    }
  }
  
  clearFilters() {
    this.filters = {
      search: '',
      season: '',
      class: '',
      class_type: '',
      status: ''
    };
    
    this.render();
    this.updateFilters();
  }
  
  getFilters() {
    return { ...this.filters };
  }
  
  applyFilters(items) {
    return items.filter(item => {
      // Search filter
      if (this.filters.search) {
        const search = this.filters.search.toLowerCase();
        const name = (item.short_name || '').toLowerCase();
        if (!name.includes(search)) return false;
      }
      
      // Season filter
      if (this.filters.season && item.season !== this.filters.season) {
        return false;
      }
      
      // Class filter
      if (this.filters.class && item.class !== this.filters.class) {
        return false;
      }
      
      // Class type filter
      if (this.filters.class_type && item.class_type !== this.filters.class_type) {
        return false;
      }
      
      // Status filter
      if (this.filters.status && item.status !== this.filters.status) {
        return false;
      }
      
      return true;
    });
  }
}