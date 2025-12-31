/**
 * StorageDetailView Component
 * Display storage unit details and metadata
 */

import { getPackedLabel, getPlaceholderImage } from '../utils/storage-config.js';

export class StorageDetailView {
  constructor(options = {}) {
    this.storageUnit = options.storageUnit || {};
    this.onEdit = options.onEdit || (() => {});
    this.onDelete = options.onDelete || (() => {});
    this.container = null;
  }

  /**
   * Render the detail view
   */
  render(containerElement) {
    this.container = containerElement;
    
    const unit = this.storageUnit;
    const photoUrl = unit.images?.photo_url || getPlaceholderImage();
    const season = unit.season || unit.category || 'Unknown';
    const classType = unit.class_type || 'Tote';
    
    const detailView = document.createElement('div');
    detailView.className = 'storage-detail-view';
    
    detailView.innerHTML = `
      <div class="detail-header">
        <div class="detail-photo">
          <img src="${photoUrl}" alt="${unit.short_name}" class="detail-photo-img">
        </div>
        
        <div class="detail-info">
          <div class="detail-title-section">
            <h1 class="detail-title">${unit.short_name}</h1>
            <code class="detail-id">${unit.id}</code>
          </div>
          
          <div class="detail-badges">
            <span class="detail-badge badge-${season.toLowerCase()}">${season}</span>
            <span class="detail-badge detail-type-badge">${classType}</span>
            <span class="detail-badge packed-badge ${unit.packed ? 'packed' : 'unpacked'}">
              ${getPackedLabel(unit.packed)}
            </span>
          </div>
          
          <div class="detail-actions">
            <button class="btn btn-primary" id="btn-edit">
              Edit Metadata
            </button>
            <button class="btn btn-danger" id="btn-delete">
              Delete
            </button>
          </div>
        </div>
      </div>
      
      <div class="detail-body">
        <div class="detail-section">
          <h2 class="section-title">Details</h2>
          <div class="detail-grid">
            <div class="detail-item">
              <span class="detail-label">Type</span>
              <span class="detail-value">${classType}</span>
            </div>
            
            <div class="detail-item">
              <span class="detail-label">Season</span>
              <span class="detail-value">${season}</span>
            </div>
            
            <div class="detail-item">
              <span class="detail-label">Location</span>
              <span class="detail-value">${unit.location || '-'}</span>
            </div>
            
            ${unit.size ? `
              <div class="detail-item">
                <span class="detail-label">Size</span>
                <span class="detail-value">${unit.size}</span>
              </div>
            ` : ''}
            
            <div class="detail-item">
              <span class="detail-label">Packed Status</span>
              <span class="detail-value">${unit.packed ? 'Packed' : 'Unpacked'}</span>
            </div>
            
            <div class="detail-item">
              <span class="detail-label">Contents</span>
              <span class="detail-value">${unit.contents_count || 0} items</span>
            </div>
            
            <div class="detail-item">
              <span class="detail-label">Created</span>
              <span class="detail-value">${this.formatDate(unit.created_at)}</span>
            </div>
            
            <div class="detail-item">
              <span class="detail-label">Last Updated</span>
              <span class="detail-value">${this.formatDate(unit.updated_at)}</span>
            </div>
          </div>
        </div>
        
        ${unit.general_notes ? `
          <div class="detail-section">
            <h2 class="section-title">Notes</h2>
            <div class="detail-notes">
              <p>${unit.general_notes}</p>
            </div>
          </div>
        ` : ''}
      </div>
    `;
    
    this.container.innerHTML = '';
    this.container.appendChild(detailView);
    
    // Attach event listeners
    this.attachEventListeners();
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    const editBtn = this.container.querySelector('#btn-edit');
    const deleteBtn = this.container.querySelector('#btn-delete');
    
    if (editBtn) {
      editBtn.addEventListener('click', () => this.onEdit(this.storageUnit));
    }
    
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => this.onDelete(this.storageUnit));
    }
  }

  /**
   * Format date for display
   */
  formatDate(dateString) {
    if (!dateString) return '-';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (e) {
      return dateString;
    }
  }

  /**
   * Update storage unit data
   */
  updateData(storageUnit) {
    this.storageUnit = storageUnit;
    this.render(this.container);
  }
}

export default StorageDetailView;