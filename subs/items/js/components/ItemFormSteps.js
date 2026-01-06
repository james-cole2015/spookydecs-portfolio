// Item Form Steps Component
// Renders each step of the wizard

import { ItemFormFields } from './ItemFormFields.js';
import { PhotoUploader } from './PhotoUploader.js';
import { CLASS_HIERARCHY, TABS, getClassTypeIcon } from '../utils/item-config.js';

export class ItemFormSteps {
  constructor(wizard) {
    this.wizard = wizard;
  }
  
  // Step 1: Select Class
  renderStep1() {
    const step = document.createElement('div');
    step.className = 'step-panel';
    
    step.innerHTML = `
      <h2>Select Item Class</h2>
      <p class="step-description">Choose the type of item you're adding</p>
      <div class="class-selector">
        ${TABS.map(tab => `
          <div class="class-card ${this.wizard.formData.class === tab.class ? 'selected' : ''}" 
               data-class="${tab.class}"
               onclick="itemFormPage.wizard.selectClass('${tab.class}')">
            <div class="class-icon">${this.getClassIcon(tab.class)}</div>
            <div class="class-label">${tab.label}</div>
          </div>
        `).join('')}
      </div>
    `;
    
    return step;
  }
  
  // Step 2: Select Class Type
  renderStep2() {
    const step = document.createElement('div');
    step.className = 'step-panel';
    
    const classTypes = CLASS_HIERARCHY[this.wizard.formData.class] || [];
    
    step.innerHTML = `
      <h2>Select ${this.wizard.formData.class} Type</h2>
      <p class="step-description">What kind of ${this.wizard.formData.class.toLowerCase()} is this?</p>
      <div class="type-selector">
        ${classTypes.map(type => `
          <div class="type-card ${this.wizard.formData.class_type === type ? 'selected' : ''}"
               data-type="${type}"
               onclick="itemFormPage.wizard.selectClassType('${type}')">
            <div class="type-icon">${getClassTypeIcon(type)}</div>
            <div class="type-label">${type}</div>
          </div>
        `).join('')}
      </div>
    `;
    
    return step;
  }
  
  // Step 3: Fill Details
  renderStep3() {
    const step = document.createElement('div');
    step.className = 'step-panel';
    
    step.innerHTML = `
      <h2>Item Details</h2>
      <p class="step-description">Fill in the information for this ${this.wizard.formData.class_type || 'item'}</p>
      
      <div class="form-section">
        <h3 class="section-title">Basic Information</h3>
        <div id="basic-fields"></div>
      </div>
      
      <div class="form-section">
        <h3 class="section-title">Specific Details</h3>
        <div id="specific-fields"></div>
      </div>
      
      <div class="form-section">
        <h3 class="section-title">Acquisition</h3>
        <div id="vendor-fields"></div>
      </div>
      
      <div class="form-section">
        <h3 class="section-title">Storage</h3>
        <div id="storage-fields"></div>
      </div>
      
      ${this.wizard.formData.class === 'Decoration' ? `
        <div class="form-section">
          <h3 class="section-title">Photos</h3>
          <div id="photo-uploader"></div>
        </div>
      ` : ''}
    `;
    
    // Wait for DOM to update, then render fields
    setTimeout(() => {
      const basicFields = new ItemFormFields('basic-fields');
      basicFields.renderBasicFields(this.wizard.formData);
      
      const specificFields = new ItemFormFields('specific-fields');
      specificFields.renderClassSpecificFields(this.wizard.formData.class_type, this.wizard.formData);
      
      const vendorFields = new ItemFormFields('vendor-fields');
      vendorFields.renderVendorFields(this.wizard.formData);
      
      const storageFields = new ItemFormFields('storage-fields');
      storageFields.renderStorageFields(this.wizard.formData);
      
      // Photo uploader for decorations
      if (this.wizard.formData.class === 'Decoration') {
        this.wizard.photoUploader = new PhotoUploader('photo-uploader', 3);
        this.wizard.photoUploader.render();
      }
    }, 10);
    
    return step;
  }
  
  // Step 4: Preview
  renderStep4() {
    // Collect all form data
    this.wizard.collectFormData();
    
    const step = document.createElement('div');
    step.className = 'step-panel';
    
    step.innerHTML = `
      <h2>Review & Confirm</h2>
      <p class="step-description">Please review the information before saving</p>
      
      <div class="preview-card">
        <div class="preview-header">
          <div class="preview-title">
            <span class="preview-icon">${getClassTypeIcon(this.wizard.formData.class_type)}</span>
            ${this.wizard.formData.short_name || 'Unnamed Item'}
          </div>
          <div class="preview-class">${this.wizard.formData.class} - ${this.wizard.formData.class_type}</div>
        </div>
        
        <div class="preview-sections">
          ${this.renderPreviewSection('Basic Information', [
            { label: 'Season', value: this.wizard.formData.season },
            { label: 'Status', value: this.wizard.formData.status || 'Active' },
            { label: 'Date Acquired', value: this.wizard.formData.date_acquired || '-' }
          ])}
          
          ${this.renderClassSpecificPreview()}
          
          ${this.renderPreviewSection('Acquisition', [
            { label: 'Cost', value: this.wizard.formData.vendor_cost ? `$${this.wizard.formData.vendor_cost}` : '-' },
            { label: 'Value', value: this.wizard.formData.vendor_value ? `$${this.wizard.formData.vendor_value}` : '-' },
            { label: 'Manufacturer', value: this.wizard.formData.vendor_manufacturer || '-' },
            { label: 'Store', value: this.wizard.formData.vendor_store || '-' }
          ])}
          
          ${this.renderPreviewSection('Storage', [
            { label: 'Tote ID', value: this.wizard.formData.storage_tote_id || '-' },
            { label: 'Location', value: this.wizard.formData.storage_location || '-' }
          ])}
          
          ${this.wizard.formData.general_notes ? `
            <div class="preview-section">
              <h4>Notes</h4>
              <p class="preview-notes">${this.wizard.formData.general_notes}</p>
            </div>
          ` : ''}
          
          ${this.wizard.photoUploader && this.wizard.photoUploader.hasPhotos() ? `
            <div class="preview-section">
              <h4>Photos</h4>
              <p>${this.wizard.photoUploader.getSelectedFiles().length} photo(s) will be uploaded</p>
            </div>
          ` : ''}
        </div>
      </div>
    `;
    
    return step;
  }
  
  // Helper: Render preview section
  renderPreviewSection(title, fields) {
    const nonEmptyFields = fields.filter(f => f.value && f.value !== '-');
    if (nonEmptyFields.length === 0) return '';
    
    return `
      <div class="preview-section">
        <h4>${title}</h4>
        <div class="preview-fields">
          ${fields.map(f => `
            <div class="preview-field">
              <span class="preview-label">${f.label}:</span>
              <span class="preview-value">${f.value}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }
  
  // Helper: Render class-specific preview
  renderClassSpecificPreview() {
    const fields = [];
    
    ['height_length', 'stakes', 'tethers', 'color', 'bulb_type', 'length', 
     'male_ends', 'female_ends', 'watts', 'amps', 'adapter'].forEach(key => {
      if (this.wizard.formData[key]) {
        fields.push({
          label: key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
          value: this.wizard.formData[key]
        });
      }
    });
    
    if (fields.length === 0) return '';
    
    return this.renderPreviewSection('Specifications', fields);
  }
  
  // Helper: Get class icon
  getClassIcon(className) {
    const icons = {
      'Decoration': '🎃',
      'Light': '💡',
      'Accessory': '🔌'
    };
    return icons[className] || '📦';
  }
}
