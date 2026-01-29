// Item Detail Page
// Displays comprehensive item information with tabs

import { fetchItemById } from '../api/items.js';
import { getMaintenanceRecords, getMaintenancePageUrl } from '../api/maintenance.js';
import { initTabBar } from '../components/TabBar.js';
import { navigate } from '../utils/router.js';
import { toast } from '../shared/toast.js';
import { getStatusColor, getClassIcon, getSeasonIcon } from '../utils/item-config.js';

class ItemDetailPage {
  constructor() {
    this.item = null;
    this.maintenanceRecords = [];
    this.tabBar = null;
  }
  
  async render(itemId) {
    this.showLoading();
    
    try {
      // Fetch item data
      this.item = await fetchItemById(itemId, true);
      
      // Fetch maintenance records
      try {
        this.maintenanceRecords = await getMaintenanceRecords(itemId, 5);
      } catch (error) {
        console.warn('Failed to load maintenance records:', error);
        this.maintenanceRecords = [];
      }
      
      // Render page
      this.renderPage();
      
      // Initialize tab bar
      this.tabBar = initTabBar('tab-bar-container', [
        { id: 'overview', label: 'Overview' },
        { id: 'deployment', label: 'Deployment' },
        { id: 'maintenance', label: 'Maintenance' },
        { id: 'photos', label: 'Photos' }
      ], (tabId) => this.handleTabChange(tabId));
      
      this.hideLoading();
    } catch (error) {
      console.error('Error loading item:', error);
      this.hideLoading();
      this.showError(error.message);
    }
  }
  
  renderPage() {
    const container = document.getElementById('app-container');
    
    const photoUrl = this.getPhotoUrl();
    const classIcon = getClassIcon(this.item.class);
    const seasonIcon = getSeasonIcon(this.item.season);
    
    container.innerHTML = `
      <!-- Breadcrumb -->
      <div class="breadcrumb">
        <a href="/" class="breadcrumb-link">Items</a>
        <span class="breadcrumb-separator">›</span>
        <span class="breadcrumb-current">${this.escapeHtml(this.item.short_name)}</span>
      </div>
      
      <!-- Header -->
      <div class="detail-header">
        <div class="detail-header-top">
          <div class="detail-header-main">
            ${photoUrl ? `
              <img src="${photoUrl}" alt="${this.item.short_name}" class="detail-photo">
            ` : `
              <div class="detail-photo-placeholder">${classIcon}</div>
            `}
            
            <div class="detail-info">
              <h1 class="detail-name">${this.escapeHtml(this.item.short_name)}</h1>
              <div class="detail-id">${this.item.id}</div>
              <div class="detail-type">${this.item.class_type} • ${seasonIcon} ${this.item.season}</div>
              <div class="detail-badges">
                ${this.renderBadges()}
              </div>
              <div class="detail-meta">
                ${this.item.date_acquired ? `
                  <div class="detail-meta-row">Acquired: ${this.item.date_acquired}</div>
                ` : ''}
                ${this.item.vendor_metadata?.vendor_store ? `
                  <div class="detail-meta-row">${this.item.vendor_metadata.vendor_store}</div>
                ` : ''}
                ${this.item.vendor_metadata?.cost ? `
                  <div class="detail-meta-row">Cost: $${this.item.vendor_metadata.cost}</div>
                ` : ''}
              </div>
            </div>
          </div>
          
          <button class="btn-primary" onclick="itemDetailPage.handleEdit()">
            Edit
          </button>
        </div>
      </div>
      
      <!-- Tab Bar -->
      <div id="tab-bar-container"></div>
      
      <!-- Tab Content -->
      <div class="tab-content">
        <div id="tab-overview" class="tab-panel active">
          ${this.renderOverviewTab()}
        </div>
        
        <div id="tab-deployment" class="tab-panel">
          ${this.renderDeploymentTab()}
        </div>
        
        <div id="tab-maintenance" class="tab-panel">
          ${this.renderMaintenanceTab()}
        </div>
        
        <div id="tab-photos" class="tab-panel">
          ${this.renderPhotosTab()}
        </div>
      </div>
    `;
  }
  
  renderBadges() {
    const badges = [];
    
    if (this.item.deployment_data?.deployed) {
      badges.push('<span class="item-badge badge-deployed">Deployed</span>');
    }
    
    if (this.item.status === 'Active') {
      badges.push('<span class="item-badge badge-active">Active</span>');
    } else if (this.item.status === 'Packed') {
      badges.push('<span class="item-badge badge-packed">Packed</span>');
    }
    
    if (this.item.repair_status?.needs_repair) {
      badges.push('<span class="item-badge badge-repair">Needs Repair</span>');
    }
    
    return badges.join('');
  }
  
