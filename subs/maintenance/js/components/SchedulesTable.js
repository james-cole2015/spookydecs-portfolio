// Schedules table view - main component

import { appState } from '../state.js';
import { fetchSchedules } from '../scheduleApi.js';
import { navigateTo } from '../router.js';
import { Toast } from '../utils/toast.js';
import { SchedulesTableRenderers } from './SchedulesTableRenderers.js';
import { SchedulesTableHandlers } from './SchedulesTableHandlers.js';

export class SchedulesTableView {
  constructor() {
    this.currentPage = 0;
    this.pageSize = 50;
    this.sortColumn = 'class_type';
    this.sortDirection = 'asc';
    this.expandedRow = null;
  }
  
  async render(container) {
    container.innerHTML = `
      <div class="schedules-view">
        <div class="view-header">
          <div class="header-left">
            <button class="btn-back" onclick="window.location.href='/'">
              ← Back to Records
            </button>
            <h1>Maintenance Templates</h1>
          </div>
          <div class="header-actions">
            <button class="btn-secondary" id="btn-apply-templates">
              → Apply Templates
            </button>
            <button class="btn-primary" id="btn-create-schedule">
              + Create Template
            </button>
          </div>
        </div>
        
        <div id="filters-container"></div>
        <div id="stats-container"></div>
        <div id="table-container">
          <div class="loading">Loading templates...</div>
        </div>
      </div>
    `;
    
    // Attach header button listeners
    this.attachHeaderListeners(container);
    
    // Render filters
    this.renderFilters(container);
    
    // Load and render schedules
    await this.loadSchedules();
    this.renderStats(container);
    this.renderTable(container);
    
    // Subscribe to state changes
    this.unsubscribe = appState.subscribe(() => {
      const schedulesView = document.querySelector('.schedules-view');
      if (schedulesView) {
        this.renderStats(schedulesView);
        this.renderTable(schedulesView);
      }
    });
  }
  
  destroy() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }
  
  attachHeaderListeners(container) {
    const createBtn = container.querySelector('#btn-create-schedule');
    if (createBtn) {
      createBtn.addEventListener('click', () => {
        navigateTo('/schedules/new');
      });
    }
    
    const applyTemplatesBtn = container.querySelector('#btn-apply-templates');
    if (applyTemplatesBtn) {
      applyTemplatesBtn.addEventListener('click', () => {
        navigateTo('/schedules/apply');
      });
    }
  }
  
  async loadSchedules() {
    try {
      const schedules = await fetchSchedules();
      schedules.forEach(schedule => {
        schedule.status = schedule.enabled ? 'active' : 'disabled';
      });
      appState.setSchedules(schedules);
    } catch (error) {
      console.error('Failed to load templates:', error);
      Toast.show('error', 'Error', 'Failed to load templates');
    }
  }
  
  sortData(data, column, direction) {
    return [...data].sort((a, b) => {
      let aVal = a[column];
      let bVal = b[column];
      
      // Handle nulls
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      
      // Compare
      if (aVal < bVal) return direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  }
  
  hasActiveFilters() {
    const filters = appState.getState().scheduleFilters;
    return filters.item_id !== 'all' || 
           filters.task_type !== 'all' || 
           filters.status !== 'all' || 
           filters.enabled !== 'all';
  }
  
  renderFilters(container) {
    const filtersContainer = container.querySelector('#filters-container');
    const state = appState.getState();
    const filters = state.scheduleFilters;
    
    filtersContainer.innerHTML = SchedulesTableRenderers.renderFiltersHTML(
      filters, 
      this.hasActiveFilters()
    );
    
    // Attach filter event listeners
    SchedulesTableHandlers.attachFilterListeners(
      container, 
      () => this.renderFilters(container)
    );
  }
  
  renderStats(container) {
    const statsContainer = container.querySelector('#stats-container');
    if (!statsContainer) return;
    
    const schedules = appState.getState().schedules;
    statsContainer.innerHTML = SchedulesTableRenderers.renderStatsHTML(schedules);
  }
  
  renderTable(container) {
    const tableContainer = container.querySelector('#table-container');
    if (!tableContainer) return;
    
    let schedules = appState.getFilteredSchedules();
    
    // Apply default filter
    const defaultFilter = appState.getState().scheduleFilters.status;
    if (defaultFilter === 'true') {
      schedules = schedules.filter(s => s.is_default === true);
    } else if (defaultFilter === 'false') {
      schedules = schedules.filter(s => !s.is_default);
    }
    
    if (schedules.length === 0) {
      tableContainer.innerHTML = SchedulesTableRenderers.renderEmptyStateHTML();
      return;
    }
    
    // Apply sorting
    schedules = this.sortData(schedules, this.sortColumn, this.sortDirection);
    
    // Pagination
    const totalPages = Math.ceil(schedules.length / this.pageSize);
    const startIdx = this.currentPage * this.pageSize;
    const endIdx = startIdx + this.pageSize;
    const pageData = schedules.slice(startIdx, endIdx);
    
    // Render table
    const tableHTML = SchedulesTableRenderers.renderTableHTML(
      pageData,
      this.sortColumn,
      this.sortDirection,
      this.expandedRow
    );
    
    const paginationHTML = totalPages > 1 
      ? SchedulesTableRenderers.renderPaginationHTML(this.currentPage, totalPages)
      : '';
    
    tableContainer.innerHTML = tableHTML + paginationHTML;
    
    // Attach event listeners
    this.attachTableEventListeners(tableContainer);
  }
  
  attachTableEventListeners(container) {
    // Attach all table listeners
    SchedulesTableHandlers.attachTableListeners(container, this);
    SchedulesTableHandlers.attachPaginationListeners(container, this);
  }
}
