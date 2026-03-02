// Multi-Item Review Modal Component
// Displays all extracted line items from receipt with inline editing

import {
  formatCurrency,
  formatDate,
  COST_TYPES,
  getCategoriesForCostType,
  SUBCATEGORIES,
  getRelatedIdConfig,
  isRelatedIdRequired
} from '../utils/finance-config.js';

export class MultiItemReviewModal {
  constructor() {
    this.modal = null;
    this.items = [];
    this.receiptMetadata = {};
    this.extractionId = null;
    this.imageId = null;
    this.contextData = {};
    this.onConfirm = null;
    this.onCancel = null;
    this.itemsCache = null;
    this.recordsCache = null;
    this.ideasCache = null;
  }

  async show(data, callbacks = {}) {
    console.log('🎬 MultiItemReviewModal.show() called with data:', data);

    this.items = data.items || [];
    this.receiptMetadata = data.receipt_metadata || {};
    this.extractionId = data.extraction_id;
    this.imageId = data.image_id;
    this.contextData = data.context || {};
    this.onConfirm = callbacks.onConfirm;
    this.onCancel = callbacks.onCancel;

    console.log(`📋 Items to review: ${this.items.length}`);
    console.log('🧾 Receipt metadata:', this.receiptMetadata);

    // Load all related entity caches before mapping items
    await this.loadAllRelatedCaches();

    const contextRecordId = this.contextData.record_id;

    // Auto-select all items and pre-fill related fields from context/Lambda response
    this.items = this.items.map((item, index) => {
      console.log(`  Item ${index + 1}:`, item);
      const mapped = { ...item, selected: true, errors: {} };

      // Lambda already injects related_record_id for repair/maintenance when record_id is in context.
      // As a belt-and-suspenders fallback, also apply from contextData on the frontend.
      if (contextRecordId && ['repair', 'maintenance'].includes(item.cost_type) && !mapped.related_record_id) {
        const record = (this.recordsCache || []).find(r => r.record_id === contextRecordId);
        mapped.related_record_id = contextRecordId;
        mapped.related_record_id_display = record
          ? (record.short_description || record.record_id)
          : contextRecordId;
        // Also carry through item_id from the record or context
        if (record?.item_id) {
          mapped.related_item_id = record.item_id;
        } else if (this.contextData.item_id) {
          mapped.related_item_id = this.contextData.item_id;
        }
      }

      // Populate display name for any related_record_id already set (e.g. from Lambda)
      if (mapped.related_record_id && !mapped.related_record_id_display) {
        const record = (this.recordsCache || []).find(r => r.record_id === mapped.related_record_id);
        mapped.related_record_id_display = record
          ? (record.short_description || record.record_id)
          : mapped.related_record_id;
      }

      return mapped;
    });

    this.render();
    this.attachListeners();
  }

  async loadAllRelatedCaches() {
    try {
      const { API_ENDPOINT: apiEndpoint } = await window.SpookyConfig.get();

      const [itemsResult, recordsResult, ideasResult] = await Promise.allSettled([
        fetch(`${apiEndpoint}/items`),
        fetch(`${apiEndpoint}/admin/maintenance-records`),
        fetch(`${apiEndpoint}/ideas`)
      ]);

      // Items
      if (itemsResult.status === 'fulfilled' && itemsResult.value.ok) {
        const json = await itemsResult.value.json();
        const data = (json && typeof json === 'object' && 'data' in json) ? json.data : json;
        const raw = data.items || data;
        this.itemsCache = Array.isArray(raw) ? raw : [];
      } else {
        this.itemsCache = [];
      }

      // Maintenance records
      if (recordsResult.status === 'fulfilled' && recordsResult.value.ok) {
        const json = await recordsResult.value.json();
        const data = (json && typeof json === 'object' && 'data' in json) ? json.data : json;
        const raw = data.records || data;
        this.recordsCache = Array.isArray(raw) ? raw : [];
      } else {
        this.recordsCache = [];
      }

      // Ideas
      if (ideasResult.status === 'fulfilled' && ideasResult.value.ok) {
        const json = await ideasResult.value.json();
        const data = (json && typeof json === 'object' && 'data' in json) ? json.data : json;
        const raw = data.ideas || data;
        this.ideasCache = Array.isArray(raw) ? raw : [];
      } else {
        this.ideasCache = [];
      }

      console.log(`✅ Loaded: ${this.itemsCache.length} items, ${this.recordsCache.length} records, ${this.ideasCache.length} ideas`);
    } catch (error) {
      console.error('❌ Failed to load related caches:', error);
      this.itemsCache = [];
      this.recordsCache = [];
      this.ideasCache = [];
    }
  }

