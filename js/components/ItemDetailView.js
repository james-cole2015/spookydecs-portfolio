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
    
    // Attach event listeners after DOM is inserted
    this.attachTabEventListeners();
  }
  
  renderHeader() {
    const header = document.createElement('div');
    header.className = 'detail-header';
    
    const icon = getClassTypeIcon(this.item.class_type);
    
    // Determine which action buttons to show
    const packingData = this.item.packing_data || {};
    const isUnpacked = packingData.packing_status === false;
    const isNonPackable = this.item.packable === false;
    const isSinglePacked = this.item.single_packed === true;
    const isReceptacle = this.item.class_type === 'Receptacle';
    
    const showStoreButton = isNonPackable && !isReceptacle && isUnpacked;
    const showPackButton = isSinglePacked && isUnpacked;
    
    header.innerHTML = `
      <div class="header-title">
        <h1><span class="title-icon">${icon}</span> ${this.item.short_name}</h1>
        <div class="item-id-badge">${this.item.id}</div>
      </div>
      <div class="header-actions">
        ${showStoreButton ? `
          <button class="btn btn-primary" onclick="itemDetailPage.handleStoreItem()" title="Store Item">
            📍 Store Item
          </button>
        ` : ''}
        ${showPackButton ? `
          <button class="btn btn-primary" onclick="itemDetailPage.handlePackItem()" title="Pack Item">
            📦 Pack Item
          </button>
        ` : ''}
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
    
    // Tab buttons container
    const tabButtons = document.createElement('div');
    tabButtons.className = 'section-tabs';
    
    // Desktop tabs
    const desktopTabs = document.createElement('div');
    desktopTabs.className = 'section-tabs-desktop';
    desktopTabs.innerHTML = `
      <button class="section-tab active" data-section="details">Details</button>
      <button class="section-tab" data-section="maintenance">Maintenance</button>
      <button class="section-tab" data-section="deployments">Deployments</button>
      <button class="section-tab" data-section="storage">Storage</button>
    `;
    
    // Mobile dropdown
    const mobileDropdown = document.createElement('div');
    mobileDropdown.className = 'section-tabs-mobile';
    
    const select = document.createElement('select');
    select.className = 'section-tab-select';
    select.innerHTML = `
      <option value="details">Details</option>
      <option value="maintenance">Maintenance</option>
      <option value="deployments">Deployments</option>
      <option value="storage">Storage</option>
    `;
    
    mobileDropdown.appendChild(select);
    
    tabButtons.appendChild(desktopTabs);
    tabButtons.appendChild(mobileDropdown);
    
    // Tab content
    const tabContent = document.createElement('div');
    tabContent.className = 'section-content';
    
    // Details section (active by default)
    tabContent.appendChild(this.renderDetailsSection());
    
    tabbed.appendChild(tabButtons);
    tabbed.appendChild(tabContent);
    
    return tabbed;
  }
  
  attachTabEventListeners() {
    // Desktop tab buttons
    const desktopTabs = this.container.querySelectorAll('.section-tab');
    desktopTabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        this.switchTab(e.target.dataset.section);
      });
    });
    
    // Mobile dropdown
    const mobileSelect = this.container.querySelector('.section-tab-select');
    if (mobileSelect) {
      mobileSelect.addEventListener('change', (e) => {
        this.switchTab(e.target.value);
      });
    }
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
    console.log('Switching to tab:', sectionName);
    
    // Update desktop tab buttons
    this.container.querySelectorAll('.section-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.section === sectionName);
    });
    
    // Update mobile dropdown
    const mobileSelect = this.container.querySelector('.section-tab-select');
    if (mobileSelect) {
      mobileSelect.value = sectionName;
    }
    
    // Clear and render new content
    const contentContainer = this.container.querySelector('.section-content');
    if (!contentContainer) {
      console.error('Section content container not found!');
      return;
    }
    
    console.log('Content container found, clearing...');
    contentContainer.innerHTML = '';
    
    let sectionContent;
    try {
      switch (sectionName) {
        case 'details':
          console.log('Rendering details section');
          sectionContent = this.renderDetailsSection();
          break;
        case 'deployments':
          console.log('Rendering deployments section');
          sectionContent = this.renderDeploymentsSection();
          break;
        case 'maintenance':
          console.log('Rendering maintenance section');
          sectionContent = this.renderMaintenanceSection();
          break;
        case 'storage':
          console.log('Rendering storage section');
          sectionContent = this.renderStorageSection();
          break;
        default:
          console.error('Unknown section:', sectionName);
          return;
      }
      
      if (!sectionContent) {
        console.error('Section content is null/undefined for:', sectionName);
        return;
      }
      
      console.log('Appending section content to container');
      contentContainer.appendChild(sectionContent);
      console.log('Section rendered successfully');
      
    } catch (error) {
      console.error('Error rendering section:', sectionName, error);
      contentContainer.innerHTML = `
        <div class="error-section">
          <div class="error-icon">⚠️</div>
          <div class="error-message">Error loading section: ${error.message}</div>
        </div>
      `;
    }
  }
  
  renderDeploymentsSection() {
    const section = document.createElement('div');
    section.className = 'section-panel active';
    section.dataset.section = 'deployments';
    
    console.log('Rendering Deployments Section');
    console.log('Item data:', this.item);
    console.log('Deployment data:', this.item.deployment_data);
    
    const deploymentData = this.item.deployment_data || {};
    const previousDeployments = deploymentData.previous_deployments || [];
    const deploymentCount = Array.isArray(previousDeployments) ? previousDeployments.length : 0;
    
    console.log('Deployment count:', deploymentCount);
    console.log('Previous deployments:', previousDeployments);
    
    if (deploymentCount === 0) {
      section.innerHTML = `
        <div class="empty-section">
          <div class="empty-icon">📍</div>
          <div class="empty-message">Awaiting first deployment</div>
        </div>
      `;
      return section;
    }
    
    const lastDeploymentId = deploymentData.last_deployment_id || null;
    const lastDeployedAt = deploymentData.last_deployed_at || null;
    
    section.innerHTML = `
      <div class="section-header">
        <h3>Deployed ${deploymentCount} time${deploymentCount !== 1 ? 's' : ''}</h3>
      </div>
      
      ${lastDeploymentId ? `
        <div class="field-group">
          <h4 class="subsection-title">Last Deployment</h4>
          <div class="deployment-item">
            <span class="deployment-icon">📍</span>
            <a href="/deployments/${lastDeploymentId}" class="deployment-link">
              ${lastDeploymentId}
            </a>
            ${lastDeployedAt ? `
              <span class="deployment-date">${new Date(lastDeployedAt).toLocaleDateString()}</span>
            ` : ''}
          </div>
        </div>
      ` : ''}
      
      ${previousDeployments.length > 0 ? `
        <div class="field-group">
          <h4 class="subsection-title">Deployment History</h4>
          <div class="deployment-list">
            ${previousDeployments.map(depId => `
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
    section.className = 'section-panel active';
    section.dataset.section = 'maintenance';
    
    console.log('Rendering Maintenance Section');
    console.log('Item data:', this.item);
    console.log('Repair status:', this.item.repair_status);
    
    const repairStatus = this.item.repair_status || {};
    const needsRepair = repairStatus.needs_repair || false;
    const criticality = repairStatus.criticality || null;
    
    console.log('Needs repair:', needsRepair);
    console.log('Criticality:', criticality);
    
    section.innerHTML = `
      <div class="field-group">
        <h4 class="subsection-title">Current Repair Status</h4>
        ${needsRepair ? `
          <div class="repair-status-card needs-repair">
            <div class="repair-status-icon">⚠️</div>
            <div class="repair-status-info">
              <div class="repair-status-label">Repair Needed</div>
              ${criticality ? `
                <span class="pill pill-criticality-${criticality.toLowerCase()}">${criticality} Priority</span>
              ` : ''}
            </div>
            <a href="/repairs/${this.item.id}" class="btn-primary btn-small">
              View in Repair Dashboard
            </a>
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
    `;
    
    console.log('Maintenance section HTML created');
    return section;
  }
  
  renderStorageSection() {
    const section = document.createElement('div');
    section.className = 'section-panel active';
    section.dataset.section = 'storage';
    
    console.log('Rendering Storage Section');
    console.log('Item data:', this.item);
    console.log('Packing data:', this.item.packing_data);
    
    const packingData = this.item.packing_data || {};
    const toteId = packingData.tote_id || null;
    const toteLocation = packingData.tote_location || null;
    
    console.log('Tote ID:', toteId);
    console.log('Tote Location:', toteLocation);
    
    if (!toteId) {
      section.innerHTML = `
        <div class="empty-section">
          <div class="empty-icon">📦</div>
          <div class="empty-message">Not currently stored</div>
        </div>
      `;
      console.log('Storage section: showing empty state');
      return section;
    }
    
    section.innerHTML = `
      <div class="field-group">
        <div class="storage-card">
          <div class="storage-icon">📦</div>
          <div class="storage-info">
            <div class="storage-field">
              <span class="storage-label">Tote ID:</span>
              <span class="storage-value">${toteId}</span>
            </div>
            <div class="storage-field">
              <span class="storage-label">Location:</span>
              <span class="storage-value">${toteLocation || 'Unknown'}</span>
            </div>
          </div>
          <a href="/storage/${toteId}" class="btn-secondary btn-small">
            View Storage Details
          </a>
        </div>
      </div>
    `;
    
    console.log('Storage section HTML created');
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