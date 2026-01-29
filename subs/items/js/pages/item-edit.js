// Item Edit Page
// Dedicated edit form (not wizard)

import { fetchItemById, updateItem } from '../api/items.js';
import { navigate } from '../utils/router.js';
import { toast } from '../shared/toast.js';

class ItemEditPage {
  constructor() {
    this.item = null;
  }
  
  async render(itemId) {
    const loadingOverlay = document.getElementById('loading-overlay');
    
    try {
      loadingOverlay?.classList.remove('hidden');
      
      // Fetch item
      this.item = await fetchItemById(itemId, true);
      
      const container = document.getElementById('app-container');
      container.innerHTML = `
        <div class="view-header">
          <button class="btn-back" onclick="itemEditPage.handleCancel()">
            ← Back to Item
          </button>
          <h1>Edit Item: ${this.escapeHtml(this.item.short_name)}</h1>
        </div>
        
        <div class="form-container">
          <div class="form-section">
            <h2>Basic Information</h2>
            <p>Edit form fields will be rendered here by ItemEditForm component</p>
            <p>This is a stub - full implementation coming next</p>
          </div>
          
          <div class="form-actions">
            <button class="btn-secondary" onclick="itemEditPage.handleCancel()">
              Cancel
            </button>
            <button class="btn-primary" onclick="itemEditPage.handleSave()">
              Save Changes
            </button>
          </div>
        </div>
      `;
      
      loadingOverlay?.classList.add('hidden');
      
    } catch (error) {
      console.error('Error loading item:', error);
      loadingOverlay?.classList.add('hidden');
      toast.error('Load Failed', error.message);
      navigate('/');
    }
  }

  handleCancel() {
    navigate(`/${this.item.id}`);
  }
  
  async handleSave() {
    // Stub - will collect form data and update
    toast.info('Coming Soon', 'Edit functionality will be implemented next');
  }
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Global instance
const itemEditPage = new ItemEditPage();

// Make available globally
if (typeof window !== 'undefined') {
  window.itemEditPage = itemEditPage;
}

export function renderItemEdit(itemId) {
  itemEditPage.render(itemId);
}