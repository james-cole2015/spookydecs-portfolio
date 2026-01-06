// Item Form Page
// Create or Edit items with wizard-style steps

import { fetchItemById, createItem, updateItem } from '../api/items.js';
import { ItemFormWizard } from '../components/ItemFormWizard.js';
import { addCostModal } from '../components/AddCostModal.js';
import { toast } from '../shared/toast.js';

let config = null;

// Load config
async function loadConfig() {
  if (!config) {
    const response = await fetch('/config.json');
    config = await response.json();
  }
  return config;
}

export let wizard = null;

export async function init(params) {
  console.log('Item form init with params:', params);
  
  const mode = params.mode || 'create';
  let originalItem = null;
  
  // If edit mode, fetch existing item
  if (mode === 'edit') {
    if (!params.itemId) {
      toast.error('Error', 'No item ID provided');
      window.location.href = '/items';
      return;
    }
    
    try {
      showLoading();
      originalItem = await fetchItemById(params.itemId);
    } catch (error) {
      console.error('Failed to load item:', error);
      toast.error('Error', 'Failed to load item for editing');
      window.location.href = '/items';
      return;
    }
  }
  
  // Initialize wizard
  wizard = new ItemFormWizard(mode, originalItem);
  wizard.render();
}

function showLoading() {
  const container = document.getElementById('step-content');
  if (container) {
    container.innerHTML = `
      <div class="form-loading">
        <div class="spinner"></div>
        <div>Loading item...</div>
      </div>
    `;
  }
}

export async function handleSave() {
  const saveBtn = document.querySelector('.btn-save');
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.textContent = '💾 Saving...';
  }
  
  try {
    // Prepare item data
    const itemData = wizard.prepareItemData();
    console.log('Saving item:', itemData);
    
    let response;
    let itemId;
    let itemName;
    
    if (wizard.mode === 'create') {
      // Create new item
      response = await createItem(itemData);
      itemId = response.confirmation?.id || response.preview?.id;
      itemName = response.confirmation?.short_name || response.preview?.short_name;
      
      toast.success('Item Created', `${itemName} has been created`);
    } else {
      // Update existing item
      response = await updateItem(wizard.originalItem.id, itemData);
      itemId = response.id || wizard.originalItem.id;
      itemName = response.short_name || wizard.originalItem.short_name;
      
      toast.success('Item Updated', `${itemName} has been updated`);
    }
    
    // Upload photos if any (decorations only)
    if (wizard.photoUploader && wizard.photoUploader.hasPhotos()) {
      try {
        console.log('Uploading photos for item:', itemId);
        await wizard.photoUploader.uploadPhotos(itemId, wizard.formData.season);
        toast.success('Photos Uploaded', 'Photos have been added to the item');
      } catch (photoError) {
        console.error('Photo upload error:', photoError);
        toast.error('Photo Upload Failed', photoError.message || 'Unknown error');
        
        // Re-enable button and stop
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.textContent = '💾 Save Item';
        }
        return;
      }
    }
    
    // Check mode before cleanup
    const isCreateMode = wizard.mode === 'create';
    
    // Cleanup wizard
    cleanup();
    
    // For create mode, show cost modal
    if (isCreateMode) {
      const cfg = await loadConfig();
      addCostModal.show(itemId, itemName, cfg.NEW_COST_URL);
    } else {
      // For edit mode, just navigate back
      setTimeout(() => {
        window.location.href = '/items';
      }, 500);
    }
    
  } catch (error) {
    console.error('Failed to save item:', error);
    toast.error('Save Failed', error.message || 'Failed to save item. Please try again.');
    
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = '💾 Save Item';
    }
  }
}

export function handleCancel() {
  window.location.href = '/items';
}

export function cleanup() {
  if (wizard) {
    wizard.cleanup();
    wizard = null;
  }
}