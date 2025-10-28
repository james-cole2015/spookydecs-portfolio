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
  document.querySelectorAll('.accordion-content').forEach(content => {
    content.classList.add('active');
  });
  document.querySelectorAll('.accordion-header').forEach(header => {
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
  
  // Previous deployments
  const previousDeployments = item.deployment_data?.previous_deployments || [];
  document.getElementById('edit-previous-deployments').value = 
    previousDeployments.length > 0 ? previousDeployments.join('\n') : 'No previous deployments';
  
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

// Show edit preview
function showEditPreview() {
  // Validate form first
  const form = document.getElementById('editForm');
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }
  
  // Additional custom validation
  const validationErrors = validateEditForm();
  if (validationErrors.length > 0) {
    showToast('error', 'Validation Error', validationErrors[0]);
    return;
  }
  
  // Get form data
  const formData = getEditFormData();
  
  // Generate preview
  generateEditPreview(formData);
  
  // Switch views
  document.getElementById('editFormView').style.display = 'none';
  document.getElementById('editPreviewView').style.display = 'block';
  document.getElementById('editPreviewBtn').style.display = 'none';
  document.getElementById('editBackBtn').style.display = 'inline-block';
  document.getElementById('editSaveBtn').style.display = 'inline-block';
  document.getElementById('editCancelBtn').style.display = 'none';
  
  // Update modal title
  document.getElementById('editModalTitle').textContent = 'Preview Changes';
}

// Validate edit form
function validateEditForm() {
  const errors = [];
  
  // Validate numeric fields
  const numericFields = ['edit-cost', 'edit-value'];
  
  // Add dynamic numeric fields
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
      // Remove currency symbols and whitespace
      const cleanValue = field.value.replace(/[$,\s]/g, '');
      if (isNaN(cleanValue) || cleanValue === '') {
        const label = field.previousElementSibling?.textContent.replace(' *', '') || fieldId;
        errors.push(`${label} must be a valid number`);
      }
    }
  });
  
  return errors;
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

// Generate edit preview
function generateEditPreview(formData) {
  const previewContainer = document.getElementById('editPreviewView');
  const originalItem = window.currentEditItem;
  
  // Detect changes
  const changes = detectChanges(originalItem, formData);
  
  let previewHTML = '';
  
  // Basic Information Section
  previewHTML += generatePreviewSection('Basic Information', [
    { label: 'Short Name', original: originalItem.short_name, new: formData.short_name, field: 'short_name' },
    { label: 'Season', original: originalItem.season, new: formData.season, field: 'season' },
    { label: 'Class', original: originalItem.class, new: formData.class, field: 'class' },
    { label: 'Class Type', original: originalItem.class_type, new: formData.class_type, field: 'class_type' },
    { label: 'Status', original: originalItem.status, new: formData.status, field: 'status' },
    { label: 'Item Notes', original: originalItem.general_notes, new: formData.general_notes, field: 'general_notes' }
  ], changes);
  
  // Item Details Section
  const classType = originalItem.class_type;
  const attributesToShow = CLASS_TYPE_ATTRIBUTES[classType] || [];
  if (attributesToShow.length > 0) {
    const itemDetailsFields = attributesToShow.map(attr => ({
      label: ATTRIBUTE_LABELS[attr] || formatFieldName(attr),
      original: originalItem[attr],
      new: formData[attr],
      field: attr
    }));
    previewHTML += generatePreviewSection('Item Details', itemDetailsFields, changes);
  }
  
  // Vendor Information Section
  previewHTML += generatePreviewSection('Vendor Information', [
    { label: 'Cost', original: originalItem.vendor_metadata?.cost, new: formData.vendor_metadata.cost, field: 'vendor_metadata.cost' },
    { label: 'Value', original: originalItem.vendor_metadata?.value, new: formData.vendor_metadata.value, field: 'vendor_metadata.value' },
    { label: 'Manufacturer', original: originalItem.vendor_metadata?.manufacturer, new: formData.vendor_metadata.manufacturer, field: 'vendor_metadata.manufacturer' },
    { label: 'Store', original: originalItem.vendor_metadata?.vendor_store, new: formData.vendor_metadata.vendor_store, field: 'vendor_metadata.vendor_store' }
  ], changes);
  
  previewContainer.innerHTML = previewHTML;
}

