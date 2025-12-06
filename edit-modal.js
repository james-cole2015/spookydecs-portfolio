// edit-modal.js - Edit item functionality

window.currentEditItem = null;

function editItem(id) {
  const item = allItems.find(i => i.id === id);
  if (!item) {
    console.error('Item not found:', id);
    return;
  }
  
 window.currentEditItem = item;
  
  // Set modal title
  document.getElementById('editModalTitle').textContent = 'Edit Item';
  
  // Populate form fields - Details tab
  document.getElementById('edit-short-name').value = item.short_name || '';
  document.getElementById('edit-season').value = item.season || '';
  document.getElementById('edit-class').value = item.class || '';
  document.getElementById('edit-class-type').value = item.class_type || '';
  document.getElementById('edit-status').value = item.status || 'Active';
  document.getElementById('edit-general-notes').value = item.general_notes || '';
  
  // Populate form fields - Vendor tab
  const vm = item.vendor_metadata || {};
  document.getElementById('edit-store').value = vm.vendor_store || '';
  document.getElementById('edit-manufacturer').value = vm.manufacturer || '';
  document.getElementById('edit-cost').value = vm.cost || '';
  document.getElementById('edit-value').value = vm.value || '';
  
  // Populate form fields - Storage tab
  const pd = item.packing_data || {};
  document.getElementById('edit-tote-location').value = pd.tote_location || '';
  
  // Populate misc fields
  populateEditMiscFields(item);
  
  // Switch to Details tab
  switchEditTab('details');
  
  // Show form, hide preview
  document.getElementById('editFormView').style.display = 'block';
  document.getElementById('editPreviewView').style.display = 'none';
  
  // Show/hide appropriate buttons
  document.getElementById('editCancelBtn').style.display = 'inline-block';
  document.getElementById('editPreviewBtn').style.display = 'inline-block';
  document.getElementById('editBackBtn').style.display = 'none';
  document.getElementById('editSaveBtn').style.display = 'none';
  
  // Show modal
  openModal('editModal');
}

