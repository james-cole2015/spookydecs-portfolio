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
        <button class="btn-secondary" onclick="itemDetailPage.handleEdit()">
          ✏️ Edit
        </button>
        <button class="btn-warning" onclick="itemDetailPage.handleRetire()">
          📦 Retire
        </button>
        <button class="btn-danger" onclick="itemDetailPage.handleDelete()">
          🗑️ Delete
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
      <button class="section-tab" data-section="repairs">Repairs</button>
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
        { label: 'Class', value: this.item.class },
        { label: 'Type', value: this.item.class_type },
        { label: 'Season', value: this.item.season },
        { label: 'Status', value: this.item.status || 'Active' },
        { label: 'Date Acquired', value: this.item.date_acquired || '-' }
      ]
    });
    
    // Physical Specifications (class-specific fields)
    const physicalFields = this.getPhysicalSpecFields();
    if (physicalFields.length > 0) {
      categories.push({
        title: 'Physical Specifications',
        fields: physicalFields
      });
    }
    
    // Power Specifications (if applicable)
    const powerFields = this.getPowerSpecFields();
    if (powerFields.length > 0) {
      categories.push({
        title: 'Power Specifications',
        fields: powerFields
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
    
    // Acquisition Details
    const vendorData = this.item.vendor_metadata || {};
    categories.push({
      title: 'Acquisition',
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
      value.textContent = field.value || '-';
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
      case 'repairs':
        sectionContent = this.renderRepairsSection();
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
    
    section.innerHTML = `
      <div class="field-group">
        <h3 class="field-group-title">Deployment Status</h3>
        <div class="fields-container">
          <div class="field">
            <div class="field-label">Currently Deployed</div>
            <div class="field-value">${deploymentData.deployed ? 'Yes' : 'No'}</div>
          </div>
          ${deploymentData.last_deployment_id ? `
            <div class="field">
              <div class="field-label">Last Deployment</div>
              <div class="field-value deployment-link">${deploymentData.last_deployment_id}</div>
            </div>
          ` : ''}
          ${deploymentData.last_deployed_at ? `
            <div class="field">
              <div class="field-label">Last Deployed Date</div>
              <div class="field-value">${new Date(deploymentData.last_deployed_at).toLocaleDateString()}</div>
            </div>
          ` : ''}
        </div>
      </div>
      
      ${deploymentData.previous_deployments && deploymentData.previous_deployments.length > 0 ? `
        <div class="field-group">
          <h3 class="field-group-title">Deployment History</h3>
          <div class="deployment-list">
            ${deploymentData.previous_deployments.map(depId => `
              <div class="deployment-item">
                <span class="deployment-icon">📍</span>
                <span class="deployment-link">${depId}</span>
              </div>
            `).join('')}
          </div>
        </div>
      ` : '<div class="empty-section">No deployment history</div>'}
    `;
    
    return section;
  }
  
  renderRepairsSection() {
    const section = document.createElement('div');
    section.className = 'section-panel';
    section.dataset.section = 'repairs';
    
    const repairStatus = this.item.repair_status || {};
    const repairHistory = this.item.repair_history || [];
    
    const needsRepair = repairStatus.needs_repair || false;
    const status = repairStatus.status || 'Operational';
    
    section.innerHTML = `
      <div class="field-group">
        <h3 class="field-group-title">Current Status</h3>
        <div class="repair-status-card ${needsRepair ? 'needs-repair' : 'operational'}">
          <div class="repair-status-icon">${needsRepair ? '⚠️' : '✓'}</div>
          <div class="repair-status-info">
            <div class="repair-status-label">${status}</div>
            ${needsRepair && repairStatus.criticality ? `
              <div class="repair-criticality">${repairStatus.criticality} Priority</div>
            ` : ''}
            ${needsRepair && repairStatus.estimated_repair_cost ? `
              <div class="repair-cost">Est. Cost: $${repairStatus.estimated_repair_cost}</div>
            ` : ''}
          </div>
          ${needsRepair ? `
            <button class="btn-primary btn-small" onclick="itemDetailPage.handleMarkRepaired()">
              Mark as Repaired
            </button>
          ` : ''}
        </div>
        
        ${repairStatus.repair_notes && repairStatus.repair_notes.length > 0 ? `
          <div class="repair-notes">
            <h4>Current Repair Notes</h4>
            ${repairStatus.repair_notes.map(note => `
              <div class="repair-note">
                <div class="note-meta">${note.date ? new Date(note.date).toLocaleDateString() : ''} - ${note.type || 'Note'}</div>
                <div class="note-text">${note.description || ''}</div>
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>
      
      ${repairHistory.length > 0 ? `
        <div class="field-group">
          <h3 class="field-group-title">Repair History</h3>
          <div class="repair-history-link">
            <a href="#" onclick="itemDetailPage.viewRepairHistory(); return false;">
              View full repair history (${repairHistory.length} records)
            </a>
          </div>
        </div>
      ` : ''}
      
      <div class="field-group">
        <button class="btn-secondary" onclick="itemDetailPage.handleFlagForRepair()">
          🔧 Flag for Repair
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
    
    section.innerHTML = `
      <div class="field-group">
        <h3 class="field-group-title">Current Location</h3>
        ${packingData.tote_id ? `
          <div class="storage-card">
            <div class="storage-icon">📦</div>
            <div class="storage-info">
              <div class="storage-tote-id">${packingData.tote_id}</div>
              <div class="storage-location">${packingData.tote_location || 'Unknown location'}</div>
              <div class="storage-status">
                ${packingData.packing_status ? 'Packed' : 'Not packed'}
              </div>
            </div>
            <button class="btn-secondary btn-small" onclick="itemDetailPage.viewStorage()">
              View Storage
            </button>
          </div>
        ` : `
          <div class="empty-section">Not currently stored</div>
        `}
      </div>
      
      <div class="field-group">
        <button class="btn-secondary" onclick="itemDetailPage.handleChangeStorage()">
          📍 Change Storage Location
        </button>
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
