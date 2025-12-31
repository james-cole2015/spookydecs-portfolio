/**
 * StorageFormFields Component
 * Dynamic form field generator for storage creation/editing
 * PATCHED: Skip validation for disabled fields
 */

import { getFormFields, getFieldOptions, validateField } from '../utils/storage-config.js';
import { itemsAPI } from '../utils/storage-api.js';

export class StorageFormFields {
  constructor(options = {}) {
    this.classType = options.classType || 'Tote'; // 'Tote' or 'Self'
    this.data = options.data || {};
    this.onChange = options.onChange || (() => {});
    this.container = null;
    this.season = options.season || null; // For filtering items in self-contained
  }

  /**
   * Render form fields
   */
  async render(containerElement) {
    this.container = containerElement;
    
    const fields = getFormFields(this.classType);
    const formFields = document.createElement('div');
    formFields.className = 'form-fields';
    
    for (const field of fields) {
      const fieldElement = await this.createField(field);
      formFields.appendChild(fieldElement);
    }
    
    this.container.innerHTML = '';
    this.container.appendChild(formFields);
    
    // Attach event listeners
    this.attachEventListeners();
  }

  /**
   * Create individual form field
   */
  async createField(fieldConfig) {
    const fieldWrapper = document.createElement('div');
    fieldWrapper.className = 'form-field';
    
    const fieldId = `field-${fieldConfig.name}`;
    const value = this.data[fieldConfig.name] || '';
    const isRequired = fieldConfig.required ? ' *' : '';
    
    // Label
    const label = document.createElement('label');
    label.className = 'form-label';
    label.htmlFor = fieldId;
    label.textContent = fieldConfig.label + isRequired;
    fieldWrapper.appendChild(label);
    
    // Field input
    let input;
    
    switch (fieldConfig.type) {
      case 'select':
        input = this.createSelectField(fieldId, fieldConfig, value);
        break;
      
      case 'item-select':
        input = await this.createItemSelectField(fieldId, fieldConfig, value);
        break;
      
      case 'textarea':
        input = this.createTextareaField(fieldId, fieldConfig, value);
        break;
      
      case 'text':
      default:
        input = this.createTextField(fieldId, fieldConfig, value);
        break;
    }
    
    fieldWrapper.appendChild(input);
    
    // Help text
    if (fieldConfig.helpText) {
      const helpText = document.createElement('span');
      helpText.className = 'form-help';
      helpText.textContent = fieldConfig.helpText;
      fieldWrapper.appendChild(helpText);
    }
    
    // Error message placeholder
    const error = document.createElement('span');
    error.className = 'form-error';
    error.id = `error-${fieldConfig.name}`;
    fieldWrapper.appendChild(error);
    
    return fieldWrapper;
  }

  /**
   * Create text field
   */
  createTextField(fieldId, fieldConfig, value) {
    const input = document.createElement('input');
    input.type = 'text';
    input.id = fieldId;
    input.name = fieldConfig.name;
    input.className = 'form-input';
    input.value = value;
    input.placeholder = fieldConfig.placeholder || '';
    input.required = fieldConfig.required || false;
    return input;
  }

  /**
   * Create textarea field
   */
  createTextareaField(fieldId, fieldConfig, value) {
    const textarea = document.createElement('textarea');
    textarea.id = fieldId;
    textarea.name = fieldConfig.name;
    textarea.className = 'form-textarea';
    textarea.value = value;
    textarea.placeholder = fieldConfig.placeholder || '';
    textarea.required = fieldConfig.required || false;
    textarea.rows = 4;
    return textarea;
  }

  /**
   * Create select field
   */
  createSelectField(fieldId, fieldConfig, value) {
    const select = document.createElement('select');
    select.id = fieldId;
    select.name = fieldConfig.name;
    select.className = 'form-select';
    select.required = fieldConfig.required || false;
    
    // Get options
    const options = getFieldOptions(fieldConfig.options);
    
    // Add empty option if not required
    if (!fieldConfig.required) {
      const emptyOption = document.createElement('option');
      emptyOption.value = '';
      emptyOption.textContent = 'Select...';
      select.appendChild(emptyOption);
    }
    
    // Add options
    options.forEach(option => {
      const optionElement = document.createElement('option');
      optionElement.value = option;
      optionElement.textContent = option;
      optionElement.selected = option === value;
      select.appendChild(optionElement);
    });
    
    return select;
  }

