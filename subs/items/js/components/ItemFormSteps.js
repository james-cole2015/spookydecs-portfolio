// Item Form Steps Component
// Renders content into each vertical wizard step

import { CLASS_HIERARCHY } from '../utils/item-config.js';
import { ItemFormFields } from './ItemFormFields.js';

export class ItemFormSteps {
  constructor(wizard) {
    this.wizard = wizard;
  }

  // Step 1: Select Class
  renderStep1(stepEl) {
    if (!stepEl) return;

    stepEl.innerHTML = `
      <div class="step-panel">
        <h2>Select Item Class</h2>
        <p class="step-description">Choose the primary category for your item</p>
        <div class="class-selector">
          ${Object.keys(CLASS_HIERARCHY).map(className => `
            <div
              class="class-card ${this.wizard.formData.class === className ? 'selected' : ''}"
              data-class-name="${className}"
              onclick="itemFormPage.wizard.selectClass('${className}')"
            >
              <div class="class-icon">${this.getClassIcon(className)}</div>
              <div class="class-label">${className}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // Step 2: Select Class Type
  renderStep2(stepEl) {
    if (!stepEl) return;

    const selectedClass = this.wizard.formData.class;
    const types = CLASS_HIERARCHY[selectedClass]?.types || [];

    stepEl.innerHTML = `
      <div class="step-panel">
        <h2>Select ${selectedClass} Type</h2>
        <p class="step-description">Choose the specific type of ${selectedClass.toLowerCase()}</p>
        <div class="type-selector">
          ${types.map(type => `
            <div
              class="type-card ${this.wizard.formData.class_type === type ? 'selected' : ''}"
              data-class-type="${type}"
              onclick="itemFormPage.wizard.selectClassType('${type}')"
            >
              <div class="type-icon">${this.getTypeIcon(type)}</div>
              <div class="type-label">${type}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // Step 3: Details form
  renderStep3(stepEl) {
    if (!stepEl) return;

    const { class: itemClass, class_type } = this.wizard.formData;

    stepEl.innerHTML = `
      <div class="step-panel">
        <h2>Item Details</h2>
        <p class="step-description">Fill in the details for your ${class_type || 'item'}</p>

        <div class="form-section">
          <h3 class="section-title">Basic Information</h3>
          <div id="basic-fields"></div>
        </div>

        <div class="form-section">
          <h3 class="section-title">${itemClass} Specific Details</h3>
          <div id="specific-fields"></div>
        </div>

        <div class="form-section">
          <h3 class="section-title">Vendor Information</h3>
          <div id="vendor-fields"></div>
        </div>

        <div class="form-section">
          <h3 class="section-title">Storage Information</h3>
          <div id="storage-fields"></div>
        </div>

        <div class="step-review-action">
          <button class="btn-primary btn-review" onclick="itemFormPage.handleReview()">
            Review →
          </button>
        </div>
      </div>
    `;

    setTimeout(() => this.renderFormFields(), 0);
  }

  renderFormFields() {
    // Pass formData without status so the status dropdown is not shown in create mode
    const dataForBasic = { ...this.wizard.formData, status: undefined };

    const basicFields = new ItemFormFields('basic-fields');
    basicFields.renderBasicFields(dataForBasic);

    const specificFields = new ItemFormFields('specific-fields');
    specificFields.renderClassSpecificFields(
      this.wizard.formData.class_type,
      this.wizard.formData
    );

    const vendorFields = new ItemFormFields('vendor-fields');
    vendorFields.renderVendorFields(this.wizard.formData);

    const storageFields = new ItemFormFields('storage-fields');
    storageFields.renderStorageFields(this.wizard.formData);
  }

  // Step 4: Preview + Save
  renderStep4(stepEl) {
    if (!stepEl) return;

    const data = this.wizard.formData;

    stepEl.innerHTML = `
      <div class="step-panel">
        <h2>Review & Confirm</h2>
        <p class="step-description">Review all details before creating the item</p>

        <div class="preview-card">
          <div class="preview-header">
            <div class="preview-title">
              <span class="preview-icon">${this.getClassIcon(data.class)}</span>
              ${data.short_name || 'Unnamed Item'}
            </div>
            <div class="preview-class">${data.class} — ${data.class_type}</div>
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
                  <span class="preview-value">Packed</span>
                </div>
                ${data.date_acquired ? `
                  <div class="preview-field">
                    <span class="preview-label">Date Acquired:</span>
                    <span class="preview-value">${data.date_acquired}</span>
                  </div>
                ` : ''}
              </div>
              ${data.general_notes ? `<p class="preview-notes">${data.general_notes}</p>` : ''}
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

        <div class="step-save-action">
          <button class="btn-primary btn-save" onclick="itemFormPage.handleSave()">
            💾 Save Item
          </button>
        </div>
      </div>
    `;
  }

  renderClassSpecificPreview(data) {
    const fields = [];

    if (data.class === 'Decoration') {
      if (data.height_length) fields.push(`Height/Length: ${data.height_length} ft`);
      if (data.stakes) fields.push(`Stakes: ${data.stakes}`);
      if (data.tethers) fields.push(`Tethers: ${data.tethers}`);
      if (data.adapter) fields.push(`Adapter: ${data.adapter}`);
    }

    if (data.class === 'Light') {
      if (data.color) fields.push(`Color: ${data.color}`);
      if (data.bulb_type) fields.push(`Bulb Type: ${data.bulb_type}`);
      if (data.length) fields.push(`Length: ${data.length} ft`);
      if (data.watts) fields.push(`Watts: ${data.watts}W`);
      if (data.amps) fields.push(`Amps: ${data.amps}A`);
    }

    if (data.class === 'Accessory') {
      if (data.length) fields.push(`Length: ${data.length} ft`);
      if (data.male_ends) fields.push(`Male Ends: ${data.male_ends}`);
      if (data.female_ends) fields.push(`Female Ends: ${data.female_ends}`);
    }

    if (data.power_inlet !== undefined) {
      fields.push(`Power Required: ${data.power_inlet ? 'Yes' : 'No'}`);
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
      'Accessory': '🔌',
      'Storage': '📦'
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
      'Projection': '📽️',
      'Cord': '➰',
      'Plug': '🔌',
      'Receptacle': '⚡',
      'Timer': '⏱️',
      'Controller': '🎮',
      'Tote': '📦',
      'Box': '📫',
      'Bin': '🗑️'
    };
    return icons[type] || '📦';
  }
}
