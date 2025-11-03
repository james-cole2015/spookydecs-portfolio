// Edit Modal - Save Changes

// Save edit changes
async function saveEditChanges() {
  const formData = getEditFormData();
  const itemId = window.currentEditItem.id;
  
  try {
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
    
    // Call API service
    await saveItemToAPI(itemId, updatePayload);
    
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