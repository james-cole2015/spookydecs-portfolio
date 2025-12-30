// Cost Form Fields Component

import { 
  COST_TYPES, 
  getCategoriesForCostType,
  SUBCATEGORIES,
  FORM_DEFAULTS,
  validateCostRecord,
  calculateTotalCost,
  calculateValue
} from '../utils/finance-config.js';
import { getItems } from '../utils/finance-api.js';

export class CostFormFields {
  constructor(containerId, initialData = null) {
    this.container = document.getElementById(containerId);
    this.formData = initialData || { ...FORM_DEFAULTS };
    this.errors = {};
    this.items = [];
    this.onSubmit = null;
    this.onCancel = null;
    
    this.loadItems();
    this.render();
  }

  async loadItems() {
    try {
      const response = await getItems({ status: 'Active' });
      this.items = response.items || response || [];
    } catch (error) {
      console.error('Failed to load items:', error);
      this.items = [];
    }
  }

  render() {
    const isEditing = !!this.formData.cost_id;
    const isGift = this.formData.cost_type === 'gift';

    this.container.innerHTML = `
      <div class="form-header">
        <h2>${isEditing ? 'Edit Cost Record' : 'Add Cost Record'}</h2>
      </div>

      <form class="cost-form" id="cost-form">
        ${this.renderManualEntry(isGift)}
        ${!isEditing ? this.renderUploadOption() : ''}
        ${this.renderFormActions(isEditing)}
      </form>
    `;

    this.attachListeners();
  }

  renderManualEntry(isGift) {
    return `
      <div class="form-section">
        ${this.renderField('item_name', 'Item Name', 'text', true)}
        ${this.renderField('cost_date', 'Cost Date', 'date', true)}
        ${this.renderSelectField('cost_type', 'Cost Type', COST_TYPES, true)}
        ${this.renderCategoryField()}
      </div>

      ${this.formData.category ? `
        <div class="form-section">
          ${this.renderSubcategoryField()}
        </div>
      ` : ''}

      <div class="form-section">
        ${this.renderField('vendor', 'Vendor', 'text', true)}
        ${this.renderField('purchase_date', 'Purchase Date', 'date', false)}
        ${this.renderField('quantity', 'Quantity', 'number', false)}
        ${this.renderField('unit_cost', 'Unit Cost', 'number', false)}
      </div>

      <div class="form-section">
        ${this.renderField('total_cost', 'Total Cost', 'number', true, isGift)}
        ${this.renderField('tax', 'Tax', 'number', false, isGift)}
        ${this.renderField('value', 'Value', 'number', false, false)}
        ${this.renderCurrencyField()}
      </div>

      ${this.renderRelatedItemField()}

      <div class="form-section single-column">
        ${this.renderTextarea('description', 'Description', false)}
        ${this.renderTextarea('notes', 'Notes', false)}
      </div>
    `;
  }

