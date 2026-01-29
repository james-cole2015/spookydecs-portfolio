// ItemFormFields Component
// Generates dynamic form fields based on class and class_type

import {
  CLASS_TYPE_ATTRIBUTES,
  FIELD_METADATA,
  SEASONS,
  ITEM_STATUS
} from '../utils/item-config.js';

export class ItemFormFields {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.formData = {};
    this.errors = {};
  }
  
  renderBasicFields(data = {}) {
    if (!this.container) return;
    
    this.formData = { ...data };
    
    const fields = document.createElement('div');
    fields.className = 'form-fields';
    
    // Short Name
    fields.appendChild(this.createTextField(
      'short_name',
      'Item Name',
      this.formData.short_name || '',
      true,
      'Enter a descriptive name'
    ));
    
    // Season
    fields.appendChild(this.createSelectField(
      'season',
      'Season',
      SEASONS.map(s => s.value),
      this.formData.season || '',
      true
    ));

    // Status (for edit mode, create always defaults to Active)
    if (data.status) {
      fields.appendChild(this.createSelectField(
        'status',
        'Status',
        ITEM_STATUS.map(s => s.value),
        this.formData.status || 'Active',
        true
      ));
    }
    
    // Date Acquired
    fields.appendChild(this.createTextField(
      'date_acquired',
      'Date Acquired',
      this.formData.date_acquired || '',
      false,
      'Year (e.g., 2023)'
    ));
    
    // General Notes
    fields.appendChild(this.createTextAreaField(
      'general_notes',
      'Notes',
      this.formData.general_notes || '',
      false,
      'Any additional notes'
    ));
    
    this.container.innerHTML = '';
    this.container.appendChild(fields);
  }
  
  renderClassSpecificFields(classType, data = {}) {
    if (!this.container) return;
    
    this.formData = { ...this.formData, ...data };
    
    const fields = document.createElement('div');
    fields.className = 'form-fields';
    
    const attributes = CLASS_TYPE_ATTRIBUTES[classType]?.fields || [];
    
    if (attributes.length === 0) {
      fields.innerHTML = '<div class="no-fields-message">No additional fields for this type</div>';
      this.container.appendChild(fields);
      return;
    }
    
    attributes.forEach(attr => {
      const value = this.formData[attr] || '';
      const isNumeric = this.isNumericField(attr);

      fields.appendChild(this.createTextField(
        attr,
        FIELD_METADATA[attr]?.label || attr,
        value,
        false,
        isNumeric ? 'Enter a number' : '',
        isNumeric
      ));
    });
    
    this.container.innerHTML = '';
    this.container.appendChild(fields);
  }
  
  renderVendorFields(data = {}) {
    if (!this.container) return;
    
    const vendorData = data.vendor_metadata || {};
    
    const fields = document.createElement('div');
    fields.className = 'form-fields';
    
    fields.appendChild(this.createTextField(
      'vendor_cost',
      'Cost',
      vendorData.cost || '',
      false,
      'Purchase price',
      true
    ));
    
    fields.appendChild(this.createTextField(
      'vendor_value',
      'Current Value',
      vendorData.value || '',
      false,
      'Estimated current value',
      true
    ));
    
    fields.appendChild(this.createTextField(
      'vendor_manufacturer',
      'Manufacturer',
      vendorData.manufacturer || '',
      false,
      'Brand or manufacturer'
    ));
    
    fields.appendChild(this.createTextField(
      'vendor_store',
      'Store',
      vendorData.vendor_store || '',
      false,
      'Where purchased'
    ));
    
    this.container.innerHTML = '';
    this.container.appendChild(fields);
  }
  
  renderStorageFields(data = {}) {
    if (!this.container) return;
    
    const packingData = data.packing_data || {};
    
    const fields = document.createElement('div');
    fields.className = 'form-fields';
    
    fields.appendChild(this.createTextField(
      'storage_tote_id',
      'Storage Tote ID',
      packingData.tote_id || '',
      false,
      'e.g., TOTE 004'
    ));
    
    fields.appendChild(this.createTextField(
      'storage_location',
      'Storage Location',
      packingData.tote_location || '',
      false,
      'e.g., Shed, Crawl Space'
    ));
    
    this.container.innerHTML = '';
    this.container.appendChild(fields);
  }
  
  createTextField(name, label, value, required, placeholder = '', isNumeric = false) {
    const formGroup = document.createElement('div');
    formGroup.className = 'form-group';
    formGroup.dataset.fieldName = name;
    
    const labelEl = document.createElement('label');
    labelEl.setAttribute('for', name);
    labelEl.innerHTML = `${label} ${required ? '<span class="required">*</span>' : ''}`;
    
    const input = document.createElement('input');
    input.type = 'text';
    input.id = name;
    input.name = name;
    input.value = value;
    input.placeholder = placeholder;
    if (required) input.required = true;
    
    // Add validation on blur for numeric fields
    if (isNumeric) {
      input.addEventListener('blur', () => {
        this.validateNumericField(name, input.value);
      });
    }
    
    // Clear error on input
    input.addEventListener('input', () => {
      this.clearFieldError(name);
    });
    
    const errorMsg = document.createElement('div');
    errorMsg.className = 'error-message';
    
    formGroup.appendChild(labelEl);
    formGroup.appendChild(input);
    formGroup.appendChild(errorMsg);
    
    // Show existing error if any
    if (this.errors[name]) {
      this.showFieldError(name, this.errors[name]);
    }
    
    return formGroup;
  }
  
  createTextAreaField(name, label, value, required, placeholder = '') {
    const formGroup = document.createElement('div');
    formGroup.className = 'form-group';
    formGroup.dataset.fieldName = name;
    
    const labelEl = document.createElement('label');
    labelEl.setAttribute('for', name);
    labelEl.innerHTML = `${label} ${required ? '<span class="required">*</span>' : ''}`;
    
    const textarea = document.createElement('textarea');
    textarea.id = name;
    textarea.name = name;
    textarea.value = value;
    textarea.placeholder = placeholder;
    textarea.rows = 4;
    if (required) textarea.required = true;
    
    textarea.addEventListener('input', () => {
      this.clearFieldError(name);
    });
    
    const errorMsg = document.createElement('div');
    errorMsg.className = 'error-message';
    
    formGroup.appendChild(labelEl);
    formGroup.appendChild(textarea);
    formGroup.appendChild(errorMsg);
    
    return formGroup;
  }
  
  createSelectField(name, label, options, value, required) {
    const formGroup = document.createElement('div');
    formGroup.className = 'form-group';
    formGroup.dataset.fieldName = name;
    
    const labelEl = document.createElement('label');
    labelEl.setAttribute('for', name);
    labelEl.innerHTML = `${label} ${required ? '<span class="required">*</span>' : ''}`;
    
    const select = document.createElement('select');
    select.id = name;
    select.name = name;
    if (required) select.required = true;
    
    // Add empty option
    const emptyOption = document.createElement('option');
    emptyOption.value = '';
    emptyOption.textContent = `Select ${label}`;
    select.appendChild(emptyOption);
    
    // Add options
    options.forEach(opt => {
      const option = document.createElement('option');
      option.value = opt;
      option.textContent = opt;
      if (opt === value) option.selected = true;
      select.appendChild(option);
    });
    
    select.addEventListener('change', () => {
      this.clearFieldError(name);
    });
    
    const errorMsg = document.createElement('div');
    errorMsg.className = 'error-message';
    
    formGroup.appendChild(labelEl);
    formGroup.appendChild(select);
    formGroup.appendChild(errorMsg);
    
    return formGroup;
  }
  
  isNumericField(fieldName) {
    const numericFields = [
      'stakes', 'tethers', 'height_length', 'length', 
      'male_ends', 'female_ends', 'watts', 'amps',
      'vendor_cost', 'vendor_value'
    ];
    return numericFields.includes(fieldName);
  }
  
  validateNumericField(name, value) {
    if (!value || value.trim() === '') {
      this.clearFieldError(name);
      return true;
    }
    
    const cleanValue = value.replace(/[$,\s]/g, '');
    
    if (isNaN(cleanValue) || cleanValue === '') {
      this.showFieldError(name, 'Must be a valid number');
      return false;
    }
    
    this.clearFieldError(name);
    return true;
  }
  
  showFieldError(name, message) {
    this.errors[name] = message;
    
    const formGroup = this.container?.querySelector(`[data-field-name="${name}"]`);
    if (formGroup) {
      formGroup.classList.add('error');
      const errorMsg = formGroup.querySelector('.error-message');
      if (errorMsg) {
        errorMsg.textContent = message;
      }
    }
  }
  
  clearFieldError(name) {
    delete this.errors[name];
    
    const formGroup = this.container?.querySelector(`[data-field-name="${name}"]`);
    if (formGroup) {
      formGroup.classList.remove('error');
      const errorMsg = formGroup.querySelector('.error-message');
      if (errorMsg) {
        errorMsg.textContent = '';
      }
    }
  }
  
  validateAll() {
    this.errors = {};
    
    // Validate required fields
    const requiredInputs = this.container?.querySelectorAll('[required]');
    requiredInputs?.forEach(input => {
      if (!input.value || input.value.trim() === '') {
        this.showFieldError(input.name, 'This field is required');
      }
    });
    
    // Validate numeric fields
    const inputs = this.container?.querySelectorAll('input[type="text"]');
    inputs?.forEach(input => {
      if (this.isNumericField(input.name) && input.value.trim() !== '') {
        this.validateNumericField(input.name, input.value);
      }
    });
    
    return Object.keys(this.errors).length === 0;
  }
  
  getFormData() {
    const data = {};
    
    const inputs = this.container?.querySelectorAll('input, select, textarea');
    inputs?.forEach(input => {
      if (input.value && input.value.trim() !== '') {
        data[input.name] = input.value.trim();
      }
    });
    
    return data;
  }
}
