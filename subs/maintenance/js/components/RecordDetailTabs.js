// Record detail view - tab content rendering

import { formatCurrency } from '../utils/formatters.js';
import { getCostsUrl } from '../api.js';
import { isMobile } from '../utils/responsive.js';
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
   * Render photos tab content — CDN <photo-gallery> is mounted here by RecordDetailActions
   */
  renderPhotosTab() {
    return `<div class="photos-tab"><div id="photo-gallery-container"></div></div>`;
  }
}
