/**
 * Storage List Page
 * Main storage list view with filters, stats drawer, and responsive card grid
 * UPDATED: Icon-only buttons, mobile-optimized
 */

import { storageAPI, itemsAPI, photosAPI } from '../utils/storage-api.js';
import { formatStorageUnit } from '../utils/storage-config.js';
import { getFiltersFromUrl, saveFiltersToUrl } from '../utils/state.js';
import { FilterBar } from '../components/FilterBar.js';
import { StorageCards } from '../components/StorageCards.js';
import { PageHeader } from '../components/PageHeader.js';
import { navigate } from '../utils/router.js';
import { showSuccess, showError } from '../shared/toast.js';

let allStorage = [];
let allItems = [];
let filteredStorage = [];
let currentFilters = {};

let filterBar;
let storageCards;
let pageHeader;

/**
 * Render storage list page
 */
export async function renderStorageList() {
  const app = document.getElementById('app');
  
  // Render page structure
  app.innerHTML = `
    <div class="storage-list-page">
      <div id="page-header-container"></div>
      
      <div id="filter-container"></div>
      
      <div class="list-controls">
        <div class="item-count" id="item-count">0 units</div>
      </div>
      
      <div id="cards-container"></div>
    </div>
  `;
  
  // Restore filters from URL
  currentFilters = getFiltersFromUrl();
  
  // Initialize PageHeader (without stats initially)
  pageHeader = new PageHeader({
    title: 'Storage Inventory',
    icon: '📦',
    stats: null // Will be populated after data loads
  });
  
  pageHeader.render(document.getElementById('page-header-container'));
  
  // Add icon-only action buttons to header
  const actionsContainer = pageHeader.getActionsContainer();
  if (actionsContainer) {
    actionsContainer.innerHTML = `
      <button class="btn btn-secondary btn-icon" id="btn-stats" title="View Stats" aria-label="View Statistics">📊</button>
      <button class="btn btn-secondary btn-icon" id="btn-pack" title="Pack Items" aria-label="Pack Items">📦</button>
      <button class="btn btn-primary btn-icon" id="btn-create" title="Create Storage" aria-label="Create New Storage">➕</button>
    `;
    
    // Attach button event listeners
    document.getElementById('btn-stats').addEventListener('click', () => {
      pageHeader.openDrawer();
    });
    
    document.getElementById('btn-pack').addEventListener('click', () => {
      navigate('/storage/pack');
    });
    
    document.getElementById('btn-create').addEventListener('click', () => {
      navigate('/storage/create');
    });
  }
  
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
 * Load storage data and items from API
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
    
    // Fetch storage units and items in parallel
    const [storageData, itemsData] = await Promise.all([
      storageAPI.getAll({}),
      itemsAPI.getAll({})
    ]);
    
    allStorage = storageData.map(unit => formatStorageUnit(unit));
    allItems = itemsData;

    // Enrich storage units with primary photo URLs for card thumbnails
    const photoIds = allStorage
      .map(unit => unit.images?.primary_photo_id)
      .filter(id => id);

    if (photoIds.length > 0) {
      const photoMap = await photosAPI.getByIds(photoIds);
      allStorage = allStorage.map(unit => {
        const photoId = unit.images?.primary_photo_id;
        const photoData = photoId ? photoMap[photoId] : null;
        if (!photoData) return unit;
        return {
          ...unit,
          images: {
            ...unit.images,
            thumb_cloudfront_url: photoData.thumb_cloudfront_url || null,
            photo_url: photoData.cloudfront_url || null
          }
        };
      });
    }

    console.log('Loaded storage units:', allStorage.length);
    console.log('Loaded items:', allItems.length);
    
    // Calculate and update stats
    const stats = calculateStats(allStorage, allItems);
    pageHeader.updateStats(stats);
    
    // Update stats button with badge if there are unpacked items
    updateStatsButton(stats);
    
    // Render page
    renderPage();
    
  } catch (error) {
    console.error('Failed to load storage:', error);
    showErrorState('Failed to load storage units. Please try again.');
  }
}

/**
 * Calculate stats for drawer
 */
function calculateStats(storage, items) {
  const stats = {
    total_storage: storage.length,
    unpacked_storage: storage.filter(unit => unit.packed === false).length,
    total_items: items.length,
    unpacked_items: items.filter(item => item.packing_data?.packing_status === false).length,
    by_season: {}
  };
  
  // Calculate stats by season
  const seasons = ['Halloween', 'Christmas', 'Shared'];
  
  seasons.forEach(season => {
    const seasonStorage = storage.filter(unit => unit.season === season);
    const seasonItems = items.filter(item => item.season === season);
    const unpackedSeasonItems = seasonItems.filter(item => item.packing_data?.packing_status === false);
    
    if (seasonStorage.length > 0 || seasonItems.length > 0) {
      stats.by_season[season] = {
        storage: seasonStorage.length,
        items: seasonItems.length,
        unpacked_items: unpackedSeasonItems.length
      };
    }
  });
  
  return stats;
}

/**
 * Update stats button with badge
 */
function updateStatsButton(stats) {
  const statsBtn = document.getElementById('btn-stats');
  if (!statsBtn) return;
  
  const unpackedCount = stats.unpacked_items || 0;
  
  if (unpackedCount > 0) {
    statsBtn.classList.add('has-badge');
    statsBtn.setAttribute('data-badge', unpackedCount);
  } else {
    statsBtn.classList.remove('has-badge');
    statsBtn.removeAttribute('data-badge');
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