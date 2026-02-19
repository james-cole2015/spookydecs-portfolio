// Multi-Item Review Modal Component
// Displays all extracted line items from receipt with inline editing

import { formatCurrency, formatDate, COST_TYPES, getCategoriesForCostType, SUBCATEGORIES, getRelatedIdConfig } from '../utils/finance-config.js';

export class MultiItemReviewModal {
  constructor() {
    this.modal = null;
    this.items = [];
    this.receiptMetadata = {};
    this.extractionId = null;
    this.imageId = null;
    this.onConfirm = null;
    this.onCancel = null;
    this.itemsCache = null; // Cache for item lookup
  }

  async show(data, callbacks = {}) {
    console.log('🎬 MultiItemReviewModal.show() called with data:', data);
    
    this.items = data.items || [];
    this.receiptMetadata = data.receipt_metadata || {};
    this.extractionId = data.extraction_id;
    this.imageId = data.image_id;
    this.onConfirm = callbacks.onConfirm;
    this.onCancel = callbacks.onCancel;

    console.log(`📋 Items to review: ${this.items.length}`);
    console.log('🧾 Receipt metadata:', this.receiptMetadata);

    // Auto-select all items by default
    this.items = this.items.map((item, index) => {
      console.log(`  Item ${index + 1}:`, item);
      return {
        ...item,
        selected: true,
        errors: {}
      };
    });

    // Fetch items for related_item_id selector
    await this.loadItemsCache();

    this.render();
    this.attachListeners();
  }

  async loadItemsCache() {
    try {
      console.log('🔄 Loading items cache...');
      const { API_ENDPOINT: apiEndpoint } = await window.SpookyConfig.get();
      const response = await fetch(`${apiEndpoint}/items`);

      if (!response.ok) {
        throw new Error(`Failed to fetch from /items`);
      }

      const json = await response.json();
      const data = (json && typeof json === 'object' && 'data' in json) ? json.data : json;
      const items = data.items || data || [];

      if (!Array.isArray(items)) {
        console.error('Expected items array but got:', typeof items, items);
        this.itemsCache = [];
        return;
      }

      this.itemsCache = items;
      console.log(`✅ Loaded ${this.itemsCache.length} items for selection`);
    } catch (error) {
      console.error('❌ Failed to load items:', error);
      this.itemsCache = [];
    }
  }

