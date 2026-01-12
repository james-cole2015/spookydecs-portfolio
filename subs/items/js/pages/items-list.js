// Items List Page
// Main orchestrator for items list view

import { fetchAllItems } from '../api/items.js';
import { saveTabState, restoreTabState, getFilteredItems, getAvailableClassTypes, getTabCounts } from '../utils/state.js';
import { TabBar } from '../components/TabBar.js';
import { FilterBar } from '../components/FilterBar.js';
import { ItemsTable } from '../components/ItemsTable.js';
import { navigate } from '../router.js';

let allItems = [];
let currentState = {
  tab: 'decorations',
  filters: {
    search: '',
    season: '',
    class_type: '',
    repair_status: '',
    status: ''
  }
};

let tabBar;
let filterBar;
let itemsTable;

export async function init() {
  console.log('Initializing items list page...');
  
  // Initialize components
  tabBar = new TabBar('tab-container', handleTabChange);
  filterBar = new FilterBar('filter-container', handleFilterChange);
  itemsTable = new ItemsTable('table-container');
  
  // Restore state from URL/localStorage
  currentState = restoreTabState();
  
  // Show loading state
  itemsTable.showLoading();
  
  try {
    // Fetch all items
    allItems = await fetchAllItems();
    
    // Render page
    renderPage();
    
  } catch (error) {
    console.error('Failed to load items:', error);
    showError('Failed to load items. Please try again.');
  }
}

function renderPage() {
  // Get available class types for current tab
  const availableClassTypes = getAvailableClassTypes(allItems, currentState.tab);
  
  // Clear class_type filter if it's not valid for current tab
  if (currentState.filters.class_type && 
      !availableClassTypes.includes(currentState.filters.class_type)) {
    currentState.filters.class_type = '';
  }
  
  // Get tab counts
  const tabCounts = getTabCounts(allItems);
  
  // Render components with tab counts
  tabBar.render(currentState.tab, tabCounts);
  filterBar.render(currentState.filters, availableClassTypes);
  
  // Filter and render items
  const filteredItems = getFilteredItems(allItems, currentState);
  itemsTable.render(filteredItems, currentState.tab);
  
  // Update item count display
  updateItemCount(filteredItems.length, allItems.length);
  
  // Save state
  saveTabState(currentState.tab, currentState.filters);
}

function updateItemCount(filtered, total) {
  const countContainer = document.getElementById('item-count');
  if (countContainer) {
    if (filtered === total) {
      countContainer.textContent = `Showing ${total} item${total !== 1 ? 's' : ''}`;
    } else {
      countContainer.textContent = `Showing ${filtered} of ${total} item${total !== 1 ? 's' : ''}`;
    }
  }
}

function handleTabChange(newTab) {
  currentState.tab = newTab;
  
  // Clear class_type filter when switching tabs (class types are tab-specific)
  currentState.filters.class_type = '';
  
  renderPage();
}

function handleFilterChange(newFilters) {
  currentState.filters = newFilters;
  renderPage();
}

function showError(message) {
  const container = document.getElementById('table-container');
  if (container) {
    container.innerHTML = `
      <div class="error-state">
        <div class="error-icon">⚠️</div>
        <div class="error-message">${message}</div>
        <button class="btn-retry" onclick="window.location.reload()">Retry</button>
      </div>
    `;
  }
}

// Refresh items from API
export async function refreshItems() {
  console.log('Refreshing items...');
  
  // Show loading state in table
  itemsTable.showLoading();
  
  try {
    // Fetch fresh data from API with cache busting
    allItems = await fetchAllItems(true);
    
    // Re-render with updated data
    renderPage();
    
    console.log('Items refreshed successfully');
    
  } catch (error) {
    console.error('Failed to refresh items:', error);
    showError('Failed to refresh items. Please try again.');
  }
}

// Action button handlers
export function handleCreateItem() {
  navigate('/items/create');
}

export function handleRefreshItems() {
  refreshItems();
}

export function handleRetireItem() {
  // TODO: Implement retire functionality
  alert('Retire functionality will be implemented in item detail view');
}

export function handleDeleteItem() {
  // TODO: Implement delete functionality
  alert('Delete functionality will be implemented in item detail view');
}

export function cleanup() {
  // Cleanup if needed when navigating away
  if (itemsTable && itemsTable.cleanup) {
    itemsTable.cleanup();
  }
  tabBar = null;
  filterBar = null;
  itemsTable = null;
}