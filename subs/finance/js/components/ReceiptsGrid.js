// Receipts Grid Component - Card grid with infinite scroll

import { ReceiptModal } from './ReceiptModal.js';
import { formatCurrency, formatDate } from '../utils/finance-config.js';

export class ReceiptsGrid {
  constructor(containerId, receipts = [], costsMap = {}) {
    this.container = document.getElementById(containerId);
    this.receipts = receipts;
    this.costsMap = costsMap; // Map of cost_id -> cost data
    this.displayedCount = 20; // Initial load
    this.batchSize = 20; // Load more per scroll
    this.modal = new ReceiptModal();
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
    
    // Check if it's a PDF
    const isPDF = receipt.cloudfront_url?.toLowerCase().endsWith('.pdf') || 
                  receipt.s3_key?.toLowerCase().endsWith('.pdf') ||
                  receipt.thumbnail_url?.toLowerCase().endsWith('.pdf');
    
    return `
      <div class="receipt-card" data-receipt-id="${receipt.image_id}">
        <div class="receipt-card-thumbnail">
          ${isPDF ? `
            <div class="receipt-card-pdf-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="currentColor" fill-opacity="0.1"/>
                <path d="M14 2V8H20" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M10 12H14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <path d="M10 16H14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <path d="M10 20H14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
              <div class="receipt-card-pdf-label">PDF</div>
            </div>
          ` : receipt.thumbnail_url ? `
            <img src="${receipt.thumbnail_url}" alt="${vendor} receipt" loading="lazy" />
          ` : `
            <div class="receipt-card-thumbnail-placeholder">📄</div>
          `}
        </div>
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
            ${costId ? `
              <a href="/costs/${costId}" class="receipt-card-item-link" onclick="event.stopPropagation()">
                <span class="receipt-card-item-icon">🔗</span>
                <span>${itemName}</span>
              </a>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }

  attachEventListeners() {
    // Card click to open modal
    const cards = this.container.querySelectorAll('.receipt-card');
    cards.forEach(card => {
      card.addEventListener('click', () => {
        const receiptId = card.dataset.receiptId;
        const receipt = this.receipts.find(r => r.image_id === receiptId);
        if (receipt) {
          this.openReceiptModal(receipt);
        }
      });
    });
  }

  openReceiptModal(receipt) {
    const cost = this.costsMap[receipt.cost_id] || {};
    
    const modalData = {
      vendor: cost.vendor || receipt.vendor || 'Unknown Vendor',
      amount: cost.total_cost ? formatCurrency(cost.total_cost) : '',
      date: receipt.created_at ? formatDate(receipt.created_at) : '',
      cloudfront_url: receipt.cloudfront_url || receipt.image_url,
      cost_id: receipt.cost_id
    };
    
    this.modal.show(modalData);
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
    if (this.modal) {
      this.modal.destroy();
    }
  }
}