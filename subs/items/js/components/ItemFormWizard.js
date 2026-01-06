// Item Form Wizard Component
// Manages wizard state, navigation, and orchestration

import { ItemFormSteps } from './ItemFormSteps.js';
import { ItemFormFields } from './ItemFormFields.js';
import { PhotoUploader } from './PhotoUploader.js';
import { toast } from '../shared/toast.js';

export class ItemFormWizard {
  constructor(mode = 'create', originalItem = null) {
    this.mode = mode;
    this.currentStep = mode === 'edit' ? 3 : 1;
    this.originalItem = originalItem;
    this.formData = this.initializeFormData();
    this.photoUploader = null;
  }
  
  initializeFormData() {
    if (this.mode === 'edit' && this.originalItem) {
      return {
        ...this.originalItem,
        class: this.originalItem.class,
        class_type: this.originalItem.class_type
      };
    }
    
    return {
      class: '',
      class_type: '',
      season: '',
      status: 'Active'
    };
  }
  
  // Main render method
  render() {
    this.updatePageTitle();
    this.renderStepIndicator();
    this.renderStepContent();
    this.renderStepActions();
  }
  
  updatePageTitle() {
    const titleEl = document.getElementById('form-title');
    if (titleEl) {
      if (this.mode === 'create') {
        titleEl.textContent = 'Create New Item';
      } else {
        titleEl.textContent = `Edit Item: ${this.originalItem.short_name}`;
      }
    }
  }
  
  renderStepIndicator() {
    const container = document.getElementById('step-indicator');
    if (!container) return;
    
    const steps = this.mode === 'create' 
      ? [
          { num: 1, label: 'Class' },
          { num: 2, label: 'Type' },
          { num: 3, label: 'Details' },
          { num: 4, label: 'Preview' }
        ]
      : [
          { num: 3, label: 'Details' },
          { num: 4, label: 'Preview' }
        ];
    
    container.innerHTML = steps.map(step => `
      <div class="step ${this.currentStep === step.num ? 'active' : ''} ${this.currentStep > step.num ? 'completed' : ''}">
        <div class="step-number">${step.num === 4 ? '✓' : step.num}</div>
        <div class="step-label">${step.label}</div>
      </div>
    `).join('<div class="step-connector"></div>');
  }
  
  renderStepContent() {
    const container = document.getElementById('step-content');
    if (!container) return;
    
    container.innerHTML = '';
    
    const stepRenderer = new ItemFormSteps(this);
    let stepElement;
    
    switch (this.currentStep) {
      case 1:
        stepElement = stepRenderer.renderStep1();
        break;
      case 2:
        stepElement = stepRenderer.renderStep2();
        break;
      case 3:
        stepElement = stepRenderer.renderStep3();
        break;
      case 4:
        stepElement = stepRenderer.renderStep4();
        break;
    }
    
    if (stepElement) {
      container.appendChild(stepElement);
    }
  }
  
  renderStepActions() {
    const container = document.getElementById('step-actions');
    if (!container) return;
    
    const canGoBack = this.mode === 'create' ? this.currentStep > 1 : this.currentStep > 3;
    const canGoNext = this.mode === 'create' ? this.currentStep < 4 : this.currentStep < 4;
    const isLastStep = this.currentStep === 4;
    
    container.innerHTML = `
      <button 
        class="btn-secondary" 
        onclick="itemFormPage.handleCancel()"
      >
        Cancel
      </button>
      
      <div class="action-buttons-right">
        ${canGoBack ? `
          <button 
            class="btn-secondary" 
            onclick="itemFormPage.wizard.previousStep()"
          >
            ← Previous
          </button>
        ` : ''}
        
        ${canGoNext && !isLastStep ? `
          <button 
            class="btn-primary" 
            onclick="itemFormPage.wizard.nextStep()"
          >
            Next →
          </button>
        ` : ''}
        
        ${isLastStep ? `
          <button 
            class="btn-primary btn-save" 
            onclick="itemFormPage.handleSave()"
          >
            💾 Save Item
          </button>
        ` : ''}
      </div>
    `;
  }
  
