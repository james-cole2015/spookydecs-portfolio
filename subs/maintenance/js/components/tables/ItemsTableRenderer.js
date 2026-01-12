// Items table renderer - handles both desktop table and mobile cards for maintenance items

import { appState } from '../../state.js';
import { navigateTo } from '../../router.js';
import { formatDate, formatCriticality, formatCurrency } from '../../utils/formatters.js';
import { isMobile } from '../../utils/responsive.js';

export class ItemsTableRenderer {
  constructor(mobileItemCardView, mobileScrollManager) {
    this.mobileItemCardView = mobileItemCardView;
    this.mobileScrollManager = mobileScrollManager;
    this.currentPage = 0;
    this.pageSize = 50;
  }
  
  render(container) {
    const itemsData = appState.groupByItem();
    
    console.log('ItemsTableRenderer.render() called');
    console.log('  Items data length:', itemsData.length);
    
    if (itemsData.length === 0) {
      console.log('  Rendering empty state for items');
      container.innerHTML = this.renderEmptyState();
      return;
    }
    
    console.log('  Rendering items table with', itemsData.length, 'items');
    
    // Sort by item_id
    const sortedData = itemsData.sort((a, b) => a.item_id.localeCompare(b.item_id));
    
    if (isMobile()) {
      this.renderMobile(container, sortedData);
    } else {
      this.renderDesktop(container, sortedData);
    }
  }
  
  renderMobile(container, data) {
    const loadedCount = this.mobileScrollManager.getLoadedCount();
    const pageData = data.slice(0, loadedCount);
    const hasMore = loadedCount < data.length;
    
    container.innerHTML = `
      ${this.mobileScrollManager.renderItemCount(data.length, pageData.length)}
      ${this.mobileItemCardView.render(pageData)}
      ${hasMore ? this.mobileScrollManager.renderLoadingTrigger() : this.mobileScrollManager.renderEndOfResults()}
      ${this.mobileScrollManager.renderScrollToTop()}
    `;
    
    this.mobileItemCardView.attachEventListeners(container);
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
    `;
    
    container.innerHTML = tableHtml;
    this.attachTableEventListeners(container);
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
        <div class="empty-icon">📦</div>
        <h3>No items found</h3>
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
        const itemId = row.getAttribute('data-item-id');
        navigateTo(`/${encodeURIComponent(itemId)}`);
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
          const itemsData = appState.groupByItem();
          const totalPages = Math.ceil(itemsData.length / this.pageSize);
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