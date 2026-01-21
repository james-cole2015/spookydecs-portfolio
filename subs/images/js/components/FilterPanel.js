// Filter Panel Component
import { IMAGES_CONFIG } from '../utils/images-config.js';

export function FilterPanel(currentFilters = {}, onFilterChange) {
  const panel = document.createElement('div');
  panel.className = 'filter-panel';
  
  panel.innerHTML = `
    <div class="filter-header">
      <button class="btn btn-secondary btn-sm filter-toggle">
        <span class="filter-icon">🔍</span> Filters
      </button>
      <div class="filter-search">
        <input 
          type="text" 
          class="search-input" 
          placeholder="Search by ID or caption..."
          value="${currentFilters.search || ''}"
        />
      </div>
    </div>
    
    <div class="filter-content" style="display: none;">
      <div class="filter-grid">
        <div class="filter-group">
          <label>Season</label>
          <select name="season" class="filter-select">
            ${IMAGES_CONFIG.FILTER_OPTIONS.season.map(opt => `
              <option value="${opt.value}" ${currentFilters.season === opt.value ? 'selected' : ''}>
                ${opt.label}
              </option>
            `).join('')}
          </select>
        </div>
        
        <div class="filter-group">
          <label>Category</label>
          <select name="category" class="filter-select">
            ${IMAGES_CONFIG.FILTER_OPTIONS.category.map(opt => `
              <option value="${opt.value}" ${currentFilters.category === opt.value ? 'selected' : ''}>
                ${opt.label}
              </option>
            `).join('')}
          </select>
        </div>
        
        <div class="filter-group">
          <label>Year</label>
          <input 
            type="number" 
            name="year" 
            class="filter-input" 
            placeholder="YYYY"
            value="${currentFilters.year || ''}"
            min="2020"
            max="2030"
          />
        </div>
        
        <div class="filter-group">
          <label>Visibility</label>
          <select name="isPublic" class="filter-select">
            ${IMAGES_CONFIG.FILTER_OPTIONS.isPublic.map(opt => `
              <option value="${opt.value}" ${currentFilters.isPublic === opt.value ? 'selected' : ''}>
                ${opt.label}
              </option>
            `).join('')}
          </select>
        </div>
        
        <div class="filter-group">
          <label>References</label>
          <select name="hasReferences" class="filter-select">
            ${IMAGES_CONFIG.FILTER_OPTIONS.hasReferences.map(opt => `
              <option value="${opt.value}" ${currentFilters.hasReferences === opt.value ? 'selected' : ''}>
                ${opt.label}
              </option>
            `).join('')}
          </select>
        </div>
      </div>
      
      <div class="filter-actions">
        <button class="btn btn-sm btn-secondary clear-filters">Clear All</button>
        <button class="btn btn-sm btn-primary apply-filters">Apply Filters</button>
      </div>
    </div>
  `;
  
  // Toggle filter panel
  const toggleBtn = panel.querySelector('.filter-toggle');
  const content = panel.querySelector('.filter-content');
  
  toggleBtn.addEventListener('click', () => {
    const isVisible = content.style.display !== 'none';
    content.style.display = isVisible ? 'none' : 'block';
    toggleBtn.classList.toggle('active', !isVisible);
  });
  
  // Search input handler
  const searchInput = panel.querySelector('.search-input');
  let searchTimeout;
  
  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      if (onFilterChange) {
        onFilterChange({ ...getFilters(), search: e.target.value });
      }
    }, 300);
  });
  
  // Get current filter values
  function getFilters() {
    const filters = {};
    panel.querySelectorAll('.filter-select, .filter-input').forEach(input => {
      if (input.value) {
        filters[input.name] = input.value;
      }
    });
    filters.search = searchInput.value;
    return filters;
  }
  
  // Apply filters
  const applyBtn = panel.querySelector('.apply-filters');
  applyBtn.addEventListener('click', () => {
    if (onFilterChange) {
      onFilterChange(getFilters());
    }
    content.style.display = 'none';
    toggleBtn.classList.remove('active');
  });
  
  // Clear filters
  const clearBtn = panel.querySelector('.clear-filters');
  clearBtn.addEventListener('click', () => {
    panel.querySelectorAll('.filter-select').forEach(select => {
      select.selectedIndex = 0;
    });
    panel.querySelectorAll('.filter-input').forEach(input => {
      input.value = '';
    });
    searchInput.value = '';
    
    if (onFilterChange) {
      onFilterChange({});
    }
  });
  
  return panel;
}