  /**
   * Create item select field (for self-contained)
   */
  async createItemSelectField(fieldId, fieldConfig, value) {
    const wrapper = document.createElement('div');
    wrapper.className = 'item-select-wrapper';
    
    // Search input
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.id = `${fieldId}-search`;
    searchInput.className = 'form-input';
    searchInput.placeholder = 'Search for item...';
    wrapper.appendChild(searchInput);
    
    // Dropdown container
    const dropdown = document.createElement('div');
    dropdown.className = 'item-select-dropdown hidden';
    dropdown.id = `${fieldId}-dropdown`;
    wrapper.appendChild(dropdown);
    
    // Hidden input for actual value
    const hiddenInput = document.createElement('input');
    hiddenInput.type = 'hidden';
    hiddenInput.id = fieldId;
    hiddenInput.name = fieldConfig.name;
    hiddenInput.value = value;
    hiddenInput.required = fieldConfig.required || false;
    wrapper.appendChild(hiddenInput);
    
    // Selected item display
    const selectedDisplay = document.createElement('div');
    selectedDisplay.className = 'item-selected hidden';
    selectedDisplay.id = `${fieldId}-selected`;
    wrapper.appendChild(selectedDisplay);
    
    // Load items
    await this.loadItemsForSelect(fieldId, searchInput, dropdown, hiddenInput, selectedDisplay);
    
    return wrapper;
  }

  /**
   * Load unpacked items for item select
   */
  async loadItemsForSelect(fieldId, searchInput, dropdown, hiddenInput, selectedDisplay) {
    try {
      // Fetch unpacked items
      const items = await itemsAPI.getUnpacked(this.season);
      
      let filteredItems = items;
      
      // Search functionality
      searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        
        if (searchTerm.length === 0) {
          dropdown.classList.add('hidden');
          return;
        }
        
        filteredItems = items.filter(item => {
          const matchId = item.id.toLowerCase().includes(searchTerm);
          const matchName = item.short_name.toLowerCase().includes(searchTerm);
          return matchId || matchName;
        });
        
        this.renderItemDropdown(dropdown, filteredItems, hiddenInput, selectedDisplay, searchInput);
        dropdown.classList.remove('hidden');
      });
      
