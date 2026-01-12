// Records table renderer - handles both desktop table and mobile cards for maintenance records

import { appState } from '../../state.js';
import { navigateTo } from '../../router.js';
import { formatDate, formatStatus, formatCriticality, formatRecordTypePill } from '../../utils/formatters.js';
import { isMobile } from '../../utils/responsive.js';

export class RecordsTableRenderer {
  constructor(mobileCardView, mobileScrollManager) {
    this.mobileCardView = mobileCardView;
    this.mobileScrollManager = mobileScrollManager;
    this.currentPage = 0;
    this.pageSize = 50;
    this.sortColumn = 'created_at';
    this.sortDirection = 'desc';
    this.expandedRow = null;
  }
  
  render(container) {
    const state = appState.getState();
    let data = state.filteredRecords;
    
    console.log('RecordsTableRenderer.render() called');
    console.log('  Total records:', state.records.length);
    console.log('  Filtered records:', state.filteredRecords.length);
    console.log('  Active tab:', state.activeTab);
    
    // Apply tab filter
    if (state.activeTab !== 'all' && state.activeTab !== 'items') {
      const recordType = state.activeTab.endsWith('s') ? state.activeTab.slice(0, -1) : state.activeTab;
      data = data.filter(r => r.record_type === recordType);
      console.log('  After tab filter:', data.length);
    }
    
    if (data.length === 0) {
      console.log('  Rendering empty state');
      container.innerHTML = this.renderEmptyState();
      return;
    }
    
    console.log('  Rendering table with', data.length, 'records');
    
    // Apply sorting
    data = this.sortData(data, this.sortColumn, this.sortDirection);
    
    if (isMobile()) {
      this.renderMobile(container, data);
    } else {
      this.renderDesktop(container, data);
    }
  }
  
  renderMobile(container, data) {
    const loadedCount = this.mobileScrollManager.getLoadedCount();
    const pageData = data.slice(0, loadedCount);
    const hasMore = loadedCount < data.length;
    
    container.innerHTML = `
      ${this.mobileScrollManager.renderRecordCount(data.length, pageData.length)}
      ${this.mobileCardView.render(pageData)}
      ${hasMore ? this.mobileScrollManager.renderLoadingTrigger() : this.mobileScrollManager.renderEndOfResults()}
      ${this.mobileScrollManager.renderScrollToTop()}
    `;
    
    this.mobileCardView.attachEventListeners(container);
    this.mobileScrollManager.setupInfiniteScroll(container, data.length);
    this.mobileScrollManager.setupScrollToTop(container);
  }
  
  renderDesktop(container, data) {
    const totalPages = Math.ceil(data.length / this.pageSize);
    const startIdx = this.currentPage * this.pageSize;
    const endIdx = startIdx + this.pageSize;
    const pageData = data.slice(startIdx, endIdx);
    
    const tableHtml = `
      ${totalPages > 1 ? this.renderPagination(totalPages, data.length) : ''}
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
    `;
    
    container.innerHTML = tableHtml;
    this.attachTableEventListeners(container);
  }
  
  renderRecordRow(record) {
    const itemId = record.item_id || 'N/A';
    const recordId = record.record_id.substring(0, 8) + '...';
    const isExpanded = this.expandedRow === record.record_id;
    
    const scheduleBadge = record.is_scheduled_task 
      ? `<span class="schedule-badge" title="Scheduled task">📅</span>` 
      : '';
    
    const displayDate = record.date_scheduled || record.date_performed || record.created_at;
    
    return `
      <tr class="table-row ${isExpanded ? 'expanded' : ''}" data-record-id="${record.record_id}" data-item-id="${itemId}">
        <td><code>${recordId}</code></td>
        <td>${formatStatus(record.status)}</td>
        <td class="table-title">${scheduleBadge}${record.title}</td>
        <td>${formatRecordTypePill(record.record_type)}</td>
        <td><code>${itemId}</code></td>
        <td>${formatCriticality(record.criticality)}</td>
        <td>${formatDate(displayDate)}</td>
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
  
  renderPagination(totalPages, totalRecords) {
    const startRecord = this.currentPage * this.pageSize + 1;
    const endRecord = Math.min((this.currentPage + 1) * this.pageSize, totalRecords);
    
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
        <span class="pagination-info">
          Showing ${startRecord}-${endRecord} of ${totalRecords}
        </span>
        <div class="pagination-controls">
          <button 
            class="pagination-btn pagination-arrow" 
            data-page="prev"
            ${this.currentPage === 0 ? 'disabled' : ''}
          >
            ← Previous
          </button>
          ${pages.join('')}
          <button 
            class="pagination-btn pagination-arrow" 
            data-page="next"
            ${this.currentPage === totalPages - 1 ? 'disabled' : ''}
          >
            Next →
          </button>
        </div>
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
  
  sortData(data, column, direction) {
    return [...data].sort((a, b) => {
      let aVal = a[column];
      let bVal = b[column];
      
      if (column === 'created_at' || column === 'date_performed') {
        aVal = new Date(aVal);
        bVal = new Date(bVal);
      }
      
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      
      if (aVal < bVal) return direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  }
  
  attachTableEventListeners(container) {
    const rows = container.querySelectorAll('.table-row');
    rows.forEach(row => {
      row.addEventListener('click', (e) => {
        if (e.target.closest('.expansion-btn')) return;
        
        const recordId = row.getAttribute('data-record-id');
        
        if (this.expandedRow === recordId) {
          this.expandedRow = null;
        } else {
          this.expandedRow = recordId;
        }
        
        // Need to trigger re-render from parent
        if (this.onRerender) {
          this.onRerender();
        }
      });
    });
    
    const expansionBtns = container.querySelectorAll('.expansion-btn');
    expansionBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = btn.getAttribute('data-action');
        const recordId = btn.getAttribute('data-record-id');
        const itemId = btn.getAttribute('data-item-id');
        
        this.handleExpansionAction(action, recordId, itemId);
      });
    });
    
    const sortHeaders = container.querySelectorAll('th.sortable');
    sortHeaders.forEach(header => {
      header.addEventListener('click', () => {
        const column = header.getAttribute('data-column');
        
        if (this.sortColumn === column) {
          this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
          this.sortColumn = column;
          this.sortDirection = 'desc';
        }
        
        if (this.onRerender) {
          this.onRerender();
        }
      });
    });
    
    this.attachPaginationListeners(container);
  }
  
  handleExpansionAction(action, recordId, itemId) {
    switch(action) {
      case 'view':
        navigateTo(`/${encodeURIComponent(itemId)}/${recordId}`);
        break;
      case 'edit':
        navigateTo(`/${encodeURIComponent(itemId)}/${recordId}/edit`);
        break;
      case 'inspect':
        navigateTo(`/${encodeURIComponent(itemId)}/${recordId}/perform-inspection`);
        break;
      case 'delete':
        if (this.onDelete) {
          this.onDelete(recordId);
        }
        break;
    }
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
          const dataLength = state.filteredRecords.length;
          const totalPages = Math.ceil(dataLength / this.pageSize);
          this.currentPage = Math.min(totalPages - 1, this.currentPage + 1);
        } else {
          this.currentPage = parseInt(page);
        }
        
        if (this.onRerender) {
          this.onRerender();
        }
      });
    });
  }
}