  renderOverviewTab() {
    return `
      <div class="detail-section">
        <h2 class="section-title">Overview</h2>
        <div class="detail-grid">
          ${this.renderField('Dimensions', this.item.height_length ? `${this.item.height_length} ft` : null)}
          ${this.renderField('Stakes', this.item.stakes)}
          ${this.renderField('Tethers', this.item.tethers)}
          ${this.renderField('Color', this.item.color)}
          ${this.renderField('Bulb Type', this.item.bulb_type)}
          ${this.renderField('Length', this.item.length ? `${this.item.length} ft` : null)}
          ${this.renderField('Male Ends', this.item.male_ends)}
          ${this.renderField('Female Ends', this.item.female_ends)}
          ${this.renderField('Power Required', this.item.power_inlet ? 'Yes' : 'No')}
        </div>
        
        ${this.item.general_notes ? `
          <div class="section-divider"></div>
          <div class="detail-field">
            <div class="field-label">Notes</div>
            <div class="field-value">${this.escapeHtml(this.item.general_notes)}</div>
          </div>
        ` : ''}
      </div>
      
      <div class="section-divider"></div>
      
      <div class="detail-section">
        <h2 class="section-title">Storage</h2>
        <div class="detail-grid">
          ${this.renderField('Status', this.item.packing_data?.packing_status ? 'Packed' : 'Not Packed')}
          ${this.renderField('Tote', this.item.packing_data?.tote_id)}
          ${this.renderField('Location', this.item.packing_data?.tote_location)}
        </div>
      </div>
    `;
  }
  
  renderDeploymentTab() {
    const deployed = this.item.deployment_data?.deployed;
    const deploymentId = this.item.deployment_data?.last_deployment_id;
    const lastDeployed = this.item.deployment_data?.last_deployed_at;
    
    return `
      <div class="detail-section">
        <h2 class="section-title">Current Deployment</h2>
        ${deployed ? `
          <div class="detail-grid">
            ${this.renderField('Deployment ID', deploymentId)}
            ${this.renderField('Deployed', lastDeployed ? new Date(lastDeployed).toLocaleString() : null)}
          </div>
        ` : `
          <p class="field-value empty">Not currently deployed</p>
        `}
      </div>
      
      ${this.item.deployment_data?.previous_deployments?.length > 0 ? `
        <div class="section-divider"></div>
        <div class="detail-section">
          <h2 class="section-title">Deployment History</h2>
          ${this.renderDeploymentHistory()}
        </div>
      ` : ''}
    `;
  }
  
  renderDeploymentHistory() {
    const deployments = this.item.deployment_data?.previous_deployments || [];
    
    if (deployments.length === 0) {
      return '<p class="field-value empty">No deployment history</p>';
    }
    
    return deployments.map(depId => `
      <div class="deployment-item">
        <div class="deployment-header">
          <div class="deployment-id">${depId}</div>
        </div>
      </div>
    `).join('');
  }
  
  renderMaintenanceTab() {
    const hasRepair = this.item.repair_status?.needs_repair;
    const status = this.item.repair_status?.status;
    const appliedTemplates = this.item.maintenance?.applied_templates || [];
    const upcomingMaintenance = this.getUpcomingMaintenance();

    return `
      <div class="detail-section">
        <h2 class="section-title">Current Status</h2>
        ${hasRepair ? `
          <div class="item-badge badge-repair" style="margin-bottom: 16px;">
            Needs Repair
          </div>
        ` : `
          <div class="item-badge badge-operational" style="margin-bottom: 16px;">
            ${status || 'Operational'}
          </div>
        `}
      </div>

      <div class="section-divider"></div>

      <div class="detail-section">
        <h2 class="section-title">Applied Templates</h2>
        ${appliedTemplates.length > 0 ? `
          <div class="template-list">
            ${appliedTemplates.map(templateId => `
              <div class="template-item">
                <span class="template-id">${this.escapeHtml(templateId)}</span>
              </div>
            `).join('')}
          </div>
        ` : `
          <p class="field-value empty">No templates applied</p>
        `}
      </div>

      ${upcomingMaintenance.length > 0 ? `
        <div class="section-divider"></div>
        <div class="detail-section">
          <h2 class="section-title">Upcoming Maintenance</h2>
          ${this.renderUpcomingMaintenance(upcomingMaintenance)}
        </div>
      ` : ''}

      ${this.maintenanceRecords.length > 0 ? `
        <div class="section-divider"></div>
        <div class="detail-section">
          <h2 class="section-title">Recent Maintenance</h2>
          ${this.renderMaintenanceRecords()}
        </div>
      ` : ''}

      <div class="section-divider"></div>
      <button class="btn-link" onclick="itemDetailPage.handleViewAllMaintenance()">
        View in Maintenance →
      </button>
    `;
  }

