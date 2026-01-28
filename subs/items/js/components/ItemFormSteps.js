// Item Form Steps Component
// Renders each step of the wizard

import { CLASS_HIERARCHY } from '../utils/item-config.js';
import { ItemFormFields } from './ItemFormFields.js';

export class ItemFormSteps {
  constructor(wizard) {
    this.wizard = wizard;
  }
  
  // Step 1: Select Class
  renderStep1() {
    const panel = document.createElement('div');
    panel.className = 'step-panel';
    
    panel.innerHTML = `
      <h2>Select Item Class</h2>
      <p class="step-description">Choose the primary category for your item</p>
      
      <div class="class-selector">
        ${Object.keys(CLASS_HIERARCHY).map(className => `
          <div 
            class="class-card ${this.wizard.formData.class === className ? 'selected' : ''}" 
            onclick="itemFormPage.wizard.selectClass('${className}')"
          >
            <div class="class-icon">${this.getClassIcon(className)}</div>
            <div class="class-label">${className}</div>
          </div>
        `).join('')}
      </div>
    `;
    
    return panel;
  }
  
  // Step 2: Select Class Type
  renderStep2() {
    const panel = document.createElement('div');
    panel.className = 'step-panel';
    
    const selectedClass = this.wizard.formData.class;
    const types = CLASS_HIERARCHY[selectedClass] || [];
    
    panel.innerHTML = `
      <h2>Select ${selectedClass} Type</h2>
      <p class="step-description">Choose the specific type of ${selectedClass.toLowerCase()}</p>
      
      <div class="type-selector">
        ${types.map(type => `
          <div 
            class="type-card ${this.wizard.formData.class_type === type ? 'selected' : ''}" 
            onclick="itemFormPage.wizard.selectClassType('${type}')"
          >
            <div class="type-icon">${this.getTypeIcon(type)}</div>
            <div class="type-label">${type}</div>
          </div>
        `).join('')}
      </div>
    `;
    
    return panel;
  }
  
  // Step 3: Fill in Details
  renderStep3() {
    const panel = document.createElement('div');
    panel.className = 'step-panel';
    
    panel.innerHTML = `
      <h2>Item Details</h2>
      <p class="step-description">Fill in the required information for your ${this.wizard.formData.class_type || 'item'}</p>
      
      <div class="form-section">
        <h3 class="section-title">Basic Information</h3>
        <div id="basic-fields" class="form-fields"></div>
      </div>
      
      <div class="form-section">
        <h3 class="section-title">${this.wizard.formData.class} Specific Details</h3>
        <div id="specific-fields" class="form-fields"></div>
      </div>
      
      <div class="form-section">
        <h3 class="section-title">Vendor Information</h3>
        <div id="vendor-fields" class="form-fields"></div>
      </div>
      
      <div class="form-section">
        <h3 class="section-title">Storage Information</h3>
        <div id="storage-fields" class="form-fields"></div>
      </div>
    `;
    
    // After adding to DOM, render the form fields
    setTimeout(() => {
      this.renderFormFields();
    }, 0);
    
    return panel;
  }
  
  renderFormFields() {
    // Render basic fields
    const basicFields = new ItemFormFields('basic-fields');
    basicFields.renderBasicFields(this.wizard.formData, this.wizard.mode);
    
    // Render class-specific fields
    const specificFields = new ItemFormFields('specific-fields');
    specificFields.renderClassSpecificFields(
      this.wizard.formData.class,
      this.wizard.formData.class_type,
      this.wizard.formData
    );
    
    // Render vendor fields
    const vendorFields = new ItemFormFields('vendor-fields');
    vendorFields.renderVendorFields(this.wizard.formData);
    
    // Render storage fields
    const storageFields = new ItemFormFields('storage-fields');
    storageFields.renderStorageFields(this.wizard.formData);
  }
  
