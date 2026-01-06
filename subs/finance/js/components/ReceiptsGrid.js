// Receipts Grid Component - Card grid with infinite scroll

import { formatCurrency, formatDate } from '../utils/finance-config.js';

export class ReceiptsGrid {
  constructor(containerId, receipts = [], costsMap = {}) {
    this.container = document.getElementById(containerId);
    this.receipts = receipts;
    this.costsMap = costsMap; // Map of cost_id -> cost data
    this.displayedCount = 20; // Initial load
    this.batchSize = 20; // Load more per scroll
    this.observer = null;
    
    this.render();
    this.setupInfiniteScroll();
  }

  updateData(receipts, costsMap) {
    this.receipts = receipts;
    this.costsMap = costsMap;
    this.displayedCount = 20;
    this.render();
  }

  render() {
    if (!this.container) return;

    // Empty state
    if (this.receipts.length === 0) {
      this.container.innerHTML = `
        <div class="receipts-empty-state">
          <div class="receipts-empty-state-icon">📄</div>
          <p class="receipts-empty-state-text">No receipts available</p>
        </div>
      `;
      return;
    }

    // Show receipts
    const receiptsToShow = this.receipts.slice(0, this.displayedCount);
    
    this.container.innerHTML = `
      <div class="receipts-grid">
        ${receiptsToShow.map(receipt => this.renderCard(receipt)).join('')}
      </div>
      ${this.displayedCount < this.receipts.length ? '<div class="receipts-sentinel"></div>' : ''}
    `;

    this.attachEventListeners();
  }

  renderCard(receipt) {
    // Get associated cost data
    const cost = this.costsMap[receipt.cost_id] || {};
    
    // Format data
    const vendor = cost.vendor || receipt.vendor || 'Unknown Vendor';
    const amount = cost.total_cost ? formatCurrency(cost.total_cost) : 'N/A';
    const date = receipt.created_at ? formatDate(receipt.created_at) : 'N/A';
    const itemName = cost.item_name || 'N/A';
    const costId = receipt.cost_id;
    const receiptUrl = receipt.cloudfront_url || receipt.image_url;
    
    return `
      <div class="receipt-card" data-receipt-id="${receipt.image_id}">
        <div class="receipt-card-content">
          <div class="receipt-card-header">
            <div>
              <div class="receipt-card-vendor">${vendor}</div>
              <div class="receipt-card-amount">${amount}</div>
            </div>
          </div>
          <div class="receipt-card-meta">
            <div class="receipt-card-date">
              <span class="receipt-card-date-icon">📅</span>
              <span>${date}</span>
            </div>
            <div class="receipt-card-item-name">
              <span class="receipt-card-item-icon">🏷️</span>
              <span>${itemName}</span>
            </div>
          </div>
        </div>
        <div class="receipt-card-footer">
          <a href="${receiptUrl}" target="_blank" rel="noopener noreferrer" class="receipt-card-btn btn-view-receipt">
            <span>View Receipt</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
              <polyline points="15 3 21 3 21 9"></polyline>
              <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
          </a>
          ${costId ? `
            <a href="/costs/${costId}" target="_blank" rel="noopener noreferrer" class="receipt-card-btn btn-view-cost">
              <span>View Cost Record</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                <polyline points="15 3 21 3 21 9"></polyline>
                <line x1="10" y1="14" x2="21" y2="3"></line>
              </svg>
            </a>
          ` : ''}
        </div>
      </div>
    `;
  }

  attachEventListeners() {
    // No click handlers needed - cards now have direct link buttons
    // Buttons handle their own navigation via href attributes
  }

  setupInfiniteScroll() {
    // Disconnect existing observer
    if (this.observer) {
      this.observer.disconnect();
    }

    // Create Intersection Observer for infinite scroll
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && this.displayedCount < this.receipts.length) {
          this.loadMore();
        }
      });
    }, {
      rootMargin: '100px' // Trigger 100px before reaching sentinel
    });

    // Observe the sentinel element
    const sentinel = this.container.querySelector('.receipts-sentinel');
    if (sentinel) {
      this.observer.observe(sentinel);
    }
  }

  loadMore() {
    console.log('📄 Loading more receipts...');
    this.displayedCount += this.batchSize;
    this.render();
    this.setupInfiniteScroll(); // Re-setup observer for new sentinel
  }

  destroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
  }
}