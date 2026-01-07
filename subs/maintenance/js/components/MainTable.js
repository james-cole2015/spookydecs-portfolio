// Main table view with TanStack Table integration, sorting, and mobile support

import { appState } from '../state.js';
import { Tabs } from './Tabs.js';
import { Filters } from './Filters.js';
import { MobileCardView } from './MobileCardView.js';
import { MobileFilters } from './MobileFilters.js';
import { navigateTo } from '../router.js';
import { formatDate, formatStatus, formatCriticality, formatRecordTypePill, formatCurrency } from '../utils/formatters.js';
import { isMobile } from '../utils/responsive.js';

export class MainTableView {
  constructor() {
    this.tabs = new Tabs(() => this.renderTable());
    this.filters = new Filters(() => this.renderTable());
    this.mobileCardView = new MobileCardView((recordId, itemId) => {
      navigateTo(`/${itemId}/${recordId}`);
    });
    this.mobileFilters = new MobileFilters(() => this.renderTable());
    this.table = null;
    this.currentPage = 0;
    this.pageSize = 50;
    this.sortColumn = 'created_at';
    this.sortDirection = 'desc';
    this.expandedRow = null;
    
    // Infinite scroll state (mobile only)
    this.mobileLoadedCount = 20; // Initial load
    this.mobileLoadIncrement = 20; // Load 20 more at a time
    this.isLoadingMore = false;
    this.infiniteScrollObserver = null;
  }
  
  async render(container) {
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
    
    // Add event listeners for header buttons
    this.attachHeaderButtonListeners(container);
    
    // Render tabs
    const tabsContainer = container.querySelector('#tabs-container');
    tabsContainer.innerHTML = this.tabs.render();
    this.tabs.attachEventListeners(tabsContainer);
    
    // Render filters (desktop or mobile)
    const filtersContainer = container.querySelector('#filters-container');
    if (isMobile()) {
      filtersContainer.innerHTML = this.mobileFilters.render();
      this.mobileFilters.attachEventListeners(filtersContainer);
    } else {
      filtersContainer.innerHTML = this.filters.render();
      this.filters.attachEventListeners(filtersContainer);
    }
    
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
        if (isMobile()) {
          // For mobile, we need to re-render the entire mobile filters
          // but preserve the drawer state if it's open
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
    });
    
