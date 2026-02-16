// Item Detail Page
// Single-page scrollable layout with quick navigation and back-to-top

import { fetchItemById } from '../api/items.js';
import { getMaintenanceRecords, getMaintenancePageUrl } from '../api/maintenance.js';
import { navigate } from '../utils/router.js';
import { toast } from '../shared/toast.js';
import { getStatusColor, getClassIcon, getSeasonIcon } from '../utils/item-config.js';

class ItemDetailPage {
  constructor() {
    this.item = null;
    this.maintenanceRecords = [];
  }
  
  async render(itemId) {
    this.showLoading();
    
    try {
      // Fetch item data
      this.item = await fetchItemById(itemId, true);
      
      // Fetch maintenance records (get all, not just 5)
      try {
        this.maintenanceRecords = await getMaintenanceRecords(itemId, 100);
      } catch (error) {
        console.warn('Failed to load maintenance records:', error);
        this.maintenanceRecords = [];
      }
      
      // Render page
      this.renderPage();
      
      // Initialize scroll behaviors
      this.initScrollBehaviors();
      
      this.hideLoading();
    } catch (error) {
      console.error('Error loading item:', error);
      this.hideLoading();
      this.showError(error.message);
    }
  }
  
  /**
   * Get in-progress maintenance records
   */
  getInProgressRecords() {
    return this.maintenanceRecords.filter(record => record.status === 'in_progress');
  }
  
  /**
   * Get completed maintenance records (for Recent Maintenance section)
   */
  getCompletedRecords() {
    return this.maintenanceRecords
      .filter(record => record.status === 'completed')
      .sort((a, b) => {
        const dateA = new Date(a.date_performed || a.created_at);
        const dateB = new Date(b.date_performed || b.created_at);
        return dateB - dateA; // Most recent first
      })
      .slice(0, 5); // Limit to 5 most recent
  }
  
  /**
   * Get scheduled maintenance records from generation_history (for Upcoming Maintenance section)
   */
  getUpcomingMaintenance() {
    const history = this.item.maintenance?.generation_history || [];
    const now = new Date();

    // Filter for future due dates, sort by date, limit to 2
    const upcoming = history
      .filter(entry => {
        const dueDate = new Date(entry.due_date);
        return dueDate > now;
      })
      .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
      .slice(0, 2);
      
    return upcoming;
  }
  
  renderPage() {
    const container = document.getElementById('app-container');
    
    const photoUrl = this.getPhotoUrl();
    const classIcon = getClassIcon(this.item.class);
    const seasonIcon = getSeasonIcon(this.item.season);
    
    container.innerHTML = `
      <div class="detail-page-container">
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
                  ${this.item.date_acquired ? `<span class="detail-meta-row">Acquired: ${this.item.date_acquired}</span>` : ''}
                  ${this.item.vendor_metadata?.vendor_store ? `<span class="detail-meta-row">${this.item.vendor_metadata.vendor_store}</span>` : ''}
                  ${this.item.vendor_metadata?.cost ? `<span class="detail-meta-row">Cost: $${this.item.vendor_metadata.cost}</span>` : ''}
                </div>
              </div>
            </div>
            
            <button class="btn-primary" onclick="itemDetailPage.handleEdit()">
              Edit
            </button>
          </div>
        </div>
        
        <!-- Quick Navigation -->
        <div class="quick-nav">
          <span class="quick-nav-label">Jump to:</span>
          <a href="#overview" class="quick-nav-link" onclick="itemDetailPage.scrollToSection(event, 'overview')">Overview</a>
          <a href="#storage" class="quick-nav-link" onclick="itemDetailPage.scrollToSection(event, 'storage')">Storage</a>
          <a href="#deployment" class="quick-nav-link" onclick="itemDetailPage.scrollToSection(event, 'deployment')">Deployment</a>
          <a href="#maintenance" class="quick-nav-link" onclick="itemDetailPage.scrollToSection(event, 'maintenance')">Maintenance</a>
          <a href="#photos" class="quick-nav-link" onclick="itemDetailPage.scrollToSection(event, 'photos')">Photos</a>
        </div>
        
        <!-- All Content -->
        <div class="detail-content">
          ${this.renderAllSections()}
        </div>
        
        <!-- Back to Top Button -->
        <button class="back-to-top" id="back-to-top" onclick="itemDetailPage.scrollToTop()" aria-label="Back to top">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 19V5M12 5L5 12M12 5L19 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
    `;
  }
  