  // Navigation methods
  nextStep() {
    if (!this.validateCurrentStep()) {
      return;
    }
    
    this.collectFormData();
    
    if (this.mode === 'create') {
      if (this.currentStep === 1 && !this.formData.class) return;
      if (this.currentStep === 2 && !this.formData.class_type) return;
    }
    
    this.currentStep++;
    this.render();
  }
  
  previousStep() {
    this.collectFormData();
    this.currentStep--;
    this.render();
  }
  
  // Validation
  validateCurrentStep() {
    if (this.currentStep === 1 && !this.formData.class) {
      toast.warning('Selection Required', 'Please select an item class');
      return false;
    }
    
    if (this.currentStep === 2 && !this.formData.class_type) {
      toast.warning('Selection Required', 'Please select a class type');
      return false;
    }
    
    if (this.currentStep === 3) {
      const basicFields = new ItemFormFields('basic-fields');
      const specificFields = new ItemFormFields('specific-fields');
      const vendorFields = new ItemFormFields('vendor-fields');
      
      const allValid = basicFields.validateAll() && 
                       specificFields.validateAll() && 
                       vendorFields.validateAll();
      
      if (!allValid) {
        toast.error('Validation Error', 'Please fix the errors in the form');
        return false;
      }
    }
    
    return true;
  }
  
  collectFormData() {
    if (this.currentStep === 3) {
      const containers = ['basic-fields', 'specific-fields', 'vendor-fields', 'storage-fields'];
      
      containers.forEach(containerId => {
        const fields = new ItemFormFields(containerId);
        const data = fields.getFormData();
        this.formData = { ...this.formData, ...data };
      });
    }
  }
  
  // Selection handlers
  selectClass(className) {
    this.formData.class = className;
    this.formData.class_type = '';
    this.renderStepContent();
  }
  
  selectClassType(classType) {
    this.formData.class_type = classType;
    this.renderStepContent();
  }
  
  // Data preparation for API
  prepareItemData() {
    const data = {
      class: this.formData.class,
      class_type: this.formData.class_type,
      short_name: this.formData.short_name,
      season: this.formData.season,
      status: this.formData.status || 'Active'
    };
    
    // Optional fields
    if (this.formData.date_acquired) data.date_acquired = this.formData.date_acquired;
    if (this.formData.general_notes) data.general_notes = this.formData.general_notes;
    
    // Class-specific fields
    if (this.formData.height_length) data.height_length = this.formData.height_length;
    if (this.formData.stakes) data.stakes = this.formData.stakes;
    if (this.formData.tethers) data.tethers = this.formData.tethers;
    if (this.formData.color) data.color = this.formData.color;
    if (this.formData.bulb_type) data.bulb_type = this.formData.bulb_type;
    if (this.formData.length) data.length = this.formData.length;
    if (this.formData.male_ends) data.male_ends = this.formData.male_ends;
    if (this.formData.female_ends) data.female_ends = this.formData.female_ends;
    if (this.formData.watts) data.watts = this.formData.watts;
    if (this.formData.amps) data.amps = this.formData.amps;
    if (this.formData.adapter) data.adapter = this.formData.adapter;
    if (this.formData.power_inlet !== undefined) data.power_inlet = this.formData.power_inlet;
    
    // Vendor metadata
    if (this.formData.vendor_cost) data.cost = this.formData.vendor_cost;
    if (this.formData.vendor_value) data.value = this.formData.vendor_value;
    if (this.formData.vendor_manufacturer) data.manufacturer = this.formData.vendor_manufacturer;
    if (this.formData.vendor_store) data.vendor_store = this.formData.vendor_store;
    
    // Storage data
    if (this.formData.storage_tote_id) data.tote_id = this.formData.storage_tote_id;
    if (this.formData.storage_location) data.tote_location = this.formData.storage_location;
    
    return data;
  }
  
  cleanup() {
    this.photoUploader = null;
    this.formData = {};
  }
}