    // Render table
    await this.renderTable();
  }
  
  renderHeaderButtons() {
    if (isMobile()) {
      // Mobile: Icon buttons
      return `
        <button class="btn-mobile-icon btn-calendar" id="btn-schedules" title="Maintenance Schedules">
          📅
        </button>
        <button class="btn-mobile-icon btn-create" id="btn-create" title="Create Record">
          ➕
        </button>
      `;
    } else {
      // Desktop: Text buttons
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
      schedulesBtn.addEventListener('click', () => {
        navigateTo('/schedules');
      });
    }
    
    if (createBtn) {
      createBtn.addEventListener('click', () => {
        navigateTo('/create');
      });
    }
  }
  
  async renderTable() {
    const tableContainer = document.querySelector('#table-container');
    if (!tableContainer) return;
    
    // Reset infinite scroll state when table re-renders (new filter/tab)
    if (isMobile()) {
      this.mobileLoadedCount = this.mobileLoadIncrement;
    }
    
    const state = appState.getState();
    const activeTab = state.activeTab;
    
    if (activeTab === 'items') {
      this.renderItemsTable(tableContainer);
    } else {
      this.renderRecordsTable(tableContainer);
    }
  }
  
  sortData(data, column, direction) {
    return [...data].sort((a, b) => {
      let aVal = a[column];
      let bVal = b[column];
      
      // Handle dates
      if (column === 'created_at' || column === 'date_performed') {
        aVal = new Date(aVal);
        bVal = new Date(bVal);
      }
      
      // Handle nulls
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      
      // Compare
      if (aVal < bVal) return direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return direction === 'asc' ? 1 : -1;
      return 0;
    });
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
    
    // Apply sorting
    data = this.sortData(data, this.sortColumn, this.sortDirection);
    
    // Mobile: Infinite scroll
    if (isMobile()) {
      const pageData = data.slice(0, this.mobileLoadedCount);
      const hasMore = this.mobileLoadedCount < data.length;
      
      container.innerHTML = `
        ${this.renderRecordCount(data.length, pageData.length)}
        ${this.mobileCardView.render(pageData)}
        ${hasMore ? this.renderLoadingTrigger() : this.renderEndOfResults()}
        ${this.renderScrollToTop()}
      `;
      
      this.mobileCardView.attachEventListeners(container);
      this.setupInfiniteScroll(container, data.length);
      this.setupScrollToTop(container);
    } 
    // Desktop: Pagination
    else {
      const totalPages = Math.ceil(data.length / this.pageSize);
      const startIdx = this.currentPage * this.pageSize;
      const endIdx = startIdx + this.pageSize;
      const pageData = data.slice(startIdx, endIdx);
      
      const tableHtml = `
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th class="sortable ${this.sortColumn === 'record_id' ? 'sort-' + this.sortDirection : ''}" data-column="record_id">
                  Record ID
                </th>
                <th class="sortable ${this.sortColumn === 'status' ? 'sort-' + this.sortDirection : ''}" data-column="status">
                  Status
                </th>
                <th class="sortable ${this.sortColumn === 'title' ? 'sort-' + this.sortDirection : ''}" data-column="title">
                  Title
                </th>
                <th class="sortable ${this.sortColumn === 'record_type' ? 'sort-' + this.sortDirection : ''}" data-column="record_type">
                  Type
                </th>
                <th class="sortable ${this.sortColumn === 'item_id' ? 'sort-' + this.sortDirection : ''}" data-column="item_id">
                  Item ID
                </th>
                <th class="sortable ${this.sortColumn === 'criticality' ? 'sort-' + this.sortDirection : ''}" data-column="criticality">
                  Criticality
                </th>
                <th class="sortable ${this.sortColumn === 'date_performed' ? 'sort-' + this.sortDirection : ''}" data-column="date_performed">
                  Date
                </th>
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
  }
  
  renderRecordRow(record) {
    const itemId = record.item_id || 'N/A';
    const recordId = record.record_id.substring(0, 8) + '...';
    const isExpanded = this.expandedRow === record.record_id;
    
    // Show schedule badge if record is from a schedule
    const scheduleBadge = record.is_scheduled_task 
      ? `<span class="schedule-badge" title="Scheduled task">📅</span>` 
      : '';
    
    return `
      <tr class="table-row ${isExpanded ? 'expanded' : ''}" data-record-id="${record.record_id}" data-item-id="${itemId}">
        <td><code>${recordId}</code></td>
        <td>${formatStatus(record.status)}</td>
        <td class="table-title">${scheduleBadge}${record.title}</td>
        <td>${formatRecordTypePill(record.record_type)}</td>
        <td><code>${itemId}</code></td>
        <td>${formatCriticality(record.criticality)}</td>
        <td>${formatDate(record.date_performed || record.created_at)}</td>
      </tr>
      ${isExpanded ? this.renderExpansionDrawer(record) : ''}
    `;
  }
  
  renderExpansionDrawer(record) {
    const itemId = record.item_id || 'N/A';
    const isInspection = record.record_type === 'inspection' && 
                         ['pending', 'Pending', 'PENDING', 'scheduled', 'SCHEDULED', 'Scheduled'].includes(record.status);
    
    return `
      <tr class="expansion-drawer">
        <td colspan="7">
          <div class="expansion-content">
            <button class="expansion-btn view" data-action="view" data-record-id="${record.record_id}" data-item-id="${itemId}">
              <span class="expansion-btn-icon">👁️</span>
              <span class="expansion-btn-label">View</span>
            </button>
            <button class="expansion-btn edit" data-action="edit" data-record-id="${record.record_id}" data-item-id="${itemId}">
              <span class="expansion-btn-icon">✎</span>
              <span class="expansion-btn-label">Edit</span>
            </button>
            <button class="expansion-btn delete" data-action="delete" data-record-id="${record.record_id}" data-item-id="${itemId}">
              <span class="expansion-btn-icon">✕</span>
              <span class="expansion-btn-label">Delete</span>
            </button>
            ${isInspection ? `
              <button class="expansion-btn inspect" data-action="inspect" data-record-id="${record.record_id}" data-item-id="${itemId}">
                <span class="expansion-btn-icon">🔍</span>
                <span class="expansion-btn-label">Inspect</span>
              </button>
            ` : ''}
          </div>
        </td>
      </tr>
    `;
  }
  
  
  renderRecordCount(total, showing) {
    return `
      <div class="mobile-record-count">
        Showing ${showing} of ${total} records
      </div>
    `;
  }
  
  renderLoadingTrigger() {
    return `
      <div class="infinite-scroll-trigger" id="infinite-scroll-trigger">
        <div class="loading-spinner">
          <div class="spinner-dot"></div>
          <div class="spinner-dot"></div>
          <div class="spinner-dot"></div>
        </div>
      </div>
    `;
  }
  
  renderEndOfResults() {
    return `
      <div class="end-of-results">
        <div class="end-icon">✓</div>
        <p>End of results</p>
      </div>
    `;
  }
  
  renderScrollToTop() {
    return `
      <button class="scroll-to-top-btn hidden" id="scroll-to-top-btn" title="Scroll to top">
        ↑
      </button>
    `;
  }
  
  setupInfiniteScroll(container, totalRecords) {
    // Clean up existing observer
    if (this.infiniteScrollObserver) {
      this.infiniteScrollObserver.disconnect();
    }
    
    const trigger = container.querySelector('#infinite-scroll-trigger');
    if (!trigger) return;
    
    // Create intersection observer
    this.infiniteScrollObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && !this.isLoadingMore && this.mobileLoadedCount < totalRecords) {
            this.loadMoreRecords();
          }
        });
      },
      {
        root: null,
        rootMargin: '100px', // Trigger 100px before reaching the element
        threshold: 0.1
      }
    );
    
    this.infiniteScrollObserver.observe(trigger);
  }
  
  loadMoreRecords() {
    this.isLoadingMore = true;
    
    // Simulate slight delay for better UX (shows loading state)
    setTimeout(() => {
      this.mobileLoadedCount += this.mobileLoadIncrement;
      this.isLoadingMore = false;
      this.renderTable();
    }, 300);
  }
  
  setupScrollToTop(container) {
    const scrollBtn = container.querySelector('#scroll-to-top-btn');
    if (!scrollBtn) return;
    
    // Show/hide button based on scroll position
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      if (scrollTop > 400) {
        scrollBtn.classList.remove('hidden');
      } else {
        scrollBtn.classList.add('hidden');
      }
    };
    
    // Scroll to top when clicked
    scrollBtn.addEventListener('click', () => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
    
    // Attach scroll listener
    window.addEventListener('scroll', handleScroll);
    
    // Clean up on unmount (would need proper cleanup in real app)
    // For now, remove and re-add to prevent duplicates
    window.removeEventListener('scroll', handleScroll);
    window.addEventListener('scroll', handleScroll);
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
      row.addEventListener('click', (e) => {
        // Don't navigate if clicking expansion buttons
        if (e.target.closest('.expansion-btn')) return;
        
        const recordId = row.getAttribute('data-record-id');
        
        // Toggle expansion
        if (this.expandedRow === recordId) {
          this.expandedRow = null;
        } else {
          this.expandedRow = recordId;
        }
        
        this.renderTable();
      });
    });
    
    // Expansion button actions
    const expansionBtns = container.querySelectorAll('.expansion-btn');
    expansionBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = btn.getAttribute('data-action');
        const recordId = btn.getAttribute('data-record-id');
        const itemId = btn.getAttribute('data-item-id');
        
        switch(action) {
          case 'view':
            navigateTo(`/${itemId}/${recordId}`);
            break;
          case 'edit':
            navigateTo(`/${itemId}/${recordId}/edit`);
            break;
          case 'inspect':
            navigateTo(`/${itemId}/${recordId}/perform-inspection`);
            break;
          case 'delete':
            this.handleDelete(recordId);
            break;
        }
      });
    });
    
    // Sorting event listeners
    const sortHeaders = container.querySelectorAll('th.sortable');
    sortHeaders.forEach(header => {
      header.addEventListener('click', () => {
        const column = header.getAttribute('data-column');
        
        // Toggle sort direction if same column, otherwise default to desc
        if (this.sortColumn === column) {
          this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
          this.sortColumn = column;
          this.sortDirection = 'desc';
        }
        
        this.renderTable();
      });
    });
    
    this.attachPaginationListeners(container);
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
      // Import deleteRecord dynamically to avoid circular dependencies
      const { deleteRecord } = await import('../api.js');
      await deleteRecord(recordId);
      appState.removeRecord(recordId);
      
      if (window.toast) {
        window.toast.success('Success', 'Record deleted successfully');
      }
      
      // Reset expansion and re-render
      this.expandedRow = null;
      this.renderTable();
    } catch (error) {
      console.error('Failed to delete record:', error);
      if (window.toast) {
        window.toast.error('Error', 'Failed to delete record');
      }
    }
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