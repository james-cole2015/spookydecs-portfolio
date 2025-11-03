// Edit Modal - Form Population and Dynamic Fields

// Edit item
function editItem(id) {
  const item = allItems.find(i => i.id === id);
  if (!item) {
    console.error('Item not found:', id);
    return;
  }
  
  // Store current item for comparison later
  window.currentEditItem = JSON.parse(JSON.stringify(item));
  
  // Populate form with item data
  populateEditForm(item);
  
  // Show form view, hide preview view
  document.getElementById('editFormView').style.display = 'block';
  document.getElementById('editPreviewView').style.display = 'none';
  document.getElementById('editPreviewBtn').style.display = 'inline-block';
  document.getElementById('editBackBtn').style.display = 'none';
  document.getElementById('editSaveBtn').style.display = 'none';
  document.getElementById('editCancelBtn').style.display = 'inline-block';
  
  // Update modal title with ID
  document.getElementById('editModalTitle').textContent = `Edit Item - ${item.id}`;
  
  // Open all accordion sections by default
  document.querySelectorAll('#editModal .accordion-content').forEach(content => {
    content.classList.add('active');
  });
  document.querySelectorAll('#editModal .accordion-header').forEach(header => {
    header.classList.remove('collapsed');
  });
  
  document.getElementById('editModal').style.display = 'flex';
}

// Populate edit form with item data
function populateEditForm(item) {
  // Basic Information
  document.getElementById('edit-short-name').value = item.short_name || '';
  document.getElementById('edit-season').value = item.season || '';
  document.getElementById('edit-class').value = item.class || '';
  document.getElementById('edit-class-type').value = item.class_type || '';
  document.getElementById('edit-status').value = item.status || '';
  document.getElementById('edit-general-notes').value = item.general_notes || '';
  
  // Vendor Information
  document.getElementById('edit-cost').value = item.vendor_metadata?.cost || '';
  document.getElementById('edit-value').value = item.vendor_metadata?.value || '';
  document.getElementById('edit-manufacturer').value = item.vendor_metadata?.manufacturer || '';
  document.getElementById('edit-store').value = item.vendor_metadata?.vendor_store || '';
  
  // Storage & Deployment (all read-only)
  document.getElementById('edit-tote-location').value = item.packing_data?.tote_location || '';
  const lastDeployment = item.deployment_data?.last_deployment_id;
  document.getElementById('edit-last-deployment').value = lastDeployment ? lastDeployment.slice(-4) : 'N/A';
  
  // Generate dynamic fields based on class_type
  generateDynamicFields(item);
}

// Generate dynamic fields based on class_type
function generateDynamicFields(item) {
  const dynamicFieldsContainer = document.getElementById('dynamicFields');
  const classType = item.class_type;
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
    
    // Add placeholder for numeric fields
    if (['stakes', 'tethers', 'length', 'height_length', 'male_ends', 'female_ends'].includes(attr)) {
      input.placeholder = 'Enter a number';
    }
    
    formGroup.appendChild(label);
    formGroup.appendChild(input);
    dynamicFieldsContainer.appendChild(formGroup);
  });
}

// Toggle accordion sections
function toggleAccordion(button) {
  const content = button.nextElementSibling;
  const isActive = content.classList.contains('active');
  
  if (isActive) {
    content.classList.remove('active');
    button.classList.add('collapsed');
  } else {
    content.classList.add('active');
    button.classList.remove('collapsed');
  }
}

// Get form data
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
    }
  };
  
  // Add dynamic fields
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