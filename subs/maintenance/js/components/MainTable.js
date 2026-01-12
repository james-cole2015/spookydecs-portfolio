// Main table view orchestrator - delegates to specialized renderers

import { appState } from '../state.js';
import { Tabs } from './Tabs.js';
import { Filters } from './Filters.js';
import { MobileCardView } from './MobileCardView.js';
import { MobileFilters } from './MobileFilters.js';
import { navigateTo } from '../router.js';
import { isMobile } from '../utils/responsive.js';
import { MobileScrollManager } from './tables/MobileScrollManager.js';
import { MobileItemCardView } from './tables/MobileItemCardView.js';
import { RecordsTableRenderer } from './tables/RecordsTableRenderer.js';
import { ItemsTableRenderer } from './tables/ItemsTableRenderer.js';

export class MainTableView {
  constructor() {
    console.log('🏗️ MainTableView constructor called');
    
    // Tab and filter components
    this.tabs = new Tabs(() => this.renderTable());
    this.filters = new Filters(() => this.renderTable());
    this.mobileFilters = new MobileFilters(() => this.renderTable());
    
    // Mobile scroll manager (shared between records and items)
    this.mobileScrollManager = new MobileScrollManager(() => this.renderTable());
    
    // Mobile card views
    this.mobileCardView = new MobileCardView((recordId, itemId) => {
      navigateTo(`/${itemId}/${recordId}`);
    });
    this.mobileItemCardView = new MobileItemCardView((itemId) => {
      navigateTo(`/${encodeURIComponent(itemId)}`);
    });
    
    // Table renderers
    this.recordsRenderer = new RecordsTableRenderer(this.mobileCardView, this.mobileScrollManager);
    this.itemsRenderer = new ItemsTableRenderer(this.mobileItemCardView, this.mobileScrollManager);
    
    // Wire up callbacks
    this.recordsRenderer.onRerender = () => this.renderTable();
    this.recordsRenderer.onDelete = (recordId) => this.handleDelete(recordId);
    this.itemsRenderer.onRerender = () => this.renderTable();
    
    console.log('✅ MainTableView constructor completed');
  }
  
  async render(container) {
    console.log('🎨 MainTable.render() called');
    console.log('  Container:', container);
    
    container.innerHTML = `
      <div class="main-table-view">
        <div class="view-header">
          <h1>Maintenance Records</h1>
          <div class="header-actions">
            ${this.renderHeaderButtons()}
          </div>
        </div>
        
        <div id="tabs-container"></div>
        <div id="filters-container"></div>
        <div id="table-container"></div>
      </div>
    `;
    
    console.log('  HTML structure created');
    
    this.attachHeaderButtonListeners(container);
    
    // Render tabs
    const tabsContainer = container.querySelector('#tabs-container');
    console.log('  Tabs container:', tabsContainer);
    tabsContainer.innerHTML = this.tabs.render();
    this.tabs.attachEventListeners(tabsContainer);
    
    // Render filters
    this.renderFilters(container);
    
    // Subscribe to state changes
    appState.subscribe(() => {
      console.log('📢 State changed, re-rendering table');
      this.renderTable();
      this.updateTabs(container);
      this.updateFilters(container);
    });
    
    console.log('  About to call renderTable() for initial render');
    
    // Initial table render
    await this.renderTable();
    
    console.log('✅ MainTable.render() completed');
  }
  
  renderHeaderButtons() {
    if (isMobile()) {
      return `
        <button class="btn-mobile-icon btn-calendar" id="btn-schedules" title="Maintenance Schedules">
          📅
        </button>
        <button class="btn-mobile-icon btn-create" id="btn-create" title="Create Record">
          ➕
        </button>
      `;
    } else {
      return `
        <button class="btn-secondary" id="btn-schedules">
          📅 Maintenance Schedules
        </button>
        <button class="btn-primary" id="btn-create">
          + Create Record
        </button>
      `;
    }
  }
  
  attachHeaderButtonListeners(container) {
    const schedulesBtn = container.querySelector('#btn-schedules');
    const createBtn = container.querySelector('#btn-create');
    
    if (schedulesBtn) {
      schedulesBtn.addEventListener('click', () => navigateTo('/schedules'));
    }
    
    if (createBtn) {
      createBtn.addEventListener('click', () => navigateTo('/create'));
    }
  }
  
  renderFilters(container) {
    const filtersContainer = container.querySelector('#filters-container');
    if (!filtersContainer) return;
    
    if (isMobile()) {
      filtersContainer.innerHTML = this.mobileFilters.render();
      this.mobileFilters.attachEventListeners(filtersContainer);
    } else {
      filtersContainer.innerHTML = this.filters.render();
      this.filters.attachEventListeners(filtersContainer);
    }
  }
  
  updateTabs(container) {
    const tabsContainer = container.querySelector('#tabs-container');
    if (tabsContainer) {
      tabsContainer.innerHTML = this.tabs.render();
      this.tabs.attachEventListeners(tabsContainer);
    }
  }
  
  updateFilters(container) {
    const filtersContainer = container.querySelector('#filters-container');
    if (!filtersContainer) return;
    
    if (isMobile()) {
      const wasOpen = this.mobileFilters.isOpen;
      filtersContainer.innerHTML = this.mobileFilters.render();
      this.mobileFilters.attachEventListeners(filtersContainer);
      
      if (wasOpen) {
        const overlay = filtersContainer.querySelector('#mobile-filters-overlay');
        const drawer = filtersContainer.querySelector('#mobile-filters-drawer');
        if (overlay && drawer) {
          this.mobileFilters.openDrawer(overlay, drawer);
        }
      }
    } else {
      filtersContainer.innerHTML = this.filters.render();
      this.filters.attachEventListeners(filtersContainer);
    }
  }
  
  async renderTable() {
    const tableContainer = document.querySelector('#table-container');
    if (!tableContainer) {
      console.error('MainTable.renderTable(): table-container not found!');
      return;
    }
    
    console.log('MainTable.renderTable() called');
    
    // Reset infinite scroll state when table re-renders
    if (isMobile()) {
      this.mobileScrollManager.resetLoadCount();
    }
    
    const state = appState.getState();
    const activeTab = state.activeTab;
    
    console.log('  Active tab:', activeTab);
    console.log('  Total records in state:', state.records.length);
    console.log('  Filtered records in state:', state.filteredRecords.length);
    
    if (activeTab === 'items') {
      console.log('  Delegating to itemsRenderer');
      this.itemsRenderer.render(tableContainer);
    } else {
      console.log('  Delegating to recordsRenderer');
      this.recordsRenderer.render(tableContainer);
    }
  }
  
  async handleDelete(recordId) {
    const state = appState.getState();
    const record = state.records.find(r => r.record_id === recordId);
    if (!record) return;
    
    const confirmed = confirm(
      `Delete ${record.record_type}: ${record.title}?\n\n` +
      `This action cannot be undone.`
    );
    
    if (!confirmed) return;
    
    try {
      const { deleteRecord } = await import('../api.js');
      await deleteRecord(recordId);
      appState.removeRecord(recordId);
      
      if (window.toast) {
        window.toast.success('Success', 'Record deleted successfully');
      }
      
      // Reset expansion and re-render
      this.recordsRenderer.expandedRow = null;
      this.renderTable();
    } catch (error) {
      console.error('Failed to delete record:', error);
      if (window.toast) {
        window.toast.error('Error', 'Failed to delete record');
      }
    }
  }
}