// Main table view with TanStack Table integration

import { appState } from '../state.js';
import { Tabs } from './Tabs.js';
import { Filters } from './Filters.js';
import { navigateTo } from '../router.js';
import { formatDate, formatStatus, formatCriticality, formatRecordTypePill, formatCurrency } from '../utils/formatters.js';

export class MainTableView {
  constructor() {
    this.tabs = new Tabs(() => this.renderTable());
    this.filters = new Filters(() => this.renderTable());
    this.table = null;
    this.currentPage = 0;
    this.pageSize = 50;
  }
  
  async render(container) {
    container.innerHTML = `
      <div class="main-table-view">
        <div class="view-header">
          <h1>Maintenance Records</h1>
          <button class="btn-primary" onclick="window.location.href='/create'">
            + Create Record
          </button>
        </div>
        
        <div id="tabs-container"></div>
        <div id="filters-container"></div>
        <div id="table-container"></div>
      </div>
    `;
    
    // Render tabs
    const tabsContainer = container.querySelector('#tabs-container');
    tabsContainer.innerHTML = this.tabs.render();
    this.tabs.attachEventListeners(tabsContainer);
    
    // Render filters
    const filtersContainer = container.querySelector('#filters-container');
    filtersContainer.innerHTML = this.filters.render();
    this.filters.attachEventListeners(filtersContainer);
    
    // Subscribe to state changes
    appState.subscribe(() => {
      this.renderTable();
      // Update tabs to show new counts
      const tabsContainer = container.querySelector('#tabs-container');
      if (tabsContainer) {
        tabsContainer.innerHTML = this.tabs.render();
        this.tabs.attachEventListeners(tabsContainer);
      }
      // Update filters to show active selections
      const filtersContainer = container.querySelector('#filters-container');
      if (filtersContainer) {
        filtersContainer.innerHTML = this.filters.render();
        this.filters.attachEventListeners(filtersContainer);
      }
    });
    
    // Render table
    await this.renderTable();
  }
  
  async renderTable() {
    const tableContainer = document.querySelector('#table-container');
    if (!tableContainer) return;
    
    const state = appState.getState();
    const activeTab = state.activeTab;
    
    if (activeTab === 'items') {
      this.renderItemsTable(tableContainer);
    } else {
      this.renderRecordsTable(tableContainer);
    }
  }
  
  renderRecordsTable(container) {
    const state = appState.getState();
    let data = state.filteredRecords;
    
    // Apply tab filter
    if (state.activeTab !== 'all') {
      const recordType = state.activeTab.replace('s', ''); // repairs -> repair
      data = data.filter(r => r.record_type === recordType);
    }
    
    if (data.length === 0) {
      container.innerHTML = this.renderEmptyState();
      return;
    }
    
    // Sort by created_at desc
    data = [...data].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    // Pagination
    const totalPages = Math.ceil(data.length / this.pageSize);
    const startIdx = this.currentPage * this.pageSize;
    const endIdx = startIdx + this.pageSize;
    const pageData = data.slice(startIdx, endIdx);
    
    const tableHtml = `
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Record ID</th>
              <th>Status</th>
              <th>Title</th>
              <th>Type</th>
              <th>Item ID</th>
              <th>Criticality</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            ${pageData.map(record => this.renderRecordRow(record)).join('')}
          </tbody>
        </table>
      </div>
      ${totalPages > 1 ? this.renderPagination(totalPages) : ''}
    `;
    
    container.innerHTML = tableHtml;
    this.attachTableEventListeners(container);
  }
  
  renderRecordRow(record) {
    const itemId = record.item_id || 'N/A';
    const recordId = record.record_id.substring(0, 8) + '...';
    
    return `
      <tr class="table-row" data-record-id="${record.record_id}" data-item-id="${itemId}">
        <td><code>${recordId}</code></td>
        <td>${formatStatus(record.status)}</td>
        <td class="table-title">${record.title}</td>
        <td>${formatRecordTypePill(record.record_type)}</td>
        <td><code>${itemId}</code></td>
        <td>${formatCriticality(record.criticality)}</td>
        <td>${formatDate(record.date_performed || record.created_at)}</td>
      </tr>
    `;
  }
  