  renderAllSections() {
    return `
      <!-- Overview Section -->
      <section id="overview" class="detail-section-card">
        ${this.renderOverviewSection()}
      </section>
      
      <div class="section-divider heavy"></div>
      
      <!-- Storage Section -->
      <section id="storage" class="detail-section-card">
        ${this.renderStorageSection()}
      </section>
      
      <div class="section-divider heavy"></div>
      
      <!-- Deployment Section -->
      <section id="deployment" class="detail-section-card">
        ${this.renderDeploymentSection()}
      </section>
      
      <div class="section-divider heavy"></div>
      
      <!-- Maintenance Section -->
      <section id="maintenance" class="detail-section-card">
        ${this.renderMaintenanceSection()}
      </section>
      
      <div class="section-divider heavy"></div>
      
      <!-- Photos Section -->
      <section id="photos" class="detail-section-card">
        ${this.renderPhotosSection()}
      </section>
    `;
  }
  
  renderBadges() {
    const badges = [];
    const inProgressRecords = this.getInProgressRecords();
    
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
    
    // Add in-progress link
    if (inProgressRecords.length > 0) {
      const recordText = inProgressRecords.length === 1 ? 'record' : 'records';
      badges.push(`
        <a href="#maintenance" class="in-progress-link" onclick="itemDetailPage.scrollToSection(event, 'maintenance')">
          ${inProgressRecords.length} ${recordText} in progress →
        </a>
      `);
    }
    
    return badges.join('');
  }
  
  renderOverviewSection() {
    // Collect all fields to display
    const fields = [];
    
    // Add class-specific fields
    if (this.item.height_length) fields.push({ label: 'Dimensions', value: `${this.item.height_length} ft` });
    if (this.item.stakes) fields.push({ label: 'Stakes', value: this.item.stakes });
    if (this.item.tethers) fields.push({ label: 'Tethers', value: this.item.tethers });
    if (this.item.color) fields.push({ label: 'Color', value: this.item.color });
    if (this.item.bulb_type) fields.push({ label: 'Bulb Type', value: this.item.bulb_type });
    if (this.item.length) fields.push({ label: 'Length', value: `${this.item.length} ft` });
    if (this.item.male_ends) fields.push({ label: 'Male Ends', value: this.item.male_ends });
    if (this.item.female_ends) fields.push({ label: 'Female Ends', value: this.item.female_ends });
    if (this.item.watts) fields.push({ label: 'Watts', value: this.item.watts });
    if (this.item.amps) fields.push({ label: 'Amps', value: this.item.amps });
    
    // Power inlet
    fields.push({ label: 'Power Required', value: this.item.power_inlet ? 'Yes' : 'No' });
    
    return `
      <div class="detail-section">
        <h2 class="section-title">Overview</h2>
        <div class="detail-grid">
          ${fields.map(field => `
            <div class="detail-field">
              <div class="field-label">${field.label}</div>
              <div class="field-value">${this.escapeHtml(String(field.value))}</div>
            </div>
          `).join('')}
        </div>
        
        ${this.item.general_notes ? `
          <div class="detail-field full-width">
            <div class="field-label">Notes</div>
            <div class="field-value">${this.escapeHtml(this.item.general_notes)}</div>
          </div>
        ` : ''}
      </div>
    `;
  }
  
  renderStorageSection() {
    return `
      <div class="detail-section">
        <h2 class="section-title">Storage</h2>
        <div class="detail-grid">
          ${this.renderField('Status', this.item.packing_data?.packing_status ? 'Packed' : 'Not Packed')}
          ${this.item.packing_data?.tote_id ? this.renderField('Tote', this.item.packing_data.tote_id) : ''}
          ${this.item.packing_data?.tote_location ? this.renderField('Location', this.item.packing_data.tote_location) : ''}
        </div>
      </div>
    `;
  }
  
