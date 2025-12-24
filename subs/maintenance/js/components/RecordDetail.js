// Record detail view component

import { fetchRecord, deleteRecord, getItemUrl, getCostsUrl } from '../api.js';
import { appState } from '../state.js';
import { navigateTo } from '../router.js';
import { formatDate, formatDateTime, formatCurrency, formatStatus, formatCriticality, formatRecordType } from '../utils/formatters.js';
import { StatsCards } from './StatsCards.js';
import { PhotoSwipeGallery } from './PhotoSwipeGallery.js';

export class RecordDetailView {
  constructor(recordId, itemId) {
    this.recordId = recordId;
    this.itemId = itemId;
    this.record = null;
    this.item = null;
    this.activeTab = 'details';
    this.photoGallery = null;
  }
  
  async render(container) {
    try {
      // Fetch record data
      this.record = await fetchRecord(this.recordId);
      this.item = appState.getItem(this.itemId);
      
      container.innerHTML = this.renderView();
      this.attachEventListeners(container);
      
    } catch (error) {
      console.error('Failed to load record:', error);
      container.innerHTML = this.renderError();
    }
  }
  
  renderView() {
    return `
      <div class="detail-view">
        <div class="detail-header">
          <button class="btn-back" onclick="history.back()">← Back</button>
          <div class="header-actions">
            <a href="/${this.itemId}/${this.recordId}/edit" class="btn-secondary">Edit Record</a>
            <button class="btn-danger" data-action="delete">Delete Record</button>
          </div>
        </div>
        
        <div class="detail-title">
          <h1>${this.record.title}</h1>
          <div class="title-meta">
            ${formatRecordType(this.record.record_type)} • ${this.record.record_id.substring(0, 12)}...
          </div>
        </div>
        
        ${StatsCards.renderRecordStats(this.record)}
        
        <div class="detail-tabs">
          <button class="tab-btn ${this.activeTab === 'details' ? 'active' : ''}" data-tab="details">
            Details
          </button>
          <button class="tab-btn ${this.activeTab === 'costs' ? 'active' : ''}" data-tab="costs">
            Costs
          </button>
          <button class="tab-btn ${this.activeTab === 'photos' ? 'active' : ''}" data-tab="photos">
            Photos
          </button>
        </div>
        
        <div class="detail-content">
          ${this.renderTabContent()}
        </div>
      </div>
    `;
  }
  
  renderTabContent() {
    switch (this.activeTab) {
      case 'details':
        return this.renderDetailsTab();
      case 'costs':
        return this.renderCostsTab();
      case 'photos':
        return this.renderPhotosTab();
      default:
        return '';
    }
  }
  
  renderDetailsTab() {
    const materials = this.record.materials_used || [];
    
    return `
      <div class="details-tab">
        <div class="detail-grid">
          <div class="detail-section">
            <h3>Record Information</h3>
            <div class="detail-row">
              <span class="detail-label">Record ID</span>
              <span class="detail-value"><code>${this.record.record_id}</code></span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Record Type</span>
              <span class="detail-value">${formatRecordType(this.record.record_type)}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Status</span>
              <span class="detail-value">${formatStatus(this.record.status)}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Criticality</span>
              <span class="detail-value">${formatCriticality(this.record.criticality)}</span>
            </div>
          </div>
          
          <div class="detail-section">
            <h3>Scheduling</h3>
            <div class="detail-row">
              <span class="detail-label">Date Performed</span>
              <span class="detail-value">${formatDate(this.record.date_performed)}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Performed By</span>
              <span class="detail-value">${this.record.performed_by}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Est. Completion</span>
              <span class="detail-value">${this.record.estimated_completion_date ? formatDate(this.record.estimated_completion_date) : 'N/A'}</span>
            </div>
          </div>
          
          <div class="detail-section full-width">
            <h3>Description</h3>
            <p class="detail-description">${this.record.description || 'No description provided'}</p>
          </div>
          
          ${materials.length > 0 ? `
            <div class="detail-section full-width">
              <h3>Materials Used</h3>
              <ul class="materials-list">
                ${materials.map(m => `
                  <li>
                    <strong>${m.item}</strong>
                    ${m.quantity ? ` - ${m.quantity} ${m.unit || ''}` : ''}
                  </li>
                `).join('')}
              </ul>
            </div>
          ` : ''}
          
          <div class="detail-section full-width">
            <h3>Timestamps</h3>
            <div class="detail-row">
              <span class="detail-label">Created</span>
              <span class="detail-value">${formatDateTime(this.record.created_at)}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Updated</span>
              <span class="detail-value">${formatDateTime(this.record.updated_at)}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Updated By</span>
              <span class="detail-value">${this.record.updated_by || 'N/A'}</span>
            </div>
          </div>
          
          <div class="detail-section full-width">
            <h3>Related Links</h3>
            <div class="link-buttons">
              <a href="/${this.itemId}" class="btn-link">
                View Item in Maintenance →
              </a>
              <a href="${getItemUrl(this.itemId)}" class="btn-link" target="_blank">
                View Item in Items Subdomain →
              </a>
            </div>
          </div>
        </div>
      </div>
    `;
  }
  