  render() {
    if (this.modal) {
      this.modal.remove();
    }

    const selectedCount = this.items.filter(item => item.selected).length;
    const selectedTotal = this.items
      .filter(item => item.selected)
      .reduce((sum, item) => sum + (parseFloat(item.total_cost) || 0), 0);

    const modalHTML = `
      <div class="multi-item-review-modal" id="multi-item-review-modal">
        <div class="multi-item-review-modal-content">
          <div class="multi-item-review-modal-header">
            <div>
              <h2 class="multi-item-review-modal-title">Review Extracted Items</h2>
              <p class="modal-subtitle">
                ${this.items.length === 1 ? '1 item detected' : `${this.items.length} items detected`} from receipt
              </p>
            </div>
            <button class="close-btn" id="close-modal-btn">&times;</button>
          </div>
          
          <div class="multi-item-review-modal-body">
            ${this.renderSummaryBar(selectedCount, selectedTotal)}
            ${this.renderItemsList()}
          </div>

          <div class="multi-item-review-modal-footer">
            <button class="btn-secondary" id="cancel-btn">Go Back</button>
            <button class="btn-primary" id="confirm-btn" ${selectedCount === 0 ? 'disabled' : ''}>
              Create ${selectedCount} Cost ${selectedCount === 1 ? 'Record' : 'Records'}
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    this.modal = document.getElementById('multi-item-review-modal');

    // Trigger animation
    setTimeout(() => {
      this.modal.classList.add('visible');
    }, 10);
  }

  renderSummaryBar(selectedCount, selectedTotal) {
    return `
      <div class="summary-bar">
        <div class="summary-item">
          <span class="summary-label">Vendor:</span>
          <span class="summary-value">${this.receiptMetadata.vendor || 'N/A'}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Purchase Date:</span>
          <span class="summary-value">${formatDate(this.receiptMetadata.purchase_date) || 'N/A'}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Receipt Total:</span>
          <span class="summary-value">${formatCurrency(this.receiptMetadata.receipt_total)}</span>
        </div>
        <div class="summary-item highlight">
          <span class="summary-label">Selected:</span>
          <span class="summary-value">${selectedCount}/${this.items.length} items (${formatCurrency(selectedTotal)})</span>
        </div>
      </div>
    `;
  }

  renderItemsList() {
    return `
      <div class="items-list">
        ${this.items.map((item, index) => this.renderItemCard(item, index)).join('')}
      </div>
    `;
  }

  renderItemCard(item, index) {
    const hasErrors = Object.keys(item.errors || {}).length > 0;
    // Collapse all items by default, only expand if has errors
    const isExpanded = hasErrors;

    return `
      <div class="item-card ${!item.selected ? 'disabled' : ''} ${hasErrors ? 'has-errors' : ''}" data-index="${index}">
        <div class="item-header">
          <label class="item-checkbox-wrapper">
            <input 
              type="checkbox" 
              class="item-checkbox" 
              data-index="${index}"
              ${item.selected ? 'checked' : ''}
            />
            <div class="item-summary">
              <span class="item-name">${item.item_name || 'Unnamed Item'}</span>
              <span class="item-cost">${formatCurrency(item.total_cost)}</span>
            </div>
          </label>
          <button class="toggle-expand-btn" data-index="${index}">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="${isExpanded ? 'expanded' : ''}">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>
        </div>

        <div class="item-details ${isExpanded ? 'expanded' : ''}" data-index="${index}">
          ${this.renderItemFields(item, index)}
        </div>
      </div>
    `;
  }

  renderItemFields(item, index) {
    const categories = getCategoriesForCostType(item.cost_type);
    const subcategories = item.category && SUBCATEGORIES[item.category] ? SUBCATEGORIES[item.category] : [];
    
    // Determine if related_item_id is applicable
    const needsRelatedItem = item.cost_type === 'acquisition' && 
                             ['decoration', 'light', 'accessory'].includes(item.category);
    const showRelatedItem = item.cost_type !== 'supply_purchase';

    return `
      <div class="item-form-grid">
        <!-- Row 1: Cost Type & Category -->
        <div class="form-group">
          <label class="form-label">Cost Type</label>
          <select class="form-select" data-field="cost_type" data-index="${index}">
            ${COST_TYPES.map(type => 
              `<option value="${type.value}" ${item.cost_type === type.value ? 'selected' : ''}>${type.label}</option>`
            ).join('')}
          </select>
          ${item.errors?.cost_type ? `<span class="form-error">${item.errors.cost_type}</span>` : ''}
        </div>

        <div class="form-group">
          <label class="form-label">Category</label>
          <select class="form-select" data-field="category" data-index="${index}">
            ${categories.map(cat => 
              `<option value="${cat.value}" ${item.category === cat.value ? 'selected' : ''}>${cat.label}</option>`
            ).join('')}
          </select>
          ${item.errors?.category ? `<span class="form-error">${item.errors.category}</span>` : ''}
        </div>

        ${subcategories.length > 0 ? `
          <div class="form-group">
            <label class="form-label">Subcategory</label>
            <select class="form-select" data-field="subcategory" data-index="${index}">
              <option value="">Select...</option>
              ${subcategories.map(sub => 
                `<option value="${sub}" ${item.subcategory === sub ? 'selected' : ''}>${sub}</option>`
              ).join('')}
            </select>
          </div>
        ` : ''}

        <!-- Row 2: Quantity & Costs -->
        <div class="form-group">
          <label class="form-label">Quantity</label>
          <input 
            type="number" 
            class="form-input" 
            data-field="quantity" 
            data-index="${index}"
            value="${item.quantity || 1}"
            min="1"
            step="1"
          />
        </div>

        <div class="form-group">
          <label class="form-label">Unit Cost</label>
          <input 
            type="number" 
            class="form-input" 
            data-field="unit_cost" 
            data-index="${index}"
            value="${item.unit_cost || 0}"
            min="0"
            step="0.01"
          />
        </div>

        <div class="form-group">
          <label class="form-label">Total Cost</label>
          <input 
            type="number" 
            class="form-input" 
            data-field="total_cost" 
            data-index="${index}"
            value="${item.total_cost || 0}"
            min="0"
            step="0.01"
          />
          ${item.errors?.total_cost ? `<span class="form-error">${item.errors.total_cost}</span>` : ''}
        </div>

        <!-- Row 3: Related Item (if applicable) -->
        ${showRelatedItem ? `
          <div class="form-group full-width">
            <label class="form-label ${needsRelatedItem ? 'required' : ''}">
              Related Item ${needsRelatedItem ? '' : '(Optional)'}
            </label>
            <div class="related-item-selector">
              <input 
                type="text" 
                class="form-input related-search-input" 
                data-field="related_item_search" 
                data-index="${index}"
                placeholder="Search items..."
                value="${item.related_item_id || ''}"
                autocomplete="off"
                ${item.cost_type === 'supply_purchase' ? 'disabled' : ''}
              />
              <input type="hidden" data-field="related_item_id" data-index="${index}" value="${item.related_item_id || ''}" />
              <div class="related-dropdown" data-index="${index}"></div>
              ${item.related_item_id ? `
                <button type="button" class="clear-related-btn" data-index="${index}">×</button>
              ` : ''}
            </div>
            ${item.errors?.related_item_id ? `<span class="form-error">${item.errors.related_item_id}</span>` : ''}
            ${item.cost_type === 'supply_purchase' ? `
              <span class="form-hint">Related items not applicable for supplies</span>
            ` : ''}
          </div>
        ` : ''}

        <!-- Row 4: Manufacturer (acquisition only) -->
        ${item.cost_type === 'acquisition' ? `
          <div class="form-group full-width">
            <label class="form-label required">Manufacturer</label>
            <input
              type="text"
              class="form-input"
              data-field="manufacturer"
              data-index="${index}"
              value="${item.manufacturer || ''}"
              placeholder="e.g. Home Depot, Spirit Halloween"
            />
            ${item.errors?.manufacturer ? `<span class="form-error">${item.errors.manufacturer}</span>` : ''}
          </div>
        ` : ''}

        <!-- Row 5: Description (full width) -->
        <div class="form-group full-width">
          <label class="form-label">Description</label>
          <textarea
            class="form-textarea"
            data-field="description"
            data-index="${index}"
            rows="2"
          >${item.description || ''}</textarea>
        </div>
      </div>
    `;
  }

  attachListeners() {
    if (!this.modal) return;

    // Close button
    const closeBtn = this.modal.querySelector('#close-modal-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.close());
    }

    // Cancel button
    const cancelBtn = this.modal.querySelector('#cancel-btn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        if (this.onCancel) this.onCancel();
        this.close();
      });
    }

    // Confirm button
    const confirmBtn = this.modal.querySelector('#confirm-btn');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => this.handleConfirm());
    }

    // Item checkboxes
    this.modal.querySelectorAll('.item-checkbox').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const index = parseInt(e.target.dataset.index);
        this.items[index].selected = e.target.checked;
        this.updateUI();
      });
    });

    // Expand/collapse buttons
    this.modal.querySelectorAll('.toggle-expand-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.closest('.toggle-expand-btn').dataset.index);
        const details = this.modal.querySelector(`.item-details[data-index="${index}"]`);
        const svg = e.target.closest('.toggle-expand-btn').querySelector('svg');
        
        details.classList.toggle('expanded');
        svg.classList.toggle('expanded');
      });
    });

    // Form field changes
    this.modal.querySelectorAll('select[data-field], input[data-field], textarea[data-field]').forEach(input => {
      input.addEventListener('change', (e) => {
        const field = e.target.dataset.field;
        const index = parseInt(e.target.dataset.index);
        
        if (field === 'cost_type') {
          this.handleCostTypeChange(index, e.target.value);
        } else if (field === 'category') {
          this.handleCategoryChange(index, e.target.value);
        } else {
          this.items[index][field] = e.target.value;
        }
      });
    });

    // Related item search
    this.modal.querySelectorAll('.related-search-input').forEach(input => {
      input.addEventListener('input', (e) => {
        const index = parseInt(e.target.dataset.index);
        this.handleRelatedItemSearch(index, e.target.value);
      });

      input.addEventListener('focus', (e) => {
        const index = parseInt(e.target.dataset.index);
        if (e.target.value === '') {
          const costType = this.items[index].cost_type;
          this.showRelatedItemDropdown(index, this.getFilteredItemsForCostType(costType));
        }
      });
    });

    // Clear related item buttons
    this.modal.querySelectorAll('.clear-related-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.dataset.index);
        this.clearRelatedItem(index);
      });
    });

    // Click outside to close
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        if (this.onCancel) this.onCancel();
        this.close();
      }
    });

    // ESC key to close
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        if (this.onCancel) this.onCancel();
        this.close();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);
  }

  handleCostTypeChange(index, newCostType) {
    this.items[index].cost_type = newCostType;
    
    // Update category to match cost type
    const validCategories = getCategoriesForCostType(newCostType);
    if (!validCategories.find(cat => cat.value === this.items[index].category)) {
      this.items[index].category = validCategories[0]?.value || 'other';
    }

    // Re-render this item card
    this.updateItemCard(index);
  }

  handleCategoryChange(index, newCategory) {
    this.items[index].category = newCategory;
    
    // Clear subcategory if not applicable
    if (!SUBCATEGORIES[newCategory]) {
      this.items[index].subcategory = '';
    }

    // Re-render this item card
    this.updateItemCard(index);
  }

  getFilteredItemsForCostType(costType) {
    if (!this.itemsCache || this.itemsCache.length === 0) return [];

    const config = getRelatedIdConfig(costType);
    if (!config || !config.endpoint.includes('/items')) return this.itemsCache;

    let items = this.itemsCache;
    if (config.classFilter && config.classFilter.length > 0) {
      items = items.filter(item => config.classFilter.includes(item.class));
    }
    return items;
  }

  handleRelatedItemSearch(index, query) {
    if (!this.itemsCache || this.itemsCache.length === 0) return;

    const costType = this.items[index].cost_type;
    const config = getRelatedIdConfig(costType);
    const searchFields = config?.searchFields || ['short_name', 'id'];
    const available = this.getFilteredItemsForCostType(costType);

    const searchLower = query.toLowerCase();
    const filtered = available.filter(item =>
      searchFields.some(field => item[field]?.toLowerCase().includes(searchLower))
    ).slice(0, 10);

    this.showRelatedItemDropdown(index, filtered);
  }

  showRelatedItemDropdown(index, items) {
    const dropdown = this.modal.querySelector(`.related-dropdown[data-index="${index}"]`);
    if (!dropdown) return;

    if (items.length === 0) {
      dropdown.innerHTML = '<div class="dropdown-empty">No items found</div>';
      dropdown.classList.add('visible');
      return;
    }

    dropdown.innerHTML = items.map(item => `
      <div class="dropdown-item" data-index="${index}" data-item-id="${item.id}">
        <span class="dropdown-item-name">${item.short_name || item.id}</span>
        <span class="dropdown-item-id">${item.id}</span>
      </div>
    `).join('');

    // Attach click handlers
    dropdown.querySelectorAll('.dropdown-item').forEach(el => {
      el.addEventListener('click', (e) => {
        const itemIndex = parseInt(e.currentTarget.dataset.index);
        const itemId = e.currentTarget.dataset.itemId;
        this.selectRelatedItem(itemIndex, itemId);
      });
    });

    dropdown.classList.add('visible');
  }

  selectRelatedItem(index, itemId) {
    const item = this.itemsCache.find(i => i.id === itemId);
    if (!item) return;

    this.items[index].related_item_id = itemId;

    // Update UI
    const searchInput = this.modal.querySelector(`.related-search-input[data-index="${index}"]`);
    const hiddenInput = this.modal.querySelector(`input[type="hidden"][data-field="related_item_id"][data-index="${index}"]`);
    const dropdown = this.modal.querySelector(`.related-dropdown[data-index="${index}"]`);

    if (searchInput) searchInput.value = item.short_name || itemId;
    if (hiddenInput) hiddenInput.value = itemId;
    if (dropdown) dropdown.classList.remove('visible');

    // Add clear button if not present
    this.updateItemCard(index);
  }

  clearRelatedItem(index) {
    this.items[index].related_item_id = '';
    
    const searchInput = this.modal.querySelector(`.related-search-input[data-index="${index}"]`);
    const hiddenInput = this.modal.querySelector(`input[type="hidden"][data-field="related_item_id"][data-index="${index}"]`);
    
    if (searchInput) searchInput.value = '';
    if (hiddenInput) hiddenInput.value = '';

    this.updateItemCard(index);
  }

  updateItemCard(index) {
    const card = this.modal.querySelector(`.item-card[data-index="${index}"]`);
    if (!card) return;

    const item = this.items[index];
    const details = card.querySelector('.item-details');
    const wasExpanded = details.classList.contains('expanded');

    details.innerHTML = this.renderItemFields(item, index);
    
    if (wasExpanded) {
      details.classList.add('expanded');
    }

    // Re-attach listeners for this card
    this.attachListeners();
  }

  updateUI() {
    // Update summary bar
    const selectedCount = this.items.filter(item => item.selected).length;
    const selectedTotal = this.items
      .filter(item => item.selected)
      .reduce((sum, item) => sum + (parseFloat(item.total_cost) || 0), 0);

    const summaryBar = this.modal.querySelector('.summary-bar');
    if (summaryBar) {
      summaryBar.innerHTML = this.renderSummaryBar(selectedCount, selectedTotal).replace(/<div class="summary-bar">|<\/div>$/g, '');
    }

    // Update confirm button
    const confirmBtn = this.modal.querySelector('#confirm-btn');
    if (confirmBtn) {
      confirmBtn.disabled = selectedCount === 0;
      confirmBtn.textContent = `Create ${selectedCount} Cost ${selectedCount === 1 ? 'Record' : 'Records'}`;
    }

    // Update item cards disabled state
    this.items.forEach((item, index) => {
      const card = this.modal.querySelector(`.item-card[data-index="${index}"]`);
      if (card) {
        if (item.selected) {
          card.classList.remove('disabled');
        } else {
          card.classList.add('disabled');
        }
      }
    });
  }

  validateItems() {
    let isValid = true;

    this.items.forEach((item, index) => {
      if (!item.selected) {
        item.errors = {};
        return;
      }

      const errors = {};

      // Required fields
      if (!item.cost_type) errors.cost_type = 'Required';
      if (!item.category) errors.category = 'Required';
      if (!item.total_cost || parseFloat(item.total_cost) <= 0) {
        errors.total_cost = 'Must be greater than 0';
      }

      // Manufacturer required for acquisition
      if (item.cost_type === 'acquisition') {
        if (!item.manufacturer || item.manufacturer.toString().trim() === '') {
          errors.manufacturer = 'Required for acquisitions';
        }
      }

      // Related item validation
      const needsRelatedItem = item.cost_type === 'acquisition' &&
                               ['decoration', 'light', 'accessory'].includes(item.category);
      if (needsRelatedItem && !item.related_item_id) {
        errors.related_item_id = 'Required for this cost type';
      }

      item.errors = errors;
      if (Object.keys(errors).length > 0) {
        isValid = false;
      }
    });

    return isValid;
  }

  handleConfirm() {
    // Validate all selected items
    const isValid = this.validateItems();

    if (!isValid) {
      // Re-render to show errors
      this.render();
      this.attachListeners();
      return;
    }

    // Get selected items
    const selectedItems = this.items.filter(item => item.selected);

    // Build cost records with shared metadata
    const costRecords = selectedItems.map(item => ({
      item_name: item.item_name,
      description: item.description || '',
      cost_type: item.cost_type,
      category: item.category,
      subcategory: item.subcategory || '',
      quantity: parseInt(item.quantity) || 1,
      unit_cost: parseFloat(item.unit_cost) || 0,
      total_cost: parseFloat(item.total_cost),
      value: parseFloat(item.total_cost),
      manufacturer: item.manufacturer || '',
      vendor: this.receiptMetadata.vendor,
      purchase_date: this.receiptMetadata.purchase_date,
      cost_date: this.receiptMetadata.purchase_date,
      related_item_id: item.related_item_id || '',
      extraction_id: this.extractionId,
      image_id: this.imageId,
      currency: 'USD'
    }));

    if (this.onConfirm) {
      this.onConfirm(costRecords);
    }

    this.close();
  }

  close() {
    if (this.modal) {
      this.modal.classList.remove('visible');
      setTimeout(() => {
        if (this.modal && this.modal.parentNode) {
          this.modal.parentNode.removeChild(this.modal);
        }
        this.modal = null;
      }, 200);
    }
  }
}