function populateEditMiscFields(item) {
  const container = document.getElementById('editMiscFields');
  const classType = item.class_type;
  const attributesToShow = CLASS_TYPE_ATTRIBUTES[classType] || [];
  
  if (attributesToShow.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📦</div>
        <div>No additional attributes for this class type</div>
      </div>
    `;
    return;
  }
  
  let html = '';
  
  attributesToShow.forEach(attr => {
    const label = ATTRIBUTE_LABELS[attr] || formatFieldName(attr);
    const value = item[attr] || '';
    
    html += `
      <div class="form-group">
        <label for="edit-${attr}">${label}</label>
        <input type="text" id="edit-${attr}" value="${value}">
      </div>
    `;
  });
  
  container.innerHTML = html;
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

function showEditPreview() {
  // Validate form
  const form = document.getElementById('editForm');
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }
  
  // Collect form data
  const formData = collectEditFormData();
  
  // Generate preview HTML
  const previewHtml = generateEditPreviewHtml(formData);
  
  // Show preview
  document.getElementById('editPreviewView').innerHTML = previewHtml;
  document.getElementById('editFormView').style.display = 'none';
  document.getElementById('editPreviewView').style.display = 'block';
  
  // Update buttons
  document.getElementById('editCancelBtn').style.display = 'none';
  document.getElementById('editPreviewBtn').style.display = 'none';
  document.getElementById('editBackBtn').style.display = 'inline-block';
  document.getElementById('editSaveBtn').style.display = 'inline-block';
}

function backToEditForm() {
  document.getElementById('editFormView').style.display = 'block';
  document.getElementById('editPreviewView').style.display = 'none';
  
  document.getElementById('editCancelBtn').style.display = 'inline-block';
  document.getElementById('editPreviewBtn').style.display = 'inline-block';
  document.getElementById('editBackBtn').style.display = 'none';
  document.getElementById('editSaveBtn').style.display = 'none';
}

function collectEditFormData() {
  const formData = {
    id: window.currentEditItem.id,
    short_name: document.getElementById('edit-short-name').value,
    season: document.getElementById('edit-season').value,
    class: document.getElementById('edit-class').value,
    class_type: document.getElementById('edit-class-type').value,
    status: document.getElementById('edit-status').value,
    general_notes: document.getElementById('edit-general-notes').value,
    vendor_metadata: {
      vendor_store: document.getElementById('edit-store').value,
      manufacturer: document.getElementById('edit-manufacturer').value,
      cost: document.getElementById('edit-cost').value,
      value: document.getElementById('edit-value').value,
    },
    packing_data: {
      tote_location: document.getElementById('edit-tote-location').value,
    },
  };
  
  // Collect misc fields
  const classType = window.currentEditItem.class_type;
  const attributesToShow = CLASS_TYPE_ATTRIBUTES[classType] || [];
  
  attributesToShow.forEach(attr => {
    const input = document.getElementById(`edit-${attr}`);
    if (input) {
      formData[attr] = input.value;
    }
  });
  
  return formData;
}

function generateEditPreviewHtml(formData) {
  const icon = CLASS_TYPE_ICONS[formData.class_type] || '📦';
  
  return `
    <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px;">
      <h3 style="margin: 0 0 16px 0; color: #374151; font-size: 16px; font-weight: 600;">Preview Changes</h3>
      
      <div class="preview-section">
        <div class="preview-section-title">Details</div>
        <div class="field-row">
          <div class="field-label">Name:</div>
          <div class="field-value">${formData.short_name || '-'}</div>
        </div>
        <div class="field-row">
          <div class="field-label">Season:</div>
          <div class="field-value">${formData.season || '-'}</div>
        </div>
        <div class="field-row">
          <div class="field-label">Class:</div>
          <div class="field-value">${formData.class || '-'}</div>
        </div>
        <div class="field-row">
          <div class="field-label">Class Type:</div>
          <div class="field-value"><span class="type-icon">${icon}</span> ${formData.class_type || '-'}</div>
        </div>
        <div class="field-row">
          <div class="field-label">Status:</div>
          <div class="field-value">${formData.status || '-'}</div>
        </div>
        <div class="field-row">
          <div class="field-label">Item Notes:</div>
          <div class="field-value">${formData.general_notes || '-'}</div>
        </div>
      </div>
      
      <div class="preview-section">
        <div class="preview-section-title">Vendor</div>
        <div class="field-row">
          <div class="field-label">Store:</div>
          <div class="field-value">${formData.vendor_metadata.vendor_store || '-'}</div>
        </div>
        <div class="field-row">
          <div class="field-label">Manufacturer:</div>
          <div class="field-value">${formData.vendor_metadata.manufacturer || '-'}</div>
        </div>
        <div class="field-row">
          <div class="field-label">Cost:</div>
          <div class="field-value">${formData.vendor_metadata.cost || '-'}</div>
        </div>
        <div class="field-row">
          <div class="field-label">Value:</div>
          <div class="field-value">${formData.vendor_metadata.value || '-'}</div>
        </div>
      </div>
      
      <div class="preview-section">
        <div class="preview-section-title">Storage</div>
        <div class="field-row">
          <div class="field-label">Storage Location:</div>
          <div class="field-value">${formData.packing_data.tote_location || '-'}</div>
        </div>
      </div>
    </div>
  `;
}
/*
async function saveEditChanges() {
  try {
    const formData = collectEditFormData();
    
    // Disable save button
    const saveBtn = document.getElementById('editSaveBtn');
    const originalText = saveBtn.textContent;
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';
    
    // Call API
    await updateItem(formData);
    
    // Close modal
    closeModal('editModal');
    
    // Show success message
    showToast('Item Updated', 'Item was successfully updated', 'success');
    
    // Refresh table
    await loadItems();
    
  } catch (error) {
    console.error('Error saving changes:', error);
    showToast('Save Failed', error.message || 'Failed to save changes', 'error');
    
    // Re-enable button
    const saveBtn = document.getElementById('editSaveBtn');
    saveBtn.disabled = false;
    saveBtn.textContent = 'Confirm & Save';
  }
}
*/ // removing duplicate function 
/**
 * Delete item from the edit modal
 */
async function deleteFromEditModal() {
  if (!window.currentEditItem) {
    console.error('No item currently being edited');
    return;
  }
  
  // Check if item is deployed
  if (isItemDeployed(window.currentEditItem)) {
    showToast('Cannot Delete', 'Deployed items cannot be deleted', 'error');
    return;
  }
  
  // Confirm deletion
  const itemName = window.currentEditItem.short_name || 'this item';
  const confirmMessage = `Delete '${itemName}'? This cannot be undone.`;
  
  if (!confirm(confirmMessage)) {
    return;
  }
  
  try {
    // Call API to delete
    await deleteItem(window.currentEditItem.id);
    
    // Close modal
    closeModal('editModal');
    
    // Show success message
    showToast('Item Deleted', `Successfully deleted '${itemName}'`, 'success');
    
    // Refresh table
    await loadItems();
    
  } catch (error) {
    console.error('Error deleting item:', error);
    showToast('Delete Failed', error.message || 'Failed to delete item', 'error');
  }
}