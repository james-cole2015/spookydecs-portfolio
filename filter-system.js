// filter-system.js - Handles table filtering functionality

const FilterSystem = {
  activeFilters: {
    search: '',
    season: 'all',
    classType: 'all',
    repairStatus: 'all',
    location: 'all'
  },
  
  allItems: [],
  
  init() {
    this.setupFilterControls();
    this.attachEventListeners();
  },
  
  setupFilterControls() {
    const controlsDiv = document.querySelector('.controls');
    
    // Create filter container
    const filterContainer = document.createElement('div');
    filterContainer.className = 'filter-container';
    filterContainer.innerHTML = `
      <div class="filter-row">
        <select id="filterSeason" class="filter-select">
          <option value="all">All Seasons</option>
          <option value="Halloween">Halloween</option>
          <option value="Christmas">Christmas</option>
          <option value="Shared">Shared</option>
        </select>
        
        <select id="filterClassType" class="filter-select">
          <option value="all">All Class Types</option>
        </select>
        
        <select id="filterRepairStatus" class="filter-select">
          <option value="all">All Repair Status</option>
          <option value="Good">Good</option>
          <option value="Needs Repair">Needs Repair</option>
        </select>
        
        <select id="filterLocation" class="filter-select">
          <option value="all">All Locations</option>
          <option value="Shed">Shed</option>
          <option value="Crawl Space">Crawl Space</option>
        </select>
        
        <button id="btnClearFilters" class="btn-clear-filters">Clear Filters</button>
      </div>
    `;
    
    // Insert after the main controls row
    controlsDiv.parentNode.insertBefore(filterContainer, controlsDiv.nextSibling);
  },
  
  attachEventListeners() {
    // Search input
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', (e) => {
      this.activeFilters.search = e.target.value.toLowerCase();
      this.applyFilters();
    });
    
    // Filter dropdowns
    document.getElementById('filterSeason').addEventListener('change', (e) => {
      this.activeFilters.season = e.target.value;
      this.applyFilters();
    });
    
    document.getElementById('filterClassType').addEventListener('change', (e) => {
      this.activeFilters.classType = e.target.value;
      this.applyFilters();
    });
    
    document.getElementById('filterRepairStatus').addEventListener('change', (e) => {
      this.activeFilters.repairStatus = e.target.value;
      this.applyFilters();
    });
    
    document.getElementById('filterLocation').addEventListener('change', (e) => {
      this.activeFilters.location = e.target.value;
      this.applyFilters();
    });
    
    // Clear filters button
    document.getElementById('btnClearFilters').addEventListener('click', () => {
      this.clearAllFilters();
    });
  },
  
  setItems(items) {
    this.allItems = items;
    this.populateFilterOptions();
    this.applyFilters();
  },
  
  /*
  populateFilterOptions() {
    // Extract unique values for dynamic filters
    const classTypes = new Set();
    const locations = new Set();
    
    this.allItems.forEach(item => {
      if (item.class_type) classTypes.add(item.class_type);
      if (item.tote_location) locations.add(item.tote_location);
    });
    
    // Populate Class Type dropdown
    const classTypeSelect = document.getElementById('filterClassType');
    classTypeSelect.innerHTML = '<option value="all">All Class Types</option>';
    Array.from(classTypes).sort().forEach(type => {
      classTypeSelect.innerHTML += `<option value="${type}">${type}</option>`;
    });
    
    // Populate Location dropdown
    const locationSelect = document.getElementById('filterLocation');
    locationSelect.innerHTML = '<option value="all">All Locations</option>';
    Array.from(locations).sort().forEach(loc => {
      locationSelect.innerHTML += `<option value="${loc}">${loc}</option>`;
    });
  },
  */
  applyFilters() {
    const filteredItems = this.allItems.filter(item => {
      // Search filter (checks name)
      if (this.activeFilters.search) {
        const searchLower = this.activeFilters.search;
        const nameLower = (item.short_name || '').toLowerCase();
        if (!nameLower.includes(searchLower)) return false;
      }
      
      // Season filter
      if (this.activeFilters.season !== 'all') {
        if (item.season !== this.activeFilters.season) return false;
      }
      
      // Class Type filter
      if (this.activeFilters.classType !== 'all') {
        if (item.class_type !== this.activeFilters.classType) return false;
      }
      
      // Repair Status filter
      if (this.activeFilters.repairStatus !== 'all') {
        const needsRepair = item.repair_status?.needs_repair === true;
        const filterWantsRepair = this.activeFilters.repairStatus === 'Needs Repair';
        if (needsRepair !== filterWantsRepair) return false;
      }
      // Location filter
      if (this.activeFilters.location !== 'all') {
        if (item.packing_data?.tote_location !== this.activeFilters.location) return false;
      }
      
      return true;
    });
    
    // Update the UI with filtered items
    this.updateDisplay(filteredItems);
    this.updateFilterCount(filteredItems.length);
  },
  
  updateDisplay(items) {
    // Update table view
    if (typeof UIRenderer !== 'undefined' && UIRenderer.renderTableRows) {
      UIRenderer.renderTableRows(items);
    }
    
    // Update mobile card view
    if (typeof UIRenderer !== 'undefined' && UIRenderer.renderMobileCards) {
      UIRenderer.renderMobileCards(items);
    }
  },
  
  updateFilterCount(count) {
    const totalCount = this.allItems.length;
    
    // Add or update filter count display
    let countDisplay = document.querySelector('.filter-count');
    if (!countDisplay) {
      countDisplay = document.createElement('div');
      countDisplay.className = 'filter-count';
      const filterContainer = document.querySelector('.filter-container');
      filterContainer.appendChild(countDisplay);
    }
    
    if (count === totalCount) {
      countDisplay.textContent = `Showing all ${totalCount} items`;
      countDisplay.style.color = '#64748b';
    } else {
      countDisplay.textContent = `Showing ${count} of ${totalCount} items`;
      countDisplay.style.color = '#0f172a';
      countDisplay.style.fontWeight = '600';
    }
  },
  
  clearAllFilters() {
    // Reset filter values
    this.activeFilters = {
      search: '',
      season: 'all',
      classType: 'all',
      repairStatus: 'all',
      location: 'all'
    };
    
    // Reset UI controls
    document.getElementById('searchInput').value = '';
    document.getElementById('filterSeason').value = 'all';
    document.getElementById('filterClassType').value = 'all';
    document.getElementById('filterRepairStatus').value = 'all';
    document.getElementById('filterLocation').value = 'all';
    
    // Reapply filters (will show all items)
    this.applyFilters();
  },
  
  getActiveFilterCount() {
    let count = 0;
    if (this.activeFilters.search) count++;
    if (this.activeFilters.season !== 'all') count++;
    if (this.activeFilters.classType !== 'all') count++;
    if (this.activeFilters.repairStatus !== 'all') count++;
    if (this.activeFilters.location !== 'all') count++;
    return count;
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FilterSystem;
}