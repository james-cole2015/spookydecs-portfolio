// Item Detail Page
// Single-page with section-based editing and action drawer

import { fetchItemById, updateItem } from '../api/items.js';
import { getMaintenanceRecords, getMaintenancePageUrl } from '../api/maintenance.js';
import { navigate } from '../utils/router.js';
import { toast } from '../shared/toast.js';
import { getStatusColor, getClassIcon, getSeasonIcon } from '../utils/item-config.js';
import { actionDrawer } from '../components/ActionDrawer.js';
import { EditableSection } from '../components/EditableSection.js';
import { PhotoGallery } from '../components/PhotoGallery.js';

class ItemDetailPage {
  constructor() {
    this.item = null;
    this.maintenanceRecords = [];
    this.editingSection = null; // Currently editing section instance
  }
  
  async render(itemId) {
    this.showLoading();
    
    try {
      // Fetch item data
      this.item = await fetchItemById(itemId, true);
      
      // Fetch maintenance records
      try {
        this.maintenanceRecords = await getMaintenanceRecords(itemId, 100);
      } catch (error) {
        console.warn('Failed to load maintenance records:', error);
        this.maintenanceRecords = [];
      }
      
      // Render page
      await this.renderPage();
      
      // Initialize action drawer
      actionDrawer.init(this.item, () => this.handleItemUpdate());

      // Initialize scroll behaviors
      this.initScrollBehaviors();

      // Attach click handlers for editable fields
      this.attachEditHandlers();

      // Mount photo gallery into Photos section
      await this.mountPhotoGallery();

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
        return dateB - dateA;
      })
      .slice(0, 5);
  }
  
  /**
   * Get scheduled maintenance records from generation_history
   */
  getUpcomingMaintenance() {
    const history = this.item.maintenance?.generation_history || [];
    const now = new Date();

    const upcoming = history
      .filter(entry => {
        const dueDate = new Date(entry.due_date);
        return dueDate > now;
      })
      .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
      .slice(0, 2);
      
    return upcoming;
  }
  
  async renderPage() {
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
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Quick Navigation -->
        <div class="quick-nav">
          <span class="quick-nav-label">Jump to:</span>
          <a href="#overview" class="quick-nav-link" onclick="itemDetailPage.scrollToSection(event, 'overview')">Overview</a>
          <a href="#storage" class="quick-nav-link" onclick="itemDetailPage.scrollToSection(event, 'storage')">Storage</a>
          <a href="#deployment" class="quick-nav-link" onclick="itemDetailPage.scrollToSection(event, 'deployment')">Deployment</a>
          <a href="#finance" class="quick-nav-link" onclick="itemDetailPage.scrollToSection(event, 'finance')">Finance</a>
          <a href="#maintenance" class="quick-nav-link" onclick="itemDetailPage.scrollToSection(event, 'maintenance')">Maintenance</a>
          <a href="#photos" class="quick-nav-link" onclick="itemDetailPage.scrollToSection(event, 'photos')">Photos</a>
          <a href="#related-links" class="quick-nav-link" onclick="itemDetailPage.scrollToSection(event, 'related-links')">Related Links</a>
        </div>
        
        <!-- All Content -->
        <div class="detail-content">
          ${await this.renderAllSections()}
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
  
  async renderAllSections() {
    return `
      <!-- Overview Section -->
      <section id="overview" class="detail-section-card" data-section-type="overview">
        ${this.renderOverviewSection()}
      </section>
      
      <div class="section-divider heavy"></div>
      
      <!-- Storage Section -->
      <section id="storage" class="detail-section-card" data-section-type="storage">
        ${this.renderStorageSection()}
      </section>
      
      <div class="section-divider heavy"></div>
      
      <!-- Deployment Section -->
      <section id="deployment" class="detail-section-card" data-section-type="deployment">
        ${this.renderDeploymentSection()}
      </section>
      
      <div class="section-divider heavy"></div>
      
      <!-- Finance Section -->
      <section id="finance" class="detail-section-card">
        ${this.renderFinanceSection()}
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
      
      <div class="section-divider heavy"></div>

      <!-- Related Links Section -->
      <section id="related-links" class="detail-section-card">
        ${await this.renderRelatedLinksSection()}
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
    } else if (this.item.status === 'Retired') {
      badges.push('<span class="item-badge badge-retired">Retired</span>');
    }
    
    if (this.item.repair_status?.needs_repair) {
      badges.push('<span class="item-badge badge-repair">Needs Repair</span>');
    }
    
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
    const fields = [];
    
    if (this.item.height_length) fields.push({ label: 'Dimensions', value: `${this.item.height_length} ft`, key: 'height_length' });
    if (this.item.stakes) fields.push({ label: 'Stakes', value: this.item.stakes, key: 'stakes' });
    if (this.item.tethers) fields.push({ label: 'Tethers', value: this.item.tethers, key: 'tethers' });
    if (this.item.color) fields.push({ label: 'Color', value: this.item.color, key: 'color' });
    if (this.item.bulb_type) fields.push({ label: 'Bulb Type', value: this.item.bulb_type, key: 'bulb_type' });
    if (this.item.length) fields.push({ label: 'Length', value: `${this.item.length} ft`, key: 'length' });
    if (this.item.male_ends) fields.push({ label: 'Male Ends', value: this.item.male_ends, key: 'male_ends' });
    if (this.item.female_ends) fields.push({ label: 'Female Ends', value: this.item.female_ends, key: 'female_ends' });
    if (this.item.watts) fields.push({ label: 'Watts', value: this.item.watts, key: 'watts' });
    if (this.item.amps) fields.push({ label: 'Amps', value: this.item.amps, key: 'amps' });
    
    fields.push({ label: 'Power Required', value: this.item.power_inlet ? 'Yes' : 'No', key: 'power_inlet' });
    
    return `
      <div class="detail-section">
        <h2 class="section-title">Overview</h2>
        <div class="detail-grid">
          ${fields.map(field => `
            <div class="detail-field" data-field-key="${field.key}">
              <div class="field-label">${field.label}</div>
              <div class="field-value editable-value" data-section="overview">${this.escapeHtml(String(field.value))}</div>
            </div>
          `).join('')}
        </div>
        
        ${this.item.general_notes ? `
          <div class="detail-field full-width" data-field-key="general_notes">
            <div class="field-label">Notes</div>
            <div class="field-value editable-value" data-section="overview">${this.escapeHtml(this.item.general_notes)}</div>
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
          ${this.renderField('Status', this.item.packing_data?.packing_status ? 'Packed' : 'Not Packed', 'packing_status', 'storage')}
          ${this.item.packing_data?.tote_id ? this.renderField('Tote', this.item.packing_data.tote_id, 'tote_id', 'storage') : ''}
          ${this.item.packing_data?.tote_location ? this.renderField('Location', this.item.packing_data.tote_location, 'tote_location', 'storage') : ''}
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

  renderFinanceSection() {
    const vendor = this.item.vendor_metadata || {};
    const hasCost = vendor.cost && vendor.cost !== '0';
    const hasValue = vendor.value && vendor.value !== '0';

    return `
      <div class="detail-section">
        <h2 class="section-title">Finance</h2>
        <div class="detail-grid">
          ${this.renderField('Cost', hasCost ? `$${vendor.cost}` : '—')}
          ${this.renderField('Current Value', hasValue ? `$${vendor.value}` : '—')}
          ${this.renderField('Manufacturer', vendor.manufacturer || '—')}
          ${this.renderField('Vendor', vendor.vendor_store || '—')}
        </div>
      </div>
    `;
  }

  async renderRelatedLinksSection() {
    const toteId = this.item.packing_data?.tote_id;
    const itemId = this.item.id;

    // Resolve base URLs from config — fall back gracefully if any are missing
    let storageBase = '', financeBase = '', maintenanceBase = '', imagesBase = '';
    try {
      const config = await window.SpookyConfig.get();
      storageBase    = config.STR_ADM_URL   || '';
      financeBase    = config.finance_url    || '';
      maintenanceBase = config.MAINT_URL    || '';
      imagesBase     = config.IMAGES_URL    || '';
    } catch (err) {
      console.warn('Could not load SpookyConfig for related links:', err);
    }

    // Build each link definition
    const links = [
      {
        type: 'storage',
        icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 8V21H3V8"/><path d="M23 3H1v5h22V3z"/><path d="M10 12h4"/>
        </svg>`,
        label: 'Storage',
        descriptor: 'Totes, locations & packing status',
        href: toteId && storageBase ? `${storageBase}/storage/${toteId}` : null,
        disabled: !toteId,
        tooltip: !toteId ? 'No Tote Assigned' : null,
      },
      {
        type: 'finance',
        icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
        </svg>`,
        label: 'Finance',
        descriptor: 'Cost, value & vendor records',
        href: financeBase ? `${financeBase}/${itemId}` : null,
        disabled: !financeBase,
        tooltip: null,
      },
      {
        type: 'maintenance',
        icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
        </svg>`,
        label: 'Maintenance',
        descriptor: 'Service history & schedules',
        href: maintenanceBase ? `${maintenanceBase}/${itemId}` : null,
        disabled: !maintenanceBase,
        tooltip: null,
      },
      {
        type: 'photos',
        icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
        </svg>`,
        label: 'Photos',
        descriptor: 'Primary & secondary images',
        href: imagesBase || null,
        disabled: !imagesBase,
        tooltip: null,
      },
    ];

    return `
      <div class="detail-section">
        <h2 class="section-title">Related Links</h2>
        <div class="related-links-strip">
          ${links.map(link => {
            if (link.disabled) {
              return `
                <span
                  class="related-link-item related-link-item--disabled"
                  data-link-type="${link.type}"
                  ${link.tooltip ? `title="${link.tooltip}"` : ''}
                  aria-disabled="true"
                  aria-label="${link.label}${link.tooltip ? ` — ${link.tooltip}` : ''}"
                >
                  <span class="related-link-icon">${link.icon}</span>
                  <span class="related-link-body">
                    <span class="related-link-label">${link.label}</span>
                    <span class="related-link-descriptor">${link.tooltip || link.descriptor}</span>
                  </span>
                  <span class="related-link-arrow">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M7 17L17 7M17 7H7M17 7v10"/>
                    </svg>
                  </span>
                </span>
              `;
            }

            return `
              <a
                href="${link.href}"
                class="related-link-item"
                data-link-type="${link.type}"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Go to ${link.label}"
              >
                <span class="related-link-icon">${link.icon}</span>
                <span class="related-link-body">
                  <span class="related-link-label">${link.label}</span>
                  <span class="related-link-descriptor">${link.descriptor}</span>
                </span>
                <span class="related-link-arrow">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M7 17L17 7M17 7H7M17 7v10"/>
                  </svg>
                </span>
              </a>
            `;
          }).join('')}
        </div>
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
    return `
      <div class="detail-section">
        <h2 class="section-title">Photos</h2>
        <div id="photo-gallery-mount"></div>
      </div>
    `;
  }

  async mountPhotoGallery() {
    const mountEl = document.getElementById('photo-gallery-mount');
    if (!mountEl) return;

    const gallery = new PhotoGallery({
      itemId: this.item.id,
      season: this.item.season,
      onAddPhotos: () => actionDrawer.handleUploadPhoto()
    });

    await gallery.render(mountEl);
    this.photoGallery = gallery;
  }
  
  renderField(label, value, key = null, section = null) {
    if (value === null || value === undefined || value === '') return '';
    
    const editableClass = section ? 'editable-value' : '';
    const dataAttrs = section ? `data-section="${section}"` : '';
    
    return `
      <div class="detail-field" ${key ? `data-field-key="${key}"` : ''}>
        <div class="field-label">${label}</div>
        <div class="field-value ${editableClass}" ${dataAttrs}>${this.escapeHtml(String(value))}</div>
      </div>
    `;
  }
  
  /**
   * Attach click handlers to editable fields
   */
  attachEditHandlers() {
    document.querySelectorAll('.editable-value').forEach(field => {
      field.addEventListener('click', (e) => {
        const sectionType = e.target.dataset.section;
        if (sectionType && !this.editingSection) {
          this.handleFieldClick(sectionType);
        }
      });
    });
  }
  
  /**
   * Handle click on editable field - enter edit mode for section
   */
  handleFieldClick(sectionType) {
    const sectionId = sectionType;
    
    // Create EditableSection instance
    this.editingSection = new EditableSection(sectionId, sectionType, this.item);
    
    // Enter edit mode
    this.editingSection.enterEditMode();
    
    // Attach save/cancel handlers
    this.attachStickyFooterHandlers();
  }
  
  /**
   * Attach handlers to sticky footer buttons
   */
  attachStickyFooterHandlers() {
    const saveBtn = document.getElementById('save-edit-btn');
    const cancelBtn = document.getElementById('cancel-edit-btn');
    
    if (saveBtn) {
      saveBtn.addEventListener('click', () => this.handleSaveSection());
    }
    
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.handleCancelSection());
    }
  }
  
  /**
   * Save section changes
   */
  async handleSaveSection() {
    if (!this.editingSection) return;
    
    // Validate
    if (!this.editingSection.validate()) {
      toast.error('Validation Failed', 'Please fix the errors in the form');
      return;
    }
    
    const loadingOverlay = document.getElementById('loading-overlay');
    
    try {
      loadingOverlay?.classList.remove('hidden');
      
      // Get form data
      const updateData = this.editingSection.exitEditMode(true);
      
      console.log('Saving section with data:', updateData);
      
      // Update item
      const updatedItem = await updateItem(this.item.id, updateData);
      
      toast.success('Saved', 'Changes have been saved successfully');
      
      // Update local item
      this.item = updatedItem;
      
      // Clear editing section
      this.editingSection = null;
      
      // Re-render page
      await this.renderPage();
      
      // Re-initialize
      actionDrawer.updateItem(this.item);
      this.initScrollBehaviors();
      this.attachEditHandlers();
      
      loadingOverlay?.classList.add('hidden');
      
    } catch (error) {
      console.error('Error saving section:', error);
      loadingOverlay?.classList.add('hidden');
      toast.error('Save Failed', error.message || 'Could not save changes');
    }
  }
  
  /**
   * Cancel section editing
   */
  async handleCancelSection() {
    if (!this.editingSection) return;
    
    // Exit edit mode without saving
    this.editingSection.exitEditMode(false);
    
    // Clear editing section
    this.editingSection = null;
    
    // Re-render page
    await this.renderPage();
    
    // Re-initialize
    actionDrawer.updateItem(this.item);
    this.initScrollBehaviors();
    this.attachEditHandlers();
    
    toast.info('Cancelled', 'Changes have been discarded');
  }
  
  /**
   * Handle item update from action drawer (e.g., photo upload, retire)
   */
  async handleItemUpdate() {
    try {
      // Re-fetch item
      this.item = await fetchItemById(this.item.id, true);
      
      // Re-render page
      await this.renderPage();

      // Re-initialize
      actionDrawer.updateItem(this.item);
      this.initScrollBehaviors();
      this.attachEditHandlers();
      await this.mountPhotoGallery();

    } catch (error) {
      console.error('Error refreshing item:', error);
      toast.error('Refresh Failed', 'Could not reload item data');
    }
  }
  
  initScrollBehaviors() {
    const backToTopBtn = document.getElementById('back-to-top');
    
    const handleScroll = () => {
      if (window.scrollY > 300) {
        backToTopBtn?.classList.add('visible');
      } else {
        backToTopBtn?.classList.remove('visible');
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    handleScroll();
  }
  
  scrollToSection(event, sectionId) {
    event.preventDefault();
    const section = document.getElementById(sectionId);
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      history.pushState(null, null, `#${sectionId}`);
    }
  }
  
  scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
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