  getRelatedCacheForCostType(costType) {
    const config = getRelatedIdConfig(costType);
    if (!config) return [];

    if (config.endpoint.includes('/items')) {
      let items = this.itemsCache || [];
      if (config.classFilter && config.classFilter.length > 0) {
        items = items.filter(item => config.classFilter.includes(item.class));
      }
      return items;
    } else if (config.endpoint.includes('/maintenance-records')) {
      return this.recordsCache || [];
    } else if (config.endpoint.includes('/ideas')) {
      return this.ideasCache || [];
    }

    return [];
  }

  getEntityDisplayFields(entity, costType) {
    const config = getRelatedIdConfig(costType);
    if (!config) return { primary: entity.id || '', secondary: '', id: entity.id || '' };

    if (config.endpoint.includes('/items')) {
      return { primary: entity.short_name || entity.id, secondary: entity.id, id: entity.id };
    } else if (config.endpoint.includes('/maintenance-records')) {
      return {
        primary: entity.record_id,
        secondary: entity.short_description || entity.item_id || '',
        id: entity.record_id
      };
    } else if (config.endpoint.includes('/ideas')) {
      return {
        primary: entity.idea_name || entity.name || entity.id,
        secondary: entity.id,
        id: entity.id
      };
    }

    return { primary: entity.id || '', secondary: '', id: entity.id || '' };
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

    // Related field is fully config-driven by cost type
    const relatedConfig = getRelatedIdConfig(item.cost_type);
    const showRelatedField = !!relatedConfig;
    const relatedFieldName = relatedConfig?.field;
    const relatedLabel = relatedConfig?.label || 'Related';
    const isRelatedReq = relatedConfig ? isRelatedIdRequired(item.cost_type, item.category) : false;
    const currentRelatedId = relatedFieldName ? (item[relatedFieldName] || '') : '';
    const currentRelatedDisplay = relatedFieldName
      ? (item[`${relatedFieldName}_display`] || currentRelatedId)
      : '';

    return `
      <div class="item-form-grid">
        <!-- Cost Type & Category -->
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

        <!-- Quantity & Costs -->
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

        <!-- Related field: driven by cost_type via getRelatedIdConfig -->
        ${showRelatedField ? `
          <div class="form-group full-width">
            <label class="form-label ${isRelatedReq ? 'required' : ''}">
              ${relatedLabel} ${isRelatedReq ? '' : '(Optional)'}
            </label>
            <div class="related-item-selector">
              <input
                type="text"
                class="form-input related-search-input"
                data-field="related_search"
                data-index="${index}"
                placeholder="Search ${relatedLabel.toLowerCase()}s..."
                value="${currentRelatedDisplay}"
                autocomplete="off"
              />
              <input type="hidden" data-field="${relatedFieldName}" data-index="${index}" value="${currentRelatedId}" />
              <div class="related-dropdown" data-index="${index}"></div>
              ${currentRelatedId ? `
                <button type="button" class="clear-related-btn" data-index="${index}">×</button>
              ` : ''}
            </div>
            ${item.errors?.[relatedFieldName] ? `<span class="form-error">${item.errors[relatedFieldName]}</span>` : ''}
          </div>
        ` : ''}

        <!-- Manufacturer (acquisition only) -->
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

        <!-- Description (full width) -->
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

    // Form field changes — delegated
    this.modal.addEventListener('change', (e) => {
      const field = e.target.dataset.field;
      if (!field) return;
      const index = parseInt(e.target.dataset.index);
      if (field === 'cost_type') {
        this.handleCostTypeChange(index, e.target.value);
      } else if (field === 'category') {
        this.handleCategoryChange(index, e.target.value);
      } else {
        this.items[index][field] = e.target.value;
      }
    });

    // Related search input — delegated
    this.modal.addEventListener('input', (e) => {
      if (!e.target.classList.contains('related-search-input')) return;
      const index = parseInt(e.target.dataset.index);
      this.handleRelatedSearch(index, e.target.value);
    });

    // Related search focus — show options on empty focus
    this.modal.addEventListener('focusin', (e) => {
      if (!e.target.classList.contains('related-search-input')) return;
      const index = parseInt(e.target.dataset.index);
      if (e.target.value === '') {
        const costType = this.items[index].cost_type;
        const available = this.getRelatedCacheForCostType(costType).slice(0, 10);
        this.showRelatedDropdown(index, available, costType);
      }
    });

    // Click outside + clear buttons — delegated
    this.modal.addEventListener('click', (e) => {
      const clearBtn = e.target.closest('.clear-related-btn');
      if (clearBtn) {
        const index = parseInt(clearBtn.dataset.index);
        this.clearRelatedEntity(index);
        return;
      }

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
    const oldConfig = getRelatedIdConfig(this.items[index].cost_type);
    const newConfig = getRelatedIdConfig(newCostType);

    // Clear old related field when switching to a different field name
    if (oldConfig && oldConfig.field !== newConfig?.field) {
      this.items[index][oldConfig.field] = '';
      this.items[index][`${oldConfig.field}_display`] = '';
    }

    this.items[index].cost_type = newCostType;

    // Reset category if it's not valid for the new cost type
    const validCategories = getCategoriesForCostType(newCostType);
    if (!validCategories.find(cat => cat.value === this.items[index].category)) {
      this.items[index].category = validCategories[0]?.value || 'other';
    }

    this.updateItemCard(index);
  }

  handleCategoryChange(index, newCategory) {
    this.items[index].category = newCategory;

    if (!SUBCATEGORIES[newCategory]) {
      this.items[index].subcategory = '';
    }

    this.updateItemCard(index);
  }

  handleRelatedSearch(index, query) {
    const costType = this.items[index].cost_type;
    const config = getRelatedIdConfig(costType);
    if (!config) return;

    const searchFields = config.searchFields || ['id'];
    const available = this.getRelatedCacheForCostType(costType);

    const filtered = query
      ? available.filter(entity =>
          searchFields.some(field => entity[field]?.toLowerCase().includes(query.toLowerCase()))
        ).slice(0, 10)
      : available.slice(0, 10);

    this.showRelatedDropdown(index, filtered, costType);
  }

  showRelatedDropdown(index, entities, costType) {
    const dropdown = this.modal.querySelector(`.related-dropdown[data-index="${index}"]`);
    if (!dropdown) return;

    if (entities.length === 0) {
      dropdown.innerHTML = '<div class="dropdown-empty">No results found</div>';
      dropdown.classList.add('visible');
      return;
    }

    dropdown.innerHTML = entities.map(entity => {
      const { primary, secondary, id } = this.getEntityDisplayFields(entity, costType);
      return `
        <div class="dropdown-item" data-index="${index}" data-entity-id="${id}">
          <span class="dropdown-item-name">${primary}</span>
          <span class="dropdown-item-id">${secondary}</span>
        </div>
      `;
    }).join('');

    dropdown.querySelectorAll('.dropdown-item').forEach(el => {
      el.addEventListener('click', (e) => {
        const itemIndex = parseInt(e.currentTarget.dataset.index);
        const entityId = e.currentTarget.dataset.entityId;
        this.selectRelatedEntity(itemIndex, entityId);
      });
    });

    dropdown.classList.add('visible');
  }

  selectRelatedEntity(index, entityId) {
    const costType = this.items[index].cost_type;
    const config = getRelatedIdConfig(costType);
    if (!config) return;

    const cache = this.getRelatedCacheForCostType(costType);
    const entity = cache.find(e => {
      const { id } = this.getEntityDisplayFields(e, costType);
      return id === entityId;
    });
    if (!entity) return;

    const { primary } = this.getEntityDisplayFields(entity, costType);
    const fieldName = config.field;

    this.items[index][fieldName] = entityId;
    this.items[index][`${fieldName}_display`] = primary;
    // For maintenance records, also carry through the associated item_id
    if (config.endpoint.includes('/maintenance-records') && entity.item_id) {
      this.items[index].related_item_id = entity.item_id;
    }

    const searchInput = this.modal.querySelector(`.related-search-input[data-index="${index}"]`);
    const hiddenInput = this.modal.querySelector(`input[type="hidden"][data-field="${fieldName}"][data-index="${index}"]`);
    const dropdown = this.modal.querySelector(`.related-dropdown[data-index="${index}"]`);

    if (searchInput) searchInput.value = primary;
    if (hiddenInput) hiddenInput.value = entityId;
    if (dropdown) dropdown.classList.remove('visible');

    this.updateItemCard(index);
  }

  clearRelatedEntity(index) {
    const costType = this.items[index].cost_type;
    const config = getRelatedIdConfig(costType);
    const fieldName = config?.field;
    if (!fieldName) return;

    this.items[index][fieldName] = '';
    this.items[index][`${fieldName}_display`] = '';
    // For maintenance records, also clear the derived related_item_id
    if (config.endpoint.includes('/maintenance-records')) {
      this.items[index].related_item_id = '';
    }

    const searchInput = this.modal.querySelector(`.related-search-input[data-index="${index}"]`);
    const hiddenInput = this.modal.querySelector(`input[type="hidden"][data-field="${fieldName}"][data-index="${index}"]`);

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

    // No re-attachment needed — field listeners are delegated on this.modal
  }

  updateUI() {
    const selectedCount = this.items.filter(item => item.selected).length;
    const selectedTotal = this.items
      .filter(item => item.selected)
      .reduce((sum, item) => sum + (parseFloat(item.total_cost) || 0), 0);

    const summaryBar = this.modal.querySelector('.summary-bar');
    if (summaryBar) {
      summaryBar.innerHTML = this.renderSummaryBar(selectedCount, selectedTotal).replace(/<div class="summary-bar">|<\/div>$/g, '');
    }

    const confirmBtn = this.modal.querySelector('#confirm-btn');
    if (confirmBtn) {
      confirmBtn.disabled = selectedCount === 0;
      confirmBtn.textContent = `Create ${selectedCount} Cost ${selectedCount === 1 ? 'Record' : 'Records'}`;
    }

    this.items.forEach((item, index) => {
      const card = this.modal.querySelector(`.item-card[data-index="${index}"]`);
      if (card) {
        card.classList.toggle('disabled', !item.selected);
      }
    });
  }

  validateItems() {
    let isValid = true;

    this.items.forEach((item) => {
      if (!item.selected) {
        item.errors = {};
        return;
      }

      const errors = {};

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

      // Related field validation via config
      const relatedConfig = getRelatedIdConfig(item.cost_type);
      if (relatedConfig && isRelatedIdRequired(item.cost_type, item.category)) {
        if (!item[relatedConfig.field]) {
          errors[relatedConfig.field] = `${relatedConfig.label} is required`;
        }
      }

      item.errors = errors;
      if (Object.keys(errors).length > 0) {
        isValid = false;
      }
    });

    return isValid;
  }

  handleConfirm() {
    const isValid = this.validateItems();

    if (!isValid) {
      this.render();
      this.attachListeners();
      return;
    }

    const selectedItems = this.items.filter(item => item.selected);

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
      related_record_id: item.related_record_id || '',
      related_idea_id: item.related_idea_id || '',
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
