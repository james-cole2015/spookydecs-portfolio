// Item Edit Page
// Full edit interface with form fields and action center

import { fetchItemById, updateItem } from '../api/items.js';
import { navigate } from '../utils/router.js';
import { toast } from '../shared/toast.js';
import { ItemEditForm } from '../components/ItemEditForm.js';
import { actionCenter } from '../components/ActionCenter.js';

class ItemEditPage {
  constructor() {
    this.item = null;
    this.editForm = null;
  }
  
  async render(itemId) {
    const loadingOverlay = document.getElementById('loading-overlay');
    
    try {
      loadingOverlay?.classList.remove('hidden');
      
      // Fetch item with cache bust
      this.item = await fetchItemById(itemId, true);
      
      const container = document.getElementById('app-container');
      container.innerHTML = `
        <div class="page-container">
          <!-- Header -->
          <div class="edit-header">
            <button class="btn-back" onclick="itemEditPage.handleCancel()">
              ← Back to Item
            </button>
            <div class="edit-header-content">
              <div class="edit-header-left">
                ${this.item.images?.cloudfront_url ? 
                  `<img src="${this.item.images.cloudfront_url}" alt="${this.escapeHtml(this.item.short_name)}" class="edit-photo">` :
                  `<div class="edit-photo-placeholder">📦</div>`
                }
                <div class="edit-header-info">
                  <h1 class="edit-title">Edit Item</h1>
                  <div class="edit-subtitle">${this.escapeHtml(this.item.short_name || this.item.id)}</div>
                  <div class="edit-id">${this.item.id}</div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Action Center -->
          <div id="action-center-container"></div>
          
          <!-- Edit Form -->
          <div id="edit-form-container" class="form-container"></div>
          
          <!-- Form Actions -->
          <div class="form-actions">
            <button class="btn btn-secondary" onclick="itemEditPage.handleCancel()">
              Cancel
            </button>
            <button class="btn btn-primary" onclick="itemEditPage.handleSave()">
              Save Changes
            </button>
          </div>
        </div>
      `;
      
      // Initialize edit form
      this.editForm = new ItemEditForm('edit-form-container');
      this.editForm.render(this.item);
      
      // Initialize action center
      actionCenter.render(this.item, (updatedItem) => {
        this.handleItemUpdate(updatedItem);
      });
      
      loadingOverlay?.classList.add('hidden');
      
    } catch (error) {
      console.error('Error loading item:', error);
      loadingOverlay?.classList.add('hidden');
      toast.error('Load Failed', error.message);
      navigate('/');
    }
  }
  
  handleCancel() {
    // Navigate back to detail page
    navigate(`/${this.item.id}`);
  }
  
  async handleSave() {
    // Clear previous errors
    this.editForm.clearAllErrors();
    
    // Validate form
    if (!this.editForm.validate()) {
      toast.error('Validation Failed', 'Please fix the errors in the form');
      return;
    }
    
    const loadingOverlay = document.getElementById('loading-overlay');
    
    try {
      loadingOverlay?.classList.remove('hidden');
      
      // Get form data
      const formData = this.editForm.getFormData();
      
      console.log('Saving item with data:', formData);
      
      // Update item
      const updatedItem = await updateItem(this.item.id, formData);
      
      toast.success('Saved', 'Item has been updated successfully');
      
      // Update local item reference
      this.item = updatedItem;
      
      loadingOverlay?.classList.add('hidden');
      
      // Navigate back to detail page after short delay
      setTimeout(() => {
        navigate(`/${this.item.id}`);
      }, 1000);
      
    } catch (error) {
      console.error('Error saving item:', error);
      loadingOverlay?.classList.add('hidden');
      toast.error('Save Failed', error.message || 'Could not save changes');
    }
  }
  
async handleItemUpdate(updatedItem) {
  if (updatedItem) {
    this.item = updatedItem;
  } else {
    // Re-fetch after photo upload (no updated item passed)
    this.item = await fetchItemById(this.item.id, true);
  }
 a
  this.editForm.render(this.item);
  actionCenter.render(this.item, (item) => {
    this.handleItemUpdate(item);
  });
}
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Global instance
const itemEditPage = new ItemEditPage();

// Make available globally for onclick handlers
if (typeof window !== 'undefined') {
  window.itemEditPage = itemEditPage;
}

export function renderItemEdit(itemId) {
  itemEditPage.render(itemId);
}