  // Step 4: Preview
  renderStep4() {
    const panel = document.createElement('div');
    panel.className = 'step-panel';
    
    const data = this.wizard.formData;
    
    panel.innerHTML = `
      <h2>Review & Confirm</h2>
      <p class="step-description">Review all details before ${this.wizard.mode === 'create' ? 'creating' : 'updating'} the item</p>
      
      <div class="preview-card">
        <div class="preview-header">
          <div class="preview-title">
            <span class="preview-icon">${this.getClassIcon(data.class)}</span>
            ${data.short_name || 'Unnamed Item'}
          </div>
          <div class="preview-class">${data.class} - ${data.class_type}</div>
        </div>
        
        <div class="preview-sections">
          <div class="preview-section">
            <h4>Basic Information</h4>
            <div class="preview-fields">
              <div class="preview-field">
                <span class="preview-label">Season:</span>
                <span class="preview-value">${data.season || 'Not set'}</span>
              </div>
              <div class="preview-field">
                <span class="preview-label">Status:</span>
                <span class="preview-value">${data.status || 'Packed'}</span>
              </div>
              ${data.date_acquired ? `
                <div class="preview-field">
                  <span class="preview-label">Date Acquired:</span>
                  <span class="preview-value">${data.date_acquired}</span>
                </div>
              ` : ''}
            </div>
            ${data.general_notes ? `
              <p class="preview-notes">${data.general_notes}</p>
            ` : ''}
          </div>
          
          ${this.renderClassSpecificPreview(data)}
          
          <div class="preview-section">
            <h4>Vendor Information</h4>
            <div class="preview-fields">
              ${data.vendor_store ? `
                <div class="preview-field">
                  <span class="preview-label">Store:</span>
                  <span class="preview-value">${data.vendor_store}</span>
                </div>
              ` : ''}
              ${data.vendor_manufacturer ? `
                <div class="preview-field">
                  <span class="preview-label">Manufacturer:</span>
                  <span class="preview-value">${data.vendor_manufacturer}</span>
                </div>
              ` : ''}
              ${data.vendor_cost ? `
                <div class="preview-field">
                  <span class="preview-label">Cost:</span>
                  <span class="preview-value">$${data.vendor_cost}</span>
                </div>
              ` : ''}
              ${data.vendor_value ? `
                <div class="preview-field">
                  <span class="preview-label">Value:</span>
                  <span class="preview-value">$${data.vendor_value}</span>
                </div>
              ` : ''}
            </div>
          </div>
          
          ${data.storage_tote_id || data.storage_location ? `
            <div class="preview-section">
              <h4>Storage</h4>
              <div class="preview-fields">
                ${data.storage_tote_id ? `
                  <div class="preview-field">
                    <span class="preview-label">Tote ID:</span>
                    <span class="preview-value">${data.storage_tote_id}</span>
                  </div>
                ` : ''}
                ${data.storage_location ? `
                  <div class="preview-field">
                    <span class="preview-label">Location:</span>
                    <span class="preview-value">${data.storage_location}</span>
                  </div>
                ` : ''}
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    `;
    
    return panel;
  }
  
  renderClassSpecificPreview(data) {
    const fields = [];
    
    // Decoration-specific
    if (data.class === 'Decoration') {
      if (data.height_length) fields.push(`Height/Length: ${data.height_length} ft`);
      if (data.stakes) fields.push(`Stakes: ${data.stakes}`);
      if (data.tethers) fields.push(`Tethers: ${data.tethers}`);
      if (data.adapter) fields.push(`Adapter: ${data.adapter}`);
    }
    
    // Light-specific
    if (data.class === 'Light') {
      if (data.color) fields.push(`Color: ${data.color}`);
      if (data.bulb_type) fields.push(`Bulb Type: ${data.bulb_type}`);
      if (data.length) fields.push(`Length: ${data.length} ft`);
      if (data.watts) fields.push(`Watts: ${data.watts}W`);
      if (data.amps) fields.push(`Amps: ${data.amps}A`);
    }
    
    // Accessory-specific
    if (data.class === 'Accessory') {
      if (data.length) fields.push(`Length: ${data.length} ft`);
      if (data.male_ends) fields.push(`Male Ends: ${data.male_ends}`);
      if (data.female_ends) fields.push(`Female Ends: ${data.female_ends}`);
    }
    
    // Power inlet
    if (data.power_inlet !== undefined) {
      fields.push(`Power Inlet: ${data.power_inlet ? 'Yes' : 'No'}`);
    }
    
    if (fields.length === 0) return '';
    
    return `
      <div class="preview-section">
        <h4>${data.class} Details</h4>
        <div class="preview-fields">
          ${fields.map(field => `
            <div class="preview-field">
              <span class="preview-value">${field}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }
  
  // Icon helpers
  getClassIcon(className) {
    const icons = {
      'Decoration': '🎃',
      'Light': '💡',
      'Accessory': '🔌'
    };
    return icons[className] || '📦';
  }
  
  getTypeIcon(type) {
    const icons = {
      'Inflatable': '🎈',
      'Animatronic': '🤖',
      'Static Prop': '🗿',
      'String Light': '💡',
      'Spot Light': '🔦',
      'Cord': '➰',
      'Plug': '🔌',
      'Receptacle': '⚡'
    };
    return icons[type] || '📦';
  }
}