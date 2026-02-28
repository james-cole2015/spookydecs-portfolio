/**
 * CreateWizard Component
 * 3-step vertical progressive disclosure wizard for creating storage units
 * Matches the item creation wizard pattern
 */

import { StorageFormFields } from './StorageFormFields.js';
import STORAGE_CONFIG from '../utils/storage-config.js';
import { showError } from '../shared/toast.js';

export class CreateWizard {
  constructor(options = {}) {
    this.onComplete = options.onComplete || (() => {});
    this.onCancel = options.onCancel || (() => {});
    this.container = null;

    // Wizard state
    this.stepsRevealed = 1;
    this.selectedType = null; // 'Tote' or 'Self'
    this.formData = {};
    this.uploadedPhotoIds = [];

    // Components
    this.formFields = null;
  }

  // --- Render entry point ---

  render(containerElement) {
    this.container = containerElement;

    this.container.innerHTML = `
      <div class="wizard-container--vertical">
        <div class="view-header view-header--wizard">
          <button class="btn-back-wizard" id="btn-back-wizard">← Back</button>
          <h1>Create Storage Unit</h1>
        </div>

        <div id="step-indicator" class="step-indicator"></div>

        <div class="wizard-body" id="wizard-body">
          <div id="wizard-step-1" class="wizard-step"></div>
          <div id="wizard-step-2" class="wizard-step wizard-step--hidden"></div>
          <div id="wizard-step-3" class="wizard-step wizard-step--hidden"></div>
        </div>
      </div>
    `;

    document.getElementById('btn-back-wizard').addEventListener('click', () => this.onCancel());

    this.renderStep1(document.getElementById('wizard-step-1'));
    this.renderStepIndicator();
  }

  // --- Step indicator ---

  renderStepIndicator() {
    const container = document.getElementById('step-indicator');
    if (!container) return;

    const steps = [
      { num: 1, label: 'Type' },
      { num: 2, label: 'Details' },
      { num: 3, label: 'Review' }
    ];

    container.innerHTML = steps.map((step, i) => {
      const isActive = this.stepsRevealed === step.num;
      const isCompleted = this.stepsRevealed > step.num;
      const isUpcoming = this.stepsRevealed < step.num;

      const connector = i < steps.length - 1
        ? `<div class="step-connector ${isCompleted ? 'step-connector--completed' : ''}"></div>`
        : '';

      return `
        <div class="step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''} ${isUpcoming ? 'upcoming' : ''}">
          <div class="step-number">${isCompleted ? '✓' : step.num}</div>
          <div class="step-label">${step.label}</div>
        </div>
        ${connector}
      `;
    }).join('');
  }

  // --- Step reveal / teardown ---

  revealStep(stepNum) {
    const stepEl = document.getElementById(`wizard-step-${stepNum}`);
    if (!stepEl) return;

    stepEl.classList.remove('wizard-step--hidden');
    stepEl.classList.add('wizard-step--revealing');
    stepEl.addEventListener('animationend', () => {
      stepEl.classList.remove('wizard-step--revealing');
    }, { once: true });

    switch (stepNum) {
      case 2: this.renderStep2(stepEl); break;
      case 3: this.renderStep3(stepEl); break;
    }

    this.stepsRevealed = Math.max(this.stepsRevealed, stepNum);
    this.renderStepIndicator();
    this.scrollToStep(stepNum);
  }

  tearDownFrom(stepNum) {
    for (let i = stepNum; i <= 3; i++) {
      const stepEl = document.getElementById(`wizard-step-${i}`);
      if (stepEl) {
        stepEl.classList.add('wizard-step--hidden');
        stepEl.classList.remove('wizard-step--revealing');
        stepEl.innerHTML = '';
      }
    }
    this.stepsRevealed = Math.min(this.stepsRevealed, stepNum - 1);
  }

