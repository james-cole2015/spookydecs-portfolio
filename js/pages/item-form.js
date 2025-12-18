// Item Form Page
// Create or Edit items with wizard-style steps

import { fetchItemById, createItem, updateItem } from '../api/items.js';
import { getPhotosForItem } from '../api/photos.js';
import { ItemFormFields } from '../components/ItemFormFields.js';
import { PhotoUploader } from '../components/PhotoUploader.js';
import { CLASS_HIERARCHY, TABS, getClassTypeIcon } from '../utils/item-config.js';
import { toast } from '../shared/toast.js';
import { navigate } from '../router.js';

let mode = 'create'; // 'create' or 'edit'
let currentStep = 1;
let formData = {
  class: '',
  class_type: '',
  season: '',
  status: 'Active'
};
let originalItem = null;

let formFields = null;
let photoUploader = null;

export async function init(params) {
  console.log('1. Init called with params:', params);
  
  mode = params.mode || 'create';
  console.log('2. Mode set to:', mode);
  
  currentStep = 1;
  formData = {
    class: '',
    class_type: '',
    season: '',
    status: 'Active'
  };
  
  console.log('3. About to check edit mode');
  
  // If edit mode, fetch existing item
  if (mode === 'edit') {
    console.log('4. In edit mode block');
    
    if (!params.itemId) {
      console.log('5. No itemId - showing error');
      toast.error('Error', 'No item ID provided');
      navigate('/items');
      return;
    }
    
    console.log('6. ItemId exists:', params.itemId);
    
    try {
      console.log('7. Calling showLoading()');
      showLoading();
      
      console.log('8. About to fetch item by ID');
      originalItem = await fetchItemById(params.itemId);
      console.log('9. Item fetched:', originalItem);
      
      // Pre-fill form data
      formData = {
        ...originalItem,
        class: originalItem.class,
        class_type: originalItem.class_type
      };
      
      console.log('10. FormData populated');
      
      // For edit mode, skip to step 3 (details)
      currentStep = 3;
      console.log('11. About to call renderWizard()');
      renderWizard();
      console.log('12. renderWizard() completed');
      
    } catch (error) {
      console.error('ERROR in edit mode:', error);
      toast.error('Error', 'Failed to load item for editing');
      navigate('/items');
    }
  } else {
    console.log('13. In create mode - calling renderWizard()');
    // Create mode - start at step 1
    renderWizard();
  }
  
  console.log('14. Init function completed');
}

function showLoading() {
  const container = document.getElementById('step-content');
  if (container) {
    container.innerHTML = `
      <div class="form-loading">
        <div class="spinner"></div>
        <div>Loading item...</div>
      </div>
    `;
  }
}

function renderWizard() {
  console.log('renderWizard() called, currentStep:', currentStep);
  updatePageTitle();
  console.log('updatePageTitle() done');
  renderStepIndicator();
  console.log('renderStepIndicator() done');
  renderStepContent();
  console.log('renderStepContent() done');
  renderStepActions();
  console.log('renderStepActions() done');
}

function renderStepContent() {
  console.log('renderStepContent() called, currentStep:', currentStep);
  const container = document.getElementById('step-content');
  console.log('step-content container:', container);
  
  if (!container) {
    console.error('step-content container NOT FOUND!');
    return;
  }
  
  container.innerHTML = '';
  
  switch (currentStep) {
    case 1:
      console.log('Calling renderStep1()');
      container.appendChild(renderStep1());
      break;
    case 2:
      console.log('Calling renderStep2()');
      container.appendChild(renderStep2());
      break;
    case 3:
      console.log('Calling renderStep3()');
      container.appendChild(renderStep3());
      break;
    case 4:
      console.log('Calling renderStep4()');
      container.appendChild(renderStep4());
      break;
  }
  
  console.log('renderStepContent() finished');
}

function updatePageTitle() {
  const titleEl = document.getElementById('form-title');
  if (titleEl) {
    if (mode === 'create') {
      titleEl.textContent = 'Create New Item';
    } else {
      titleEl.textContent = `Edit Item: ${originalItem.short_name}`;
    }
  }
}

function renderStepIndicator() {
  const container = document.getElementById('step-indicator');
  if (!container) return;
  
  const steps = mode === 'create' 
    ? [
        { num: 1, label: 'Class' },
        { num: 2, label: 'Type' },
        { num: 3, label: 'Details' },
        { num: 4, label: 'Preview' }
      ]
    : [
        { num: 3, label: 'Details' },
        { num: 4, label: 'Preview' }
      ];
  
  container.innerHTML = steps.map(step => `
    <div class="step ${currentStep === step.num ? 'active' : ''} ${currentStep > step.num ? 'completed' : ''}">
      <div class="step-number">${step.num === 4 ? '✓' : step.num}</div>
      <div class="step-label">${step.label}</div>
    </div>
  `).join('<div class="step-connector"></div>');
}