// Generate preview section
function generatePreviewSection(title, fields, changes) {
  let html = `
    <div class="preview-section">
      <div class="preview-section-header">
        <span>${title}</span>
      </div>
      <div class="preview-section-content">
  `;
  
  fields.forEach(field => {
    const isChanged = changes.has(field.field);
    const displayValue = field.new || 'N/A';
    const changedClass = isChanged ? 'changed' : '';
    
    html += `
      <div class="preview-field ${changedClass}">
        <div class="preview-field-label">${field.label}:</div>
        <div class="preview-field-value">
          ${displayValue}
          ${isChanged ? '<span class="change-indicator">Changed</span>' : ''}
        </div>
      </div>
    `;
  });
  
  html += `
      </div>
    </div>
  `;
  
  return html;
}

// Detect changes between original and new data
function detectChanges(original, updated) {
  const changes = new Set();
  
  // Check top-level fields
  ['short_name', 'season', 'class', 'status', 'general_notes'].forEach(field => {
    if ((original[field] || '') !== (updated[field] || '')) {
      changes.add(field);
    }
  });
  
  // Check dynamic fields
  const classType = original.class_type;
  const attributesToShow = CLASS_TYPE_ATTRIBUTES[classType] || [];
  attributesToShow.forEach(attr => {
    if ((original[attr] || '') !== (updated[attr] || '')) {
      changes.add(attr);
    }
  });
  
  // Check vendor_metadata
  if ((original.vendor_metadata?.cost || '') !== (updated.vendor_metadata.cost || '')) {
    changes.add('vendor_metadata.cost');
  }
  if ((original.vendor_metadata?.value || '') !== (updated.vendor_metadata.value || '')) {
    changes.add('vendor_metadata.value');
  }
  if ((original.vendor_metadata?.manufacturer || '') !== (updated.vendor_metadata.manufacturer || '')) {
    changes.add('vendor_metadata.manufacturer');
  }
  if ((original.vendor_metadata?.vendor_store || '') !== (updated.vendor_metadata.vendor_store || '')) {
    changes.add('vendor_metadata.vendor_store');
  }
  
  // Check packing_data
  if ((original.packing_data?.tote_location || '') !== (updated.packing_data.tote_location || '')) {
    changes.add('packing_data.tote_location');
  }
  
  return changes;
}

// Back to edit form
function backToEditForm() {
  document.getElementById('editFormView').style.display = 'block';
  document.getElementById('editPreviewView').style.display = 'none';
  document.getElementById('editPreviewBtn').style.display = 'inline-block';
  document.getElementById('editBackBtn').style.display = 'none';
  document.getElementById('editSaveBtn').style.display = 'none';
  document.getElementById('editCancelBtn').style.display = 'inline-block';
  
  document.getElementById('editModalTitle').textContent = `Edit Item - ${window.currentEditItem.id}`;
}

// Save edit changes
async function saveEditChanges() {
  const formData = getEditFormData();
  const itemId = window.currentEditItem.id;
  
  try {
    const apiUrl = config.API_ENDPOINT || '';
    if (!apiUrl) {
      throw new Error('API endpoint not configured');
    }
    
    // Prepare the update payload - merge with original item
    const updatePayload = {
      ...window.currentEditItem,
      ...formData,
      vendor_metadata: {
        ...window.currentEditItem.vendor_metadata,
        ...formData.vendor_metadata
      },
      // Keep original packing_data and deployment_data (read-only)
      packing_data: window.currentEditItem.packing_data,
      deployment_data: window.currentEditItem.deployment_data
    };
    
    const response = await fetch(`${apiUrl}/items/${itemId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updatePayload)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to update item: ${response.status}`);
    }
    
    // Success!
    showToast('success', 'Success!', 'Item updated successfully');
    
    // Close edit modal
    closeModal('editModal');
    
    // Reload items
    await loadItems();
    
    // If view modal was open, refresh it
    const viewModal = document.getElementById('viewModal');
    if (viewModal.style.display === 'flex') {
      viewItem(itemId);
    }
    
  } catch (error) {
    console.error('Failed to save changes:', error);
    showToast('error', 'Error', error.message || 'Failed to update item');
  }
}

// Show toast notification
function showToast(type, title, message) {
  // Remove any existing toasts
  const existingToast = document.querySelector('.toast');
  if (existingToast) {
    existingToast.remove();
  }
  
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  const icon = type === 'success' ? '✅' : '❌';
  
  toast.innerHTML = `
    <div class="toast-icon">${icon}</div>
    <div class="toast-content">
      <div class="toast-title">${title}</div>
      <div class="toast-message">${message}</div>
    </div>
    <button class="toast-close" onclick="this.parentElement.remove()">×</button>
  `;
  
  document.body.appendChild(toast);
  
  // Auto-remove after 4 seconds
  setTimeout(() => {
    if (toast.parentElement) {
      toast.remove();
    }
  }, 4000);
}// Global variables
let config = {};
let allItems = [];

