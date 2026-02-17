// EditableSection.js (FIXED)
// Handles section-based editing for item detail page
// Renders form fields and manages save/cancel

import { ItemFormFields } from './ItemFormFields.js';

export class EditableSection {
  constructor(sectionId, sectionType, item) {
    this.sectionId = sectionId;
    this.sectionType = sectionType; // 'overview', 'storage', 'deployment'
    this.item = item;
    this.isEditing = false;
    this.formFields = null;
    this.originalData = null;
  }
  
  /**
   * Enter edit mode for this section
   */
  enterEditMode() {
    const section = document.getElementById(this.sectionId);
    if (!section) return;
    
    this.isEditing = true;
    
    // Store original data for cancel
    this.originalData = this.getCurrentData();
    
    // Add editing class to section
    section.classList.add('editing');
    
    // Disable other sections
    this.disableOtherSections();
    
    // Replace content with form fields
    this.renderEditForm(section);
    
    // Show sticky footer
    this.showStickyFooter();
  }
  
  /**
   * Exit edit mode (save or cancel)
   */
  exitEditMode(save = false) {
    const section = document.getElementById(this.sectionId);
    if (!section) return;
    
    this.isEditing = false;
    section.classList.remove('editing');
    
    // Re-enable other sections
    this.enableOtherSections();
    
    // Hide sticky footer
    this.hideStickyFooter();
    
    return save ? this.getFormData() : null;
  }
  
  /**
   * Render edit form based on section type
   */
  renderEditForm(section) {
    const contentDiv = section.querySelector('.detail-section');
    if (!contentDiv) return;
    
    // Create form container
    const formContainer = document.createElement('div');
    formContainer.className = 'editable-section-form';
    formContainer.id = `${this.sectionId}-form`;
    
    contentDiv.innerHTML = '';
    contentDiv.appendChild(formContainer);
    
    // Initialize ItemFormFields for this section
    this.formFields = new ItemFormFields(`${this.sectionId}-form`);
    
    // Render appropriate fields based on section type
    switch (this.sectionType) {
      case 'overview':
        this.renderOverviewFields();
        break;
      case 'storage':
        this.renderStorageFields();
        break;
      case 'deployment':
        // Deployment is read-only for now
        break;
    }
  }
  
  /**
   * Render overview section fields
   */
  renderOverviewFields() {
    if (!this.formFields) return;
    
    // Create form fields container
    const container = this.formFields.container;
    if (!container) return;
    
    const fieldsHTML = `
      <div class="form-fields">
        ${this.renderOverviewFieldsHTML()}
      </div>
    `;
    
    container.innerHTML = fieldsHTML;
    
    // Attach event listeners for validation
    this.attachFieldListeners();
  }
  
  /**
   * Generate HTML for overview fields based on class type
   */
  renderOverviewFieldsHTML() {
    const fields = [];
    const classType = this.item.class_type;
    
    // Class-specific fields
    if (['Inflatable', 'Animatronic', 'Static Prop'].includes(classType)) {
      fields.push(this.createFieldHTML('height_length', 'Height/Length (ft)', 'text', this.item.height_length || ''));
      fields.push(this.createFieldHTML('stakes', 'Stakes', 'text', this.item.stakes || ''));
      fields.push(this.createFieldHTML('tethers', 'Tethers', 'text', this.item.tethers || ''));
    }
    
    if (['Inflatable', 'Animatronic'].includes(classType)) {
      fields.push(this.createFieldHTML('adapter', 'Adapter', 'text', this.item.adapter || ''));
    }
    
    if (['String Light', 'Spot Light'].includes(classType)) {
      fields.push(this.createFieldHTML('color', 'Color', 'text', this.item.color || ''));
      fields.push(this.createFieldHTML('bulb_type', 'Bulb Type', 'text', this.item.bulb_type || ''));
    }
    
    if (classType === 'String Light') {
      fields.push(this.createFieldHTML('length', 'Length (ft)', 'text', this.item.length || ''));
    }
    
    if (['Cord', 'Plug', 'Timer', 'Controller'].includes(classType)) {
      fields.push(this.createFieldHTML('male_ends', 'Male Ends', 'text', this.item.male_ends || ''));
      fields.push(this.createFieldHTML('female_ends', 'Female Ends', 'text', this.item.female_ends || ''));
    }
    
    if (classType === 'Cord') {
      fields.push(this.createFieldHTML('length', 'Length (ft)', 'text', this.item.length || ''));
      fields.push(this.createFieldHTML('watts', 'Watts', 'text', this.item.watts || ''));
      fields.push(this.createFieldHTML('amps', 'Amps', 'text', this.item.amps || ''));
    }
    
    // Power inlet (for most types)
    if (['Inflatable', 'Animatronic', 'Static Prop', 'String Light', 'Spot Light', 'Projection', 'Plug', 'Receptacle', 'Timer', 'Controller'].includes(classType)) {
      fields.push(this.createSelectHTML('power_inlet', 'Power Required', [
        { value: 'true', label: 'Yes' },
        { value: 'false', label: 'No' }
      ], this.item.power_inlet ? 'true' : 'false'));
    }
    
    // General notes (full width)
    fields.push(this.createTextareaHTML('general_notes', 'General Notes', this.item.general_notes || ''));
    
    return fields.join('');
  }
  
  /**
   * Create HTML for text input field
   */
  createFieldHTML(name, label, type, value) {
    return `
      <div class="form-group" data-field="${name}">
        <label for="${name}">${label}</label>
        <input type="${type}" id="${name}" name="${name}" value="${this.escapeHtml(String(value))}" />
        <span class="error-message"></span>
      </div>
    `;
  }
  