// Step 1: Select Class
function renderStep1() {
  const step = document.createElement('div');
  step.className = 'step-panel';
  
  step.innerHTML = `
    <h2>Select Item Class</h2>
    <p class="step-description">Choose the type of item you're adding</p>
    <div class="class-selector">
      ${TABS.map(tab => `
        <div class="class-card ${formData.class === tab.class ? 'selected' : ''}" 
             data-class="${tab.class}"
             onclick="itemFormPage.selectClass('${tab.class}')">
          <div class="class-icon">${getClassIcon(tab.class)}</div>
          <div class="class-label">${tab.label}</div>
        </div>
      `).join('')}
    </div>
  `;
  
  return step;
}

function getClassIcon(className) {
  const icons = {
    'Decoration': '🎃',
    'Light': '💡',
    'Accessory': '🔌'
  };
  return icons[className] || '📦';
}

// Step 2: Select Class Type
function renderStep2() {
  const step = document.createElement('div');
  step.className = 'step-panel';
  
  const classTypes = CLASS_HIERARCHY[formData.class] || [];
  
  step.innerHTML = `
    <h2>Select ${formData.class} Type</h2>
    <p class="step-description">What kind of ${formData.class.toLowerCase()} is this?</p>
    <div class="type-selector">
      ${classTypes.map(type => `
        <div class="type-card ${formData.class_type === type ? 'selected' : ''}"
             data-type="${type}"
             onclick="itemFormPage.selectClassType('${type}')">
          <div class="type-icon">${getClassTypeIcon(type)}</div>
          <div class="type-label">${type}</div>
        </div>
      `).join('')}
    </div>
  `;
  
  return step;
}

// Step 3: Fill Details
function renderStep3() {
  console.log('renderStep3 called');
  const step = document.createElement('div');
  step.className = 'step-panel';
  
  console.log('formData at renderStep3:', formData);
  console.log('class:', formData.class, 'class_type:', formData.class_type);
  
  step.innerHTML = `
    <h2>Item Details</h2>
    <p class="step-description">Fill in the information for this ${formData.class_type || 'item'}</p>
    
    <div class="form-section">
      <h3 class="section-title">Basic Information</h3>
      <div id="basic-fields"></div>
    </div>
    
    <div class="form-section">
      <h3 class="section-title">Specific Details</h3>
      <div id="specific-fields"></div>
    </div>
    
    <div class="form-section">
      <h3 class="section-title">Acquisition</h3>
      <div id="vendor-fields"></div>
    </div>
    
    <div class="form-section">
      <h3 class="section-title">Storage</h3>
      <div id="storage-fields"></div>
    </div>
    
    ${formData.class === 'Decoration' ? `
      <div class="form-section">
        <h3 class="section-title">Photos</h3>
        <div id="photo-uploader"></div>
      </div>
    ` : ''}
  `;
  
  // Wait for DOM to update, then render fields
  setTimeout(() => {
    console.log('setTimeout in renderStep3 executing');
    console.log('Looking for basic-fields container:', document.getElementById('basic-fields'));
    
    formFields = new ItemFormFields('basic-fields');
    console.log('ItemFormFields created for basic-fields');
    formFields.renderBasicFields(formData);
    console.log('renderBasicFields completed');
    
    formFields = new ItemFormFields('specific-fields');
    console.log('ItemFormFields created for specific-fields');
    formFields.renderClassSpecificFields(formData.class_type, formData);
    console.log('renderClassSpecificFields completed');
    
    formFields = new ItemFormFields('vendor-fields');
    console.log('ItemFormFields created for vendor-fields');
    formFields.renderVendorFields(formData);
    console.log('renderVendorFields completed');
    
    formFields = new ItemFormFields('storage-fields');
    console.log('ItemFormFields created for storage-fields');
    formFields.renderStorageFields(formData);
    console.log('renderStorageFields completed');
    
    // Photo uploader for decorations
    if (formData.class === 'Decoration') {
      console.log('Creating PhotoUploader for Decoration');
      photoUploader = new PhotoUploader('photo-uploader', 3);
      photoUploader.render();
      console.log('PhotoUploader render completed');
    }
    
    console.log('All field rendering completed');
  }, 10);
  
  console.log('Returning step element');
  return step;
}

