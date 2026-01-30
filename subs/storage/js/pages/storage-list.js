/**
 * Storage List Page
 * Main storage list view with filters and responsive card grid
 */

import { storageAPI } from '../utils/storage-api.js';
import { formatStorageUnit } from '../utils/storage-config.js';
import { getFiltersFromUrl, saveFiltersToUrl } from '../utils/state.js';
import { FilterBar } from '../components/FilterBar.js';
import { StorageCards } from '../components/StorageCards.js';
import { navigate } from '../utils/router.js';
import { showSuccess, showError } from '../shared/toast.js';

let allStorage = [];
let filteredStorage = [];
let currentFilters = {};

let filterBar;
let storageCards;

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
            📦 Pack Items
          </button>
          <button class="btn btn-primary" id="btn-create">
            ➕ Create Storage
          </button>
        </div>
      </div>
      
      <div id="filter-container"></div>
      
      <div class="list-controls">
        <div class="item-count" id="item-count">0 units</div>
      </div>
      
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
  
  // Restore filters from URL
  currentFilters = getFiltersFromUrl();
  
  // Initialize components
  filterBar = new FilterBar({
    filters: currentFilters,
    showFilters: ['season', 'location', 'class_type', 'packed'],
    onChange: handleFilterChange
  });
  
  storageCards = new StorageCards({
    data: [],
    onDelete: handleDelete
  });
  
  // Load data
  await loadData();
}

/**
 * Load storage data from API
 */
async function loadData() {
  try {
    // Show loading state
    const cardsContainer = document.getElementById('cards-container');
    if (cardsContainer) {
      cardsContainer.innerHTML = `
        <div class="loading-state">
          <div class="spinner"></div>
          <p>Loading storage units...</p>
        </div>
      `;
    }
    
    // Fetch all storage units
    const data = await storageAPI.getAll({});
    allStorage = data.map(unit => formatStorageUnit(unit));
    
    console.log('Loaded storage units:', allStorage.length);
    
    // Render page
    renderPage();
    
  } catch (error) {
    console.error('Failed to load storage:', error);
    showErrorState('Failed to load storage units. Please try again.');
  }
}

/**
 * Render page components
 */
function renderPage() {
  // Render filter bar
  const filterContainer = document.getElementById('filter-container');
  if (filterContainer) {
    filterBar.render(filterContainer);
  }
  
  // Apply filters
  filteredStorage = applyFilters(allStorage, currentFilters);
  
  // Render cards
  const cardsContainer = document.getElementById('cards-container');
  if (cardsContainer) {
    storageCards.data = filteredStorage;
    storageCards.render(cardsContainer);
  }
  
  // Update count
  updateCount();
  
  // Save filters to URL
  saveFiltersToUrl(currentFilters);
}

/**
 * Apply filters to storage data
 */
function applyFilters(storage, filters) {
  let filtered = [...storage];
  
  // Filter by season
  if (filters.season && filters.season !== 'All') {
    filtered = filtered.filter(unit => unit.season === filters.season);
  }
  
  // Filter by location
  if (filters.location && filters.location !== 'All') {
    filtered = filtered.filter(unit => unit.location === filters.location);
  }
  
  // Filter by class_type
  if (filters.class_type && filters.class_type !== 'All') {
    filtered = filtered.filter(unit => unit.class_type === filters.class_type);
  }
  
  // Filter by packed status
  if (filters.packed && filters.packed !== 'All') {
    const isPacked = filters.packed === 'true';
    filtered = filtered.filter(unit => unit.packed === isPacked);
  }
  
  // Filter by search
  if (filters.search && filters.search.trim() !== '') {
    const searchTerm = filters.search.toLowerCase().trim();
    filtered = filtered.filter(unit => 
      unit.id.toLowerCase().includes(searchTerm) ||
      unit.short_name.toLowerCase().includes(searchTerm) ||
      (unit.location && unit.location.toLowerCase().includes(searchTerm))
    );
  }
  
  return filtered;
}

/**
 * Handle filter change
 */
function handleFilterChange(newFilters) {
  currentFilters = newFilters;
  renderPage();
}

/**
 * Handle delete storage unit
 */
async function handleDelete(unit) {
  const confirmed = confirm(
    `Are you sure you want to delete "${unit.short_name}"?\n\n` +
    `This action cannot be undone. The storage unit must be empty before deletion.`
  );
  
  if (!confirmed) return;
  
  try {
    await storageAPI.delete(unit.id);
    showSuccess('Storage unit deleted successfully');
    
    // Reload data
    await loadData();
    
  } catch (error) {
    console.error('Failed to delete storage:', error);
    
    // Check if error is due to non-empty storage
    if (error.message && error.message.includes('contents')) {
      showError('Cannot delete storage unit with contents. Please remove all items first.');
    } else {
      showError('Failed to delete storage unit');
    }
  }
}

/**
 * Update item count display
 */
function updateCount() {
  const countElement = document.getElementById('item-count');
  if (!countElement) return;
  
  const filteredCount = filteredStorage.length;
  const totalCount = allStorage.length;
  
  if (filteredCount === totalCount) {
    countElement.textContent = `${totalCount} ${totalCount === 1 ? 'unit' : 'units'}`;
  } else {
    countElement.textContent = `${filteredCount} of ${totalCount} ${totalCount === 1 ? 'unit' : 'units'}`;
  }
}

/**
 * Show error state
 */
function showErrorState(message) {
  const cardsContainer = document.getElementById('cards-container');
  if (cardsContainer) {
    cardsContainer.innerHTML = `
      <div class="error-state">
        <div class="error-icon">⚠️</div>
        <h3>Error Loading Storage</h3>
        <p>${message}</p>
        <button class="btn btn-primary" onclick="window.location.reload()">
          Retry
        </button>
      </div>
    `;
  }
}