// Edit Modal - Preview and Validation

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