// Step 4: Preview
function renderStep4() {
  // Collect all form data
  collectFormData();
  
  const step = document.createElement('div');
  step.className = 'step-panel';
  
  step.innerHTML = `
    <h2>Review & Confirm</h2>
    <p class="step-description">Please review the information before saving</p>
    
    <div class="preview-card">
      <div class="preview-header">
        <div class="preview-title">
          <span class="preview-icon">${getClassTypeIcon(formData.class_type)}</span>
          ${formData.short_name || 'Unnamed Item'}
        </div>
        <div class="preview-class">${formData.class} - ${formData.class_type}</div>
      </div>
      
      <div class="preview-sections">
        ${renderPreviewSection('Basic Information', [
          { label: 'Season', value: formData.season },
          { label: 'Status', value: formData.status || 'Active' },
          { label: 'Date Acquired', value: formData.date_acquired || '-' }
        ])}
        
        ${renderClassSpecificPreview()}
        
        ${renderPreviewSection('Acquisition', [
          { label: 'Cost', value: formData.vendor_cost ? `$${formData.vendor_cost}` : '-' },
          { label: 'Value', value: formData.vendor_value ? `$${formData.vendor_value}` : '-' },
          { label: 'Manufacturer', value: formData.vendor_manufacturer || '-' },
          { label: 'Store', value: formData.vendor_store || '-' }
        ])}
        
        ${renderPreviewSection('Storage', [
          { label: 'Tote ID', value: formData.storage_tote_id || '-' },
          { label: 'Location', value: formData.storage_location || '-' }
        ])}
        
        ${formData.general_notes ? `
          <div class="preview-section">
            <h4>Notes</h4>
            <p class="preview-notes">${formData.general_notes}</p>
          </div>
        ` : ''}
        
        ${photoUploader && photoUploader.hasPhotos() ? `
          <div class="preview-section">
            <h4>Photos</h4>
            <p>${photoUploader.getSelectedFiles().length} photo(s) will be uploaded</p>
          </div>
        ` : ''}
      </div>
    </div>
  `;
  
  return step;
}

function renderPreviewSection(title, fields) {
  const nonEmptyFields = fields.filter(f => f.value && f.value !== '-');
  if (nonEmptyFields.length === 0) return '';
  
  return `
    <div class="preview-section">
      <h4>${title}</h4>
      <div class="preview-fields">
        ${fields.map(f => `
          <div class="preview-field">
            <span class="preview-label">${f.label}:</span>
            <span class="preview-value">${f.value}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderClassSpecificPreview() {
  const fields = [];
  
  // Add class-specific fields that have values
  ['height_length', 'stakes', 'tethers', 'color', 'bulb_type', 'length', 
   'male_ends', 'female_ends', 'watts', 'amps', 'adapter'].forEach(key => {
    if (formData[key]) {
      fields.push({
        label: key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        value: formData[key]
      });
    }
  });
  
  if (fields.length === 0) return '';
  
  return renderPreviewSection('Specifications', fields);
}

function renderStepActions() {
  const container = document.getElementById('step-actions');
  if (!container) return;
  
  const canGoBack = mode === 'create' ? currentStep > 1 : currentStep > 3;
  const canGoNext = mode === 'create' ? currentStep < 4 : currentStep < 4;
  const isLastStep = currentStep === 4;
  
  container.innerHTML = `
    <button 
      class="btn-secondary" 
      onclick="itemFormPage.handleCancel()"
    >
      Cancel
    </button>
    
    <div class="action-buttons-right">
      ${canGoBack ? `
        <button 
          class="btn-secondary" 
          onclick="itemFormPage.previousStep()"
        >
          ← Previous
        </button>
      ` : ''}
      
      ${canGoNext && !isLastStep ? `
        <button 
          class="btn-primary" 
          onclick="itemFormPage.nextStep()"
        >
          Next →
        </button>
      ` : ''}
      
      ${isLastStep ? `
        <button 
          class="btn-primary btn-save" 
          onclick="itemFormPage.handleSave()"
        >
          💾 Save Item
        </button>
      ` : ''}
    </div>
  `;
}

// Action handlers
export function selectClass(className) {
  formData.class = className;
  formData.class_type = ''; // Reset class type when class changes
  
  // Re-render step 1 to show selection
  renderStepContent();
}

export function selectClassType(classType) {
  formData.class_type = classType;
  
  // Re-render step 2 to show selection
  renderStepContent();
}

export function nextStep() {
  // Validate current step before moving forward
  if (!validateCurrentStep()) {
    return;
  }
  
  // Collect data from current step
  collectFormData();
  
  // Move to next step
  if (mode === 'create') {
    if (currentStep === 1 && !formData.class) return;
    if (currentStep === 2 && !formData.class_type) return;
  }
  
  currentStep++;
  renderWizard();
}

export function previousStep() {
  // Collect data before going back
  collectFormData();
  
  currentStep--;
  renderWizard();
}

function validateCurrentStep() {
  if (currentStep === 1 && !formData.class) {
    toast.warning('Selection Required', 'Please select an item class');
    return false;
  }
  
  if (currentStep === 2 && !formData.class_type) {
    toast.warning('Selection Required', 'Please select a class type');
    return false;
  }
  
  if (currentStep === 3) {
    // Validate all fields in step 3
    const basicFields = new ItemFormFields('basic-fields');
    const specificFields = new ItemFormFields('specific-fields');
    const vendorFields = new ItemFormFields('vendor-fields');
    
    const allValid = basicFields.validateAll() && 
                     specificFields.validateAll() && 
                     vendorFields.validateAll();
    
    if (!allValid) {
      toast.error('Validation Error', 'Please fix the errors in the form');
      return false;
    }
  }
  
  return true;
}

function collectFormData() {
  if (currentStep === 3) {
    // Collect from all field containers
    const containers = ['basic-fields', 'specific-fields', 'vendor-fields', 'storage-fields'];
    
    containers.forEach(containerId => {
      const fields = new ItemFormFields(containerId);
      const data = fields.getFormData();
      formData = { ...formData, ...data };
    });
  }
}

export async function handleSave() {
  const saveBtn = document.querySelector('.btn-save');
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.textContent = '💾 Saving...';
  }
  
  try {
    // Prepare item data
    const itemData = prepareItemData();
    console.log('Preparing to save item data:', itemData);
    
    let response;
    let itemId;
    let itemName;
    
    if (mode === 'create') {
      // Create new item
      console.log('Creating new item with data:', JSON.stringify(itemData, null, 2));
      response = await createItem(itemData);
      
      // Extract from Lambda response structure
      itemId = response.confirmation?.id || response.preview?.id;
      itemName = response.confirmation?.short_name || response.preview?.short_name;
      
      toast.success('Item Created', `${itemName} has been created`);
    } else {
      // Update existing item
      response = await updateItem(originalItem.id, itemData);
      itemId = response.id || originalItem.id;
      itemName = response.short_name || originalItem.short_name;
      
      toast.success('Item Updated', `${itemName} has been updated`);
    }
    
    // Upload photos if any (decorations only)
    if (photoUploader && photoUploader.hasPhotos()) {
      try {
        await photoUploader.uploadPhotos(itemId, formData.season);
        toast.success('Photos Uploaded', 'Photos have been added to the item');
      } catch (photoError) {
        console.error('Failed to upload photos:', photoError);
        toast.warning('Photo Upload Failed', 'Item was created but photos failed to upload');
      }
    }
    
    // Reset form state before navigating
    cleanup();
    
    // Navigate after brief delay to allow cleanup
    setTimeout(() => {
      console.log('Navigating to /items...');
      window.location.href = '/items';
    }, 500);
    
  } catch (error) {
    console.error('Failed to save item:', error);
    toast.error('Save Failed', error.message || 'Failed to save item. Please try again.');
    
    // Re-enable button on error
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = '💾 Save Item';
    }
  }
}

