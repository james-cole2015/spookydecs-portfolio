// Cost Detail Drawer Component

import { formatCurrency, formatDate, formatDateTime } from '../utils/finance-config.js';
import { modal } from '../shared/modal.js';
import { toast } from '../shared/toast.js';
import { deleteCost } from '../utils/finance-api.js';

export class CostDetailDrawer {
  constructor() {
    this.drawer = document.getElementById('cost-detail-drawer');
    this.overlay = null;
    this.currentCost = null;
    this.onEdit = null;
    this.onDelete = null;
    this.initOverlay();
  }

  initOverlay() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'drawer-overlay';
    document.body.appendChild(this.overlay);

    this.overlay.addEventListener('click', () => this.close());
  }

  open(cost, callbacks = {}) {
    this.currentCost = cost;
    this.onEdit = callbacks.onEdit;
    this.onDelete = callbacks.onDelete;
    
    this.render();
    
    setTimeout(() => {
      this.drawer.classList.add('open');
      this.overlay.classList.add('visible');
    }, 10);
  }

  close() {
    this.drawer.classList.remove('open');
    this.overlay.classList.remove('visible');
    setTimeout(() => {
      this.drawer.innerHTML = '';
      this.currentCost = null;
    }, 300);
  }

  render() {
    const cost = this.currentCost;
    if (!cost) return;

    this.drawer.innerHTML = `
      <div class="drawer-header">
        <h2 class="drawer-title">Cost Record Details</h2>
        <button class="drawer-close" aria-label="Close">×</button>
      </div>

      <div class="drawer-actions">
        <button class="drawer-action-btn view" data-tooltip="View Full Details">
          <span class="icon">👁️</span>
          <span class="label">View</span>
        </button>
        <button class="drawer-action-btn edit" data-tooltip="Edit Record">
          <span class="icon">✏️</span>
          <span class="label">Edit</span>
        </button>
        <button class="drawer-action-btn delete" data-tooltip="Delete Record">
          <span class="icon">🗑️</span>
          <span class="label">Delete</span>
        </button>
      </div>

      <div class="drawer-content">
        ${this.renderBasicInfo(cost)}
        ${this.renderCostDetails(cost)}
        ${this.renderVendorInfo(cost)}
        ${this.renderRelatedInfo(cost)}
        ${this.renderReceiptSection(cost)}
        ${this.renderMetadata(cost)}
      </div>
    `;

    this.attachListeners();
  }

  renderBasicInfo(cost) {
    const packBadge = cost.class_type === 'pack'
      ? `<span class="badge badge-pack">PACK</span>`
      : '';
    return `
      <div class="detail-section">
        <h3 class="detail-section-title">Basic Information</h3>
        <div class="drawer-detail-list">
          <div class="drawer-detail-item">
            <span class="detail-label">Cost ID</span>
            <span class="detail-value">${cost.cost_id} ${packBadge}</span>
          </div>
          <div class="drawer-detail-item">
            <span class="detail-label">Date</span>
            <span class="detail-value">${formatDate(cost.cost_date)}</span>
          </div>
          <div class="drawer-detail-item">
            <span class="detail-label">Item Name</span>
            <span class="detail-value">${cost.item_name || 'N/A'}</span>
          </div>
          ${cost.description ? `
          <div class="drawer-detail-item full-width">
            <span class="detail-label">Description</span>
            <span class="detail-value">${cost.description}</span>
          </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  renderCostDetails(cost) {
    return `
      <div class="detail-section">
        <h3 class="detail-section-title">Cost Details</h3>
        <div class="drawer-detail-list">
          <div class="drawer-detail-item">
            <span class="detail-label">Type</span>
            <span class="detail-value">
              <span class="cost-type-badge cost-type-${cost.cost_type}">
                ${cost.cost_type.replace('_', ' ')}
              </span>
            </span>
          </div>
          <div class="drawer-detail-item">
            <span class="detail-label">Category</span>
            <span class="detail-value">
              <span class="category-badge">${cost.category}</span>
            </span>
          </div>
          ${cost.subcategory ? `
            <div class="drawer-detail-item">
              <span class="detail-label">Subcategory</span>
              <span class="detail-value">${cost.subcategory}</span>
            </div>
          ` : ''}
          <div class="drawer-detail-item">
            <span class="detail-label">Quantity</span>
            <span class="detail-value">${cost.quantity || 1}</span>
          </div>
          <div class="drawer-detail-item">
            <span class="detail-label">Unit Cost</span>
            <span class="detail-value">${formatCurrency(cost.unit_cost || cost.total_cost, cost.currency)}</span>
          </div>
          <div class="drawer-detail-item highlight">
            <span class="detail-label">Total Amount</span>
            <span class="detail-value amount">${formatCurrency(cost.total_cost, cost.currency)}</span>
          </div>
        </div>
      </div>
    `;
  }

  renderVendorInfo(cost) {
    return `
      <div class="detail-section">
        <h3 class="detail-section-title">Vendor Information</h3>
        <div class="drawer-detail-list">
          <div class="drawer-detail-item">
            <span class="detail-label">Vendor</span>
            <span class="detail-value">${cost.vendor || 'N/A'}</span>
          </div>
          <div class="drawer-detail-item">
            <span class="detail-label">Purchase Date</span>
            <span class="detail-value">${cost.purchase_date ? formatDate(cost.purchase_date) : 'N/A'}</span>
          </div>
        </div>
      </div>
    `;
  }

  renderRelatedInfo(cost) {
    // Pack records: show pack contents and derived fields instead of a single item link
    if (cost.class_type === 'pack') {
      return this.renderPackInfo(cost);
    }

    if (!cost.related_item_id && !cost.related_record_id && !cost.related_idea_id) {
      return '';
    }

    return `
      <div class="detail-section">
        <h3 class="detail-section-title">Related Records</h3>
        <div class="drawer-detail-list">
          ${cost.related_item_id ? `
            <div class="drawer-detail-item">
              <span class="detail-label">Related Item</span>
              <span class="detail-value">
                <a href="#" class="related-item-link" data-navigate="/${cost.related_item_id}">
                  ${cost.related_item_id} →
                </a>
              </span>
            </div>
          ` : ''}
          ${cost.related_idea_id ? `
            <div class="drawer-detail-item">
              <span class="detail-label">Related Idea</span>
              <span class="detail-value">
                <a href="#" class="related-item-link" data-navigate="/${cost.related_idea_id}">
                  ${cost.related_idea_id} →
                </a>
              </span>
            </div>
          ` : ''}
          ${cost.related_record_id ? `
            <div class="drawer-detail-item">
              <span class="detail-label">Related Maintenance</span>
              <span class="detail-value">
                <a href="#" class="related-item-link" data-navigate="/${cost.related_record_id}">
                  ${cost.related_record_id} →
                </a>
              </span>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  renderPackInfo(cost) {
    const packItems = Array.isArray(cost.pack_item_ids) ? cost.pack_item_ids : [];
    const itemsHTML = packItems.length > 0
      ? packItems.map(id => `
          <div class="pack-item-chip">
            <a href="#" class="related-item-link" data-navigate="/${id}">${id} →</a>
          </div>
        `).join('')
      : '<span style="color:#64748b;font-size:14px;">No items listed</span>';

    const costPerItem = typeof cost.cost_per_item === 'number' ? cost.cost_per_item : parseFloat(cost.cost_per_item) || 0;
    const valuePerItem = typeof cost.value_per_item === 'number' ? cost.value_per_item : parseFloat(cost.value_per_item) || 0;

    return `
      <div class="detail-section">
        <h3 class="detail-section-title">Pack Contents</h3>
        <div class="pack-items-list">${itemsHTML}</div>
      </div>
      <div class="detail-section">
        <h3 class="detail-section-title">Pack Summary</h3>
        <div class="drawer-detail-list">
          <div class="drawer-detail-item">
            <span class="detail-label">Items in Pack</span>
            <span class="detail-value">${cost.item_count || packItems.length}</span>
          </div>
          <div class="drawer-detail-item highlight">
            <span class="detail-label">Cost Per Item</span>
            <span class="detail-value amount">${formatCurrency(costPerItem)}</span>
          </div>
          <div class="drawer-detail-item highlight">
            <span class="detail-label">Value Per Item</span>
            <span class="detail-value amount">${formatCurrency(valuePerItem)}</span>
          </div>
        </div>
      </div>
    `;
  }

  renderReceiptSection(cost) {
    const receipt = cost.receipt_data;
    const hasReceipt = receipt && (receipt.cloudfront_url || receipt.receipt_id);

    if (!hasReceipt) {
      return `
        <div class="detail-section">
          <h3 class="detail-section-title">Receipt</h3>
          <p style="color: #64748b; font-size: 14px;">No receipt attached</p>
        </div>
      `;
    }

    const displayName = receipt.file_name || receipt.receipt_id || receipt.extraction_id || 'Receipt';
    return `
      <div class="detail-section">
        <h3 class="detail-section-title">Receipt</h3>
        <div class="receipt-preview">
          <div class="receipt-icon">📄</div>
          <div class="receipt-info">
            <div class="receipt-name">${displayName}</div>
            <div class="receipt-meta">
              ${receipt.file_type || 'Image'} ${receipt.file_size ? `• ${(receipt.file_size / 1024).toFixed(1)} KB` : ''}
            </div>
          </div>
          <button class="receipt-view-btn">View</button>
        </div>
      </div>
    `;
  }

  renderMetadata(cost) {
    return `
      <div class="detail-section">
        <h3 class="detail-section-title">Metadata</h3>
        <div class="drawer-detail-list">
          <div class="drawer-detail-item">
            <span class="detail-label">Created At</span>
            <span class="detail-value">${formatDateTime(cost.created_at)}</span>
          </div>
          <div class="drawer-detail-item">
            <span class="detail-label">Created By</span>
            <span class="detail-value">${cost.created_by || 'System'}</span>
          </div>
          ${cost.updated_at ? `
            <div class="drawer-detail-item">
              <span class="detail-label">Last Updated</span>
              <span class="detail-value">${formatDateTime(cost.updated_at)}</span>
            </div>
          ` : ''}
          ${cost.notes ? `
            <div class="drawer-detail-item full-width">
              <span class="detail-label">Notes</span>
              <span class="detail-value">${cost.notes}</span>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  attachListeners() {
    // Close button
    const closeBtn = this.drawer.querySelector('.drawer-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.close());
    }

    // Action buttons
    const viewBtn = this.drawer.querySelector('.drawer-action-btn.view');
    const editBtn = this.drawer.querySelector('.drawer-action-btn.edit');
    const deleteBtn = this.drawer.querySelector('.drawer-action-btn.delete');

    if (viewBtn) {
      viewBtn.addEventListener('click', () => {
        // Navigate to cost detail page
        window.location.href = `/costs/${this.currentCost.cost_id}`;
        this.close();
      });
    }

    if (editBtn) {
      editBtn.addEventListener('click', () => {
        if (this.onEdit) {
          this.onEdit(this.currentCost);
        }
        this.close();
      });
    }

    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => this.handleDelete());
    }

    // Related item links - navigate directly
    this.drawer.querySelectorAll('[data-navigate]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const path = e.currentTarget.dataset.navigate;
        window.location.href = path;
        this.close();
      });
    });

    // Receipt view button
    const receiptBtn = this.drawer.querySelector('.receipt-view-btn');
    if (receiptBtn) {
      receiptBtn.addEventListener('click', () => {
        const receipt = this.currentCost.receipt_data;
        if (receipt?.cloudfront_url) {
          window.open(receipt.cloudfront_url, '_blank');
        } else if (receipt?.receipt_id) {
          window.open(`/receipts/${receipt.receipt_id}`, '_blank');
        }
      });
    }
  }

  async handleDelete() {
    const confirmed = await modal.confirm({
      title: 'Delete Cost Record',
      message: `Are you sure you want to delete cost record "${this.currentCost.cost_id}"? This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger'
    });

    if (!confirmed) return;

    try {
      await deleteCost(this.currentCost.cost_id);
      toast.success('Cost record deleted successfully');
      
      if (this.onDelete) {
        this.onDelete(this.currentCost.cost_id);
      }
      
      this.close();
    } catch (error) {
      toast.error(`Failed to delete cost record: ${error.message}`);
    }
  }
}