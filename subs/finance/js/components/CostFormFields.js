// Cost Form Fields Component

import { 
  COST_TYPES, 
  getCategoriesForCostType,
  SUBCATEGORIES,
  FORM_DEFAULTS,
  validateCostRecord,
  calculateTotalCost,
  calculateValue,
  getRelatedIdConfig,
  isRelatedIdRequired
} from '../utils/finance-config.js';
import { getItems, API_BASE_URL } from '../utils/finance-api.js';

export class CostFormFields {
  constructor(containerId, initialData = null) {
    this.container = document.getElementById(containerId);
    this.formData = initialData || { ...FORM_DEFAULTS };
    this.errors = {};
    this.items = [];
    this.records = [];
    this.ideas = [];
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

  async loadRelatedData(costType) {
    const config = getRelatedIdConfig(costType);
    if (!config) return [];

    try {
      const endpoint = config.endpoint;
      const response = await fetch(`${API_BASE_URL}${endpoint}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch from ${endpoint}`);
      }

      const data = await response.json();
      
      // Handle different response structures
      if (endpoint.includes('/items')) {
        return data.items || data || [];
      } else if (endpoint.includes('/maintenance-records')) {
        return data.records || data || [];
      } else if (endpoint.includes('/ideas')) {
        return data.ideas || data || [];
      }
      
      return data || [];
    } catch (error) {
      console.error(`Failed to load related data from ${config.endpoint}:`, error);
      return [];
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
        ${this.renderField('purchase_date', 'Purchase Date', 'date', false, isGift)}
        ${this.renderField('quantity', 'Quantity', 'number', false)}
        ${this.renderField('unit_cost', 'Unit Cost', 'number', false)}
      </div>

      <div class="form-section">
        ${this.renderField('total_cost', 'Total Cost', 'number', true, isGift)}
        ${this.renderField('tax', 'Tax', 'number', false, isGift)}
        ${this.renderField('value', 'Value', 'number', false, false)}
        ${this.renderCurrencyField()}
      </div>

      ${this.renderDynamicRelatedField()}

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

  renderDynamicRelatedField() {
    const config = getRelatedIdConfig(this.formData.cost_type);
    
    // If no related field needed for this cost type, return empty
    if (!config) return '';
    
    const fieldName = config.field;
    const value = this.formData[fieldName] || '';
    const isRequired = isRelatedIdRequired(this.formData.cost_type, this.formData.category);
    const error = this.errors[fieldName];

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
            ${value ? `<button type="button" class="clear-related-btn" id="clear-related-btn" title="Clear selection">×</button>` : ''}
          </div>
          <input type="hidden" id="${fieldName}" name="${fieldName}" value="${value}" />
          <div class="related-dropdown" id="related-dropdown"></div>
          ${value ? `<span class="form-hint">Selected: ${value}</span>` : ''}
          ${error ? `<span class="form-error">${error}</span>` : ''}
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

    // Related field search
    this.attachRelatedSearch();

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

  async attachRelatedSearch() {
    const config = getRelatedIdConfig(this.formData.cost_type);
    if (!config) return;

    const searchInput = this.container.querySelector('#related_search');
    const dropdown = this.container.querySelector('#related-dropdown');
    const hiddenInput = this.container.querySelector(`#${config.field}`);
    const clearBtn = this.container.querySelector('#clear-related-btn');

    if (!searchInput || !dropdown || !hiddenInput) return;

    // Load related data
    const relatedData = await this.loadRelatedData(this.formData.cost_type);

    // Clear button handler
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        searchInput.value = '';
        hiddenInput.value = '';
        this.formData[config.field] = '';
        this.render(); // Re-render to remove clear button
      });
    }

    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase();
      
      if (!query) {
        dropdown.classList.remove('visible');
        return;
      }

      // Filter based on config search fields
      const filtered = relatedData.filter(item => {
        return config.searchFields.some(field => 
          item[field]?.toLowerCase().includes(query)
        );
      });

      if (filtered.length > 0) {
        dropdown.innerHTML = filtered.slice(0, 10).map(item => {
          // Determine display fields based on endpoint
          let primaryField, secondaryField, idField;
          
          if (config.endpoint.includes('/items')) {
            primaryField = item.short_name;
            secondaryField = item.id;
            idField = item.id;
          } else if (config.endpoint.includes('/maintenance-records')) {
            primaryField = item.record_id;
            secondaryField = item.short_description || item.item_id;
            idField = item.record_id;
          } else if (config.endpoint.includes('/ideas')) {
            primaryField = item.idea_name || item.name;
            secondaryField = item.id;
            idField = item.id;
          }

          return `
            <div class="related-option" data-id="${idField}" data-item-id="${item.item_id || ''}">
              <div class="related-option-name">${primaryField}</div>
              <div class="related-option-id">${secondaryField}</div>
            </div>
          `;
        }).join('');
        dropdown.classList.add('visible');
      } else {
        dropdown.innerHTML = '<div class="related-option">No results found</div>';
        dropdown.classList.add('visible');
      }
    });

    dropdown.addEventListener('click', (e) => {
      const option = e.target.closest('.related-option');
      if (option && option.dataset.id) {
        const selectedId = option.dataset.id;
        const selectedItem = relatedData.find(item => {
          if (config.endpoint.includes('/items')) return item.id === selectedId;
          if (config.endpoint.includes('/maintenance-records')) return item.record_id === selectedId;
          if (config.endpoint.includes('/ideas')) return item.id === selectedId;
        });
        
        if (selectedItem) {
          // Set display name
          let displayName;
          if (config.endpoint.includes('/items')) {
            displayName = selectedItem.short_name;
          } else if (config.endpoint.includes('/maintenance-records')) {
            displayName = selectedItem.record_id;
            // Extract item_id from record and store it
            if (selectedItem.item_id) {
              this.formData.related_item_id = selectedItem.item_id;
            }
          } else if (config.endpoint.includes('/ideas')) {
            displayName = selectedItem.idea_name || selectedItem.name;
          }

          searchInput.value = displayName;
          hiddenInput.value = selectedId;
          this.formData[config.field] = selectedId;
        }
        
        dropdown.classList.remove('visible');
        this.render(); // Re-render to show clear button
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