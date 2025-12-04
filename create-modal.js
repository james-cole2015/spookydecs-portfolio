// Create Modal - Tab-based item creation

function openCreateModal() {
  clearCreateForm();
  
  document.getElementById('createModalTitle').textContent = 'Create New Item';
  
  showCreateFormView();
  switchCreateTab('details');
  
  document.getElementById('createModal').style.display = 'flex';
}

function clearCreateForm() {
  document.getElementById('create-short-name').value = '';
  document.getElementById('create-season').value = '';
  document.getElementById('create-class').value = '';
  document.getElementById('create-class-type').value = '';
  document.getElementById('create-class-type').disabled = true;
  document.getElementById('create-status').value = 'Active';
  document.getElementById('create-deployed').checked = false;
  document.getElementById('create-general-notes').value = '';
  
  document.getElementById('create-cost').value = '';
  document.getElementById('create-value').value = '';
  document.getElementById('create-manufacturer').value = '';
  document.getElementById('create-store').value = '';
  
  document.getElementById('create-tote-location').value = '';
  
  document.getElementById('createDynamicFields').innerHTML = '<div class="field-hint" style="text-align: center; padding: 20px;">Select a Class Type to see additional fields</div>';
}

function onCreateClassChange() {
  const classSelect = document.getElementById('create-class');
  const classTypeSelect = document.getElementById('create-class-type');
  const selectedClass = classSelect.value;
  
  classTypeSelect.innerHTML = '<option value="">Select Class Type</option>';
  classTypeSelect.disabled = !selectedClass;
  
  if (!selectedClass) {
    document.getElementById('createDynamicFields').innerHTML = '<div class="field-hint" style="text-align: center; padding: 20px;">Select a Class Type to see additional fields</div>';
    return;
  }
  
  const classTypes = CLASS_HIERARCHY[selectedClass] || [];
  classTypes.forEach(type => {
    const option = document.createElement('option');
    option.value = type;
    option.textContent = type;
    classTypeSelect.appendChild(option);
  });
}

function onCreateClassTypeChange() {
  const classType = document.getElementById('create-class-type').value;
  generateCreateDynamicFields(classType);
}

function generateCreateDynamicFields(classType) {
  const container = document.getElementById('createDynamicFields');
  const attributesToShow = CLASS_TYPE_ATTRIBUTES[classType] || [];
  
  container.innerHTML = '';
  
  if (attributesToShow.length === 0) {
    container.innerHTML = '<div class="field-hint" style="text-align: center; padding: 20px;">No additional fields for this class type</div>';
    return;
  }
  
  attributesToShow.forEach(attr => {
    const formGroup = document.createElement('div');
    formGroup.className = 'form-group';
    
    const label = document.createElement('label');
    label.setAttribute('for', `create-${attr}`);
    label.textContent = ATTRIBUTE_LABELS[attr] || formatFieldName(attr);
    
    let input;
    if (attr === 'notes') {
      input = document.createElement('textarea');
      input.rows = 3;
    } else {
      input = document.createElement('input');
      input.type = 'text';
    }
    
    input.id = `create-${attr}`;
    input.name = attr;
    
    if (['stakes', 'tethers', 'length', 'height_length', 'male_ends', 'female_ends'].includes(attr)) {
      input.placeholder = 'Enter a number';
      input.addEventListener('blur', () => validateCreateNumericField(input));
    }
    
    formGroup.appendChild(label);
    formGroup.appendChild(input);
    
    const errorMsg = document.createElement('div');
    errorMsg.className = 'error-message';
    formGroup.appendChild(errorMsg);
    
    container.appendChild(formGroup);
  });
}

function validateCreateNumericField(input) {
  const formGroup = input.closest('.form-group');
  const errorMsg = formGroup.querySelector('.error-message');
  
  if (input.value.trim() === '') {
    formGroup.classList.remove('error');
    return true;
  }
  
  const cleanValue = input.value.replace(/[$,\s]/g, '');
  if (isNaN(cleanValue) || cleanValue === '') {
    formGroup.classList.add('error');
    errorMsg.textContent = 'Must be a valid number';
    return false;
  }
  
  formGroup.classList.remove('error');
  return true;
}

function switchCreateTab(tabName) {
  // Update tab buttons (desktop)
  document.querySelectorAll('#createModal .tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });
  
  // Update dropdown (mobile)
  const dropdown = document.getElementById('createTabDropdown');
  if (dropdown) {
    dropdown.value = tabName;
  }
  
  // Update tab content
  document.querySelectorAll('#createModal .tab-content').forEach(content => {
    content.classList.toggle('active', content.dataset.tab === tabName);
  });
}

function showCreateFormView() {
  document.getElementById('createFormView').style.display = 'block';
  document.getElementById('createPreviewView').style.display = 'none';
  document.getElementById('createPreviewBtn').style.display = 'inline-block';
  document.getElementById('createBackBtn').style.display = 'none';
  document.getElementById('createSaveBtn').style.display = 'none';
  document.getElementById('createCancelBtn').style.display = 'inline-block';
}

function showCreatePreview() {
  const form = document.getElementById('createForm');
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }
  
  const validationErrors = validateCreateForm();
  if (validationErrors.length > 0) {
    showToast('error', 'Validation Error', validationErrors[0]);
    return;
  }
  
  const formData = getCreateFormData();
  generateCreatePreview(formData);
  
  document.getElementById('createFormView').style.display = 'none';
  document.getElementById('createPreviewView').style.display = 'block';
  document.getElementById('createPreviewBtn').style.display = 'none';
  document.getElementById('createBackBtn').style.display = 'inline-block';
  document.getElementById('createSaveBtn').style.display = 'inline-block';
  document.getElementById('createCancelBtn').style.display = 'none';
  document.getElementById('createModalTitle').textContent = 'Preview New Item';
}

function validateCreateForm() {
  const errors = [];
  const numericFields = ['create-cost', 'create-value'];
  
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
      if (!validateCreateNumericField(field)) {
        const label = field.previousElementSibling?.textContent || fieldId;
        errors.push(`${label} must be a valid number`);
      }
    }
  });
  
  return errors;
}

function getCreateFormData() {
  const formData = {
    short_name: document.getElementById('create-short-name').value.trim(),
    season: document.getElementById('create-season').value,
    class: document.getElementById('create-class').value,
    class_type: document.getElementById('create-class-type').value,
    status: document.getElementById('create-status').value,
    deployed: document.getElementById('create-deployed').checked,
    general_notes: document.getElementById('create-general-notes').value.trim(),
    vendor_metadata: {
      cost: document.getElementById('create-cost').value.trim(),
      value: document.getElementById('create-value').value.trim(),
      manufacturer: document.getElementById('create-manufacturer').value.trim(),
      vendor_store: document.getElementById('create-store').value.trim()
    },
    packing_data: {
      tote_location: document.getElementById('create-tote-location').value.trim()
    }
  };
  
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

function backToCreateForm() {
  showCreateFormView();
  document.getElementById('createModalTitle').textContent = 'Create New Item';
}