  scrollToStep(stepNum) {
    const stepEl = document.getElementById(`wizard-step-${stepNum}`);
    if (!stepEl) return;
    requestAnimationFrame(() => {
      stepEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  // --- Step 1: Type Selection ---

  renderStep1(el) {
    el.innerHTML = `
      <div class="step-panel">
        <h2>Choose a storage type</h2>
        <p class="step-description">Select the type of storage unit you want to create</p>

        <div class="type-selector">
          <div class="type-card ${this.selectedType === 'Tote' ? 'selected' : ''}" data-type="Tote">
            <div class="type-icon">📦</div>
            <div class="type-label">Tote</div>
            <div class="type-sublabel">Standardized container for multiple items</div>
          </div>
          <div class="type-card ${this.selectedType === 'Self' ? 'selected' : ''}" data-type="Self">
            <div class="type-icon">📄</div>
            <div class="type-label">Self-Contained</div>
            <div class="type-sublabel">Item stored in its original box</div>
          </div>
        </div>
      </div>
    `;

    el.querySelectorAll('.type-card').forEach(card => {
      card.addEventListener('click', () => this.selectType(card.dataset.type));
    });
  }

  selectType(type) {
    const typeChanged = this.selectedType !== type;
    this.selectedType = type;

    // Update card selection
    document.querySelectorAll('#wizard-step-1 .type-card').forEach(card => {
      card.classList.toggle('selected', card.dataset.type === type);
    });

    if (this.stepsRevealed >= 2 && typeChanged) {
      // Type changed after step 2 was revealed — reset form and re-render step 2
      this.formData = {};
      this.formFields = null;
      this.tearDownFrom(2);
      this.revealStep(2);
    } else if (this.stepsRevealed < 2) {
      this.revealStep(2);
    }
  }

  // --- Step 2: Details Form ---

  async renderStep2(el) {
    const typeName = this.selectedType === 'Tote' ? 'Tote' : 'Self-Contained Unit';

    el.innerHTML = `
      <div class="step-panel">
        <h2>${typeName} Details</h2>
        <p class="step-description">Fill in the details for your storage unit</p>
        <div id="form-fields-container"></div>
        <div class="step-action">
          <button class="btn btn-primary btn-review" id="btn-review">Review →</button>
        </div>
      </div>
    `;

    this.formFields = new StorageFormFields({
      classType: this.selectedType,
      data: this.formData,
      season: this.formData.season,
      onChange: (data) => {
        this.formData = { ...this.formData, ...data };
        if (data.season && this.selectedType === 'Self') {
          this.formFields.setSeason(data.season);
        }
      }
    });

    await this.formFields.render(el.querySelector('#form-fields-container'));

    el.querySelector('#btn-review').addEventListener('click', () => this.handleReview());
  }

  handleReview() {
    if (!this.formFields) return;

    this.formData = { ...this.formData, ...this.formFields.getData() };

    if (!this.formFields.validate()) {
      showError('Please fix the errors before continuing');
      return;
    }

    if (this.stepsRevealed >= 3) {
      // Re-render step 3 with fresh data
      this.tearDownFrom(3);
    }
    this.revealStep(3);
  }

  // --- Step 3: Photo & Review ---

  renderStep3(el) {
    const typeName = this.selectedType === 'Tote' ? 'Tote' : 'Self-Contained Unit';
    const idPreview = this.generateIdPreview();
    const hasPhoto = this.uploadedPhotoIds.length > 0;

    el.innerHTML = `
      <div class="step-panel step-panel--left">
        <h2>Review & Photo</h2>
        <p class="step-description">Confirm your details and optionally add a photo</p>

        <div class="photo-upload-section">
          <h3 class="review-title">Photo <span style="font-weight:400;color:#6b7280">(Optional)</span></h3>
          <p class="upload-description">Add a photo to help identify this storage unit</p>
          <button type="button" class="btn btn-secondary" id="btn-trigger-upload">
            📷 ${hasPhoto ? 'Change Photo' : 'Upload Photo'}
          </button>
          <div class="upload-success ${hasPhoto ? '' : 'hidden'}" id="upload-success">
            ✓ Photo uploaded successfully
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
              <span class="review-value">${this.formData.season || '—'}</span>
            </div>
            <div class="review-item">
              <span class="review-label">Location</span>
              <span class="review-value">${this.formData.location || '—'}</span>
            </div>
            <div class="review-item">
              <span class="review-label">Short Name</span>
              <span class="review-value">${this.formData.short_name || '—'}</span>
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

        <div class="step-action">
          <button class="btn btn-primary btn-create-storage" id="btn-create">
            💾 Create Storage Unit
          </button>
        </div>
      </div>
    `;

    el.querySelector('#btn-trigger-upload').addEventListener('click', () => this.openPhotoUploadModal());
    el.querySelector('#btn-create').addEventListener('click', () => this.complete());
  }

  // --- ID preview ---

  generateIdPreview() {
    if (!this.formData.season) return 'STOR-XXXX-XXX-001';
    const typeCode = STORAGE_CONFIG.CLASS_TYPE_CODES[this.selectedType];
    const seasonCode = STORAGE_CONFIG.SEASON_CODES[this.formData.season];
    return `STOR-${typeCode}-${seasonCode}-001`;
  }

  // --- Photo upload ---

  openPhotoUploadModal() {
    const modal = document.createElement('photo-upload-modal');
    modal.setAttribute('context', 'storage');
    modal.setAttribute('photo-type', 'storage');
    modal.setAttribute('season', (this.formData.season || '').toLowerCase());
    modal.setAttribute('max-photos', '5');
    modal.setAttribute('year', new Date().getFullYear().toString());

    modal.addEventListener('upload-complete', (e) => {
      this.handlePhotoUploadComplete(e.detail);
    });

    modal.addEventListener('upload-cancel', () => {});

    document.body.appendChild(modal);
  }

  handlePhotoUploadComplete(detail) {
    if (detail.photo_ids && detail.photo_ids.length > 0) {
      this.uploadedPhotoIds = detail.photo_ids;

      const successEl = document.getElementById('upload-success');
      if (successEl) successEl.classList.remove('hidden');

      const uploadBtn = document.getElementById('btn-trigger-upload');
      if (uploadBtn) uploadBtn.textContent = '📷 Change Photo';
    }
  }

  // --- Complete ---

  complete() {
    this.onComplete(this.selectedType, this.formData, this.uploadedPhotoIds);
  }
}

export default CreateWizard;