  /**
   * Create HTML for select field
   */
  createSelectHTML(name, label, options, value) {
    return `
      <div class="form-group" data-field="${name}">
        <label for="${name}">${label}</label>
        <select id="${name}" name="${name}">
          ${options.map(opt => `
            <option value="${opt.value}" ${opt.value === value ? 'selected' : ''}>
              ${opt.label}
            </option>
          `).join('')}
        </select>
        <span class="error-message"></span>
      </div>
    `;
  }
  
  /**
   * Create HTML for textarea field
   */
  createTextareaHTML(name, label, value) {
    return `
      <div class="form-group full-width" data-field="${name}">
        <label for="${name}">${label}</label>
        <textarea id="${name}" name="${name}">${this.escapeHtml(String(value))}</textarea>
        <span class="error-message"></span>
      </div>
    `;
  }
  
  /**
   * Render storage section fields
   */
  renderStorageFields() {
    if (!this.formFields) return;
    
    const container = this.formFields.container;
    if (!container) return;
    
    const fieldsHTML = `
      <div class="form-fields">
        ${this.createFieldHTML('storage_tote_id', 'Tote ID', 'text', this.item.packing_data?.tote_id || '')}
        ${this.createFieldHTML('storage_location', 'Location', 'text', this.item.packing_data?.tote_location || '')}
      </div>
    `;
    
    container.innerHTML = fieldsHTML;
    this.attachFieldListeners();
  }
  
  /**
   * Attach event listeners for field validation
   */
  attachFieldListeners() {
    const container = this.formFields?.container;
    if (!container) return;
    
    const inputs = container.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      input.addEventListener('blur', () => {
        // Clear error on blur (optional)
      });
    });
  }
  
  /**
   * Get current data from item (for storing original state)
   */
  getCurrentData() {
    switch (this.sectionType) {
      case 'overview':
        return {
          height_length: this.item.height_length,
          stakes: this.item.stakes,
          tethers: this.item.tethers,
          adapter: this.item.adapter,
          color: this.item.color,
          bulb_type: this.item.bulb_type,
          length: this.item.length,
          male_ends: this.item.male_ends,
          female_ends: this.item.female_ends,
          watts: this.item.watts,
          amps: this.item.amps,
          power_inlet: this.item.power_inlet,
          general_notes: this.item.general_notes
        };
      case 'storage':
        return {
          packing_data: { ...this.item.packing_data }
        };
      default:
        return {};
    }
  }
  
  /**
   * Get form data from fields
   */
  getFormData() {
    if (!this.formFields?.container) return {};
    
    const formData = {};
    const inputs = this.formFields.container.querySelectorAll('input, select, textarea');
    
    inputs.forEach(input => {
      const name = input.name;
      let value = input.value;
      
      // Handle power_inlet boolean
      if (name === 'power_inlet') {
        value = value === 'true';
      }
      
      formData[name] = value;
    });
    
    // Format data based on section type
    switch (this.sectionType) {
      case 'overview':
        return formData;
        
      case 'storage':
        return {
          packing_data: {
            ...(this.item.packing_data || {}),
            tote_id: formData.storage_tote_id || '',
            tote_location: formData.storage_location || '',
            packing_status: formData.storage_tote_id ? true : false
          }
        };
        
      default:
        return {};
    }
  }
  
  /**
   * Validate form fields
   */
  validate() {
    // Basic validation - can be expanded
    return true;
  }
  
  /**
   * Disable other sections while editing
   */
  disableOtherSections() {
    document.querySelectorAll('.detail-section-card').forEach(card => {
      if (card.id !== this.sectionId) {
        card.classList.add('disabled');
      }
    });
  }
  
  /**
   * Re-enable other sections
   */
  enableOtherSections() {
    document.querySelectorAll('.detail-section-card').forEach(card => {
      card.classList.remove('disabled');
    });
  }
  
  /**
   * Show sticky footer with save/cancel
   */
  showStickyFooter() {
    let footer = document.getElementById('sticky-edit-footer');
    
    if (!footer) {
      footer = document.createElement('div');
      footer.id = 'sticky-edit-footer';
      footer.className = 'sticky-edit-footer';
      footer.innerHTML = `
        <div class="sticky-footer-content">
          <div class="sticky-footer-message">
            <span class="sticky-footer-icon">⚠️</span>
            <span class="sticky-footer-text">Unsaved changes to <strong>${this.getSectionLabel()}</strong></span>
          </div>
          <div class="sticky-footer-actions">
            <button class="btn-secondary" id="cancel-edit-btn">Discard</button>
            <button class="btn-primary" id="save-edit-btn">
              Save <span class="dirty-indicator">●</span>
            </button>
          </div>
        </div>
      `;
      document.body.appendChild(footer);
    }
    
    // Show footer with animation
    setTimeout(() => footer.classList.add('visible'), 10);
  }
  
  /**
   * Hide sticky footer
   */
  hideStickyFooter() {
    const footer = document.getElementById('sticky-edit-footer');
    if (footer) {
      footer.classList.remove('visible');
      setTimeout(() => footer.remove(), 300);
    }
  }
  
  /**
   * Get human-readable section label
   */
  getSectionLabel() {
    const labels = {
      overview: 'Overview',
      storage: 'Storage',
      deployment: 'Deployment'
    };
    return labels[this.sectionType] || 'Section';
  }
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}