// FilterBar Component
// Search and filter controls for items list

import { CLASS_HIERARCHY, SEASONS, ITEM_STATUS } from '../utils/item-config.js';
import { updateUrlParams, getUrlParams } from '../utils/state.js';

export class FilterBar {
  constructor(containerId, onFilterChange) {
    this.container = document.getElementById(containerId);
    this.onFilterChange = onFilterChange;
    this.filters = this.loadFiltersFromUrl();
    this.filtersOpen = false;
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

  getActiveFilterCount() {
    let count = 0;
    if (this.filters.season) count++;
    if (this.filters.class) count++;
    if (this.filters.class_type) count++;
    if (this.filters.status) count++;
    return count;
  }
  
  render() {
    if (!this.container) return;

    const isCollapsed = window.innerWidth < 769;

    if (isCollapsed) {
      this.renderCollapsed();
    } else {
      this.renderDesktop();
    }

    this.attachEventListeners();
  }

  renderDesktop() {
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
              placeholder="Search by name or ID..."
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
  }

  renderCollapsed() {
    const classTypes = this.filters.class ?
      CLASS_HIERARCHY[this.filters.class]?.types || [] : [];

    const activeFilterCount = this.getActiveFilterCount();
    const filterBadge = activeFilterCount > 0
      ? `<span class="filter-badge">${activeFilterCount}</span>`
      : '';

    this.container.innerHTML = `
      <div class="filter-bar filter-bar-collapsed">
        <div class="filters-top-row">
          <input
            type="text"
            class="filter-input filter-search-input"
            id="filter-search"
            placeholder="Search by name or ID..."
            value="${this.filters.search}"
          >
          <button class="btn-filters-toggle ${this.filtersOpen ? 'active' : ''}" id="btn-filters-toggle">
            Filters ${filterBadge}
            <span class="toggle-chevron">${this.filtersOpen ? '▲' : '▼'}</span>
          </button>
        </div>

        <div class="filters-dropdown-panel ${this.filtersOpen ? 'open' : ''}" id="filters-dropdown-panel">
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

          <div class="filter-actions filter-actions-collapsed">
            <button class="btn-clear-filters" id="btn-clear-filters">
              Clear Filters
            </button>
          </div>
        </div>
      </div>
    `;
  }
  
  attachEventListeners() {
    // Toggle button (collapsed only)
    const toggleBtn = document.getElementById('btn-filters-toggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        this.filtersOpen = !this.filtersOpen;
        const panel = document.getElementById('filters-dropdown-panel');
        const chevron = toggleBtn.querySelector('.toggle-chevron');
        if (this.filtersOpen) {
          panel.classList.add('open');
          toggleBtn.classList.add('active');
          chevron.textContent = '▲';
        } else {
          panel.classList.remove('open');
          toggleBtn.classList.remove('active');
          chevron.textContent = '▼';
        }
      });
    }

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
        this.filters.class_type = '';
        this.render();
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
    updateUrlParams(this.filters, true);
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
      if (this.filters.search) {
        const search = this.filters.search.toLowerCase();
        const name = (item.short_name || '').toLowerCase();
        const id = (item.id || '').toLowerCase();
        if (!name.includes(search) && !id.includes(search)) return false;
      }
      
      if (this.filters.season && item.season !== this.filters.season) {
        return false;
      }
      
      if (this.filters.class && item.class !== this.filters.class) {
        return false;
      }
      
      if (this.filters.class_type && item.class_type !== this.filters.class_type) {
        return false;
      }
      
      if (this.filters.status && item.status !== this.filters.status) {
        return false;
      }
      
      return true;
    });
  }
}