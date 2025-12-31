/**
 * CreateWizard Component
 * 3-step wizard for creating storage units (Tote or Self-contained)
 */

import { StorageFormFields } from './StorageFormFields.js';
import STORAGE_CONFIG from '../utils/storage-config.js';

export class CreateWizard {
  constructor(options = {}) {
    this.onComplete = options.onComplete || (() => {});
    this.onCancel = options.onCancel || (() => {});
    this.container = null;
    
    // Wizard state
    this.currentStep = 1;
    this.selectedType = null; // 'Tote' or 'Self'
    this.formData = {};
    this.photoData = null;
    
    // Components
    this.formFields = null;
  }

  /**
   * Render the wizard
   */
  render(containerElement) {
    this.container = containerElement;
    
    const wizard = document.createElement('div');
    wizard.className = 'wizard-container';
    
    wizard.innerHTML = `
      <div class="wizard-header">
        <h1 class="wizard-title">Create Storage Unit</h1>
        <p class="wizard-subtitle">Follow the steps to create a new storage unit</p>
      </div>
      
      <div class="wizard-progress" id="wizard-progress"></div>
      
      <div class="wizard-body" id="wizard-body"></div>
      
      <div class="wizard-footer">
        <button class="btn btn-secondary" id="btn-cancel">Cancel</button>
        <div style="flex: 1"></div>
        <button class="btn btn-secondary hidden" id="btn-prev">← Previous</button>
        <button class="btn btn-primary" id="btn-next">Next →</button>
      </div>
    `;
    
    this.container.innerHTML = '';
    this.container.appendChild(wizard);
    
    // Render initial step
    this.renderProgress();
    this.renderStep();
    
    // Attach event listeners
    this.attachEventListeners();
  }

  /**
   * Render progress indicator
   */
  renderProgress() {
    const progressContainer = this.container.querySelector('#wizard-progress');
    const steps = STORAGE_CONFIG.WIZARD_STEPS.create;
    
    progressContainer.innerHTML = steps.map((step, index) => {
      const stepNum = index + 1;
      const isActive = stepNum === this.currentStep;
      const isCompleted = stepNum < this.currentStep;
      
      return `
        <div class="progress-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}">
          <div class="step-indicator">${isCompleted ? '✓' : stepNum}</div>
          <div class="step-label">${step.label}</div>
        </div>
      `;
    }).join('');
  }

  /**
   * Render current step
   */
  renderStep() {
    const bodyContainer = this.container.querySelector('#wizard-body');
    
    switch (this.currentStep) {
      case 1:
        this.renderStep1(bodyContainer);
        break;
      case 2:
        this.renderStep2(bodyContainer);
        break;
      case 3:
        this.renderStep3(bodyContainer);
        break;
    }
    
    this.updateButtons();
  }

  /**
   * Step 1: Choose Type
   */
  renderStep1(container) {
    container.innerHTML = `
      <div class="wizard-step active">
        
        <div class="type-selection">
          <div class="type-option ${this.selectedType === 'Tote' ? 'selected' : ''}" data-type="Tote">
            <div class="type-icon">📦</div>
            <h3 class="type-title">Tote</h3>
            <p class="type-description">Standardized storage container for multiple items</p>
          </div>
          
          <div class="type-option ${this.selectedType === 'Self' ? 'selected' : ''}" data-type="Self">
            <div class="type-icon">📄</div>
            <h3 class="type-title">Self-Contained</h3>
            <p class="type-description">Item stored in its original box or packaging</p>
          </div>
        </div>
      </div>
    `;
    
    // Type selection click handlers
    const typeOptions = container.querySelectorAll('.type-option');
    typeOptions.forEach(option => {
      option.addEventListener('click', () => {
        this.selectedType = option.dataset.type;
        
        // Update UI
        typeOptions.forEach(opt => opt.classList.remove('selected'));
        option.classList.add('selected');
      });
    });
  }

  /**
   * Step 2: Basic Info
   */
  async renderStep2(container) {
    const typeName = this.selectedType === 'Tote' ? 'Tote' : 'Self-Contained Unit';
    
    container.innerHTML = `
      <div class="wizard-step active">
        <h2 class="mb-lg">Basic Information - ${typeName}</h2>
        <div id="form-fields-container"></div>
      </div>
    `;
    
    // Initialize form fields
    this.formFields = new StorageFormFields({
      classType: this.selectedType,
      data: this.formData,
      season: this.formData.season,
      onChange: (data) => {
        this.formData = { ...this.formData, ...data };
        
        // Update season for item filtering in self-contained
        if (data.season && this.selectedType === 'Self') {
          this.formFields.setSeason(data.season);
        }
      }
    });
    
    await this.formFields.render(container.querySelector('#form-fields-container'));
  }