      // Close dropdown when clicking outside
      document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !dropdown.contains(e.target)) {
          dropdown.classList.add('hidden');
        }
      });
      
      // If there's already a value, show it
      if (hiddenInput.value) {
        const selectedItem = items.find(item => item.id === hiddenInput.value);
        if (selectedItem) {
          this.showSelectedItem(selectedItem, selectedDisplay, searchInput, hiddenInput);
        }
      }
      
    } catch (error) {
      console.error('Error loading items:', error);
      dropdown.innerHTML = '<div class="item-select-error">Failed to load items</div>';
    }
  }

  /**
   * Render item dropdown
   */
  renderItemDropdown(dropdown, items, hiddenInput, selectedDisplay, searchInput) {
    if (items.length === 0) {
      dropdown.innerHTML = '<div class="item-select-empty">No items found</div>';
      return;
    }
    
    dropdown.innerHTML = items.map(item => `
      <div class="item-select-option" data-id="${item.id}" data-name="${item.short_name}">
        <code class="item-option-id">${item.id}</code>
        <span class="item-option-name">${item.short_name}</span>
      </div>
    `).join('');
    
    // Attach click handlers
    dropdown.querySelectorAll('.item-select-option').forEach(option => {
      option.addEventListener('click', () => {
        const itemId = option.dataset.id;
        const itemName = option.dataset.name;
        
        hiddenInput.value = itemId;
        this.showSelectedItem({ id: itemId, short_name: itemName }, selectedDisplay, searchInput, hiddenInput);
        dropdown.classList.add('hidden');
        searchInput.value = '';
        
        // Trigger change event
        this.onChange({ item_id: itemId });
        
        // Auto-populate short_name if empty
        const shortNameInput = this.container.querySelector('[name="short_name"]');
        if (shortNameInput && !shortNameInput.value) {
          shortNameInput.value = `${itemName} (Original Box)`;
          this.onChange({ short_name: shortNameInput.value });
        }
      });
    });
  }

  /**
   * Show selected item
   */
  showSelectedItem(item, selectedDisplay, searchInput, hiddenInput) {
    selectedDisplay.innerHTML = `
      <div class="item-selected-content">
        <div>
          <code>${item.id}</code>
          <span>${item.short_name}</span>
        </div>
        <button type="button" class="btn-remove-item">✕</button>
      </div>
    `;
    selectedDisplay.classList.remove('hidden');
    searchInput.classList.add('hidden');
    
    // Remove button
    selectedDisplay.querySelector('.btn-remove-item').addEventListener('click', () => {
      hiddenInput.value = '';
      selectedDisplay.classList.add('hidden');
      searchInput.classList.remove('hidden');
      searchInput.value = '';
      this.onChange({ item_id: '' });
    });
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    const inputs = this.container.querySelectorAll('input, select, textarea');
    
    inputs.forEach(input => {
      if (input.type === 'hidden') return;
      
      input.addEventListener('change', (e) => {
        const name = e.target.name;
        const value = e.target.value;
        
        // Validate
        const validation = validateField(name, value);
        this.showError(name, validation.valid ? '' : validation.message);
        
        // Trigger callback
        this.onChange({ [name]: value });
      });
      
      // Also listen for input events for real-time validation
      if (input.tagName === 'INPUT' && input.type === 'text') {
        input.addEventListener('input', (e) => {
          const name = e.target.name;
          const value = e.target.value;
          
          // Validate
          const validation = validateField(name, value);
          this.showError(name, validation.valid ? '' : validation.message);
        });
      }
    });
  }

  /**
   * Show validation error
   */
  showError(fieldName, message) {
    const errorElement = this.container.querySelector(`#error-${fieldName}`);
    if (errorElement) {
      errorElement.textContent = message;
      errorElement.style.display = message ? 'block' : 'none';
    }
  }

  /**
   * Get form data
   */
  getData() {
    const formData = {};
    const inputs = this.container.querySelectorAll('input, select, textarea');
    
    inputs.forEach(input => {
      if (input.name) {
        formData[input.name] = input.value;
      }
    });
    
    return formData;
  }

  /**
   * Validate all fields
   * PATCHED: Skip validation for disabled fields
   */
  validate() {
    const data = this.getData();
    let isValid = true;
    
    const fields = getFormFields(this.classType);
    
    fields.forEach(field => {
      // Get the actual input element
      const input = this.container.querySelector(`[name="${field.name}"]`);
      
      // Skip validation for disabled fields
      if (input && input.disabled) {
        console.log(`Skipping validation for disabled field: ${field.name}`);
        return;
      }
      
      // Skip validation for hidden item_id fields (self-contained, immutable)
      if (field.name === 'item_id' && input && input.closest('.form-field').style.display === 'none') {
        console.log(`Skipping validation for hidden field: ${field.name}`);
        return;
      }
      
      if (field.required && !data[field.name]) {
        this.showError(field.name, `${field.label} is required`);
        isValid = false;
      } else if (data[field.name]) {
        const validation = validateField(field.name, data[field.name]);
        if (!validation.valid) {
          this.showError(field.name, validation.message);
          isValid = false;
        }
      }
    });
    
    console.log('Validation result:', isValid);
    return isValid;
  }

  /**
   * Update season (for item filtering)
   */
  setSeason(season) {
    this.season = season;
  }
}

export default StorageFormFields;