// Create Modal - Item Creation Functionality

// Class type options by class
const CLASS_TYPE_OPTIONS = {
  'Decoration': ['Inflatable', 'Static Prop', 'Animatronic'],
  'Accessory': ['Plug', 'Cord', 'Adapter'],
  'Light': ['String Light', 'Spot Light']
};

// Typical power values for placeholders
const POWER_PLACEHOLDERS = {
  'Inflatable': { watts: 'e.g., 120 for typical inflatable', amps: 'e.g., 1.0 for typical inflatable' },
  'Animatronic': { watts: 'e.g., 100 for typical animatronic', amps: 'e.g., 0.8 for typical animatronic' },
  'String Light': { watts: 'e.g., 50 for typical string light', amps: 'e.g., 0.4 for typical string light' },
  'Spot Light': { watts: 'e.g., 75 for typical spot light', amps: 'e.g., 0.6 for typical spot light' }
};

// Open create modal
function openCreateModal() {
  // Reset form
  document.getElementById('createForm').reset();
  
  // Clear dynamic fields
  document.getElementById('createDynamicFields').innerHTML = '';
  
  // Reset class type dropdown
  const classTypeSelect = document.getElementById('create-class-type');
  classTypeSelect.innerHTML = '<option value="">Select Class Type</option>';
  classTypeSelect.disabled = true;
  
  // Show form view, hide preview
  document.getElementById('createFormView').style.display = 'block';
  document.getElementById('createPreviewView').style.display = 'none';
  document.getElementById('createPreviewBtn').style.display = 'inline-block';
  document.getElementById('createBackBtn').style.display = 'none';
  document.getElementById('createSaveBtn').style.display = 'none';
  document.getElementById('createCancelBtn').style.display = 'inline-block';
  
  // Open all accordion sections
  document.querySelectorAll('#createModal .accordion-content').forEach(content => {
    content.classList.add('active');
  });
  document.querySelectorAll('#createModal .accordion-header').forEach(header => {
    header.classList.remove('collapsed');
  });
  
  document.getElementById('createModal').style.display = 'flex';
}

// Handle class selection change
function onCreateClassChange() {
  const classSelect = document.getElementById('create-class');
  const classTypeSelect = document.getElementById('create-class-type');
  const selectedClass = classSelect.value;
  
  // Clear and enable class type dropdown
  classTypeSelect.innerHTML = '<option value="">Select Class Type</option>';
  
  if (selectedClass && CLASS_TYPE_OPTIONS[selectedClass]) {
    classTypeSelect.disabled = false;
    CLASS_TYPE_OPTIONS[selectedClass].forEach(type => {
      const option = document.createElement('option');
      option.value = type;
      option.textContent = type;
      classTypeSelect.appendChild(option);
    });
  } else {
    classTypeSelect.disabled = true;
  }
  
  // Clear dynamic fields
  document.getElementById('createDynamicFields').innerHTML = '';
}

// Handle class type selection change
function onCreateClassTypeChange() {
  const classType = document.getElementById('create-class-type').value;
  generateCreateDynamicFields(classType);
}

// Generate dynamic fields for create form
function generateCreateDynamicFields(classType) {
  const dynamicFieldsContainer = document.getElementById('createDynamicFields');
  const attributesToShow = CLASS_TYPE_ATTRIBUTES[classType] || [];
  
  dynamicFieldsContainer.innerHTML = '';
  
  if (attributesToShow.length === 0) {
    const noFields = document.createElement('div');
    noFields.className = 'field-hint';
    noFields.textContent = 'No additional fields for this class type';
    noFields.style.textAlign = 'center';
    noFields.style.padding = '20px';
    dynamicFieldsContainer.appendChild(noFields);
    return;
  }
  
  // Determine which fields are required
  const itemClass = document.getElementById('create-class').value;
  const requiredFields = getRequiredFieldsForClass(itemClass, classType);
  
  attributesToShow.forEach(attr => {
    const formGroup = document.createElement('div');
    formGroup.className = 'form-group';
    
    const label = document.createElement('label');
    label.setAttribute('for', `create-${attr}`);
    label.textContent = ATTRIBUTE_LABELS[attr] || formatFieldName(attr);
    
    // Add required indicator if needed
    if (requiredFields.includes(attr)) {
      const required = document.createElement('span');
      required.className = 'required';
      required.textContent = ' *';
      label.appendChild(required);
    }
    
    let input;
    if (attr === 'notes') {
      input = document.createElement('textarea');
      input.rows = 3;
    } else {
      input = document.createElement('input');
      
      // Set input type based on attribute
      if (attr === 'watts') {
        input.type = 'number';
        input.min = '1';
        input.max = '2000';
        input.step = '1';
        // Add placeholder based on class type
        if (POWER_PLACEHOLDERS[classType]) {
          input.placeholder = POWER_PLACEHOLDERS[classType].watts;
        }
      } else if (attr === 'amps') {
        input.type = 'number';
        input.min = '0.1';
        input.max = '20';
        input.step = '0.1';
        // Add placeholder based on class type
        if (POWER_PLACEHOLDERS[classType]) {
          input.placeholder = POWER_PLACEHOLDERS[classType].amps;
        }
      } else if (['stakes', 'tethers', 'length', 'height_length', 'male_ends', 'female_ends'].includes(attr)) {
        input.type = 'text';
        input.placeholder = 'Enter a number';
      } else {
        input.type = 'text';
      }
    }
    
    input.id = `create-${attr}`;
    input.name = attr;
    
    // Mark as required if needed
    if (requiredFields.includes(attr)) {
      input.required = true;
    }
    
    formGroup.appendChild(label);
    formGroup.appendChild(input);
    dynamicFieldsContainer.appendChild(formGroup);
  });
}

