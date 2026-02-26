// Item Form Wizard Component
// Vertical progressive wizard for item creation (create-only)

import { ItemFormSteps } from './ItemFormSteps.js';
import { ItemFormFields } from './ItemFormFields.js';
import { toast } from '../shared/toast.js';

export class ItemFormWizard {
  constructor() {
    this.formData = {
      class: '',
      class_type: '',
      season: '',
      status: 'Packed'
    };
    this.stepsRevealed = 1;
    this.steps = new ItemFormSteps(this);
  }

  // --- Render entry point ---

  render() {
    this.steps.renderStep1(document.getElementById('wizard-step-1'));
    this.renderStepIndicator();
  }

  // --- Step indicator ---

  renderStepIndicator() {
    const container = document.getElementById('step-indicator');
    if (!container) return;

    const steps = [
      { num: 1, label: 'Class' },
      { num: 2, label: 'Type' },
      { num: 3, label: 'Details' },
      { num: 4, label: 'Review' }
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

  // --- Selection handlers (called from onclick) ---

  selectClass(className) {
    const classChanged = this.formData.class !== className;
    this.formData.class = className;

    // Update card selection in step 1
    document.querySelectorAll('#wizard-step-1 .class-card').forEach(card => {
      card.classList.toggle('selected', card.dataset.className === className);
    });

    if (this.stepsRevealed >= 2 && classChanged) {
      // Class changed after step 2 was revealed — reset type and re-render step 2
      this.formData.class_type = '';
      this.tearDownFrom(3);
      this.steps.renderStep2(document.getElementById('wizard-step-2'));
      this.stepsRevealed = 2;
      this.renderStepIndicator();
      this.scrollToStep(2);
    } else if (this.stepsRevealed < 2) {
      // First time selecting a class — reveal step 2
      this.revealStep(2);
    }
  }

  selectClassType(classType) {
    const typeChanged = this.formData.class_type !== classType;
    this.formData.class_type = classType;

    // Update card selection in step 2
    document.querySelectorAll('#wizard-step-2 .type-card').forEach(card => {
      card.classList.toggle('selected', card.dataset.classType === classType);
    });

    if (this.stepsRevealed >= 3 && typeChanged) {
      // Type changed after step 3 was revealed — re-render step 3
      this.tearDownFrom(4);
      this.steps.renderStep3(document.getElementById('wizard-step-3'));
      this.stepsRevealed = 3;
      this.renderStepIndicator();
      this.scrollToStep(3);
    } else if (this.stepsRevealed < 3) {
      // First time selecting a type — reveal step 3
      this.revealStep(3);
    }
  }

  // --- Review handler (called from item-form.js) ---

  handleReview() {
    if (!this.validateStep3()) return;
    this.collectFormData();
    this.revealStep(4);
  }

  validateStep3() {
    const containers = ['basic-fields', 'specific-fields', 'vendor-fields', 'storage-fields'];
    const allValid = containers.every(id => {
      const fields = new ItemFormFields(id);
      return fields.validateAll();
    });

    if (!allValid) {
      toast.error('Validation Error', 'Please fix the errors in the form');
    }
    return allValid;
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
      case 2: this.steps.renderStep2(stepEl); break;
      case 3: this.steps.renderStep3(stepEl); break;
      case 4: this.steps.renderStep4(stepEl); break;
    }

    this.stepsRevealed = Math.max(this.stepsRevealed, stepNum);
    this.renderStepIndicator();
    this.scrollToStep(stepNum);
  }

  tearDownFrom(stepNum) {
    for (let i = stepNum; i <= 4; i++) {
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
      stepEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  // --- Data collection / preparation ---

  collectFormData() {
    const containers = ['basic-fields', 'specific-fields', 'vendor-fields', 'storage-fields'];
    containers.forEach(containerId => {
      const fields = new ItemFormFields(containerId);
      const data = fields.getFormData();
      this.formData = { ...this.formData, ...data };
    });
  }

  prepareItemData() {
    const data = {
      type: this.formData.class,
      category: this.formData.class_type,
      shortName: this.formData.short_name,
      season: this.formData.season,
      status: 'Packed'
    };

    if (this.formData.date_acquired) data.dateAcquired = this.formData.date_acquired;
    if (this.formData.general_notes) data.generalNotes = this.formData.general_notes;

    if (this.formData.height_length) data.heightLength = this.formData.height_length;
    if (this.formData.stakes) data.stakes = this.formData.stakes;
    if (this.formData.tethers) data.tethers = this.formData.tethers;
    if (this.formData.color) data.color = this.formData.color;
    if (this.formData.bulb_type) data.bulbType = this.formData.bulb_type;
    if (this.formData.length) data.length = this.formData.length;
    if (this.formData.male_ends) data.maleEnds = this.formData.male_ends;
    if (this.formData.female_ends) data.femaleEnds = this.formData.female_ends;
    if (this.formData.watts) data.watts = this.formData.watts;
    if (this.formData.amps) data.amps = this.formData.amps;
    if (this.formData.adapter) data.adapter = this.formData.adapter;
    if (this.formData.power_inlet !== undefined) data.powerInlet = this.formData.power_inlet;

    if (this.formData.vendor_cost) data.cost = this.formData.vendor_cost;
    if (this.formData.vendor_value) data.value = this.formData.vendor_value;
    if (this.formData.vendor_manufacturer) data.manufacturer = this.formData.vendor_manufacturer;
    if (this.formData.vendor_store) data.vendorStore = this.formData.vendor_store;

    if (this.formData.storage_tote_id) data.toteId = this.formData.storage_tote_id;
    if (this.formData.storage_location) data.toteLocation = this.formData.storage_location;

    return data;
  }

  cleanup() {
    this.formData = {};
  }
}