// Icon mapping for class types
const CLASS_TYPE_ICONS = {
  'Cord': '🔌',
  'Inflatable': '🎈',
  'Plug': '⚡',
  'Static Prop': '🎃',
  'Animatronic': '🤖',
  'Light': '💡',
  'String Light': '💡',
  'Spot Light': '💡',
  'Adapter': '🔧'
};

// Define which attributes to show for each class_type
const CLASS_TYPE_ATTRIBUTES = {
  'Static Prop': ['stakes', 'tethers', 'height_length', 'date_acquired'],
  'Inflatable': ['stakes', 'tethers', 'height_length', 'date_acquired', 'adapter'],
  'Animatronic': ['stakes', 'tethers', 'height_length', 'date_acquired', 'adapter'],
  'String Light': ['color', 'length', 'bulb_type', 'notes'],
  'Spot Light': ['color', 'bulb_type', 'notes'],
  'Plug': ['length', 'male_ends', 'female_ends'],
  'Cord': ['length', 'male_ends', 'female_ends'],
  'Adapter': []
};

// Define which class_types have repair tracking
const HAS_REPAIR_TRACKING = ['Static Prop', 'Inflatable', 'Animatronic', 'String Light', 'Spot Light'];

// Attribute display names
const ATTRIBUTE_LABELS = {
  'stakes': '# of Stakes',
  'tethers': '# of Tethers',
  'height_length': 'Item Height / Length',
  'date_acquired': 'Date Acquired',
  'adapter': 'Adapter',
  'color': 'Color',
  'length': 'Length',
  'bulb_type': 'Bulb Type',
  'notes': 'Notes',
  'male_ends': 'Male Ends',
  'female_ends': 'Female Ends'
};

// Load configuration
async function loadConfig() {
  try {
    const response = await fetch('config.json');
    config = await response.json();
    
    // Set admin link
    if (config.ADMIN_URL) {
      document.getElementById('adminLink').href = config.ADMIN_URL;
    }
    
    // Load items after config is loaded
    await loadItems();
  } catch (error) {
    console.error('Failed to load config:', error);
  }
}

