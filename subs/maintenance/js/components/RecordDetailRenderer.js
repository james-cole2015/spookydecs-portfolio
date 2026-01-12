// Record detail view - UI rendering components

import { formatDate, formatDateTime, formatStatus, formatCriticality, formatRecordTypePill } from '../utils/formatters.js';
import { getItemUrl, getCostsUrl } from '../api.js';
import { isMobile } from '../utils/responsive.js';

export class RecordDetailRenderer {
  constructor(record, itemId, expandedSections) {
    this.record = record;
    this.itemId = itemId;
    this.expandedSections = expandedSections;
  }
  
  /**
   * Render breadcrumb navigation
   */
  renderBreadcrumbs() {
    const recordIdShort = this.record.record_id.substring(0, 8);
    return `
      <nav class="breadcrumbs">
        <a href="/" class="breadcrumb-link">All Records</a>
        <span class="breadcrumb-separator">/</span>
        <a href="/${encodeURIComponent(this.itemId)}" class="breadcrumb-link">${this.itemId}</a>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-current">${recordIdShort}...</span>
      </nav>
    `;
  }
  
  /**
   * Render mobile status pills (status, type, criticality)
   */
  renderMobileStatusPills() {
    if (!isMobile()) return '';
    
    const statusHtml = formatStatus(this.record.status);
    const typeHtml = formatRecordTypePill(this.record.record_type);
    const criticalityHtml = formatCriticality(this.record.criticality);
    
    return `
      <div class="mobile-status-pills">
        ${statusHtml}
        ${typeHtml}
        ${criticalityHtml}
      </div>
    `;
  }
  
  /**
   * Render "Perform Inspection" button for pending inspections
   */
  renderPerformInspectionButton() {
    const isPendingInspection = 
      this.record.record_type === 'inspection' && 
      ['pending', 'Pending', 'PENDING', 'scheduled', 'SCHEDULED', 'Scheduled'].includes(this.record.status);
    
    if (!isPendingInspection) return '';
    
    return `
      <a href="/${this.itemId}/${this.record.record_id}/perform-inspection" class="btn-primary">
        Perform Inspection
      </a>
    `;
  }
  
  /**
   * Render header actions (edit, delete, perform inspection)
   */
  renderHeaderActions() {
    return `
      <div class="header-actions">
        ${this.renderPerformInspectionButton()}
        <a href="/${this.itemId}/${this.record.record_id}/edit" class="btn-secondary">Edit Record</a>
        <button class="btn-danger" data-action="delete">Delete Record</button>
      </div>
    `;
  }
  
  /**
   * Render collapsible section for mobile layout
   */
  renderCollapsibleSection(sectionId, title, content) {
    const isOpen = this.expandedSections[sectionId];
    
    return `
      <div class="detail-section-collapsible">
        <div class="detail-section-header" data-section="${sectionId}">
          <h3>${title}</h3>
          <span class="detail-section-toggle ${isOpen ? 'open' : ''}">▼</span>
        </div>
        <div class="detail-section-content ${isOpen ? 'open' : ''}">
          ${content}
        </div>
      </div>
    `;
  }
  
  /**
   * Render scheduling information section
   */
  renderSchedulingSection() {
    return `
      <div class="horizontal-detail-row">
        ${this.record.date_scheduled ? `
          <div class="detail-item">
            <span class="detail-label">Scheduled Date</span>
            <span class="detail-value">${formatDate(this.record.date_scheduled)}</span>
          </div>
        ` : ''}
        ${this.record.date_performed ? `
          <div class="detail-item">
            <span class="detail-label">Date Performed</span>
            <span class="detail-value">${formatDate(this.record.date_performed)}</span>
          </div>
        ` : ''}
        <div class="detail-item">
          <span class="detail-label">Performed By</span>
          <span class="detail-value">${this.record.performed_by}</span>
        </div>
        ${this.record.estimated_completion_date ? `
          <div class="detail-item">
            <span class="detail-label">Est. Completion</span>
            <span class="detail-value">${formatDate(this.record.estimated_completion_date)}</span>
          </div>
        ` : ''}
      </div>
    `;
  }
  