// Get required fields based on class and class_type
function getRequiredFieldsForClass(itemClass, classType) {
  const required = [];
  
  if (itemClass === 'Decoration') {
    required.push('stakes', 'tethers');
  } else if (itemClass === 'Accessory' && (classType === 'Cord' || classType === 'Plug')) {
    required.push('length', 'male_ends', 'female_ends');
  } else if (itemClass === 'Light') {
    required.push('color', 'bulb_type');
  }
  
  return required;
}

// Get create form data
function getCreateFormData() {
  const formData = {
    short_name: document.getElementById('create-short-name').value.trim(),
    season: document.getElementById('create-season').value,
    class: document.getElementById('create-class').value,
    class_type: document.getElementById('create-class-type').value,
    status: document.getElementById('create-status').value || 'Active',
    deployed: document.getElementById('create-deployed').checked,
    general_notes: document.getElementById('create-general-notes').value.trim(),
    cost: document.getElementById('create-cost').value.trim(),
    value: document.getElementById('create-value').value.trim(),
    manufacturer: document.getElementById('create-manufacturer').value.trim(),
    vendor_store: document.getElementById('create-store').value.trim(),
    tote_location: document.getElementById('create-tote-location').value.trim()
  };
  
  // Add dynamic fields
  const classType = formData.class_type;
  const attributesToShow = CLASS_TYPE_ATTRIBUTES[classType] || [];
  attributesToShow.forEach(attr => {
    const field = document.getElementById(`create-${attr}`);
    if (field) {
      formData[attr] = field.value.trim();
    }
  });
  
  return formData;
}

// Show create preview
function showCreatePreview() {
  // Validate form first
  const form = document.getElementById('createForm');
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }
  
  // Additional custom validation
  const validationErrors = validateCreateForm();
  if (validationErrors.length > 0) {
    showToast('error', 'Validation Error', validationErrors[0]);
    return;
  }
  
  // Get form data
  const formData = getCreateFormData();
  
  // Generate preview
  generateCreatePreview(formData);
  
  // Switch views
  document.getElementById('createFormView').style.display = 'none';
  document.getElementById('createPreviewView').style.display = 'block';
  document.getElementById('createPreviewBtn').style.display = 'none';
  document.getElementById('createBackBtn').style.display = 'inline-block';
  document.getElementById('createSaveBtn').style.display = 'inline-block';
  document.getElementById('createCancelBtn').style.display = 'none';
  
  // Update modal title
  document.getElementById('createModalTitle').textContent = 'Preview New Item';
}

// Validate create form
function validateCreateForm() {
  const errors = [];
  
  // Validate numeric fields
  const numericFields = ['create-cost', 'create-value'];
  
  // Add dynamic numeric fields
  const classType = document.getElementById('create-class-type').value;
  const attributesToShow = CLASS_TYPE_ATTRIBUTES[classType] || [];
  attributesToShow.forEach(attr => {
    if (['stakes', 'tethers', 'length', 'height_length', 'male_ends', 'female_ends'].includes(attr)) {
      numericFields.push(`create-${attr}`);
    }
  });
  
  numericFields.forEach(fieldId => {
    const field = document.getElementById(fieldId);
    if (field && field.value.trim() !== '') {
      // Remove currency symbols and whitespace
      const cleanValue = field.value.replace(/[$,\s]/g, '');
      if (isNaN(cleanValue) || cleanValue === '') {
        const label = field.previousElementSibling?.textContent.replace(' *', '') || fieldId;
        errors.push(`${label} must be a valid number`);
      }
    }
  });
  
  // Validate power fields
  const wattsField = document.getElementById('create-watts');
  const ampsField = document.getElementById('create-amps');
  
  if (wattsField && wattsField.value.trim() !== '') {
    const watts = parseInt(wattsField.value);
    if (isNaN(watts) || watts < 1 || watts > 2000) {
      errors.push('Power (Watts) must be between 1 and 2000');
    }
  }
  
  if (ampsField && ampsField.value.trim() !== '') {
    const amps = parseFloat(ampsField.value);
    if (isNaN(amps) || amps < 0.1 || amps > 20) {
      errors.push('Current (Amps) must be between 0.1 and 20');
    }
  }
  
  return errors;
}

