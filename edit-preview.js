// Edit Preview - Generate preview with change highlights

function generateEditPreview(formData) {
  const container = document.getElementById('editPreviewView');
  const original = window.currentEditItem;
  const changes = detectChanges(original, formData);
  
  let html = `
    <div class="preview-alert">
      <div class="preview-alert-icon">⚠️</div>
      <div class="preview-alert-content">
        <div class="preview-alert-title">Review Your Changes</div>
        <div class="preview-alert-text">
          ${changes.size} field${changes.size !== 1 ? 's' : ''} will be updated. 
          Changed fields are highlighted below.
        </div>
      </div>
    </div>
  `;
  
  // Details section
  html += generatePreviewSection('Details', [
    { label: 'Name', original: original.short_name, new: formData.short_name, field: 'short_name' },
    { label: 'Season', original: original.season, new: formData.season, field: 'season' },
    { label: 'Class', original: original.class, new: formData.class, field: 'class' },
    { label: 'Class Type', original: original.class_type, new: formData.class_type, field: 'class_type' },
    { label: 'Status', original: original.status, new: formData.status, field: 'status' },
    { label: 'Item Notes', original: original.general_notes, new: formData.general_notes, field: 'general_notes' }
  ], changes);
  
  // Dynamic fields
  const classType = original.class_type;
  const attributesToShow = CLASS_TYPE_ATTRIBUTES[classType] || [];
  if (attributesToShow.length > 0) {
    const dynamicFields = attributesToShow.map(attr => ({
      label: ATTRIBUTE_LABELS[attr] || formatFieldName(attr),
      original: original[attr],
      new: formData[attr],
      field: attr
    }));
    html += generatePreviewSection('Additional Details', dynamicFields, changes);
  }
  
  // Vendor section
  html += generatePreviewSection('Vendor Information', [
    { label: 'Cost', original: original.vendor_metadata?.cost, new: formData.vendor_metadata.cost, field: 'vendor_metadata.cost' },
    { label: 'Value', original: original.vendor_metadata?.value, new: formData.vendor_metadata.value, field: 'vendor_metadata.value' },
    { label: 'Manufacturer', original: original.vendor_metadata?.manufacturer, new: formData.vendor_metadata.manufacturer, field: 'vendor_metadata.manufacturer' },
    { label: 'Store', original: original.vendor_metadata?.vendor_store, new: formData.vendor_metadata.vendor_store, field: 'vendor_metadata.vendor_store' }
  ], changes);
  
  // Storage section
  html += generatePreviewSection('Storage', [
    { label: 'Storage Location', original: original.packing_data?.tote_location, new: formData.packing_data.tote_location, field: 'packing_data.tote_location' }
  ], changes);
  
  container.innerHTML = html;
}

function generatePreviewSection(title, fields, changes) {
  let html = `
    <div class="preview-section">
      <div class="preview-section-header">${title}</div>
      <div class="preview-section-content">
  `;
  
  fields.forEach(field => {
    const isChanged = changes.has(field.field);
    const displayValue = field.new || '-';
    const changedClass = isChanged ? 'changed' : '';
    
    html += `
      <div class="preview-field ${changedClass}">
        <div class="preview-field-label">${field.label}:</div>
        <div class="preview-field-value">
          ${displayValue}
          ${isChanged ? '<span class="change-indicator">✓ Changed</span>' : ''}
        </div>
      </div>
    `;
  });
  
  html += '</div></div>';
  return html;
}

function detectChanges(original, updated) {
  const changes = new Set();
  
  // Top-level fields
  ['short_name', 'season', 'class', 'status', 'general_notes'].forEach(field => {
    if ((original[field] || '') !== (updated[field] || '')) {
      changes.add(field);
    }
  });
  
  // Dynamic fields
  const classType = original.class_type;
  const attributesToShow = CLASS_TYPE_ATTRIBUTES[classType] || [];
  attributesToShow.forEach(attr => {
    if ((original[attr] || '') !== (updated[attr] || '')) {
      changes.add(attr);
    }
  });
  
  // Vendor metadata
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
  
  // Packing data
  if ((original.packing_data?.tote_location || '') !== (updated.packing_data.tote_location || '')) {
    changes.add('packing_data.tote_location');
  }
  
  return changes;
}

async function saveEditChanges() {
  const formData = collectEditFormData();
  const itemId = window.currentEditItem.id;
  
  try {
    const updatePayload = {
      ...window.currentEditItem,
      ...formData,
      vendor_metadata: {
        ...window.currentEditItem.vendor_metadata,
        ...formData.vendor_metadata
      },
      packing_data: {
        ...window.currentEditItem.packing_data,
        ...formData.packing_data
      },
      deployment_data: window.currentEditItem.deployment_data
    };
    
    await saveItemToAPI(itemId, updatePayload);
    
    showToast('success', 'Success!', 'Item updated successfully');
    closeModal('editModal');
    await loadItems();
    
    const viewModal = document.getElementById('viewModal');
    if (viewModal.style.display === 'flex') {
      viewItem(itemId);
    }
  } catch (error) {
    console.error('Failed to save changes:', error);
    showToast('error', 'Error', error.message || 'Failed to update item');
  }
}