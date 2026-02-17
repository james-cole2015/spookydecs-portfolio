// Cost Form Field Renderers

import { 
  COST_TYPES, 
  getCategoriesForCostType,
  SUBCATEGORIES,
  getRelatedIdConfig,
  isRelatedIdRequired
} from '../utils/finance-config.js';

export class CostFormRenderers {
  static renderManualEntry(formData, errors, isGift) {
    return `
      <div class="form-section">
        ${this.renderField('item_name', 'Item Name', 'text', true, formData, errors)}
        ${this.renderField('cost_date', 'Cost Date', 'date', true, formData, errors)}
        ${this.renderSelectField('cost_type', 'Cost Type', COST_TYPES, true, formData, errors)}
        ${this.renderGiftCheckbox(formData)}
      </div>

      <div class="form-section">
        ${this.renderCategoryField(formData, errors)}
        ${formData.category && SUBCATEGORIES[formData.category] ? this.renderSubcategoryField(formData, errors) : ''}
      </div>

      <div class="form-section">
        ${this.renderField('vendor', 'Store', 'text', true, formData, errors)}
        ${formData.cost_type === 'acquisition' ? this.renderField('manufacturer', 'Manufacturer', 'text', true, formData, errors) : ''}
        ${this.renderField('purchase_date', 'Purchase Date', 'date', false, formData, errors)}
      </div>

      <div class="form-section">
        ${this.renderField('quantity', 'Quantity', 'number', false, formData, errors)}
        ${this.renderField('unit_cost', 'Unit Cost', 'number', false, formData, errors)}
      </div>

      <div class="form-section">
        ${this.renderField('total_cost', 'Total Cost', 'number', !isGift, formData, errors, false)}
        ${this.renderField('tax', 'Tax', 'number', false, formData, errors)}
        ${this.renderField('value', 'Value', 'number', isGift, formData, errors, !isGift)}
        ${this.renderCurrencyField()}
      </div>

      ${this.renderDynamicRelatedField(formData, errors)}

      <div class="form-section single-column">
        ${this.renderTextarea('description', 'Description', false, formData, errors)}
        ${this.renderTextarea('notes', 'Notes', false, formData, errors)}
      </div>
    `;
  }

  static renderGiftCheckbox(formData) {
    const isChecked = formData.is_gift === true || formData.is_gift === 'true';
    
    return `
      <div class="form-group gift-checkbox-group">
        <label class="gift-checkbox-label">
          <input
            type="checkbox"
            id="is_gift"
            name="is_gift"
            class="gift-checkbox"
            ${isChecked ? 'checked' : ''}
            value="true"
          />
          <span class="checkbox-text">This was a gift</span>
        </label>
        <p class="form-hint" style="margin-top: 4px; margin-left: 24px;">
          ${isChecked 
            ? 'Total cost = what you paid (can be $0). Value = estimated worth.' 
            : 'Check this box if you received this item/part as a gift.'}
        </p>
      </div>
    `;
  }

  static renderField(name, label, type, required, formData, errors, disabled = false) {
    const value = formData[name] || '';
    const error = errors[name];

    return `
      <div class="form-group">
        <label class="form-label ${required ? 'required' : ''}" for="${name}">${label}</label>
        <input
          type="${type}"
          id="${name}"
          name="${name}"
          class="form-input ${error ? 'error' : ''}"
          value="${value}"
          ${required ? 'required' : ''}
          ${disabled ? 'readonly' : ''}
          ${type === 'number' ? 'step="0.01" min="0"' : ''}
        />
        ${error ? `<span class="form-error">${error}</span>` : ''}
      </div>
    `;
  }

  static renderSelectField(name, label, options, required, formData, errors) {
    const value = formData[name] || '';
    const error = errors[name];

    let optionsHTML = '';
    
    // Add placeholder option for cost_type
    if (name === 'cost_type') {
      optionsHTML += '<option value="">Select Type</option>';
    }
    
    optionsHTML += options.map(opt => 
      `<option value="${opt.value}" ${value === opt.value ? 'selected' : ''}>${opt.label}</option>`
    ).join('');

    return `
      <div class="form-group">
        <label class="form-label ${required ? 'required' : ''}" for="${name}">${label}</label>
        <select
          id="${name}"
          name="${name}"
          class="form-select ${error ? 'error' : ''}"
          ${required ? 'required' : ''}
        >
          ${optionsHTML}
        </select>
        ${error ? `<span class="form-error">${error}</span>` : ''}
      </div>
    `;
  }