// Generate create preview
function generateCreatePreview(formData) {
  const previewContainer = document.getElementById('createPreviewView');
  
  let previewHTML = '<div class="preview-alert"><div class="preview-alert-icon">ℹ️</div><div class="preview-alert-content"><div class="preview-alert-title">Review Before Creating</div><div class="preview-alert-text">Please review the information below. The item ID will be auto-generated upon creation.</div></div></div>';
  
  // Basic Information Section
  previewHTML += generateCreatePreviewSection('Basic Information', [
    { label: 'Short Name', value: formData.short_name },
    { label: 'Season', value: formData.season },
    { label: 'Class', value: formData.class },
    { label: 'Class Type', value: formData.class_type },
    { label: 'Status', value: formData.status },
    { label: 'Currently Deployed', value: formData.deployed ? 'Yes' : 'No' },
    { label: 'Item Notes', value: formData.general_notes }
  ]);
  
  // Item Details Section
  const classType = formData.class_type;
  const attributesToShow = CLASS_TYPE_ATTRIBUTES[classType] || [];
  if (attributesToShow.length > 0) {
    const itemDetailsFields = attributesToShow.map(attr => {
      let value = formData[attr];
      
      // Add units for power fields
      if (attr === 'watts' && value) {
        value = `${value}W`;
      } else if (attr === 'amps' && value) {
        value = `${value}A`;
      }
      
      return {
        label: ATTRIBUTE_LABELS[attr] || formatFieldName(attr),
        value: value
      };
    });
    previewHTML += generateCreatePreviewSection('Item Details', itemDetailsFields);
  }
  
  // Vendor Information Section
  previewHTML += generateCreatePreviewSection('Vendor Information', [
    { label: 'Cost', value: formData.cost },
    { label: 'Value', value: formData.value },
    { label: 'Manufacturer', value: formData.manufacturer },
    { label: 'Store', value: formData.vendor_store }
  ]);
  
  // Storage Section
  previewHTML += generateCreatePreviewSection('Storage & Deployment', [
    { label: 'Storage Location', value: formData.tote_location }
  ]);
  
  previewContainer.innerHTML = previewHTML;
}

// Generate preview section for create
function generateCreatePreviewSection(title, fields) {
  let html = `
    <div class="preview-section">
      <div class="preview-section-header">
        <span>${title}</span>
      </div>
      <div class="preview-section-content">
  `;
  
  fields.forEach(field => {
    const displayValue = field.value || 'N/A';
    
    html += `
      <div class="preview-field">
        <div class="preview-field-label">${field.label}:</div>
        <div class="preview-field-value">${displayValue}</div>
      </div>
    `;
  });
  
  html += `
      </div>
    </div>
  `;
  
  return html;
}

// Back to create form
function backToCreateForm() {
  document.getElementById('createFormView').style.display = 'block';
  document.getElementById('createPreviewView').style.display = 'none';
  document.getElementById('createPreviewBtn').style.display = 'inline-block';
  document.getElementById('createBackBtn').style.display = 'none';
  document.getElementById('createSaveBtn').style.display = 'none';
  document.getElementById('createCancelBtn').style.display = 'inline-block';
  
  document.getElementById('createModalTitle').textContent = 'Create New Item';
}

// Save new item
async function saveNewItem() {
  const formData = getCreateFormData();
  
  try {
    const apiUrl = config.API_ENDPOINT || '';
    if (!apiUrl) {
      throw new Error('API endpoint not configured');
    }
    
    const response = await fetch(`${apiUrl}/admin/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to create item: ${response.status}`);
    }
    
    const result = await response.json();
    
    // Success!
    showToast('success', 'Item Created!', `${result.confirmation.short_name} (${result.confirmation.id})`);
    
    // Close modal
    closeModal('createModal');
    
    // Reload items
    await loadItems();
    
  } catch (error) {
    console.error('Failed to create item:', error);
    showToast('error', 'Error', error.message || 'Failed to create item');
  }
}