  renderCostsTab() {
    const costRecordIds = this.record.cost_record_ids || [];
    const totalCost = this.record.total_cost || 0;
    
    return `
      <div class="costs-tab">
        <div class="placeholder-section">
          <div class="placeholder-icon">🚧</div>
          <h3>Cost Records Under Development</h3>
          <p>Detailed cost tracking and analysis will be available soon.</p>
        </div>
        
        <div class="cost-summary">
          <h3>Current Summary</h3>
          <div class="detail-row">
            <span class="detail-label">Total Cost</span>
            <span class="detail-value cost-value">${formatCurrency(totalCost)}</span>
          </div>
          ${costRecordIds.length > 0 ? `
            <div class="detail-row">
              <span class="detail-label">Cost Record IDs</span>
              <span class="detail-value">
                <ul class="cost-ids-list">
                  ${costRecordIds.map(id => `<li><code>${id}</code></li>`).join('')}
                </ul>
              </span>
            </div>
          ` : ''}
        </div>
        
        <div class="link-buttons">
          <a href="${getCostsUrl()}" class="btn-link disabled" target="_blank">
            View in Finance Subdomain (Coming Soon) →
          </a>
        </div>
      </div>
    `;
  }
  
  renderPhotosTab() {
    const gallery = new PhotoSwipeGallery(this.record.attachments);
    
    return `
      <div class="photos-tab">
        ${gallery.render()}
        
        <div class="photo-upload-placeholder">
          <h3>Photo Upload</h3>
          <p>Photo upload functionality will be available in a future update.</p>
        </div>
      </div>
    `;
  }
  
  renderError() {
    return `
      <div class="error-container">
        <h1>Record Not Found</h1>
        <p>The maintenance record you're looking for could not be found.</p>
        <button onclick="history.back()">Go Back</button>
      </div>
    `;
  }
  
  attachEventListeners(container) {
    // Tab switching
    const tabBtns = container.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        // Clean up old gallery if switching away from photos tab
        if (this.activeTab === 'photos' && this.photoGallery) {
          this.photoGallery.destroy();
          this.photoGallery = null;
        }
        
        this.activeTab = btn.getAttribute('data-tab');
        const contentDiv = container.querySelector('.detail-content');
        if (contentDiv) {
          contentDiv.innerHTML = this.renderTabContent();
          
          // Initialize photo gallery if on photos tab
          if (this.activeTab === 'photos') {
            this.photoGallery = new PhotoSwipeGallery(this.record.attachments);
            const photosTab = contentDiv.querySelector('.photos-tab');
            if (photosTab) {
              this.photoGallery.attachEventListeners(photosTab);
            }
          }
        }
        
        // Update active tab button
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
    
    // Delete button
    const deleteBtn = container.querySelector('[data-action="delete"]');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => {
        this.handleDelete();
      });
    }
    
    // Initialize photo gallery if on photos tab
    if (this.activeTab === 'photos') {
      this.photoGallery = new PhotoSwipeGallery(this.record.attachments);
      const photosTab = container.querySelector('.photos-tab');
      if (photosTab) {
        this.photoGallery.attachEventListeners(photosTab);
      }
    }
  }
  
  async handleDelete() {
    const confirmed = confirm(`Are you sure you want to delete this ${this.record.record_type} record?\n\nTitle: ${this.record.title}\n\nThis action cannot be undone.`);
    
    if (!confirmed) return;
    
    try {
      await deleteRecord(this.recordId);
      appState.removeRecord(this.recordId);
      
      if (window.toast) {
        window.toast.success('Success', 'Record deleted successfully');
      }
      
      // Navigate back to main view
      navigateTo('/');
      
    } catch (error) {
      console.error('Failed to delete record:', error);
      
      if (window.toast) {
        window.toast.error('Error', 'Failed to delete record: ' + error.message);
      } else {
        alert('Failed to delete record: ' + error.message);
      }
    }
  }
  
  // Cleanup method
  destroy() {
    if (this.photoGallery) {
      this.photoGallery.destroy();
      this.photoGallery = null;
    }
  }
}