  renderField(name, label, type, required, disabled = false) {
    const value = this.formData[name] || '';
    const error = this.errors[name];

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
          ${disabled ? 'disabled' : ''}
          ${type === 'number' ? 'step="0.01" min="0"' : ''}
        />
        ${error ? `<span class="form-error">${error}</span>` : ''}
      </div>
    `;
  }

  renderSelectField(name, label, options, required) {
    const value = this.formData[name] || '';
    const error = this.errors[name];

    let optionsHTML = options.map(opt => 
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

  renderCategoryField() {
    const costType = this.formData.cost_type || 'acquisition';
    const categories = getCategoriesForCostType(costType);
    const value = this.formData.category || categories[0].value;
    const error = this.errors.category;

    let optionsHTML = categories.map(opt => 
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

  renderSubcategoryField() {
    const category = this.formData.category;
    if (!category || !SUBCATEGORIES[category]) return '';

    const subcategories = SUBCATEGORIES[category].map(sub => ({
      value: sub,
      label: sub
    }));

    return this.renderSelectField('subcategory', 'Subcategory', subcategories, false);
  }

  renderCurrencyField() {
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

  renderTextarea(name, label, required) {
    const value = this.formData[name] || '';
    const error = this.errors[name];

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

  renderRelatedItemField() {
    const value = this.formData.related_item_id || '';

    return `
      <div class="form-section single-column">
        <div class="form-group item-selector">
          <label class="form-label" for="related_item_id">Related Item (Optional)</label>
          <input
            type="text"
            id="related_item_search"
            class="form-input item-search-input"
            placeholder="Search for an item..."
            autocomplete="off"
          />
          <input type="hidden" id="related_item_id" name="related_item_id" value="${value}" />
          <div class="item-dropdown" id="item-dropdown"></div>
          ${value ? `<span class="form-hint">Selected: ${value}</span>` : ''}
        </div>
      </div>
    `;
  }

  renderUploadOption() {
    return `
      <div class="upload-section">
        <button type="button" class="upload-btn" id="upload-receipt-btn" disabled>
          <span class="upload-icon">📷</span>
          <span>Upload Receipt - Auto Fill</span>
        </button>
        <p class="upload-hint">Coming in Phase 2: Upload receipt to auto-populate fields</p>
      </div>
    `;
  }

  renderFormActions(isEditing) {
    return `
      <div class="form-actions">
        <button type="button" class="btn-secondary" id="cancel-btn">Cancel</button>
        <button type="submit" class="btn-primary" id="submit-btn">
          ${isEditing ? 'Update Record' : 'Review & Submit'}
        </button>
      </div>
    `;
  }

  attachListeners() {
    const form = this.container.querySelector('#cost-form');
    
    // Form submission
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSubmit();
    });

    // Cancel button
    const cancelBtn = this.container.querySelector('#cancel-btn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        if (this.onCancel) this.onCancel();
        this.reset();
      });
    }

    // Cost type change (to update categories and gift logic)
    const costTypeSelect = this.container.querySelector('#cost_type');
    if (costTypeSelect) {
      costTypeSelect.addEventListener('change', (e) => {
        this.formData.cost_type = e.target.value;
        
        // Reset category to first available option
        const categories = getCategoriesForCostType(e.target.value);
        this.formData.category = categories[0].value;
        
        // Handle gift logic
        if (e.target.value === 'gift') {
          this.formData.total_cost = 0;
          this.formData.tax = 0;
          this.formData.value = 0;
        }
        
        this.render();
      });
    }

    // Category change (to update subcategory)
    const categorySelect = this.container.querySelector('#category');
    if (categorySelect) {
      categorySelect.addEventListener('change', (e) => {
        this.formData.category = e.target.value;
        this.render();
      });
    }

    // Auto-calculate total cost from unit cost and quantity
    const quantityInput = this.container.querySelector('#quantity');
    const unitCostInput = this.container.querySelector('#unit_cost');
    const totalCostInput = this.container.querySelector('#total_cost');

    if (quantityInput && unitCostInput && totalCostInput) {
      const updateTotal = () => {
        if (this.formData.cost_type === 'gift') return;
        
        const quantity = quantityInput.value || 1;
        const unitCost = unitCostInput.value || 0;
        totalCostInput.value = calculateTotalCost(unitCost, quantity);
        this.formData.total_cost = totalCostInput.value;
        this.updateValue();
      };

      quantityInput.addEventListener('input', updateTotal);
      unitCostInput.addEventListener('input', updateTotal);
    }

    // Auto-calculate value when total cost changes
    if (totalCostInput) {
      totalCostInput.addEventListener('input', () => {
        this.formData.total_cost = totalCostInput.value;
        this.updateValue();
      });
    }

    // Update value when tax changes
    const taxInput = this.container.querySelector('#tax');
    if (taxInput) {
      taxInput.addEventListener('input', () => {
        this.formData.tax = taxInput.value;
        this.updateValue();
      });
    }

    // Item search
    this.attachItemSearch();

    // Track all form changes
    form.addEventListener('input', (e) => {
      if (e.target.name) {
        this.formData[e.target.name] = e.target.value;
      }
    });
  }

  updateValue() {
    const valueInput = this.container.querySelector('#value');
    if (!valueInput) return;

    const value = calculateValue(
      this.formData.cost_type,
      this.formData.total_cost,
      this.formData.tax
    );

    valueInput.value = value.toFixed(2);
    this.formData.value = value;
  }

  attachItemSearch() {
    const searchInput = this.container.querySelector('#related_item_search');
    const dropdown = this.container.querySelector('#item-dropdown');
    const hiddenInput = this.container.querySelector('#related_item_id');

    if (!searchInput || !dropdown) return;

    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase();
      
      if (!query) {
        dropdown.classList.remove('visible');
        return;
      }

      const filtered = this.items.filter(item => 
        item.short_name?.toLowerCase().includes(query) ||
        item.id?.toLowerCase().includes(query)
      );

      if (filtered.length > 0) {
        dropdown.innerHTML = filtered.slice(0, 10).map(item => `
          <div class="item-option" data-item-id="${item.id}">
            <div class="item-option-name">${item.short_name}</div>
            <div class="item-option-id">${item.id}</div>
          </div>
        `).join('');
        dropdown.classList.add('visible');
      } else {
        dropdown.innerHTML = '<div class="item-option">No items found</div>';
        dropdown.classList.add('visible');
      }
    });

    dropdown.addEventListener('click', (e) => {
      const option = e.target.closest('.item-option');
      if (option && option.dataset.itemId) {
        const itemId = option.dataset.itemId;
        const item = this.items.find(i => i.id === itemId);
        
        if (item) {
          searchInput.value = item.short_name;
          hiddenInput.value = itemId;
          this.formData.related_item_id = itemId;
        }
        
        dropdown.classList.remove('visible');
      }
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!searchInput.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.classList.remove('visible');
      }
    });
  }

handleSubmit() {
  // Collect current form values
  const form = this.container.querySelector('#cost-form');
  if (form) {
    const formData = new FormData(form);
    for (let [key, value] of formData.entries()) {
      if (value) {
        this.formData[key] = value;
      }
    }
  }
  
  // Validate form
  const validation = validateCostRecord(this.formData);
  
  if (!validation.isValid) {
    this.errors = validation.errors;
    this.render();
    return;
  }

  // Clear errors
  this.errors = {};

  // Trigger submit callback
  if (this.onSubmit) {
    this.onSubmit(this.formData);
  }
}

reset() {
  this.formData = { ...FORM_DEFAULTS };
  this.errors = {};
  this.render();
}

setData(data) {
  this.formData = { ...data };
  this.render();
}
}