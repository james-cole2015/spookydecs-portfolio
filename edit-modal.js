// Edit Modal - Tab-based editing with validation

function editItem(id) {
  const item = allItems.find(i => i.id === id);
  if (!item) {
    console.error('Item not found:', id);
    return;
  }
  
  window.currentEditItem = JSON.parse(JSON.stringify(item));
  
  // Populate form
  populateEditForm(item);
  
  // Show form view
  showEditFormView();
  
  // Set title
  document.getElementById('editModalTitle').textContent = `Edit Item - ${item.id}`;
  
  // Switch to Details tab
  switchEditTab('details');
  
  // Show modal
  document.getElementById('editModal').style.display = 'flex';
}

function populateEditForm(item) {
  // Details tab - Basic fields
  document.getElementById('edit-short-name').value = item.short_name || '';
  document.getElementById('edit-season').value = item.season || '';
  document.getElementById('edit-class').value = item.class || '';
  document.getElementById('edit-class-type').value = item.class_type || '';
  document.getElementById('edit-status').value = item.status || '';
  document.getElementById('edit-general-notes').value = item.general_notes || '';
  
  // Vendor tab
  document.getElementById('edit-cost').value = item.vendor_metadata?.cost || '';
  document.getElementById('edit-value').value = item.vendor_metadata?.value || '';
  document.getElementById('edit-manufacturer').value = item.vendor_metadata?.manufacturer || '';
  document.getElementById('edit-store').value = item.vendor_metadata?.vendor_store || '';
  
  // Storage tab
  document.getElementById('edit-tote-location').value = item.packing_data?.tote_location || '';
  
  // Misc tab - Generate dynamic fields
  generateEditMiscFields(item);
}

function generateEditMiscFields(item) {
  const container = document.getElementById('editMiscFields');
  const classType = item.class_type;
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
    label.setAttribute('for', `edit-${attr}`);
    label.textContent = ATTRIBUTE_LABELS[attr] || formatFieldName(attr);
    
    let input;
    if (attr === 'notes') {
      input = document.createElement('textarea');
      input.rows = 3;
    } else {
      input = document.createElement('input');
      input.type = 'text';
    }
    
    input.id = `edit-${attr}`;
    input.name = attr;
    input.value = item[attr] || '';
    
    if (['stakes', 'tethers', 'length', 'height_length', 'male_ends', 'female_ends'].includes(attr)) {
      input.placeholder = 'Enter a number';
      input.addEventListener('blur', () => validateNumericField(input));
    }
    
    formGroup.appendChild(label);
    formGroup.appendChild(input);
    
    const errorMsg = document.createElement('div');
    errorMsg.className = 'error-message';
    formGroup.appendChild(errorMsg);
    
    container.appendChild(formGroup);
  });
}

function validateNumericField(input) {
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

function switchEditTab(tabName) {
  // Update tab buttons (desktop)
  document.querySelectorAll('#editModal .tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });
  
  // Update dropdown (mobile)
  const dropdown = document.getElementById('editTabDropdown');
  if (dropdown) {
    dropdown.value = tabName;
  }
  
  // Update tab content
  document.querySelectorAll('#editModal .tab-content').forEach(content => {
    content.classList.toggle('active', content.dataset.tab === tabName);
  });
}

function showEditFormView() {
  document.getElementById('editFormView').style.display = 'block';
  document.getElementById('editPreviewView').style.display = 'none';
  document.getElementById('editPreviewBtn').style.display = 'inline-block';
  document.getElementById('editBackBtn').style.display = 'none';
  document.getElementById('editSaveBtn').style.display = 'none';
  document.getElementById('editCancelBtn').style.display = 'inline-block';
}

function showEditPreview() {
  const form = document.getElementById('editForm');
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }
  
  const validationErrors = validateEditForm();
  if (validationErrors.length > 0) {
    showToast('error', 'Validation Error', validationErrors[0]);
    return;
  }
  
  const formData = getEditFormData();
  generateEditPreview(formData);
  
  document.getElementById('editFormView').style.display = 'none';
  document.getElementById('editPreviewView').style.display = 'block';
  document.getElementById('editPreviewBtn').style.display = 'none';
  document.getElementById('editBackBtn').style.display = 'inline-block';
  document.getElementById('editSaveBtn').style.display = 'inline-block';
  document.getElementById('editCancelBtn').style.display = 'none';
  document.getElementById('editModalTitle').textContent = 'Preview Changes';
}

function validateEditForm() {
  const errors = [];
  const numericFields = ['edit-cost', 'edit-value'];
  
  const classType = window.currentEditItem.class_type;
  const attributesToShow = CLASS_TYPE_ATTRIBUTES[classType] || [];
  attributesToShow.forEach(attr => {
    if (['stakes', 'tethers', 'length', 'height_length', 'male_ends', 'female_ends'].includes(attr)) {
      numericFields.push(`edit-${attr}`);
    }
  });
  
  numericFields.forEach(fieldId => {
    const field = document.getElementById(fieldId);
    if (field && field.value.trim() !== '') {
      if (!validateNumericField(field)) {
        const label = field.previousElementSibling?.textContent || fieldId;
        errors.push(`${label} must be a valid number`);
      }
    }
  });
  
  return errors;
}

function getEditFormData() {
  const formData = {
    short_name: document.getElementById('edit-short-name').value.trim(),
    season: document.getElementById('edit-season').value,
    class: document.getElementById('edit-class').value,
    class_type: document.getElementById('edit-class-type').value,
    status: document.getElementById('edit-status').value,
    general_notes: document.getElementById('edit-general-notes').value.trim(),
    vendor_metadata: {
      cost: document.getElementById('edit-cost').value.trim(),
      value: document.getElementById('edit-value').value.trim(),
      manufacturer: document.getElementById('edit-manufacturer').value.trim(),
      vendor_store: document.getElementById('edit-store').value.trim()
    },
    packing_data: {
      tote_location: document.getElementById('edit-tote-location').value.trim()
    }
  };
  
  const classType = window.currentEditItem.class_type;
  const attributesToShow = CLASS_TYPE_ATTRIBUTES[classType] || [];
  attributesToShow.forEach(attr => {
    const field = document.getElementById(`edit-${attr}`);
    if (field) {
      formData[attr] = field.value.trim();
    }
  });
  
  return formData;
}

function backToEditForm() {
  showEditFormView();
  document.getElementById('editModalTitle').textContent = `Edit Item - ${window.currentEditItem.id}`;
}