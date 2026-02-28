// Cost Detail View Component

import { deleteCost, getReceiptImage } from '../utils/finance-api.js';
import { toast } from '../shared/toast.js';
import { modal } from '../shared/modal.js';

export class CostDetailView {
  constructor(costData) {
    this.costData = costData;
    this.receiptImageData = null;
    this.detailsExpanded = false;
  }

  async render(container) {
    console.log('🎨 Rendering CostDetailView');
    await this.loadReceiptImage();
    container.innerHTML = this.getHTML();
    this.attachEventListeners();
  }

  async loadReceiptImage() {
    console.log('🔍 loadReceiptImage called');
    
    if (!this.costData.receipt_data) {
      console.log('❌ No receipt_data found in cost record');
      return;
    }
    
    const receiptData = this.costData.receipt_data;
    
    this.receiptImageData = {
      thumbnail_url: receiptData.thumbnail_url,
      cloudfront_url: receiptData.cloudfront_url,
      s3_key: receiptData.s3_key,
      image_id: receiptData.image_id
    };
    
    console.log('✅ Receipt image data ready:', this.receiptImageData);
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
    // Treat missing no_receipt as false for existing records
    const noReceipt = cost.no_receipt === true;

    return `
      <div class="cost-detail-page">
        <!-- Breadcrumbs -->
        <nav class="breadcrumbs">
          <a href="/" class="breadcrumb-link">Finance</a>
          <span class="breadcrumb-separator">›</span>
          <a href="/records" class="breadcrumb-link">Cost Records</a>
          <span class="breadcrumb-separator">›</span>
          <span class="breadcrumb-current">Cost Record Detail</span>
        </nav>

        <!-- Page Header with Title and Actions -->
        <div class="page-header-section">
          <div class="header-left">
            <h1>Cost Record</h1>
            <p class="detail-subtitle">${cost.cost_id}</p>
          </div>
          <div class="header-actions">
            ${hasReceipt ? `
              <button class="btn-action btn-receipt" data-action="view-receipt" title="View Receipt">
                <span class="btn-icon">📄</span>
                <span class="btn-text">View Receipt</span>
              </button>
            ` : ''}
            <button class="btn-action btn-edit" data-action="edit" title="Edit">
              <span class="btn-icon">✏️</span>
              <span class="btn-text">Edit</span>
            </button>
            <button class="btn-action btn-delete" data-action="delete" title="Delete">
              <span class="btn-icon">✕</span>
              <span class="btn-text">Delete</span>
            </button>
          </div>
        </div>

        ${this.renderRelatedLinks(cost)}
        
        <!-- Description Section -->
        ${cost.description || cost.notes ? `
          <div class="description-section">
            ${cost.description ? `<div class="description-block"><h3>Description</h3><p>${cost.description}</p></div>` : ''}
            ${cost.notes ? `<div class="notes-block"><h3>Notes</h3><p>${cost.notes}</p></div>` : ''}
          </div>
        ` : ''}

        <!-- Cost Details Section -->
        <div class="cost-details-section">
          <div class="details-header" data-action="toggle-details">
            <h2>💰 Cost Details</h2>
            <button class="details-toggle" aria-label="Toggle details">
              <span class="chevron">›</span>
            </button>
          </div>
          <div class="detail-content">
            <div class="detail-grid-centered">
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
              <div class="detail-divider"></div>
              <div class="detail-row">
                <span class="detail-label">Receipt</span>
                <span class="detail-value">
                  ${noReceipt
                    ? `<span class="badge badge-warning">No Receipt</span>`
                    : hasReceipt
                      ? `<span class="badge badge-success">On File</span>`
                      : `<span class="badge badge-muted">Not Uploaded</span>`
                  }
                </span>
              </div>
            </div>
          </div>
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
    if (cost.related_item_id) links.push({ label: 'Item', id: cost.related_item_id, url: `/${cost.related_item_id}` });
    if (cost.related_idea_id) links.push({ label: 'Idea', id: cost.related_idea_id, url: `/${cost.related_idea_id}` });
    if (cost.related_record_id) links.push({ label: 'Maintenance Record', id: cost.related_record_id, url: `/${cost.related_record_id}` });
    if (links.length === 0) return '';
    return `
      <div class="related-links-banner">
        <span class="related-label">Related:</span>
        ${links.map(link => `<a href="${link.url}" class="related-link" data-navigate="${link.url}">${link.label}: ${link.id} →</a>`).join('')}
      </div>
    `;
  }

  formatCostType(type) {
    const typeMap = {
      'acquisition': 'Purchase',
      'repair': 'Repair',
      'maintenance': 'Maintenance',
      'build': 'Build',
      'supply_purchase': 'Supply Purchase',
      'gift': 'Gift',
      'other': 'Other'
    };
    return typeMap[type] || type;
  }

  formatCategory(category) {
    const categoryMap = {
      'materials': 'Materials',
      'labor': 'Labor',
      'parts': 'Parts',
      'consumables': 'Consumables',
      'decoration': 'Decoration',
      'light': 'Light',
      'accessory': 'Accessory',
      'other': 'Other'
    };
    return categoryMap[category] || category;
  }

  attachEventListeners() {
    document.querySelectorAll('.breadcrumb-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = link.getAttribute('href');
      });
    });

    document.querySelectorAll('[data-navigate]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const path = e.currentTarget.dataset.navigate;
        window.location.href = path;
      });
    });

    document.querySelectorAll('[data-action="view-receipt"]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (this.costData.receipt_data?.cloudfront_url) {
          window.open(this.costData.receipt_data.cloudfront_url, '_blank');
        } else {
          toast.error('Receipt not available');
        }
      });
    });

    document.querySelectorAll('[data-action="edit"]').forEach(btn => 
      btn.addEventListener('click', () => {
        console.log('Edit cost clicked');
        toast.info('Edit functionality coming soon');
      })
    );

    document.querySelectorAll('[data-action="delete"]').forEach(btn => 
      btn.addEventListener('click', () => this.handleDelete())
    );

    document.querySelectorAll('[data-action="toggle-details"]').forEach(header => {
      header.addEventListener('click', () => {
        const section = header.closest('.cost-details-section');
        this.detailsExpanded = !this.detailsExpanded;
        if (this.detailsExpanded) {
          section.classList.add('expanded');
        } else {
          section.classList.remove('expanded');
        }
      });
    });

    if (window.innerWidth < 768) {
      const section = document.querySelector('.cost-details-section');
      if (section && !this.detailsExpanded) {
        section.classList.remove('expanded');
      }
    }
  }

  async handleDelete() {
    const confirmed = await modal.confirm({ 
      title: 'Delete Cost Record', 
      message: 'Are you sure you want to delete this cost record? This action cannot be undone.', 
      confirmText: 'Delete', 
      cancelText: 'Cancel', 
      type: 'danger' 
    });
    
    if (!confirmed) return;
    
    try {
      await deleteCost(this.costData.cost_id);
      toast.success('Cost record deleted successfully');
      setTimeout(() => { window.location.href = '/'; }, 1000);
    } catch (error) {
      console.error('Error deleting cost:', error);
      toast.error('Failed to delete cost record: ' + error.message);
    }
  }
}