// Load items from API
async function loadItems() {
  try {
    const apiUrl = config.API_ENDPOINT || '';
    if (!apiUrl) {
      console.error('API_ENDPOINT not found in config');
      return;
    }
    
    const response = await fetch(`${apiUrl}/items`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    allItems = data.items || [];
    
    // Filter out Storage and Deployment items
    allItems = allItems.filter(item => 
      item.class !== 'Storage' && item.class !== 'Deployment'
    );
    
    updateStats();
    renderItems();
  } catch (error) {
    console.error('Failed to load items:', error);
  }
}

// Update statistics cards
function updateStats() {
  // Season stats
  const halloween = allItems.filter(i => i.season === 'Halloween').length;
  const christmas = allItems.filter(i => i.season === 'Christmas').length;
  const shared = allItems.filter(i => i.season === 'Shared').length;
  
  const halloweenEl = document.getElementById('stat-halloween');
  const christmasEl = document.getElementById('stat-christmas');
  const sharedEl = document.getElementById('stat-shared');
  
  if (halloweenEl) halloweenEl.textContent = halloween;
  if (christmasEl) christmasEl.textContent = christmas;
  if (sharedEl) sharedEl.textContent = shared;
  
  // Class stats
  const accessoryEl = document.getElementById('stat-accessory');
  const decorationEl = document.getElementById('stat-decoration');
  const lightClassEl = document.getElementById('stat-light-class');
  
  if (accessoryEl) accessoryEl.textContent = allItems.filter(i => i.class === 'Accessory').length;
  if (decorationEl) decorationEl.textContent = allItems.filter(i => i.class === 'Decoration').length;
  if (lightClassEl) lightClassEl.textContent = allItems.filter(i => i.class === 'Light').length;
}

// Render items in table and cards
function renderItems() {
  const tableBody = document.getElementById('tableBody');
  const itemCards = document.getElementById('itemCards');
  
  tableBody.innerHTML = '';
  itemCards.innerHTML = '';
  
  allItems.forEach(item => {
    // Render table row
    const row = document.createElement('tr');
    row.innerHTML = `
      <td><span class="badge ${item.status === 'Active' ? 'active' : 'inactive'}">${item.status || 'Unknown'}</span></td>
      <td>${item.short_name || 'N/A'}</td>
      <td><span class="badge ${(item.season || '').toLowerCase()}">${item.season || 'N/A'}</span></td>
      <td>${item.class_type || 'N/A'}</td>
      <td><span class="badge ${item.repair_status?.needs_repair ? 'needs-repair' : 'ok'}">${item.repair_status?.needs_repair ? 'Needs Repair' : 'OK'}</span></td>
      <td>${item.packing_data?.tote_location || 'N/A'}</td>
      <td>
        <div class="action-buttons">
          <button class="btn-small btn-primary" onclick="viewItem('${item.id}')">View</button>
          <button class="btn-small btn-secondary" onclick="editItem('${item.id}')">Edit</button>
        </div>
      </td>
    `;
    tableBody.appendChild(row);
    
    // Render mobile card
    const card = document.createElement('div');
    card.className = 'item-card';
    card.innerHTML = `
      <div class="item-card-header">
        <div class="item-card-name">${item.short_name || 'N/A'}</div>
        <span class="badge ${item.status === 'Active' ? 'active' : 'inactive'}">${item.status || 'Unknown'}</span>
      </div>
      <div class="item-card-row">
        <span class="item-card-label">Season:</span>
        <span class="badge ${(item.season || '').toLowerCase()}">${item.season || 'N/A'}</span>
      </div>
      <div class="item-card-row">
        <span class="item-card-label">Class Type:</span>
        <span>${item.class_type || 'N/A'}</span>
      </div>
      <div class="item-card-row">
        <span class="item-card-label">Repair Status:</span>
        <span class="badge ${item.repair_status?.needs_repair ? 'needs-repair' : 'ok'}">${item.repair_status?.needs_repair ? 'Needs Repair' : 'OK'}</span>
      </div>
      <div class="item-card-row">
        <span class="item-card-label">Location:</span>
        <span>${item.packing_data?.tote_location || 'N/A'}</span>
      </div>
      <div class="action-buttons" style="margin-top: 8px;">
        <button class="btn-small btn-primary" onclick="viewItem('${item.id}')">View</button>
        <button class="btn-small btn-secondary" onclick="editItem('${item.id}')">Edit</button>
      </div>
    `;
    itemCards.appendChild(card);
  });
}

// View item details
function viewItem(id) {
  const item = allItems.find(i => i.id === id);
  if (!item) {
    console.error('Item not found:', id);
    return;
  }
  
  // Populate ID (without "ID:" prefix)
  document.getElementById('viewItemId').textContent = item.id || 'N/A';
  
  // Populate basic fields
  document.getElementById('view-short-name').textContent = item.short_name || 'N/A';
  document.getElementById('view-season').textContent = item.season || 'N/A';
  document.getElementById('view-class').textContent = item.class || 'N/A';
  
  // Class type with icon
  const classTypeEl = document.getElementById('view-class-type');
  const icon = CLASS_TYPE_ICONS[item.class_type] || '📦';
  classTypeEl.innerHTML = `<span class="type-icon">${icon}</span> ${item.class_type || 'N/A'}`;
  
  document.getElementById('view-status').textContent = item.status || 'N/A';
  document.getElementById('view-general-notes').textContent = item.general_notes || 'N/A';
  
  // Needs Repair
  const needsRepairEl = document.getElementById('view-needs-repair');
  if (item.repair_status?.needs_repair === true) {
    needsRepairEl.textContent = 'YES';
    needsRepairEl.className = 'view-field-value needs-repair-yes';
  } else {
    needsRepairEl.textContent = 'NO';
    needsRepairEl.className = 'view-field-value';
  }
  
  // Storage Location
  document.getElementById('view-tote-location').textContent = 
    item.packing_data?.tote_location || 'N/A';
  
  // Last Deployment - extract last 4 characters
  const lastDeployment = item.deployment_data?.last_deployment_id;
  if (lastDeployment) {
    const last4 = lastDeployment.slice(-4);
    document.getElementById('view-last-deployment').textContent = last4;
  } else {
    document.getElementById('view-last-deployment').textContent = 'N/A';
  }
  
  // Populate expanded content with all other fields
  populateExpandedContent(item);
  
  // Reset expanded state
  document.getElementById('expandedContent').classList.remove('show');
  document.getElementById('viewPanel').classList.remove('expanded');
  document.getElementById('btnMoreInfo').textContent = 'More Information';
  
  document.getElementById('viewModal').style.display = 'flex';
}

// Populate expanded content in view modal
function populateExpandedContent(item) {
  const expandedLeft = document.getElementById('expandedLeft');
  const expandedRight = document.getElementById('expandedRight');
  expandedLeft.innerHTML = '';
  expandedRight.innerHTML = '';
  
  const classType = item.class_type;
  const hasRepairTracking = HAS_REPAIR_TRACKING.includes(classType);
  
  // LEFT SIDE - Previous Deployments
  const deploySection = document.createElement('div');
  deploySection.className = 'expanded-section';
  
  const deployTitle = document.createElement('h4');
  deployTitle.textContent = 'Previous Deployments';
  deploySection.appendChild(deployTitle);
  
  if (item.deployment_data?.previous_deployments && 
      Array.isArray(item.deployment_data.previous_deployments) && 
      item.deployment_data.previous_deployments.length > 0) {
    item.deployment_data.previous_deployments.forEach(dep => {
      const listItem = document.createElement('div');
      listItem.className = 'list-item';
      listItem.style.paddingLeft = '12px';
      listItem.textContent = dep;
      deploySection.appendChild(listItem);
    });
  } else {
    const noData = document.createElement('div');
    noData.className = 'list-item';
    noData.style.paddingLeft = '12px';
    noData.textContent = 'No previous deployments';
    deploySection.appendChild(noData);
  }
  
  expandedLeft.appendChild(deploySection);
  
  // LEFT SIDE - Repair Information (only for items with repair tracking)
  if (hasRepairTracking) {
    const repairSection = document.createElement('div');
    repairSection.className = 'expanded-section';
    
    const repairTitle = document.createElement('h4');
    repairTitle.textContent = 'Repair Information';
    repairSection.appendChild(repairTitle);
    
    // Last Repair Date
    const repairDateField = document.createElement('div');
    repairDateField.className = 'expanded-field';
    const repairDateLabel = document.createElement('div');
    repairDateLabel.className = 'expanded-field-label';
    repairDateLabel.textContent = 'Last Repair Date:';
    const repairDateValue = document.createElement('div');
    repairDateValue.className = 'expanded-field-value';
    repairDateValue.textContent = item.repair_status?.last_repair_date || 'N/A';
    repairDateField.appendChild(repairDateLabel);
    repairDateField.appendChild(repairDateValue);
    repairSection.appendChild(repairDateField);
    
    // Repair Notes
    const repairNotesField = document.createElement('div');
    repairNotesField.className = 'expanded-field';
    const repairNotesLabel = document.createElement('div');
    repairNotesLabel.className = 'expanded-field-label';
    repairNotesLabel.textContent = 'Repair Notes:';
    const repairNotesValue = document.createElement('div');
    repairNotesValue.className = 'expanded-field-value';
    repairNotesValue.textContent = item.repair_status?.repair_notes || 'N/A';
    repairNotesField.appendChild(repairNotesLabel);
    repairNotesField.appendChild(repairNotesValue);
    repairSection.appendChild(repairNotesField);
    
    // Repair Criticality
    const repairCritField = document.createElement('div');
    repairCritField.className = 'expanded-field';
    const repairCritLabel = document.createElement('div');
    repairCritLabel.className = 'expanded-field-label';
    repairCritLabel.textContent = 'Repair Criticality:';
    const repairCritValue = document.createElement('div');
    repairCritValue.className = 'expanded-field-value';
    repairCritValue.textContent = item.repair_status?.last_criticality || 'N/A';
    repairCritField.appendChild(repairCritLabel);
    repairCritField.appendChild(repairCritValue);
    repairSection.appendChild(repairCritField);
    
    expandedLeft.appendChild(repairSection);
  }
  
  // RIGHT SIDE - Item Information (dynamic based on class_type)
  const attributesToShow = CLASS_TYPE_ATTRIBUTES[classType] || [];
  
  if (attributesToShow.length > 0) {
    const itemSection = document.createElement('div');
    itemSection.className = 'expanded-section';
    
    const itemTitle = document.createElement('h4');
    itemTitle.textContent = 'Item Information';
    itemSection.appendChild(itemTitle);
    
    attributesToShow.forEach(attr => {
      const field = document.createElement('div');
      field.className = 'expanded-field';
      
      const label = document.createElement('div');
      label.className = 'expanded-field-label';
      label.textContent = (ATTRIBUTE_LABELS[attr] || formatFieldName(attr)) + ':';
      
      const value = document.createElement('div');
      value.className = 'expanded-field-value';
      value.textContent = item[attr] || 'N/A';
      
      field.appendChild(label);
      field.appendChild(value);
      itemSection.appendChild(field);
    });
    
    expandedRight.appendChild(itemSection);
  }
  
  // RIGHT SIDE - Vendor Information
  const vendorSection = document.createElement('div');
  vendorSection.className = 'expanded-section';
  
  const vendorTitle = document.createElement('h4');
  vendorTitle.textContent = 'Vendor Information';
  vendorSection.appendChild(vendorTitle);
  
  // Cost
  const costField = document.createElement('div');
  costField.className = 'expanded-field';
  const costLabel = document.createElement('div');
  costLabel.className = 'expanded-field-label';
  costLabel.textContent = 'Cost:';
  const costValue = document.createElement('div');
  costValue.className = 'expanded-field-value';
  costValue.textContent = item.vendor_metadata?.cost || 'N/A';
  costField.appendChild(costLabel);
  costField.appendChild(costValue);
  vendorSection.appendChild(costField);
  
  // Value
  const valueField = document.createElement('div');
  valueField.className = 'expanded-field';
  const valueLabel = document.createElement('div');
  valueLabel.className = 'expanded-field-label';
  valueLabel.textContent = 'Value:';
  const valueValue = document.createElement('div');
  valueValue.className = 'expanded-field-value';
  valueValue.textContent = item.vendor_metadata?.value || 'N/A';
  valueField.appendChild(valueLabel);
  valueField.appendChild(valueValue);
  vendorSection.appendChild(valueField);
  
  // Manufacturer
  const mfgField = document.createElement('div');
  mfgField.className = 'expanded-field';
  const mfgLabel = document.createElement('div');
  mfgLabel.className = 'expanded-field-label';
  mfgLabel.textContent = 'Manufacturer:';
  const mfgValue = document.createElement('div');
  mfgValue.className = 'expanded-field-value';
  mfgValue.textContent = item.vendor_metadata?.manufacturer || 'N/A';
  mfgField.appendChild(mfgLabel);
  mfgField.appendChild(mfgValue);
  vendorSection.appendChild(mfgField);
  
  // Store
  const storeField = document.createElement('div');
  storeField.className = 'expanded-field';
  const storeLabel = document.createElement('div');
  storeLabel.className = 'expanded-field-label';
  storeLabel.textContent = 'Store:';
  const storeValue = document.createElement('div');
  storeValue.className = 'expanded-field-value';
  storeValue.textContent = item.vendor_metadata?.vendor_store || 'N/A';
  storeField.appendChild(storeLabel);
  storeField.appendChild(storeValue);
  vendorSection.appendChild(storeField);
  
  expandedRight.appendChild(vendorSection);
}

// Helper function to format field names
function formatFieldName(key) {
  return key
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Toggle expanded information in view modal
function toggleMoreInfo() {
  const expandedContent = document.getElementById('expandedContent');
  const viewPanel = document.getElementById('viewPanel');
  const btn = document.getElementById('btnMoreInfo');
  
  if (expandedContent.classList.contains('show')) {
    expandedContent.classList.remove('show');
    viewPanel.classList.remove('expanded');
    btn.textContent = 'More Information';
  } else {
    expandedContent.classList.add('show');
    viewPanel.classList.add('expanded');
    btn.textContent = 'Less Information';
  }
}

// Edit item from view modal
function editItemFromView() {
  closeModal('viewModal');
  // Get the current item ID from the view modal
  const idText = document.getElementById('viewItemId').textContent;
  const id = idText.replace('ID: ', '');
  editItem(id);
}

// Edit item
function editItem(id) {
  document.getElementById('editModal').style.display = 'flex';
}

// Close modal
function closeModal(modalId) {
  document.getElementById(modalId).style.display = 'none';
}

// Event Listeners
document.getElementById('btnCreateItem').addEventListener('click', () => {
  document.getElementById('createModal').style.display = 'flex';
});

document.getElementById('btnDeleteItem').addEventListener('click', () => {
  document.getElementById('deleteModal').style.display = 'flex';
});

document.getElementById('btnLogout').addEventListener('click', () => {
  alert('Logout clicked');
});

// Search functionality
document.getElementById('searchInput').addEventListener('input', (e) => {
  console.log('Search:', e.target.value);
});

// Close modals when clicking outside
window.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal')) {
    e.target.style.display = 'none';
  }
});

// Initialize application
loadConfig();