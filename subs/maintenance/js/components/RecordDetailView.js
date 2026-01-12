// Record detail view component - main controller

import { fetchRecord } from '../api.js';
import { appState } from '../state.js';
import { StatsCards } from './StatsCards.js';
import { isMobile } from '../utils/responsive.js';
import { RecordDetailRenderer } from './RecordDetailRenderer.js';
import { RecordDetailTabs } from './RecordDetailTabs.js';
import { RecordDetailActions } from './RecordDetailActions.js';

export class RecordDetailView {
  constructor(recordId, itemId) {
    this.recordId = recordId;
    this.itemId = itemId;
    this.record = null;
    this.item = null;
    this.activeTab = 'details';
    this.photoGallery = null;
    
    // Track which sections are expanded (mobile)
    this.expandedSections = {
      description: true,      // Open by default
      scheduling: true,       // Open by default
      record_info: false,     // Closed by default
      timestamps: false       // Closed by default
    };
    
    // Initialize helper classes (will be set after record is fetched)
    this.renderer = null;
    this.tabs = null;
    this.actions = null;
  }
  
  /**
   * Main render method - fetches data and renders the view
   */
  async render(container) {
    try {
      // Fetch record data
      this.record = await fetchRecord(this.recordId);
      this.item = appState.getItem(this.itemId);
      
      // Initialize helper classes now that we have the record
      this.renderer = new RecordDetailRenderer(this.record, this.itemId, this.expandedSections);
      this.tabs = new RecordDetailTabs(this.record, this.itemId, this.expandedSections);
      this.actions = new RecordDetailActions(this);
      
      container.innerHTML = this.renderView();
      this.actions.attachEventListeners(container);
      
    } catch (error) {
      console.error('Failed to load record:', error);
      container.innerHTML = this.renderer ? this.renderer.renderError() : this.renderBasicError();
    }
  }
  
  /**
   * Render the main view structure
   */
  renderView() {
    const mobile = isMobile();
    
    return `
      <div class="detail-view">
        ${this.renderer.renderBreadcrumbs()}
        
        ${mobile ? '' : `
          <div class="detail-header">
            ${this.renderer.renderHeaderActions()}
          </div>
        `}
        
        <div class="detail-title">
          <h1>${this.record.title}</h1>
          ${mobile ? this.renderer.renderHeaderActions() : ''}
        </div>
        
        ${this.renderer.renderMobileStatusPills()}
        
        ${mobile ? '' : StatsCards.renderRecordStats(this.record)}
        
        ${this.renderTabs()}
        
        <div class="detail-content">
          ${this.renderTabContent()}
        </div>
      </div>
    `;
  }
  
  /**
   * Render tab navigation buttons
   */
  renderTabs() {
    return `
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
    `;
  }
  
  /**
   * Render current tab content
   */
  renderTabContent() {
    switch (this.activeTab) {
      case 'details':
        return this.tabs.renderDetailsTab();
      case 'costs':
        return this.tabs.renderCostsTab();
      case 'photos':
        return this.tabs.renderPhotosTab();
      default:
        return '';
    }
  }
  
  /**
   * Basic error rendering (fallback if renderer not initialized)
   */
  renderBasicError() {
    return `
      <div class="error-container">
        <h1>Record Not Found</h1>
        <p>The maintenance record you're looking for could not be found.</p>
        <button onclick="history.back()">Go Back</button>
      </div>
    `;
  }
  
  /**
   * Cleanup method
   */
  destroy() {
    if (this.photoGallery) {
      this.photoGallery.destroy();
      this.photoGallery = null;
    }
  }
}
