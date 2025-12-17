// ItemDetailView Component
// Displays item details in organized sections with photo carousel

import { 
  getClassTypeIcon, 
  getAttributeLabel, 
  getAttributesForClassType,
  hasRepairTracking 
} from '../utils/item-config.js';

export class ItemDetailView {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.item = null;
    this.photos = { primary: null, secondary: [] };
    this.currentPhotoIndex = 0;
  }
  
  render(item, photos = { primary: null, secondary: [] }) {
    this.item = item;
    this.photos = photos;
    this.currentPhotoIndex = 0;
    
    if (!this.container) {
      console.error('ItemDetailView container not found');
      return;
    }
    
    const detailView = document.createElement('div');
    detailView.className = 'item-detail-view';
    
    // Header with title and actions
    detailView.appendChild(this.renderHeader());
    
    // Main content (2 columns: left = photos, right = details)
    detailView.appendChild(this.renderMainContent());
    
    this.container.innerHTML = '';
    this.container.appendChild(detailView);
  }
  
  renderHeader() {
    const header = document.createElement('div');
    header.className = 'detail-header';
    
    const icon = getClassTypeIcon(this.item.class_type);
    
    header.innerHTML = `
      <div class="header-title">
        <h1><span class="title-icon">${icon}</span> ${this.item.short_name}</h1>
        <div class="item-id-badge">${this.item.id}</div>
      </div>
      <div class="header-actions">
        <button class="btn-icon btn-secondary" onclick="itemDetailPage.handleEdit()" title="Edit">
          ✏️
        </button>
        <button class="btn-icon btn-warning" onclick="itemDetailPage.handleRetire()" title="Retire">
          📦
        </button>
        <button class="btn-icon btn-danger" onclick="itemDetailPage.handleDelete()" title="Delete">
          ✕
        </button>
      </div>
    `;
    
    return header;
  }
  
  renderMainContent() {
    const mainContent = document.createElement('div');
    mainContent.className = 'detail-main-content';
    
    // Left column - Photos
    const leftColumn = document.createElement('div');
    leftColumn.className = 'detail-left-column';
    leftColumn.appendChild(this.renderPhotoCarousel());
    
    // Right column - Tabbed sections
    const rightColumn = document.createElement('div');
    rightColumn.className = 'detail-right-column';
    rightColumn.appendChild(this.renderTabbedSections());
    
    mainContent.appendChild(leftColumn);
    mainContent.appendChild(rightColumn);
    
    return mainContent;
  }
  
  renderPhotoCarousel() {
    const carousel = document.createElement('div');
    carousel.className = 'photo-carousel';
    
    const allPhotos = [];
    if (this.photos.primary) allPhotos.push(this.photos.primary);
    allPhotos.push(...this.photos.secondary);
    
    if (allPhotos.length === 0) {
      carousel.innerHTML = `
        <div class="no-photo">
          <div class="no-photo-icon">📷</div>
          <div class="no-photo-text">No photos</div>
        </div>
      `;
      return carousel;
    }
    
    const currentPhoto = allPhotos[this.currentPhotoIndex];
    
    carousel.innerHTML = `
      <div class="carousel-main">
        <img src="${currentPhoto.cloudfront_url}" alt="${this.item.short_name}" class="carousel-image">
        ${allPhotos.length > 1 ? `
          <button class="carousel-prev" onclick="itemDetailPage.previousPhoto()">‹</button>
          <button class="carousel-next" onclick="itemDetailPage.nextPhoto()">›</button>
          <div class="carousel-counter">${this.currentPhotoIndex + 1} / ${allPhotos.length}</div>
        ` : ''}
      </div>
      ${allPhotos.length > 1 ? `
        <div class="carousel-thumbnails">
          ${allPhotos.map((photo, index) => `
            <img 
              src="${photo.thumb_cloudfront_url || photo.cloudfront_url}" 
              alt="Thumbnail ${index + 1}"
              class="carousel-thumbnail ${index === this.currentPhotoIndex ? 'active' : ''}"
              onclick="itemDetailPage.goToPhoto(${index})"
            >
          `).join('')}
        </div>
      ` : ''}
    `;
    
    return carousel;
  }
  
  renderTabbedSections() {
    const tabbed = document.createElement('div');
    tabbed.className = 'tabbed-sections';
    
    // Tab buttons
    const tabButtons = document.createElement('div');
    tabButtons.className = 'section-tabs';
    tabButtons.innerHTML = `
      <button class="section-tab active" data-section="details">Details</button>
      <button class="section-tab" data-section="deployments">Deployments</button>
      <button class="section-tab" data-section="maintenance">Maintenance</button>
      <button class="section-tab" data-section="storage">Storage</button>
    `;
    
    // Tab content
    const tabContent = document.createElement('div');
    tabContent.className = 'section-content';
    
    // Details section (active by default)
    tabContent.appendChild(this.renderDetailsSection());
    
    tabbed.appendChild(tabButtons);
    tabbed.appendChild(tabContent);
    
    // Add tab click handlers
    tabButtons.querySelectorAll('.section-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        this.switchTab(e.target.dataset.section);
      });
    });
    
    return tabbed;
  }
  
  renderDetailsSection() {
    const section = document.createElement('div');
    section.className = 'section-panel active';
    section.dataset.section = 'details';
    
    // Group fields by category
    const categories = this.categorizeFields();
    
    categories.forEach(category => {
      if (category.fields.length > 0) {
        section.appendChild(this.renderFieldGroup(category.title, category.fields));
      }
    });
    
    return section;
  }
  
  categorizeFields() {
    const categories = [];
    
    // Basic Information
    categories.push({
      title: 'Basic Information',
      fields: [
        { label: 'Class', value: this.item.class, isPill: true, pillType: 'class' },
        { label: 'Type', value: this.item.class_type, isPill: true, pillType: 'type' },
        { label: 'Season', value: this.item.season, isPill: true, pillType: 'season' },
        { label: 'Status', value: this.getStatusPills(), isPill: true, pillType: 'status', isMultiple: true },
        { label: 'Date Acquired', value: this.item.date_acquired || '-' }
      ]
    });
    
    // Combined Specifications (Physical + Power)
    const combinedFields = [...this.getPhysicalSpecFields(), ...this.getPowerSpecFields()];
    if (combinedFields.length > 0) {
      categories.push({
        title: 'Specifications',
        fields: combinedFields
      });
    }
    
    // Setup Requirements (stakes, tethers)
    const setupFields = this.getSetupFields();
    if (setupFields.length > 0) {
      categories.push({
        title: 'Setup Requirements',
        fields: setupFields
      });
    }
    
    // Vendor Info (renamed from Acquisition)
    const vendorData = this.item.vendor_metadata || {};
    categories.push({
      title: 'Vendor Info',
      fields: [
        { label: 'Cost', value: vendorData.cost ? `$${vendorData.cost}` : '-' },
        { label: 'Value', value: vendorData.value ? `$${vendorData.value}` : '-' },
        { label: 'Manufacturer', value: vendorData.manufacturer || '-' },
        { label: 'Store', value: vendorData.vendor_store || '-' }
      ]
    });
    
    // Notes
    if (this.item.general_notes) {
      categories.push({
        title: 'Notes',
        fields: [
          { label: '', value: this.item.general_notes, isFullWidth: true }
        ]
      });
    }
    
    return categories;
  }
  
  getStatusPills() {
    const pills = [];
    
    // Check deployed status
    if (this.item.deployment_data?.deployed) {
      pills.push({ text: 'Deployed', type: 'deployed' });
    }
    
    // Check packed status
    if (this.item.packing_data?.packing_status) {
      pills.push({ text: 'Packed', type: 'packed' });
    }
    
    // Check repair status
    if (this.item.repair_status?.needs_repair) {
      pills.push({ text: 'Repair', type: 'repair' });
    }
    
    // Check retired status
    if (this.item.status === 'Retired') {
      pills.push({ text: 'Retired', type: 'retired' });
    }
    
    // Default to Active if no other status
    if (pills.length === 0) {
      pills.push({ text: 'Active', type: 'active' });
    }
    
    return pills;
  }
  
  getPhysicalSpecFields() {
    const fields = [];
    
    // Height/Length
    if (this.item.height_length) {
      fields.push({ label: 'Height/Length', value: `${this.item.height_length} ft` });
    }
    
    // Color (for lights)
    if (this.item.color) {
      fields.push({ label: 'Color', value: this.item.color });
    }
    
    // Bulb Type (for lights)
    if (this.item.bulb_type) {
      fields.push({ label: 'Bulb Type', value: this.item.bulb_type });
    }
    
    // Length (for cords/accessories)
    if (this.item.length) {
      fields.push({ label: 'Length', value: `${this.item.length} ft` });
    }
    
    // Male/Female ends (for cords/plugs)
    if (this.item.male_ends) {
      fields.push({ label: 'Male Ends', value: this.item.male_ends });
    }
    if (this.item.female_ends) {
      fields.push({ label: 'Female Ends', value: this.item.female_ends });
    }
    
    return fields;
  }
  
  getPowerSpecFields() {
    const fields = [];
    
    if (this.item.watts) {
      fields.push({ label: 'Power', value: `${this.item.watts}W` });
    }
    
    if (this.item.amps) {
      fields.push({ label: 'Current', value: `${this.item.amps}A` });
    }
    
    if (this.item.adapter) {
      fields.push({ label: 'Adapter', value: this.item.adapter || 'None' });
    }
    
    if (this.item.power_inlet !== undefined) {
      fields.push({ label: 'Power Inlet', value: this.item.power_inlet ? 'Yes' : 'No' });
    }
    
    return fields;
  }
  
  getSetupFields() {
    const fields = [];
    
    if (this.item.stakes) {
      fields.push({ label: 'Stakes', value: this.item.stakes });
    }
    
    if (this.item.tethers) {
      fields.push({ label: 'Tethers', value: this.item.tethers });
    }
    
    return fields;
  }
  
  renderFieldGroup(title, fields) {
    const group = document.createElement('div');
    group.className = 'field-group';
    
    const groupTitle = document.createElement('h3');
    groupTitle.className = 'field-group-title';
    groupTitle.textContent = title;
    group.appendChild(groupTitle);
    
    const fieldsContainer = document.createElement('div');
    fieldsContainer.className = 'fields-container';
    
    fields.forEach(field => {
      const fieldEl = document.createElement('div');
      fieldEl.className = field.isFullWidth ? 'field field-full-width' : 'field';
      
      if (field.label) {
        const label = document.createElement('div');
        label.className = 'field-label';
        label.textContent = field.label;
        fieldEl.appendChild(label);
      }
      
      const value = document.createElement('div');
      value.className = 'field-value';
      
      if (field.isPill) {
        if (field.isMultiple && Array.isArray(field.value)) {
          // Multiple status pills
          value.className = 'field-value field-value-pills';
          field.value.forEach(pill => {
            const pillEl = document.createElement('span');
            pillEl.className = `pill pill-${pill.type}`;
            pillEl.textContent = pill.text;
            value.appendChild(pillEl);
          });
        } else {
          // Single pill
          const pillEl = document.createElement('span');
          pillEl.className = `pill pill-${field.pillType}`;
          pillEl.textContent = field.value || '-';
          value.appendChild(pillEl);
        }
      } else {
        value.textContent = field.value || '-';
      }
      
      fieldEl.appendChild(value);
      
      fieldsContainer.appendChild(fieldEl);
    });
    
    group.appendChild(fieldsContainer);
    
    return group;
  }
  
  switchTab(sectionName) {
    // Update tab buttons
    this.container.querySelectorAll('.section-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.section === sectionName);
    });
    
    // Clear and render new content
    const contentContainer = this.container.querySelector('.section-content');
    contentContainer.innerHTML = '';
    
    let sectionContent;
    switch (sectionName) {
      case 'details':
        sectionContent = this.renderDetailsSection();
        break;
      case 'deployments':
        sectionContent = this.renderDeploymentsSection();
        break;
      case 'maintenance':
        sectionContent = this.renderMaintenanceSection();
        break;
      case 'storage':
        sectionContent = this.renderStorageSection();
        break;
    }
    
    contentContainer.appendChild(sectionContent);
  }
  
  renderDeploymentsSection() {
    const section = document.createElement('div');
    section.className = 'section-panel';
    section.dataset.section = 'deployments';
    
    const deploymentData = this.item.deployment_data || {};
    const deploymentCount = deploymentData.previous_deployments?.length || 0;
    
    if (deploymentCount === 0) {
      section.innerHTML = `
        <div class="empty-section">
          <div class="empty-icon">📍</div>
          <div class="empty-message">Awaiting first deployment</div>
        </div>
      `;
      return section;
    }
    
    section.innerHTML = `
      <div class="section-header">
        <h3>Deployed ${deploymentCount} time${deploymentCount !== 1 ? 's' : ''}</h3>
      </div>
      
      ${deploymentData.last_deployment_id ? `
        <div class="field-group">
          <h4 class="subsection-title">Last Deployment</h4>
          <div class="deployment-item">
            <span class="deployment-icon">📍</span>
            <a href="/deployments/${deploymentData.last_deployment_id}" class="deployment-link">
              ${deploymentData.last_deployment_id}
            </a>
            ${deploymentData.last_deployed_at ? `
              <span class="deployment-date">${new Date(deploymentData.last_deployed_at).toLocaleDateString()}</span>
            ` : ''}
          </div>
        </div>
      ` : ''}
      
      ${deploymentData.previous_deployments && deploymentData.previous_deployments.length > 0 ? `
        <div class="field-group">
          <h4 class="subsection-title">Deployment History</h4>
          <div class="deployment-list">
            ${deploymentData.previous_deployments.map(depId => `
              <div class="deployment-item">
                <span class="deployment-icon">📍</span>
                <a href="/deployments/${depId}" class="deployment-link">${depId}</a>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
    `;
    
    return section;
  }
  
  renderMaintenanceSection() {
    const section = document.createElement('div');
    section.className = 'section-panel';
    section.dataset.section = 'maintenance';
    
    const repairStatus = this.item.repair_status || {};
    const needsRepair = repairStatus.needs_repair || false;
    
    section.innerHTML = `
      <div class="field-group">
        <h4 class="subsection-title">Current Repair Status</h4>
        ${needsRepair ? `
          <div class="repair-status-card needs-repair">
            <div class="repair-status-icon">⚠️</div>
            <div class="repair-status-info">
              <div class="repair-status-label">Repair Needed</div>
              ${repairStatus.criticality ? `
                <span class="pill pill-criticality-${repairStatus.criticality.toLowerCase()}">${repairStatus.criticality} Priority</span>
              ` : ''}
            </div>
            <a href="/repairs/${this.item.id}" class="btn-link">View in Repair Dashboard</a>
          </div>
        ` : `
          <div class="repair-status-card operational">
            <div class="repair-status-icon">✓</div>
            <div class="repair-status-info">
              <div class="repair-status-label">Operational</div>
            </div>
          </div>
        `}
      </div>
      
      <div class="field-group">
        <h4 class="subsection-title">Repair History</h4>
        <div class="placeholder-message">Repair history to be developed</div>
      </div>
      
      <div class="field-group">
        <h4 class="subsection-title">Maintenance Records</h4>
        <button class="btn-secondary" onclick="itemDetailPage.showMaintenancePlaceholder()">
          View Maintenance Records
        </button>
      </div>
      
      <div class="field-group">
        <button class="btn-primary" onclick="itemDetailPage.openWorkbench()">
          🔧 Open Workbench
        </button>
      </div>
    `;
    
    return section;
  }
  
  renderStorageSection() {
    const section = document.createElement('div');
    section.className = 'section-panel';
    section.dataset.section = 'storage';
    
    const packingData = this.item.packing_data || {};
    
    if (!packingData.tote_id) {
      section.innerHTML = `
        <div class="empty-section">
          <div class="empty-icon">📦</div>
          <div class="empty-message">Not currently stored</div>
        </div>
      `;
      return section;
    }
    
    section.innerHTML = `
      <div class="field-group">
        <div class="storage-card">
          <div class="storage-icon">📦</div>
          <div class="storage-info">
            <div class="storage-field">
              <span class="storage-label">Tote ID:</span>
              <span class="storage-value">${packingData.tote_id}</span>
            </div>
            <div class="storage-field">
              <span class="storage-label">Location:</span>
              <span class="storage-value">${packingData.tote_location || 'Unknown'}</span>
            </div>
          </div>
          <a href="/storage/${packingData.tote_id}" class="btn-secondary btn-small">
            View Storage Details
          </a>
        </div>
      </div>
    `;
    
    return section;
  }
  
  previousPhoto() {
    const allPhotos = [];
    if (this.photos.primary) allPhotos.push(this.photos.primary);
    allPhotos.push(...this.photos.secondary);
    
    this.currentPhotoIndex = (this.currentPhotoIndex - 1 + allPhotos.length) % allPhotos.length;
    this.updateCarousel();
  }
  
  nextPhoto() {
    const allPhotos = [];
    if (this.photos.primary) allPhotos.push(this.photos.primary);
    allPhotos.push(...this.photos.secondary);
    
    this.currentPhotoIndex = (this.currentPhotoIndex + 1) % allPhotos.length;
    this.updateCarousel();
  }
  
  goToPhoto(index) {
    this.currentPhotoIndex = index;
    this.updateCarousel();
  }
  
  updateCarousel() {
    const leftColumn = this.container.querySelector('.detail-left-column');
    leftColumn.innerHTML = '';
    leftColumn.appendChild(this.renderPhotoCarousel());
  }
}
