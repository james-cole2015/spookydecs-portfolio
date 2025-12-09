// Create Modal - Tab-based item creation with photo upload

// Photo state for create modal
let createPhotosSelected = [];

function openCreateModal() {
  clearCreateForm();
  
  document.getElementById('createModalTitle').textContent = 'Create New Item';
  
  showCreateFormView();
  switchCreateTab('details');
  
  openModal('createModal');
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
  
  // Clear photo state
  createPhotosSelected = [];
  updateCreatePhotoDisplay();
}

function onCreateClassChange() {
  const classSelect = document.getElementById('create-class');
  const classTypeSelect = document.getElementById('create-class-type');
  const selectedClass = classSelect.value;
  
  classTypeSelect.innerHTML = '<option value="">Select Class Type</option>';
  classTypeSelect.disabled = !selectedClass;
  
  if (!selectedClass) {
    document.getElementById('createDynamicFields').innerHTML = '<div class="field-hint" style="text-align: center; padding: 20px;">Select a Class Type to see additional fields</div>';
    hideCreatePhotoSection();
    return;
  }
  
  const classTypes = CLASS_HIERARCHY[selectedClass] || [];
  classTypes.forEach(type => {
    const option = document.createElement('option');
    option.value = type;
    option.textContent = type;
    classTypeSelect.appendChild(option);
  });
  
  // Show/hide photo section based on class
  if (selectedClass === 'Decoration') {
    showCreatePhotoSection();
  } else {
    hideCreatePhotoSection();
  }
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

function showCreatePhotoSection() {
  let photoSection = document.getElementById('createPhotoSection');
  
  if (!photoSection) {
    // Create photo section
    photoSection = document.createElement('div');
    photoSection.id = 'createPhotoSection';
    photoSection.className = 'form-group';
    photoSection.style.marginTop = '20px';
    photoSection.style.paddingTop = '20px';
    photoSection.style.borderTop = '1px solid #e5e7eb';
    
    photoSection.innerHTML = `
      <label>Photos <span style="color: #6b7280; font-weight: normal;">(Optional, max 3)</span></label>
      <div style="display: flex; gap: 12px; align-items: center;">
        <button type="button" class="btn-secondary" onclick="selectCreatePhotos()" style="margin: 0;">
          📤 Select Photos
        </button>
        <div id="createPhotoCount" style="color: #6b7280; font-size: 14px;">
          No photos selected
        </div>
      </div>
      <input type="file" id="createPhotoInput" accept="image/jpeg,image/jpg,image/png,image/heic,image/heif" multiple webkitdirectory="false" style="display: none;">
    `;
    
    // Insert after general notes field
    const generalNotesGroup = document.querySelector('#create-general-notes').closest('.form-group');
    generalNotesGroup.parentNode.insertBefore(photoSection, generalNotesGroup.nextSibling);
    
    // Add event listener to file input
    document.getElementById('createPhotoInput').addEventListener('change', handleCreatePhotoSelection);
  }
  
  photoSection.style.display = 'block';
}

function hideCreatePhotoSection() {
  const photoSection = document.getElementById('createPhotoSection');
  if (photoSection) {
    photoSection.style.display = 'none';
  }
  createPhotosSelected = [];
}

function selectCreatePhotos() {
  document.getElementById('createPhotoInput').click();
}

function handleCreatePhotoSelection(event) {
  const files = Array.from(event.target.files);
  
  // Limit to 3 photos
  if (files.length > 3) {
    showToast('error', 'Too many photos', 'Maximum 3 photos allowed during item creation');
    event.target.value = ''; // Clear selection
    return;
  }
  
  // Validate each file
  try {
    files.forEach(file => validateFile(file));
    createPhotosSelected = files;
    updateCreatePhotoDisplay();
  } catch (error) {
    showToast('error', 'Invalid file', error.message);
    event.target.value = ''; // Clear selection
    createPhotosSelected = [];
    updateCreatePhotoDisplay();
  }
}

function updateCreatePhotoDisplay() {
  const countDisplay = document.getElementById('createPhotoCount');
  if (!countDisplay) return;
  
  if (createPhotosSelected.length === 0) {
    countDisplay.textContent = 'No photos selected';
    countDisplay.style.color = '#6b7280';
  } else {
    const fileNames = createPhotosSelected.map(f => f.name).join(', ');
    countDisplay.innerHTML = `<strong>${createPhotosSelected.length} photo${createPhotosSelected.length > 1 ? 's' : ''} selected</strong><br><span style="font-size: 13px;">${fileNames}</span>`;
    countDisplay.style.color = '#059669';
  }
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