// Cost Detail View Component

import { navigateTo } from '../utils/router.js';
import { deleteCost, getReceiptImage } from '../utils/finance-api.js';

// Optional imports - graceful fallback if not available
let showToast, showModal;
try {
  const toastModule = await import('../shared/toast.js');
  showToast = toastModule.showToast;
} catch (e) {
  showToast = (msg, type) => console.log(`[${type}] ${msg}`);
}
try {
  const modalModule = await import('../shared/modal.js');
  showModal = modalModule.showModal;
} catch (e) {
  showModal = async (opts) => window.confirm(opts.message);
}

export class CostDetailView {
  constructor(costData) {
    this.costData = costData;
    this.receiptImageData = null;
  }

  async render(container) {
    console.log('🎨 Rendering CostDetailView');
    
    // Load receipt image if available
    await this.loadReceiptImage();
    
    container.innerHTML = this.getHTML();
    this.attachEventListeners();
  }

  async loadReceiptImage() {
    const photoId = this.costData.receipt_data?.image_id;
    if (!photoId) {
      console.log('No receipt photo_id found');
      return;
    }

    try {
      console.log('📸 Loading receipt image:', photoId);
      this.receiptImageData = await getReceiptImage(photoId);
      console.log('✅ Receipt image loaded:', this.receiptImageData);
    } catch (error) {
      console.error('❌ Failed to load receipt image:', error);
    }
  }

  getHTML() {
    const cost = this.costData;
    const date = new Date(cost.cost_date);
    const formattedDate = date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    const hasReceipt = cost.receipt_data?.image_id || cost.receipt_data?.image_url;

    return `
      <div class="cost-detail-page">
        <div class="page-header">
          <button class="btn-back" data-action="back">← Back to Finance</button>
          <div class="detail-title">
            <h1>Cost Record</h1>
            <p class="detail-subtitle">${cost.cost_id}</p>
          </div>
        </div>
        ${this.renderRelatedLinks(cost)}
        <div class="cost-details-section">
          <h2>💰 Cost Details</h2>
          <div class="detail-grid">
            <div class="detail-row"><span class="detail-label">Date</span><span class="detail-value">${formattedDate}</span></div>
            <div class="detail-row"><span class="detail-label">Type</span><span class="detail-value">${this.formatCostType(cost.cost_type)}</span></div>
            <div class="detail-row"><span class="detail-label">Category</span><span class="detail-value">${this.formatCategory(cost.category)}</span></div>
            ${cost.subcategory ? `<div class="detail-row"><span class="detail-label">Subcategory</span><span class="detail-value">${cost.subcategory}</span></div>` : ''}
            <div class="detail-row"><span class="detail-label">Item Name</span><span class="detail-value">${cost.item_name || 'N/A'}</span></div>
            <div class="detail-row"><span class="detail-label">Vendor</span><span class="detail-value">${cost.vendor}</span></div>
            <div class="detail-row"><span class="detail-label">Payment Method</span><span class="detail-value">${cost.payment_method || 'Not specified'}</span></div>
            <div class="detail-divider"></div>
            <div class="detail-row"><span class="detail-label">Quantity</span><span class="detail-value">${cost.quantity || 1}</span></div>
            <div class="detail-row"><span class="detail-label">Unit Cost</span><span class="detail-value">$${parseFloat(cost.unit_cost || cost.total_cost).toFixed(2)}</span></div>
            ${cost.tax > 0 ? `<div class="detail-row"><span class="detail-label">Tax</span><span class="detail-value">$${parseFloat(cost.tax).toFixed(2)}</span></div>` : ''}
            <div class="detail-row highlight"><span class="detail-label">Total Cost</span><span class="detail-value">$${parseFloat(cost.total_cost).toFixed(2)}</span></div>
            <div class="detail-row"><span class="detail-label">Item Value</span><span class="detail-value">$${parseFloat(cost.value || cost.total_cost).toFixed(2)}</span></div>
          </div>
        </div>
        ${cost.description || cost.notes ? `
          <div class="description-section">
            ${cost.description ? `<div class="description-block"><h3>Description</h3><p>${cost.description}</p></div>` : ''}
            ${cost.notes ? `<div class="notes-block"><h3>Notes</h3><p>${cost.notes}</p></div>` : ''}
          </div>
        ` : ''}
        ${hasReceipt ? this.renderReceiptSection() : ''}
        <div class="action-buttons">
          <button class="btn-secondary" data-action="edit">Edit</button>
          <button class="btn-danger" data-action="delete">Delete</button>
        </div>
        <div class="metadata-section">
          <p class="metadata-text">Created ${new Date(cost.created_at).toLocaleDateString()} by ${cost.created_by || 'system'}</p>
          ${cost.updated_at !== cost.created_at ? `<p class="metadata-text">Last updated ${new Date(cost.updated_at).toLocaleDateString()}</p>` : ''}
        </div>
      </div>
    `;
  }

