// Cost Form Fields Component

import { 
  FORM_DEFAULTS,
  validateCostRecord,
  calculateTotalCost,
  calculateValue,
  getRelatedIdConfig,
  getCategoriesForCostType
} from '../utils/finance-config.js';
import { getItems, getApiEndpoint } from '../utils/finance-api.js';
import { CostFormRenderers } from './CostFormRenderers.js';
import { ReceiptUploadModal } from './ReceiptUploadModal.js';

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
    
    // Receipt modal integration
    this.receiptModal = new ReceiptUploadModal();
    this.currentExtractionId = null;
    this.currentImageId = null;
    
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
      const apiEndpoint = await getApiEndpoint();
      const endpoint = config.endpoint;
      const response = await fetch(`${apiEndpoint}${endpoint}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch from ${endpoint}`);
      }

      const data = await response.json();
      
      // Handle different response structures
      let items = [];
      if (endpoint.includes('/items')) {
        items = data.items || data || [];
        
        // Filter by class if classFilter is specified
        if (config.classFilter && config.classFilter.length > 0) {
          items = items.filter(item => 
            config.classFilter.includes(item.class)
          );
        }
        
        return items;
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

  handleReceiptData(extractedData, extractionId, imageId) {
    // Store extraction and image IDs for audit tracking
    this.currentExtractionId = extractionId;
    this.currentImageId = imageId;
    
    // Populate form with extracted data, preserving existing context
    this.formData = {
      ...this.formData,
      vendor: extractedData.vendor || this.formData.vendor || '',
      purchase_date: extractedData.purchase_date || this.formData.purchase_date || '',
      cost_date: extractedData.purchase_date || this.formData.cost_date || '',
      description: extractedData.description || this.formData.description || '',
      item_name: extractedData.item_name || this.formData.item_name || '',
      quantity: extractedData.quantity || this.formData.quantity || 1,
      unit_cost: extractedData.unit_cost || this.formData.unit_cost || 0,
      total_cost: extractedData.total_cost || this.formData.total_cost || 0,
      cost_type: extractedData.cost_type || this.formData.cost_type || '',
      category: extractedData.category || this.formData.category || '',
      subcategory: extractedData.subcategory || this.formData.subcategory || ''
    };
    
    // Re-render form with new data
    this.render();
    
    console.log('Form populated with AI-extracted data', {
      extractionId,
      imageId
    });
  }

  render() {
    const isEditing = !!this.formData.cost_id;
    const isGift = this.formData.cost_type === 'gift';

    this.container.innerHTML = `
      <div class="form-header">
        <h2>${isEditing ? 'Edit Cost Record' : 'Add Cost Record'}</h2>
      </div>

      <form class="cost-form" id="cost-form">
        ${CostFormRenderers.renderManualEntry(this.formData, this.errors, isGift)}
        ${!isEditing ? CostFormRenderers.renderUploadOption() : ''}
        ${CostFormRenderers.renderFormActions(isEditing)}
      </form>
    `;

    this.attachListeners();
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
        if (confirm('Discard changes and return to finance page?')) {
          window.location.href = '/finance';
        }
      });
    }

    // Upload receipt button
    const uploadBtn = this.container.querySelector('#upload-receipt-btn');
    if (uploadBtn) {
      uploadBtn.addEventListener('click', () => {
        e.preventDefault();           // ADD THIS
        e.stopPropagation();          // ADD THIS
        e.stopImmediatePropagation(); // ADD THIS
        console.log('Upload button clicked!'); // ADD THIS LINE
        console.log('Modal:', this.receiptModal); // ADD THIS LINE
        // Get context from URL params
        const urlParams = new URLSearchParams(window.location.search);
        const contextData = {
          item_id: urlParams.get('item_id') || this.formData.related_item_id || null,
          record_id: urlParams.get('record_id') || this.formData.related_record_id || null,
          cost_type: urlParams.get('cost_type') || this.formData.cost_type || null,
          category: urlParams.get('category') || this.formData.category || null
        };
        
        // Open modal with context and callback
        this.receiptModal.open(contextData, (extractedData, extractionId, imageId) => {
          this.handleReceiptData(extractedData, extractionId, imageId);
        });
      });
    }

    // Cost type change (to update categories and gift logic)
    const costTypeSelect = this.container.querySelector('#cost_type');
    if (costTypeSelect) {
      costTypeSelect.addEventListener('change', (e) => {
        this.formData.cost_type = e.target.value;
        
        // Reset category when cost type changes
        this.formData.category = '';
        
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

    const relatedData = await this.loadRelatedData(this.formData.cost_type);

    // Clear button
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        searchInput.value = '';
        hiddenInput.value = '';
        this.formData[config.field] = '';
        this.render();
      });
    }

    // Search input
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase();
      if (!query) {
        dropdown.classList.remove('visible');
        return;
      }

      const filtered = relatedData.filter(item => 
        config.searchFields.some(field => item[field]?.toLowerCase().includes(query))
      );

      dropdown.innerHTML = this.buildDropdownOptions(filtered, config);
      dropdown.classList.add('visible');
    });

    // Selection
    dropdown.addEventListener('click', (e) => {
      const option = e.target.closest('.related-option');
      if (option?.dataset.id) {
        this.handleRelatedSelection(option.dataset.id, relatedData, config, searchInput, hiddenInput);
        dropdown.classList.remove('visible');
        this.render();
      }
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!searchInput.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.classList.remove('visible');
      }
    });
  }

  buildDropdownOptions(filtered, config) {
    if (filtered.length === 0) return '<div class="related-option">No results found</div>';

    return filtered.slice(0, 10).map(item => {
      const { primaryField, secondaryField, idField } = this.getDisplayFields(item, config);
      return `
        <div class="related-option" data-id="${idField}" data-item-id="${item.item_id || ''}">
          <div class="related-option-name">${primaryField}</div>
          <div class="related-option-id">${secondaryField}</div>
        </div>
      `;
    }).join('');
  }

  getDisplayFields(item, config) {
    if (config.endpoint.includes('/items')) {
      return { primaryField: item.short_name, secondaryField: item.id, idField: item.id };
    } else if (config.endpoint.includes('/maintenance-records')) {
      return { primaryField: item.record_id, secondaryField: item.short_description || item.item_id, idField: item.record_id };
    } else if (config.endpoint.includes('/ideas')) {
      return { primaryField: item.idea_name || item.name, secondaryField: item.id, idField: item.id };
    }
  }

  handleRelatedSelection(selectedId, relatedData, config, searchInput, hiddenInput) {
    const selectedItem = relatedData.find(item => {
      if (config.endpoint.includes('/items')) return item.id === selectedId;
      if (config.endpoint.includes('/maintenance-records')) return item.record_id === selectedId;
      if (config.endpoint.includes('/ideas')) return item.id === selectedId;
    });
    
    if (selectedItem) {
      const { primaryField } = this.getDisplayFields(selectedItem, config);
      searchInput.value = primaryField;
      hiddenInput.value = selectedId;
      this.formData[config.field] = selectedId;

      // Extract item_id from maintenance record
      if (config.endpoint.includes('/maintenance-records') && selectedItem.item_id) {
        this.formData.related_item_id = selectedItem.item_id;
      }
    }
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

    // Trigger submit callback with extraction and image IDs
    if (this.onSubmit) {
      this.onSubmit(this.formData, this.currentExtractionId, this.currentImageId);
    }
  }

  reset() {
    this.formData = { ...FORM_DEFAULTS };
    this.errors = {};
    this.currentExtractionId = null;
    this.currentImageId = null;
    this.render();
  }

  setData(data) {
    this.formData = { ...data };
    this.render();
  }
}