  /**
   * Step 3: Photo & Review
   */
  renderStep3(container) {
    const typeName = this.selectedType === 'Tote' ? 'Tote' : 'Self-Contained Unit';
    
    // Generate ID preview
    const idPreview = this.generateIdPreview();
    
    container.innerHTML = `
      <div class="wizard-step active">
        <h2 class="mb-lg">Review & Photo</h2>
        
        <div class="photo-upload-section">
          <h3 class="review-title">Photo (Optional)</h3>
          <div id="photo-uploader-container">
            <p class="form-help mb-md">You can add a photo now or later when editing the storage unit.</p>
            <div id="photo-uploader"></div>
          </div>
        </div>
        
        <div class="review-section">
          <h3 class="review-title">Review Details</h3>
          
          <div class="review-grid">
            <div class="review-item">
              <span class="review-label">Generated ID</span>
              <span class="review-value"><code>${idPreview}</code></span>
            </div>
            
            <div class="review-item">
              <span class="review-label">Type</span>
              <span class="review-value">${typeName}</span>
            </div>
            
            <div class="review-item">
              <span class="review-label">Season</span>
              <span class="review-value">${this.formData.season || '-'}</span>
            </div>
            
            <div class="review-item">
              <span class="review-label">Location</span>
              <span class="review-value">${this.formData.location || '-'}</span>
            </div>
            
            <div class="review-item">
              <span class="review-label">Short Name</span>
              <span class="review-value">${this.formData.short_name || '-'}</span>
            </div>
            
            ${this.formData.size ? `
              <div class="review-item">
                <span class="review-label">Size</span>
                <span class="review-value">${this.formData.size}</span>
              </div>
            ` : ''}
            
            ${this.formData.item_id ? `
              <div class="review-item">
                <span class="review-label">Item</span>
                <span class="review-value"><code>${this.formData.item_id}</code></span>
              </div>
            ` : ''}
            
            ${this.formData.general_notes ? `
              <div class="review-item" style="grid-column: 1 / -1;">
                <span class="review-label">Notes</span>
                <span class="review-value">${this.formData.general_notes}</span>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `;
    
    // Initialize PhotoUploader from assets
    this.initPhotoUploader();
  }

  /**
   * Initialize PhotoUploader component
   */
  async initPhotoUploader() {
    try {
      // Import PhotoUploader from assets
      const { PhotoUploader } = await import('https://assets.spookydecs.com/components/PhotoUploader.js');
      
      const uploaderContainer = this.container.querySelector('#photo-uploader');
      
      const photoUploader = new PhotoUploader({
        onUpload: (photoData) => {
          this.photoData = photoData;
        },
        onRemove: () => {
          this.photoData = null;
        }
      });
      
      photoUploader.render(uploaderContainer);
    } catch (error) {
      console.error('Error loading PhotoUploader:', error);
      const uploaderContainer = this.container.querySelector('#photo-uploader');
      uploaderContainer.innerHTML = '<p class="form-help">Photo upload unavailable</p>';
    }
  }

  /**
   * Generate ID preview
   */
  generateIdPreview() {
    if (!this.formData.season) {
      return 'STOR-XXXX-XXX-001';
    }
    
    const typeCode = STORAGE_CONFIG.CLASS_TYPE_CODES[this.selectedType];
    const seasonCode = STORAGE_CONFIG.SEASON_CODES[this.formData.season];
    
    return `STOR-${typeCode}-${seasonCode}-001`;
  }

  /**
   * Update button states
   */
  updateButtons() {
    const prevBtn = this.container.querySelector('#btn-prev');
    const nextBtn = this.container.querySelector('#btn-next');
    
    // Previous button
    if (this.currentStep === 1) {
      prevBtn.classList.add('hidden');
    } else {
      prevBtn.classList.remove('hidden');
    }
    
    // Next button
    if (this.currentStep === 3) {
      nextBtn.textContent = 'Create Storage Unit';
      nextBtn.className = 'btn btn-primary';
    } else {
      nextBtn.textContent = 'Next →';
      nextBtn.className = 'btn btn-primary';
    }
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    const cancelBtn = this.container.querySelector('#btn-cancel');
    const prevBtn = this.container.querySelector('#btn-prev');
    const nextBtn = this.container.querySelector('#btn-next');
    
    cancelBtn.addEventListener('click', () => this.onCancel());
    prevBtn.addEventListener('click', () => this.previousStep());
    nextBtn.addEventListener('click', () => this.nextStep());
  }

  /**
   * Next step
   */
  nextStep() {
    // Validate current step
    if (!this.validateStep()) {
      return;
    }
    
    if (this.currentStep === 3) {
      // Final step - create storage unit
      this.complete();
    } else {
      this.currentStep++;
      this.renderProgress();
      this.renderStep();
    }
  }

  /**
   * Previous step
   */
  previousStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.renderProgress();
      this.renderStep();
    }
  }

  /**
   * Validate current step
   */
  validateStep() {
    switch (this.currentStep) {
      case 1:
        if (!this.selectedType) {
          alert('Please select a storage type');
          return false;
        }
        return true;
      
      case 2:
        if (!this.formFields) {
          return false;
        }
        
        // Get form data
        this.formData = { ...this.formData, ...this.formFields.getData() };
        
        // Validate
        return this.formFields.validate();
      
      case 3:
        return true;
      
      default:
        return true;
    }
  }

  /**
   * Complete wizard
   */
  complete() {
    // Build final data
    const finalData = {
      ...this.formData,
      images: this.photoData || {}
    };
    
    this.onComplete(this.selectedType, finalData);
  }
}

export default CreateWizard;