  renderRelatedLinks(cost) {
    const links = [];
    if (cost.related_item_id) links.push({ label: 'Item', id: cost.related_item_id, url: `/finance/${cost.related_item_id}` });
    if (cost.related_idea_id) links.push({ label: 'Idea', id: cost.related_idea_id, url: `/finance/${cost.related_idea_id}` });
    if (cost.related_record_id) links.push({ label: 'Maintenance Record', id: cost.related_record_id, url: `/finance/${cost.related_record_id}` });
    if (links.length === 0) return '';
    return `
      <div class="related-links-banner">
        <span class="related-label">Related:</span>
        ${links.map(link => `<a href="${link.url}" class="related-link" data-navigate="${link.url}">${link.label}: ${link.id} →</a>`).join('')}
      </div>
    `;
  }

  renderReceiptSection() {
    if (!this.receiptImageData) {
      return `
        <div class="receipt-section">
          <h3>📄 Receipt</h3>
          <p class="empty-message">Receipt image not available</p>
        </div>
      `;
    }

    const thumbnailUrl = this.receiptImageData.thumbnail_url;
    const fullUrl = this.receiptImageData.cloudfront_url;

    return `
      <div class="receipt-section">
        <h3>📄 Receipt</h3>
        <div class="receipt-thumbnail-container">
          <img 
            src="${thumbnailUrl}" 
            alt="Receipt thumbnail" 
            class="receipt-thumbnail"
            data-full-url="${fullUrl}"
            data-action="view-receipt-full"
          />
          <button class="btn-view-full" data-full-url="${fullUrl}" data-action="view-receipt-full">
            View Full Size →
          </button>
        </div>
      </div>
    `;
  }

  formatCostType(type) {
    const typeMap = { 'acquisition': 'Purchase', 'repair': 'Repair', 'maintenance': 'Maintenance', 'build': 'Build', 'supply_purchase': 'Supply Purchase', 'gift': 'Gift', 'other': 'Other' };
    return typeMap[type] || type;
  }

  formatCategory(category) {
    const categoryMap = { 'materials': 'Materials', 'labor': 'Labor', 'parts': 'Parts', 'consumables': 'Consumables', 'decoration': 'Decoration', 'light': 'Light', 'accessory': 'Accessory', 'other': 'Other' };
    return categoryMap[category] || category;
  }

  attachEventListeners() {
    // Back button
    document.querySelectorAll('[data-action="back"]').forEach(btn => 
      btn.addEventListener('click', () => navigateTo('/'))
    );

    // Related links - prevent default and use router
    document.querySelectorAll('[data-navigate]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const path = e.currentTarget.dataset.navigate;
        navigateTo(path);
      });
    });

    // View full receipt
    document.querySelectorAll('[data-action="view-receipt-full"]').forEach(el => {
      el.addEventListener('click', (e) => {
        const fullUrl = e.currentTarget.dataset.fullUrl;
        window.open(fullUrl, '_blank');
      });
    });

    // Edit button
    document.querySelectorAll('[data-action="edit"]').forEach(btn => 
      btn.addEventListener('click', () => {
        console.log('Edit cost clicked');
        showToast('Edit functionality coming soon', 'info');
      })
    );

    // Delete button
    document.querySelectorAll('[data-action="delete"]').forEach(btn => 
      btn.addEventListener('click', () => this.handleDelete())
    );
  }

  async handleDelete() {
    const confirmed = await showModal({ 
      title: 'Delete Cost Record', 
      message: 'Are you sure you want to delete this cost record? This action cannot be undone.', 
      confirmText: 'Delete', 
      cancelText: 'Cancel', 
      type: 'danger' 
    });
    
    if (!confirmed) return;
    
    try {
      await deleteCost(this.costData.cost_id);
      showToast('Cost record deleted successfully', 'success');
      setTimeout(() => navigateTo('/'), 1000);
    } catch (error) {
      console.error('Error deleting cost:', error);
      showToast('Failed to delete cost record: ' + error.message, 'error');
    }
  }
}