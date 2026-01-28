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

// NEW: Open photo upload modal
export function openPhotoUploadModal() {
  if (!wizard || !wizard.formData) {
    toast.error('Error', 'Please complete the form first');
    return;
  }

  // Only allow photo uploads for Decoration class
  if (wizard.formData.class !== 'Decoration') {
    toast.info('Info', 'Photo uploads are only available for Decoration items');
    return;
  }

  const modal = document.createElement('photo-upload-modal');
  modal.setAttribute('context', 'item');
  modal.setAttribute('photo-type', 'catalog');
  modal.setAttribute('season', wizard.formData.season || 'shared');
  modal.setAttribute('max-photos', '3');
  
  // If editing, include item ID
  if (wizard.mode === 'edit' && wizard.originalItem) {
    modal.setAttribute('item-id', wizard.originalItem.id);
  }
  
  document.body.appendChild(modal);
  
  modal.addEventListener('upload-complete', (e) => {
    console.log('Photos uploaded:', e.detail.photo_ids);
    wizard.uploadedPhotoIds = e.detail.photo_ids;
    toast.success('Photos Uploaded', `${e.detail.photo_ids.length} photo(s) uploaded successfully`);
  });
  
  modal.addEventListener('upload-cancel', () => {
    console.log('Photo upload cancelled');
  });
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
      
      // If photos were uploaded during create flow, they need to be associated with the new item
      // This would require a separate API call to update photo metadata with the item_id
      if (wizard.hasPhotos()) {
        console.log('Photos were uploaded, but need to be associated with item:', itemId);
        // TODO: Add API call to update photos with item_id
        toast.info('Note', 'Photo association with new item will be implemented');
      }
      
    } else {
      // Update existing item
      response = await updateItem(wizard.originalItem.id, itemData);
      itemId = response.id || wizard.originalItem.id;
      itemName = response.short_name || wizard.originalItem.short_name;
      
      toast.success('Item Updated', `${itemName} has been updated`);
      
      // Photos uploaded during edit are already associated via item-id attribute in modal
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