  renderDeploymentSection() {
    const deployed = this.item.deployment_data?.deployed;
    const deploymentId = this.item.deployment_data?.last_deployment_id;
    const lastDeployed = this.item.deployment_data?.last_deployed_at;
    
    return `
      <div class="detail-section">
        <h2 class="section-title">Deployment</h2>
        
        <h3 class="subsection-title">Current Status</h3>
        ${deployed ? `
          <div class="detail-grid">
            ${this.renderField('Deployment ID', deploymentId)}
            ${this.renderField('Deployed', lastDeployed ? new Date(lastDeployed).toLocaleString() : null)}
          </div>
        ` : `
          <p class="field-value empty">Not currently deployed</p>
        `}
        
        ${this.item.deployment_data?.previous_deployments?.length > 0 ? `
          <h3 class="subsection-title">Previous Deployments</h3>
          ${this.renderDeploymentHistory()}
        ` : ''}
      </div>
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
  
  renderMaintenanceSection() {
    const hasRepair = this.item.repair_status?.needs_repair;
    const status = this.item.repair_status?.status;
    const appliedTemplates = this.item.maintenance?.applied_templates || [];
    const upcomingMaintenance = this.getUpcomingMaintenance();
    const completedRecords = this.getCompletedRecords();
    const inProgressRecords = this.getInProgressRecords();

    return `
      <div class="detail-section">
        <h2 class="section-title">Maintenance</h2>
        
        <h3 class="subsection-title">Current Status</h3>
        <div class="status-badges">
          ${hasRepair ? `
            <div class="item-badge badge-repair">
              Needs Repair
            </div>
          ` : `
            <div class="item-badge badge-operational">
              ${status || 'Operational'}
            </div>
          `}
          ${inProgressRecords.length > 0 ? `
            <a href="#" class="in-progress-link-status" onclick="event.preventDefault(); itemDetailPage.handleViewAllMaintenance();">
              ${inProgressRecords.length} ${inProgressRecords.length === 1 ? 'record' : 'records'} in progress →
            </a>
          ` : ''}
        </div>

        <h3 class="subsection-title">Applied Templates</h3>
        ${appliedTemplates.length > 0 ? `
          <div class="template-list">
            ${appliedTemplates.map(templateId => `
              <div class="template-item">
                <span class="template-id">${this.escapeHtml(String(templateId))}</span>
              </div>
            `).join('')}
          </div>
        ` : `
          <p class="field-value empty">No templates applied</p>
        `}

        ${upcomingMaintenance.length > 0 ? `
          <h3 class="subsection-title">Upcoming Maintenance</h3>
          ${this.renderUpcomingMaintenance(upcomingMaintenance)}
        ` : ''}

        ${completedRecords.length > 0 ? `
          <h3 class="subsection-title">Recent Maintenance</h3>
          ${this.renderMaintenanceRecords(completedRecords)}
        ` : ''}

        <div class="maintenance-cta">
          <button class="btn-maintenance-link" onclick="itemDetailPage.handleViewAllMaintenance()">
            <span class="btn-maintenance-icon">🔧</span>
            <span class="btn-maintenance-text">
              <span class="btn-maintenance-label">View in Maintenance</span>
              <span class="btn-maintenance-sublabel">Open full maintenance details</span>
            </span>
            <span class="btn-maintenance-arrow">→</span>
          </button>
        </div>
      </div>
    `;
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
            <span class="maintenance-id-value">${this.escapeHtml(String(entry.template_id))}</span>
          </div>
          <div class="maintenance-id-row">
            <span class="maintenance-id-label">Record:</span>
            <span class="maintenance-id-value">${this.escapeHtml(String(entry.record_id))}</span>
          </div>
        </div>
      </div>
    `).join('');
  }
  
  renderMaintenanceRecords(records) {
    return records.map(record => {
      // Use date_performed if available, otherwise fall back to date_scheduled or created_at
      const displayDate = record.date_performed || record.date_scheduled || record.created_at;
      
      return `
        <div class="maintenance-item">
          <div class="maintenance-header">
            <div class="maintenance-date">${new Date(displayDate).toLocaleDateString()}</div>
            <div class="maintenance-type">${record.record_type || 'Maintenance'}</div>
          </div>
          ${record.title ? `
            <div class="maintenance-title">${this.escapeHtml(record.title)}</div>
          ` : ''}
          ${record.description ? `
            <div class="maintenance-notes">${this.escapeHtml(record.description)}</div>
          ` : ''}
        </div>
      `;
    }).join('');
  }
  
  renderPhotosSection() {
    const primaryPhoto = this.item.images?.primary_photo_id;
    const secondaryPhotos = this.item.images?.secondary_photo_ids || [];
    
    return `
      <div class="detail-section">
        <h2 class="section-title">Photos</h2>
        
        <h3 class="subsection-title">Primary Photo</h3>
        ${primaryPhoto ? `
          <div class="detail-field">
            <div class="field-value">${primaryPhoto}</div>
          </div>
        ` : `
          <p class="field-value empty">No primary photo</p>
        `}
        
        <h3 class="subsection-title">Additional Photos</h3>
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
  
  initScrollBehaviors() {
    // Show/hide back to top button based on scroll position
    const backToTopBtn = document.getElementById('back-to-top');
    
    const handleScroll = () => {
      if (window.scrollY > 300) {
        backToTopBtn?.classList.add('visible');
      } else {
        backToTopBtn?.classList.remove('visible');
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial check
  }
  
  scrollToSection(event, sectionId) {
    event.preventDefault();
    const section = document.getElementById(sectionId);
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Update URL hash without jumping
      history.pushState(null, null, `#${sectionId}`);
    }
  }
  
  scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
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