  getUpcomingMaintenance() {
    const history = this.item.maintenance?.generation_history || [];
    const now = new Date();

    // Filter for future due dates, sort by date, limit to 2
    return history
      .filter(entry => new Date(entry.due_date) > now)
      .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
      .slice(0, 2);
  }

  renderUpcomingMaintenance(upcomingItems) {
    return upcomingItems.map(entry => `
      <div class="maintenance-item upcoming">
        <div class="maintenance-header">
          <div class="maintenance-date">Due: ${new Date(entry.due_date).toLocaleDateString()}</div>
        </div>
        <div class="maintenance-ids">
          <div class="maintenance-id-row">
            <span class="maintenance-id-label">Template:</span>
            <span class="maintenance-id-value">${this.escapeHtml(entry.template_id)}</span>
          </div>
          <div class="maintenance-id-row">
            <span class="maintenance-id-label">Record:</span>
            <span class="maintenance-id-value">${this.escapeHtml(entry.record_id)}</span>
          </div>
        </div>
      </div>
    `).join('');
  }
  
  renderMaintenanceRecords() {
    return this.maintenanceRecords.map(record => `
      <div class="maintenance-item">
        <div class="maintenance-header">
          <div class="maintenance-date">${new Date(record.date).toLocaleDateString()}</div>
          <div class="maintenance-type">${record.type || 'Maintenance'}</div>
        </div>
        ${record.notes ? `
          <div class="maintenance-notes">${this.escapeHtml(record.notes)}</div>
        ` : ''}
      </div>
    `).join('');
  }
  
  renderPhotosTab() {
    const primaryPhoto = this.item.images?.primary_photo_id;
    const secondaryPhotos = this.item.images?.secondary_photo_ids || [];
    
    return `
      <div class="detail-section">
        <h2 class="section-title">Primary Photo</h2>
        ${primaryPhoto ? `
          <div class="detail-field">
            <div class="field-value">${primaryPhoto}</div>
          </div>
        ` : `
          <p class="field-value empty">No primary photo</p>
        `}
      </div>
      
      <div class="section-divider"></div>
      
      <div class="detail-section">
        <h2 class="section-title">Additional Photos</h2>
        ${secondaryPhotos.length > 0 ? `
          <p class="field-value">${secondaryPhotos.length} photo(s)</p>
        ` : `
          <p class="field-value empty">No additional photos</p>
        `}
      </div>
    `;
  }
  
  renderField(label, value) {
    if (value === null || value === undefined || value === '') return '';
    
    return `
      <div class="detail-field">
        <div class="field-label">${label}</div>
        <div class="field-value">${this.escapeHtml(String(value))}</div>
      </div>
    `;
  }
  
  handleTabChange(tabId) {
    // Hide all panels
    document.querySelectorAll('.tab-panel').forEach(panel => {
      panel.classList.remove('active');
    });
    
    // Show selected panel
    const panel = document.getElementById(`tab-${tabId}`);
    if (panel) {
      panel.classList.add('active');
    }
  }
  
  handleEdit() {
    navigate(`/${this.item.id}/edit`);
  }
  
  async handleViewAllMaintenance() {
    try {
      const url = await getMaintenancePageUrl(this.item.id);
      window.open(url, '_blank');
    } catch (error) {
      console.error('Failed to open maintenance page:', error);
      toast.error('Error', 'Failed to open maintenance page');
    }
  }
  
  getPhotoUrl() {
    // Return cloudfront_url if resolved
    if (this.item.images?.cloudfront_url) {
      return this.item.images.cloudfront_url;
    }
    return null;
  }
  
  showLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.classList.remove('hidden');
  }
  
  hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.classList.add('hidden');
  }
  
  showError(message) {
    const container = document.getElementById('app-container');
    container.innerHTML = `
      <div class="error-container">
        <h1>Error Loading Item</h1>
        <p>${message}</p>
        <button class="btn-primary" onclick="window.location.href='/'">
          Back to Items
        </button>
      </div>
    `;
  }
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Global instance
const itemDetailPage = new ItemDetailPage();

// Make available globally
if (typeof window !== 'undefined') {
  window.itemDetailPage = itemDetailPage;
}

export function renderItemDetail(itemId) {
  itemDetailPage.render(itemId);
}