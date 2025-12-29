// Cost Review Modal Component

import { formatCurrency, formatDate } from '../utils/finance-config.js';

export class CostReviewModal {
  constructor() {
    this.modal = null;
    this.onConfirm = null;
    this.onCancel = null;
  }

  show(costData, callbacks = {}) {
    this.onConfirm = callbacks.onConfirm;
    this.onCancel = callbacks.onCancel;

    this.modal = document.createElement('div');
    this.modal.className = 'review-modal';
    this.modal.innerHTML = this.render(costData);

    document.body.appendChild(this.modal);

    setTimeout(() => {
      this.modal.classList.add('visible');
    }, 10);

    this.attachListeners();
  }

  render(cost) {
    return `
      <div class="review-modal-content">
        <div class="review-modal-header">
          <h2 class="review-modal-title">Review Cost Record</h2>
        </div>

        <div class="review-modal-body">
          ${this.renderBasicInfo(cost)}
          ${this.renderCostDetails(cost)}
          ${this.renderVendorInfo(cost)}
          ${this.renderAdditionalInfo(cost)}
        </div>

        <div class="review-modal-footer">
          <button class="btn-secondary" id="review-cancel-btn">Go Back</button>
          <button class="btn-primary" id="review-confirm-btn">Confirm & Submit</button>
        </div>
      </div>
    `;
  }

  renderBasicInfo(cost) {
    return `
      <div class="review-section">
        <h3 class="review-section-title">Basic Information</h3>
        <div class="review-grid">
          <div class="review-field">
            <span class="review-label">Item Name</span>
            <span class="review-value">${cost.item_name || 'N/A'}</span>
          </div>
          <div class="review-field">
            <span class="review-label">Cost Date</span>
            <span class="review-value">${formatDate(cost.cost_date)}</span>
          </div>
          ${cost.description ? `
            <div class="review-field full-width">
              <span class="review-label">Description</span>
              <span class="review-value">${cost.description}</span>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  renderCostDetails(cost) {
    return `
      <div class="review-section">
        <h3 class="review-section-title">Cost Details</h3>
        <div class="review-grid">
          <div class="review-field">
            <span class="review-label">Type</span>
            <span class="review-value">${cost.cost_type?.replace('_', ' ') || 'N/A'}</span>
          </div>
          <div class="review-field">
            <span class="review-label">Category</span>
            <span class="review-value">${cost.category || 'N/A'}</span>
          </div>
          ${cost.subcategory ? `
            <div class="review-field">
              <span class="review-label">Subcategory</span>
              <span class="review-value">${cost.subcategory}</span>
            </div>
          ` : ''}
          <div class="review-field">
            <span class="review-label">Quantity</span>
            <span class="review-value">${cost.quantity || 1}</span>
          </div>
          <div class="review-field">
            <span class="review-label">Unit Cost</span>
            <span class="review-value">${formatCurrency(cost.unit_cost || cost.total_cost, cost.currency)}</span>
          </div>
          <div class="review-field">
            <span class="review-label">Total Amount</span>
            <span class="review-value amount">${formatCurrency(cost.total_cost, cost.currency || 'USD')}</span>
          </div>
        </div>
      </div>
    `;
  }

  renderVendorInfo(cost) {
    return `
      <div class="review-section">
        <h3 class="review-section-title">Vendor Information</h3>
        <div class="review-grid">
          <div class="review-field">
            <span class="review-label">Vendor</span>
            <span class="review-value">${cost.vendor || 'N/A'}</span>
          </div>
          ${cost.purchase_date ? `
            <div class="review-field">
              <span class="review-label">Purchase Date</span>
              <span class="review-value">${formatDate(cost.purchase_date)}</span>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  renderAdditionalInfo(cost) {
    if (!cost.related_item_id && !cost.notes) {
      return '';
    }

    return `
      <div class="review-section">
        <h3 class="review-section-title">Additional Information</h3>
        <div class="review-grid">
          ${cost.related_item_id ? `
            <div class="review-field">
              <span class="review-label">Related Item</span>
              <span class="review-value">${cost.related_item_id}</span>
            </div>
          ` : ''}
          ${cost.notes ? `
            <div class="review-field full-width">
              <span class="review-label">Notes</span>
              <span class="review-value">${cost.notes}</span>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  attachListeners() {
    const confirmBtn = this.modal.querySelector('#review-confirm-btn');
    const cancelBtn = this.modal.querySelector('#review-cancel-btn');

    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => {
        if (this.onConfirm) this.onConfirm();
        this.close();
      });
    }

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        if (this.onCancel) this.onCancel();
        this.close();
      });
    }

    // Close on ESC key
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        if (this.onCancel) this.onCancel();
        this.close();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);

    // Close on overlay click
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        if (this.onCancel) this.onCancel();
        this.close();
      }
    });
  }

  close() {
    if (this.modal) {
      this.modal.classList.remove('visible');
      setTimeout(() => {
        if (this.modal && this.modal.parentNode) {
          this.modal.parentNode.removeChild(this.modal);
        }
        this.modal = null;
      }, 200);
    }
  }
}
