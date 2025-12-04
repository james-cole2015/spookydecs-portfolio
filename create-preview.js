// Create Preview - Generate preview and save new item

function generateCreatePreview(formData) {
  const container = document.getElementById('createPreviewView');
  
  let html = `
    <div class="preview-alert">
      <div class="preview-alert-icon">✨</div>
      <div class="preview-alert-content">
        <div class="preview-alert-title">Review New Item</div>
        <div class="preview-alert-text">
          Please review the details below before creating this item.
        </div>
      </div>
    </div>
  `;
  
  // Details section
  html += generateCreatePreviewSection('Details', [
    { label: 'Name', value: formData.short_name },
    { label: 'Season', value: formData.season },
    { label: 'Class', value: formData.class },
    { label: 'Class Type', value: formData.class_type },
    { label: 'Status', value: formData.status },
    { label: 'Deployed', value: formData.deployed ? 'Yes' : 'No' },
    { label: 'Item Notes', value: formData.general_notes }
  ]);
  
  // Dynamic fields
  const classType = formData.class_type;
  const attributesToShow = CLASS_TYPE_ATTRIBUTES[classType] || [];
  if (attributesToShow.length > 0) {
    const dynamicFields = attributesToShow.map(attr => ({
      label: ATTRIBUTE_LABELS[attr] || formatFieldName(attr),
      value: formData[attr]
    }));
    html += generateCreatePreviewSection('Additional Details', dynamicFields);
  }
  
  // Vendor section
  const vm = formData.vendor_metadata || {};
  html += generateCreatePreviewSection('Vendor Information', [
    { label: 'Store', value: vm.vendor_store },
    { label: 'Manufacturer', value: vm.manufacturer },
    { label: 'Cost', value: vm.cost },
    { label: 'Value', value: vm.value }
  ]);
  
  // Storage section
  const pd = formData.packing_data || {};
  html += generateCreatePreviewSection('Storage', [
    { label: 'Storage Location', value: pd.tote_location }
  ]);
  
  container.innerHTML = html;
}

function generateCreatePreviewSection(title, fields) {
  let html = `
    <div class="preview-section">
      <div class="preview-section-header">${title}</div>
      <div class="preview-section-content">
  `;
  
  fields.forEach(field => {
    const displayValue = field.value || '-';
    
    html += `
      <div class="preview-field">
        <div class="preview-field-label">${field.label}:</div>
        <div class="preview-field-value">${displayValue}</div>
      </div>
    `;
  });
  
  html += '</div></div>';
  return html;
}

async function saveNewItem() {
  const formData = getCreateFormData();
  
  try {
    // Generate ID
    const shortName = formData.short_name.replace(/\s+/g, '-').toUpperCase();
    const season = formData.season.substring(0, 3).toUpperCase();
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const newId = `${season}-${shortName}-${randomSuffix}`;
    
    // Build payload
    const newItem = {
      id: newId,
      type: 'Item',
      ...formData,
      repair_status: {
        needs_repair: false,
        last_repair_date: null,
        repair_notes: null,
        last_criticality: null
      },
      deployment_data: {
        last_deployment_id: null,
        previous_deployments: []
      }
    };
    
    // If deployed checkbox is checked, set last_deployment_id
    if (formData.deployed) {
      newItem.deployment_data.last_deployment_id = 'CURR';
    }
    
    await saveItemToAPI(newId, newItem);
    
    showToast('success', 'Success!', 'Item created successfully');
    closeModal('createModal');
    await loadItems();
  } catch (error) {
    console.error('Failed to create item:', error);
    showToast('error', 'Error', error.message || 'Failed to create item');
  }
}