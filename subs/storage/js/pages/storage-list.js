/**
 * Storage List Page
 * Main storage list view with tabs, filters, and responsive table/cards
 */

import { storageAPI } from '../utils/storage-api.js';
import { formatStorageUnit } from '../utils/storage-config.js';
import { getActiveTab, setActiveTab, getFiltersFromUrl, saveFiltersToUrl } from '../utils/state.js';
import { TabBar } from '../components/TabBar.js';
import { FilterBar } from '../components/FilterBar.js';
import { StorageTable } from '../components/StorageTable.js';
import { StorageCards } from '../components/StorageCards.js';
import { navigate } from '../utils/router.js';

let allStorage = [];
let filteredStorage = [];
let currentState = {
  tab: 'all',
  filters: {
    search: '',
    location: '',
    packed: '',
    class_type: ''
  }
};

let tabBar;
let filterBar;
let storageTable;
let storageCards;
let isMobileView = false;

/**
 * Check if mobile view
 */
function checkIfMobile() {
  return window.innerWidth <= 768;
}

/**
 * Render storage list page
 */
export async function renderStorageList() {
  const app = document.getElementById('app');
  
  // Render page structure
  app.innerHTML = `
    <div class="storage-list-page">
      <div class="page-header">
        <h1 class="page-title">Storage Inventory</h1>
        <div class="page-actions">
          <button class="btn btn-secondary" id="btn-pack">
            📦 Packing Wizard
          </button>
          <button class="btn btn-primary" id="btn-create">
            ➕ Create Storage
          </button>
        </div>
      </div>
      
      <div id="tab-container"></div>
      
      <div class="controls-row">
        <div id="filter-container"></div>
        <div class="item-count">
          <span id="item-count">0 units</span>
        </div>
      </div>
      
      <div id="table-container"></div>
      <div id="cards-container"></div>
    </div>
  `;
  
  // Attach button event listeners
  document.getElementById('btn-pack').addEventListener('click', () => {
    navigate('/storage/pack');
  });
  
  document.getElementById('btn-create').addEventListener('click', () => {
    navigate('/storage/create');
  });
  
  // Restore state from URL
  currentState.tab = getActiveTab().toLowerCase();
  currentState.filters = getFiltersFromUrl();
  
  // Initialize components
  tabBar = new TabBar({
    activeTab: currentState.tab,
    onChange: handleTabChange
  });
  
  filterBar = new FilterBar({
    filters: currentState.filters,
    onChange: handleFilterChange
  });
  
  storageTable = new StorageTable();
  storageCards = new StorageCards();
  
  // Check initial viewport
  isMobileView = checkIfMobile();
  
  // Setup resize listener
  setupResizeListener();
  
  // Load data
  await loadData();
}

/**
 * Load storage data
 */
async function loadData() {
  try {
    // Fetch all storage units
    const data = await storageAPI.getAll({});
    allStorage = data.map(unit => formatStorageUnit(unit));
    
    console.log('Loaded storage units:', allStorage.length);
    
    // Render page
    renderPage();
    
  } catch (error) {
    console.error('Failed to load storage:', error);
    showError('Failed to load storage units');
  }
}

/**
 * Render page
 */
function renderPage() {
  // Render tabs
  const tabContainer = document.getElementById('tab-container');
  if (tabContainer) {
    tabBar.render(tabContainer);
  }
  
  // Render filters
  const filterContainer = document.getElementById('filter-container');
  if (filterContainer) {
    filterBar.render(filterContainer);
  }
  
  // Filter storage
  filteredStorage = filterStorage(allStorage, currentState);
  
  // Render appropriate view
  renderResponsiveView();
  
  // Update count
  updateCount();
  
  // Save state to URL
  setActiveTab(currentState.tab);
  saveFiltersToUrl(currentState.filters);
}

/**
 * Render table or cards based on viewport
 */
function renderResponsiveView() {
  const tableContainer = document.getElementById('table-container');
  const cardsContainer = document.getElementById('cards-container');
  
  if (isMobileView) {
    // Mobile: Show cards only
    if (tableContainer) tableContainer.style.display = 'none';
    if (cardsContainer) {
      cardsContainer.style.display = 'block';
      storageCards.data = filteredStorage;
      storageCards.render(cardsContainer);
    }
  } else {
    // Desktop: Show table only
    if (tableContainer) {
      tableContainer.style.display = 'block';
      storageTable.data = filteredStorage;
      storageTable.render(tableContainer);
    }
    if (cardsContainer) cardsContainer.style.display = 'none';
  }
}

/**
 * Setup resize listener with debouncing
 */
function setupResizeListener() {
  let resizeTimeout;
  
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    
    resizeTimeout = setTimeout(() => {
      const wasMobile = isMobileView;
      isMobileView = checkIfMobile();
      
      // Only re-render if view changed
      if (wasMobile !== isMobileView) {
        renderResponsiveView();
      }
    }, 250);
  });
}

/**
 * Filter storage units
 */
function filterStorage(storage, state) {
  console.log('Filtering with state:', state);
  console.log('Total storage before filter:', storage.length);
  
  let filtered = [...storage];
  
  // Filter by tab (season)
  if (state.tab !== 'all') {
    const seasonMap = {
      'halloween': 'Halloween',
      'christmas': 'Christmas',
      'shared': 'Shared'
    };
    console.log('Filtering by season:', seasonMap[state.tab]);
    filtered = filtered.filter(unit => {
      console.log('Unit season:', unit.season, 'Match:', unit.season === seasonMap[state.tab]);
      return unit.season === seasonMap[state.tab];
    });
  }
  
  console.log('Filtered storage count:', filtered.length);
  
  // Apply other filters
  if (state.filters.search) {
    const searchTerm = state.filters.search.toLowerCase();
    filtered = filtered.filter(unit =>
      unit.id.toLowerCase().includes(searchTerm) ||
      unit.short_name.toLowerCase().includes(searchTerm)
    );
  }
  
  if (state.filters.location && state.filters.location !== 'All') {
    filtered = filtered.filter(unit => unit.location === state.filters.location);
  }
  
  if (state.filters.packed && state.filters.packed !== 'All') {
    const isPacked = state.filters.packed === 'true';
    filtered = filtered.filter(unit => unit.packed === isPacked);
  }
  
  if (state.filters.class_type && state.filters.class_type !== 'All') {
    filtered = filtered.filter(unit => unit.class_type === state.filters.class_type);
  }
  
  return filtered;
}

/**
 * Handle tab change
 */
function handleTabChange(newTab) {
  currentState.tab = newTab.toLowerCase();
  renderPage();
}

/**
 * Handle filter change
 */
function handleFilterChange(newFilters) {
  currentState.filters = newFilters;
  renderPage();
}

/**
 * Update item count
 */
function updateCount() {
  const countElement = document.getElementById('item-count');
  if (countElement) {
    const count = filteredStorage.length;
    const total = allStorage.length;
    
    if (count === total) {
      countElement.textContent = `${total} units`;
    } else {
      countElement.textContent = `${count} of ${total} units`;
    }
  }
}

/**
 * Show error
 */
function showError(message) {
  const tableContainer = document.getElementById('table-container');
  if (tableContainer) {
    tableContainer.innerHTML = `
      <div class="error-state">
        <div class="error-icon">⚠️</div>
        <div class="error-message">${message}</div>
        <button class="btn btn-primary" onclick="window.location.reload()">Retry</button>
      </div>
    `;
  }
}