  /**
   * Render record information section (IDs)
   */
  renderRecordInfoSection() {
    return `
      <div class="horizontal-detail-row">
        <div class="detail-item">
          <span class="detail-label">Record ID</span>
          <span class="detail-value"><code>${this.record.record_id}</code></span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Item ID</span>
          <span class="detail-value"><code>${this.itemId}</code></span>
        </div>
      </div>
    `;
  }
  
  /**
   * Render timestamps section
   */
  renderTimestampsSection() {
    return `
      <div class="timestamps-row">
        <div class="timestamp-item">
          <span class="timestamp-label">Created</span>
          <span class="timestamp-value">${formatDateTime(this.record.created_at)}</span>
        </div>
        <div class="timestamp-item">
          <span class="timestamp-label">Updated</span>
          <span class="timestamp-value">${formatDateTime(this.record.updated_at)}</span>
        </div>
        <div class="timestamp-item">
          <span class="timestamp-label">Updated By</span>
          <span class="timestamp-value">${this.record.updated_by || 'N/A'}</span>
        </div>
      </div>
    `;
  }
  
  /**
   * Render description section
   */
  renderDescriptionSection() {
    return `<p class="detail-description">${this.record.description || 'No description provided'}</p>`;
  }
  
  /**
   * Render materials list section
   */
  renderMaterialsSection() {
    const materials = this.record.materials_used || [];
    
    if (materials.length === 0) return '';
    
    return `
      <div class="detail-section full-width detail-section-border">
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
    `;
  }
  
  /**
   * Render related links section
   */
  renderRelatedLinksSection() {
    return `
      <div class="detail-section-links">
        <h3>Related Links</h3>
        <div class="link-buttons">
          <a href="/${encodeURIComponent(this.itemId)}" class="btn-link">
            View Item in Maintenance →
          </a>
          <a href="${getItemUrl(this.itemId)}" class="btn-link" target="_blank">
            View Item in Items Subdomain →
          </a>
        </div>
      </div>
    `;
  }
  
  /**
   * Render photo category loading/grid container
   */
  renderPhotoCategory(categoryLabel, categoryKey, photoRefs) {
    if (!photoRefs || photoRefs.length === 0) return '';
    
    return `
      <div class="photo-category">
        <h4>${categoryLabel} (${photoRefs.length})</h4>
        <div class="photo-category-loading" data-category="${categoryKey}">
          Loading photos...
        </div>
        <div class="photo-category-grid" data-category="${categoryKey}" style="display: none;"></div>
      </div>
    `;
  }
  
  /**
   * Render photo grid item
   */
  renderPhotoGridItem(photo, index) {
    return `
      <div class="photo-grid-item" data-photo-index="${index}">
        <img 
          src="${photo.thumb_cloudfront_url}" 
          alt="${photo.metadata?.original_filename || 'Photo'}"
          class="photo-grid-thumb"
          data-full-url="${photo.cloudfront_url}"
        >
        <div class="photo-grid-info">
          <div class="photo-filename">${photo.metadata?.original_filename || 'Photo'}</div>
          <div class="photo-meta">
            <span class="photo-type-badge">${photo.photo_type}</span>
          </div>
        </div>
      </div>
    `;
  }
  
  /**
   * Render error state
   */
  renderError() {
    return `
      <div class="error-container">
        <h1>Record Not Found</h1>
        <p>The maintenance record you're looking for could not be found.</p>
        <button onclick="history.back()">Go Back</button>
      </div>
    `;
  }
  
  /**
   * Render no photos placeholder
   */
  renderNoPhotos() {
    return `
      <div class="photos-tab">
        <div class="no-photos">
          <div class="placeholder-icon">📷</div>
          <h3>No Photos Yet</h3>
          <p>No photos have been attached to this record.</p>
          <a href="/${this.itemId}/${this.record.record_id}/edit" class="btn-secondary">
            Add Photos
          </a>
        </div>
      </div>
    `;
  }
}
