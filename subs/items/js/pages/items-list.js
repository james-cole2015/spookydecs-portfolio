// Items List Page
// Main orchestrator for items list view

import { fetchAllItems } from '../api/items.js';
import { ItemsCards } from '../components/ItemsCards.js';
import { FilterBar } from '../components/FilterBar.js';
import { navigate } from '../utils/router.js';
import { toast } from '../shared/toast.js';
import { modal } from '../shared/modal.js';

class ItemsListPage {
  constructor() {
    this.allItems = [];
    this.filteredItems = [];
    this.cardsComponent = null;
    this.filterBar = null;
  }
  
  async render() {
    this.showLoading();
    
    const container = document.getElementById('app-container');
    container.innerHTML = `
      <div class="view-header">
        <h1>Inventory Management</h1>
        <button class="btn-primary" onclick="itemsPage.handleCreate()">
          + Create Item
        </button>
      </div>
      
      <div id="filter-bar-container"></div>
      
      <div id="items-container"></div>
    `;
    
    try {
      // Fetch items
      this.allItems = await fetchAllItems(true);
      
      // Initialize components
      this.filterBar = new FilterBar('filter-bar-container', (filters) => {
        this.handleFilterChange(filters);
      });
      this.filterBar.render();
      
      this.cardsComponent = new ItemsCards('items-container');
      
      // Apply initial filters
      this.filteredItems = this.filterBar.applyFilters(this.allItems);
      this.cardsComponent.render(this.filteredItems);
      
      this.hideLoading();
    } catch (error) {
      console.error('Error loading items:', error);
      this.hideLoading();
      this.showError(error.message);
    }
  }
  
  handleFilterChange(filters) {
    this.filteredItems = this.filterBar.applyFilters(this.allItems);
    this.cardsComponent.render(this.filteredItems);
  }
  
  handleCreate() {
    navigate('/create');
  }

  handleView(itemId) {
    navigate(`/${itemId}`);
  }

  handleEdit(itemId) {
    navigate(`/${itemId}/edit`);
  }
  
  async handleMore(itemId) {
    const item = this.allItems.find(i => i.id === itemId);
    if (!item) return;
    
    // Show options modal
    const result = await modal.confirm(
      'Item Actions',
      `What would you like to do with ${item.short_name}?`,
      'Delete',
      'Cancel'
    );
    
    if (result) {
      // Handle delete
      const confirmDelete = await modal.confirm(
        'Confirm Delete',
        `Are you sure you want to delete ${item.short_name}? This action cannot be undone.`,
        'Delete',
        'Cancel'
      );
      
      if (confirmDelete) {
        this.handleDelete(itemId);
      }
    }
  }
  
  async handleDelete(itemId) {
    try {
      this.showLoading();
      
      // Import delete function
      const { deleteItem } = await import('../api/items.js');
      await deleteItem(itemId);
      
      toast.success('Item Deleted', 'Item has been permanently deleted.');
      
      // Reload items
      await this.render();
    } catch (error) {
      console.error('Error deleting item:', error);
      this.hideLoading();
      toast.error('Delete Failed', error.message);
    }
  }
  
  showLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.classList.remove('hidden');
  }
  
  hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.classList.add('hidden');
  }
  
  showError(message) {
    const container = document.getElementById('app-container');
    container.innerHTML = `
      <div class="error-container">
        <h1>Error Loading Items</h1>
        <p>${message}</p>
        <button class="btn-primary" onclick="itemsPage.render()">
          Try Again
        </button>
      </div>
    `;
  }
}

// Global instance
const itemsPage = new ItemsListPage();

// Make available globally for onclick handlers
if (typeof window !== 'undefined') {
  window.itemsPage = itemsPage;
}

export function renderItemsList() {
  itemsPage.render();
}