  static renderCategoryField(formData, errors) {
    const costType = formData.cost_type || '';
    
    // If no cost type selected, show disabled dropdown
    if (!costType) {
      return `
        <div class="form-group">
          <label class="form-label required" for="category">Category</label>
          <select
            id="category"
            name="category"
            class="form-select"
            required
            disabled
          >
            <option value="">Select a Cost Type first</option>
          </select>
        </div>
      `;
    }
    
    const categories = getCategoriesForCostType(costType);
    const value = formData.category || '';
    const error = errors.category;

    let optionsHTML = '<option value="">Select Category</option>';
    optionsHTML += categories.map(opt => 
      `<option value="${opt.value}" ${value === opt.value ? 'selected' : ''}>${opt.label}</option>`
    ).join('');

    return `
      <div class="form-group">
        <label class="form-label required" for="category">Category</label>
        <select
          id="category"
          name="category"
          class="form-select ${error ? 'error' : ''}"
          required
        >
          ${optionsHTML}
        </select>
        ${error ? `<span class="form-error">${error}</span>` : ''}
      </div>
    `;
  }

  static renderSubcategoryField(formData, errors) {
    const category = formData.category;
    if (!category || !SUBCATEGORIES[category]) return '';

    const subcategories = SUBCATEGORIES[category].map(sub => ({
      value: sub,
      label: sub
    }));

    return this.renderSelectField('subcategory', 'Subcategory', subcategories, false, formData, errors);
  }

  static renderCurrencyField() {
    return `
      <div class="form-group">
        <label class="form-label" for="currency">Currency</label>
        <input
          type="text"
          id="currency"
          name="currency"
          class="form-input"
          value="USD"
          disabled
        />
      </div>
    `;
  }

  static renderTextarea(name, label, required, formData, errors) {
    const value = formData[name] || '';
    const error = errors[name];

    return `
      <div class="form-group full-width">
        <label class="form-label ${required ? 'required' : ''}" for="${name}">${label}</label>
        <textarea
          id="${name}"
          name="${name}"
          class="form-textarea ${error ? 'error' : ''}"
          ${required ? 'required' : ''}
        >${value}</textarea>
        ${error ? `<span class="form-error">${error}</span>` : ''}
      </div>
    `;
  }

static renderDynamicRelatedField(formData, errors) {
  const config = getRelatedIdConfig(formData.cost_type);
  
  if (!config) return '';
  
  const fieldName = config.field;
  const value = formData[fieldName] || '';
  const displayName = formData[`${fieldName}_name`] || value;
  const isRequired = isRelatedIdRequired(formData.cost_type, formData.category);
  const error = errors[fieldName];

  return `
    <div class="form-section single-column">
      <div class="form-group related-selector">
        <label class="form-label ${isRequired ? 'required' : ''}" for="${fieldName}">
          ${config.label} ${isRequired ? '' : '(Optional)'}
        </label>
        <div class="related-input-wrapper">
          <input
            type="text"
            id="related_search"
            class="form-input related-search-input ${error ? 'error' : ''}"
            placeholder="Search..."
            autocomplete="off"
          />
          <input type="hidden" id="${fieldName}" name="${fieldName}" value="${value}" />
          <div class="related-dropdown" id="related-dropdown"></div>
        </div>
        ${value ? `
          <div class="related-selected">
            <span class="related-selected-value">${displayName}</span>
            <span class="related-selected-id">${value}</span>
            <button type="button" class="related-clear-btn" id="clear-related-btn" title="Clear selection">&times;</button>
          </div>
        ` : ''}
        ${error ? `<span class="form-error">${error}</span>` : ''}
      </div>
    </div>
  `;
}

  static renderFormActions(isEditing) {
    return `
      <div class="form-actions">
        <button type="button" class="btn-secondary" id="cancel-btn">
          <span style="font-weight: bold; margin-right: 8px;">✕</span>
          Cancel
        </button>
        <button type="submit" class="btn-primary" id="submit-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 8px;">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
            <polyline points="17 21 17 13 7 13 7 21"></polyline>
            <polyline points="7 3 7 8 15 8"></polyline>
          </svg>
          ${isEditing ? 'Update Record' : 'Review & Submit'}
        </button>
      </div>
    `;
  }
}