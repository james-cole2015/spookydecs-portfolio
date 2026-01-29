// ItemEditForm Component
// Wrapper around ItemFormFields for edit mode
// Organizes fields into sections: Basic, Class-Specific, Vendor, Storage

import { ItemFormFields } from './ItemFormFields.js';

export class ItemEditForm {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.item = null;
    this.formFields = null;
  }
  
  render(item) {
    if (!this.container) {
      console.error('Container not found');
      return;
    }
    
    this.item = item;
    
    this.container.innerHTML = `
      <div class="edit-form">
        <!-- Basic Information Section -->
        <div class="form-section">
          <h2 class="section-title">Basic Information</h2>
          <div id="edit-basic-fields"></div>
        </div>
        
        <!-- Class-Specific Fields Section -->
        <div class="form-section">
          <h2 class="section-title">${item.class} - ${item.class_type} Details</h2>
          <div id="edit-class-fields"></div>
        </div>
        
        <!-- Vendor Information Section -->
        <div class="form-section">
          <h2 class="section-title">Vendor Information</h2>
          <div id="edit-vendor-fields"></div>
        </div>
        
        <!-- Storage Information Section -->
        <div class="form-section">
          <h2 class="section-title">Storage Information</h2>
          <div id="edit-storage-fields"></div>
        </div>
      </div>
    `;
    
    // Create ItemFormFields instances AFTER HTML is rendered
    this.formFields = {
      basic: new ItemFormFields('edit-basic-fields'),
      classSpecific: new ItemFormFields('edit-class-fields'),
      vendor: new ItemFormFields('edit-vendor-fields'),
      storage: new ItemFormFields('edit-storage-fields')
    };
    
    // Render each section
    this.formFields.basic.renderBasicFields(item);
    this.formFields.classSpecific.renderClassSpecificFields(item.class_type, item);
    this.formFields.vendor.renderVendorFields(item);
    this.formFields.storage.renderStorageFields(item);
  }
  
  validate() {
    if (!this.formFields) {
      console.error('Form fields not initialized');
      return false;
    }
    
    const validations = [
      this.formFields.basic.validateAll(),
      this.formFields.classSpecific.validateAll(),
      this.formFields.vendor.validateAll(),
      this.formFields.storage.validateAll()
    ];
    
    return validations.every(v => v === true);
  }
  
  getFormData() {
    if (!this.formFields) {
      console.error('Form fields not initialized');
      return {};
    }
    
    // Collect data from all sections
    const basicData = this.formFields.basic.getFormData();
    const classData = this.formFields.classSpecific.getFormData();
    const vendorData = this.formFields.vendor.getFormData();
    const storageData = this.formFields.storage.getFormData();
    
    // Build update object
    const updateData = {
      ...basicData
    };
    
    // Add class-specific fields
    Object.keys(classData).forEach(key => {
      updateData[key] = classData[key];
    });
    
    // Add vendor metadata
    if (Object.keys(vendorData).length > 0) {
      updateData.vendor_metadata = {};
      
      if (vendorData.vendor_cost) {
        updateData.vendor_metadata.cost = vendorData.vendor_cost;
      }
      if (vendorData.vendor_value) {
        updateData.vendor_metadata.value = vendorData.vendor_value;
      }
      if (vendorData.vendor_manufacturer) {
        updateData.vendor_metadata.manufacturer = vendorData.vendor_manufacturer;
      }
      if (vendorData.vendor_store) {
        updateData.vendor_metadata.vendor_store = vendorData.vendor_store;
      }
    }
    
    // Add storage/packing data
    if (Object.keys(storageData).length > 0) {
      updateData.packing_data = {
        ...(this.item.packing_data || {})
      };
      
      if (storageData.storage_tote_id) {
        updateData.packing_data.tote_id = storageData.storage_tote_id;
      }
      if (storageData.storage_location) {
        updateData.packing_data.tote_location = storageData.storage_location;
      }
    }
    
    return updateData;
  }
  
  showFieldError(section, fieldName, message) {
    this.formFields[section]?.showFieldError(fieldName, message);
  }
  
  clearAllErrors() {
    if (!this.formFields) return;
    
    Object.values(this.formFields).forEach(formField => {
      formField.errors = {};
      const formGroups = formField.container?.querySelectorAll('.form-group');
      formGroups?.forEach(group => {
        group.classList.remove('error');
        const errorMsg = group.querySelector('.error-message');
        if (errorMsg) errorMsg.textContent = '';
      });
    });
  }
}