  renderItemsTable(container) {
    const itemsData = appState.groupByItem();
    
    if (itemsData.length === 0) {
      container.innerHTML = this.renderEmptyState();
      return;
    }
    
    // Sort by item_id
    const sortedData = itemsData.sort((a, b) => a.item_id.localeCompare(b.item_id));
    
    // Pagination
    const totalPages = Math.ceil(sortedData.length / this.pageSize);
    const startIdx = this.currentPage * this.pageSize;
    const endIdx = startIdx + this.pageSize;
    const pageData = sortedData.slice(startIdx, endIdx);
    
    const tableHtml = `
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Item ID</th>
              <th>Season</th>
              <th>Criticality</th>
              <th>Repairs</th>
              <th>Maintenance</th>
              <th>Inspections</th>
              <th>Total Cost</th>
              <th>Last Record</th>
            </tr>
          </thead>
          <tbody>
            ${pageData.map(item => this.renderItemRow(item)).join('')}
          </tbody>
        </table>
      </div>
      ${totalPages > 1 ? this.renderPagination(totalPages) : ''}
    `;
    
    container.innerHTML = tableHtml;
    this.attachItemsTableEventListeners(container);
  }
  
  renderItemRow(item) {
    return `
      <tr class="table-row" data-item-id="${item.item_id}">
        <td><code>${item.item_id}</code></td>
        <td>${item.season}</td>
        <td>${formatCriticality(item.criticality)}</td>
        <td><span class="count-badge">${item.repairs}</span></td>
        <td><span class="count-badge">${item.maintenance}</span></td>
        <td><span class="count-badge">${item.inspections}</span></td>
        <td>${formatCurrency(item.total_cost)}</td>
        <td>${formatDate(item.last_record_date)}</td>
      </tr>
    `;
  }
  
  renderPagination(totalPages) {
    const pages = [];
    for (let i = 0; i < totalPages; i++) {
      pages.push(`
        <button 
          class="pagination-btn ${i === this.currentPage ? 'active' : ''}" 
          data-page="${i}"
        >
          ${i + 1}
        </button>
      `);
    }
    
    return `
      <div class="pagination">
        <button 
          class="pagination-btn" 
          data-page="prev"
          ${this.currentPage === 0 ? 'disabled' : ''}
        >
          Previous
        </button>
        ${pages.join('')}
        <button 
          class="pagination-btn" 
          data-page="next"
          ${this.currentPage === totalPages - 1 ? 'disabled' : ''}
        >
          Next
        </button>
      </div>
    `;
  }
  
  renderEmptyState() {
    return `
      <div class="empty-state">
        <div class="empty-icon">📋</div>
        <h3>No records found</h3>
        <p>Try adjusting your filters or create a new record</p>
        <button class="btn-primary" onclick="window.location.href='/create'">
          + Create Record
        </button>
      </div>
    `;
  }
  
  attachTableEventListeners(container) {
    const rows = container.querySelectorAll('.table-row');
    rows.forEach(row => {
      row.addEventListener('click', () => {
        const recordId = row.getAttribute('data-record-id');
        const itemId = row.getAttribute('data-item-id');
        navigateTo(`/${itemId}/${recordId}`);
      });
    });
    
    this.attachPaginationListeners(container);
  }
  
  attachItemsTableEventListeners(container) {
    const rows = container.querySelectorAll('.table-row');
    rows.forEach(row => {
      row.addEventListener('click', () => {
        const itemId = row.getAttribute('data-item-id');
        navigateTo(`/${itemId}`);
      });
    });
    
    this.attachPaginationListeners(container);
  }
  
  attachPaginationListeners(container) {
    const paginationBtns = container.querySelectorAll('.pagination-btn');
    paginationBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const page = btn.getAttribute('data-page');
        
        if (page === 'prev') {
          this.currentPage = Math.max(0, this.currentPage - 1);
        } else if (page === 'next') {
          const state = appState.getState();
          const dataLength = state.activeTab === 'items' 
            ? appState.groupByItem().length 
            : state.filteredRecords.length;
          const totalPages = Math.ceil(dataLength / this.pageSize);
          this.currentPage = Math.min(totalPages - 1, this.currentPage + 1);
        } else {
          this.currentPage = parseInt(page);
        }
        
        this.renderTable();
      });
    });
  }
}