function prepareItemData() {
  const data = {
    // Backend expects snake_case
    class: formData.class,
    class_type: formData.class_type,
    short_name: formData.short_name,
    season: formData.season,
    status: formData.status || 'Active'
  };
  
  // Add optional fields (snake_case)
  if (formData.date_acquired) data.date_acquired = formData.date_acquired;
  if (formData.general_notes) data.general_notes = formData.general_notes;
  
  // Add class-specific fields (snake_case)
  if (formData.height_length) data.height_length = formData.height_length;
  if (formData.stakes) data.stakes = formData.stakes;
  if (formData.tethers) data.tethers = formData.tethers;
  if (formData.color) data.color = formData.color;
  if (formData.bulb_type) data.bulb_type = formData.bulb_type;
  if (formData.length) data.length = formData.length;
  if (formData.male_ends) data.male_ends = formData.male_ends;
  if (formData.female_ends) data.female_ends = formData.female_ends;
  if (formData.watts) data.watts = formData.watts;
  if (formData.amps) data.amps = formData.amps;
  if (formData.adapter) data.adapter = formData.adapter;
  if (formData.power_inlet !== undefined) data.power_inlet = formData.power_inlet;
  
  // Vendor metadata - the Lambda extracts these with get('cost'), get('value'), etc.
  if (formData.vendor_cost) data.cost = formData.vendor_cost;
  if (formData.vendor_value) data.value = formData.vendor_value;
  if (formData.vendor_manufacturer) data.manufacturer = formData.vendor_manufacturer;
  if (formData.vendor_store) data.vendor_store = formData.vendor_store;
  
  // Packing/storage data - the Lambda extracts with get('tote_location')
  if (formData.storage_tote_id) data.tote_id = formData.storage_tote_id;
  if (formData.storage_location) data.tote_location = formData.storage_location;
  
  return data;
}

export function handleCancel() {
  navigate('/items');
}

export function cleanup() {
  mode = 'create';
  currentStep = 1;
  formData = {};
  originalItem = null;
  formFields = null;
  photoUploader = null;
}