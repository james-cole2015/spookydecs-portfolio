// Record detail view - tab content rendering

import { formatCurrency } from '../utils/formatters.js';
import { getCostsUrl } from '../api.js';
import { isMobile } from '../utils/responsive.js';
import { PhotoSwipeGallery } from './PhotoSwipeGallery.js';
import { RecordDetailRenderer } from './RecordDetailRenderer.js';

export class RecordDetailTabs {
  constructor(record, itemId, expandedSections) {
    this.record = record;
    this.itemId = itemId;
    this.renderer = new RecordDetailRenderer(record, itemId, expandedSections);
  }
  
  /**
   * Render details tab content
   */
  renderDetailsTab() {
    if (isMobile()) {
      return this.renderDetailsTabMobile();
    }
    return this.renderDetailsTabDesktop();
  }
  
  /**
   * Render details tab for mobile (collapsible sections)
   */
  renderDetailsTabMobile() {
    return `
      <div class="details-tab">
        ${this.renderer.renderCollapsibleSection(
          'description',
          'Description',
          this.renderer.renderDescriptionSection()
        )}
        
        ${this.renderer.renderCollapsibleSection(
          'scheduling',
          'Scheduling',
          this.renderer.renderSchedulingSection()
        )}
        
        ${this.renderer.renderCollapsibleSection(
          'record_info',
          'Record Information',
          this.renderer.renderRecordInfoSection()
        )}
        
        ${this.renderer.renderCollapsibleSection(
          'timestamps',
          'Timestamps',
          this.renderer.renderTimestampsSection()
        )}
        
        ${this.renderer.renderRelatedLinksSection()}
      </div>
    `;
  }
  
  /**
   * Render details tab for desktop (traditional layout)
   */
  renderDetailsTabDesktop() {
    return `
      <div class="details-tab">
        <div class="detail-grid">
          <div class="detail-section full-width">
            <h3>Record Information</h3>
            ${this.renderer.renderRecordInfoSection()}
          </div>
          
          <div class="detail-section full-width detail-section-border">
            <h3>Scheduling</h3>
            ${this.renderer.renderSchedulingSection()}
          </div>
          
          <div class="detail-section full-width detail-section-border">
            <h3>Description</h3>
            ${this.renderer.renderDescriptionSection()}
          </div>
          
          ${this.renderer.renderMaterialsSection()}
          
          <div class="detail-section full-width detail-section-border">
            <h3>Timestamps</h3>
            ${this.renderer.renderTimestampsSection()}
          </div>
          
          <div class="detail-section full-width">
            ${this.renderer.renderRelatedLinksSection()}
          </div>
        </div>
      </div>
    `;
  }
  
  /**
   * Render costs tab content (loading skeleton — hydrated async by RecordDetailActions.loadCostsForTab)
   */
  renderCostsTab() {
    return `
      <div class="costs-tab">
        <div class="costs-loading" id="costs-loading">
          <div class="loading-message">Loading cost records…</div>
        </div>
        <div class="costs-content" id="costs-content" style="display:none"></div>
      </div>
    `;
  }

  /**
   * Render costs tab content once data is loaded.
   * Called statically by RecordDetailActions.loadCostsForTab.
   * @param {Array} costs - maintenance cost records, sorted newest first
   * @param {number} total - sum of total_cost for all maintenance costs
   */
  static renderCostsContent(costs, total, costsUrl = '') {
    const LIMIT = 10;
    const recent = costs.slice(0, LIMIT);
    return `
      <div class="costs-panel">
        <div class="cost-summary">
          <h3>Summary</h3>
          <div class="detail-row">
            <span class="detail-label">Total</span>
            <span class="detail-value cost-value">${formatCurrency(total)}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Records</span>
            <span class="detail-value">${costs.length}</span>
          </div>
        </div>

        <div class="cost-records-section">
          <h3>Recent Maintenance Costs</h3>
          ${recent.length > 0 ? `
            <div class="cost-records-list">
              ${recent.map(c => `
                <div class="cost-record-row">
                  <span class="cost-record-id">
                    ${costsUrl
                      ? `<a href="${costsUrl}/costs/${c.cost_id}" target="_blank" rel="noopener">${c.cost_id}</a>`
                      : c.cost_id}
                  </span>
                  <span class="cost-record-name">${c.item_name || '—'}</span>
                  <span class="cost-record-total">${formatCurrency(c.total_cost || 0)}</span>
                </div>
              `).join('')}
            </div>
            ${costs.length > LIMIT ? `<p class="costs-more-hint">${costs.length - LIMIT} more — view all in Finance</p>` : ''}
          ` : `
            <div class="no-costs">
              <p>No maintenance costs recorded for this item.</p>
            </div>
          `}
        </div>
      </div>
    `;
  }
  
  /**
   * Render photos tab content
   */
  renderPhotosTab() {
    const attachments = this.record.attachments || {};

    // Check if using legacy structure (flat array, not categorized)
    const isLegacy = this.record.attachments &&
      !attachments.hasOwnProperty('before_photos') &&
      !attachments.hasOwnProperty('after_photos') &&
      !attachments.hasOwnProperty('documentation');

    if (isLegacy) {
      return this.renderPhotosTabLegacy(attachments);
    }

    return this.renderPhotosTabNewStructure(attachments);
  }

  /**
   * Render the shared upload controls row (category select + Add Photos button)
   */
  renderUploadControls() {
    return `
      <div class="photo-upload-controls">
        <select id="photo-category-select" class="form-input">
          <option value="documentation">Documentation</option>
          <option value="before_photos">Before Photos</option>
          <option value="after_photos">After Photos</option>
        </select>
        <button class="btn-primary" data-action="add-photos">Add Photos</button>
      </div>
    `;
  }

  /**
   * Render photos tab with new structure (categorized photos)
   */
  renderPhotosTabNewStructure(attachments) {
    const hasPhotos =
      (attachments.before_photos && attachments.before_photos.length > 0) ||
      (attachments.after_photos && attachments.after_photos.length > 0) ||
      (attachments.documentation && attachments.documentation.length > 0);

    return `
      <div class="photos-tab">
        ${hasPhotos ? `
          <div class="photos-categories">
            ${this.renderer.renderPhotoCategory('Before Photos', 'before_photos', attachments.before_photos || [])}
            ${this.renderer.renderPhotoCategory('After Photos', 'after_photos', attachments.after_photos || [])}
            ${this.renderer.renderPhotoCategory('Documentation', 'documentation', attachments.documentation || [])}
          </div>
        ` : `
          <div class="no-photos">
            <div class="placeholder-icon">📷</div>
            <h3>No Photos Yet</h3>
            <p>No photos have been attached to this record.</p>
          </div>
        `}

        <div class="photo-actions">
          ${this.renderUploadControls()}
          <a href="/${this.itemId}/${this.record.record_id}/edit" class="btn-secondary">
            Manage Photos
          </a>
        </div>
      </div>
    `;
  }

  /**
   * Render photos tab with legacy structure
   */
  renderPhotosTabLegacy(attachments) {
    const gallery = new PhotoSwipeGallery(attachments);

    return `
      <div class="photos-tab">
        ${gallery.render()}

        <div class="photo-actions">
          ${this.renderUploadControls()}
          <a href="/${this.itemId}/${this.record.record_id}/edit" class="btn-secondary">
            Manage Photos
          </a>
        </div>
      </div>
    `;
  }
}
