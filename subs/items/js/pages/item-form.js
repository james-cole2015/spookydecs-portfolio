// Item Form Page (Create)
// Wizard-based item creation

import { createItem } from '../api/items.js';
import { ItemFormWizard } from '../components/ItemFormWizard.js';
import { actionModal } from '../components/ActionModal.js';
import { toast } from '../shared/toast.js';
import { navigate } from '../utils/router.js';

class ItemFormPage {
  constructor() {
    this.wizard = null;
  }
  
  render() {
    const container = document.getElementById('app-container');
    container.innerHTML = `
      <div class="view-header">
        <button class="btn-back" onclick="itemFormPage.handleCancel()">
          ← Back to Items
        </button>
        <h1 id="form-title">Create New Item</h1>
      </div>
      
      <!-- Step Indicator -->
      <div id="step-indicator" class="step-indicator"></div>
      
      <!-- Step Content -->
      <div id="step-content" class="step-content"></div>
      
      <!-- Step Actions -->
      <div id="step-actions" class="step-actions"></div>
    `;
    
    // Initialize wizard
    this.wizard = new ItemFormWizard('create');
    this.wizard.render();
  }
  
  handleCancel() {
    navigate('/');
  }
  
  async handleSave() {
    const loadingOverlay = document.getElementById('loading-overlay');
    
    try {
      loadingOverlay?.classList.remove('hidden');
      
      // Collect final form data
      this.wizard.collectFormData();
      
      // Prepare data for API
      const itemData = this.wizard.prepareItemData();
      
      console.log('Creating item:', itemData);
      
      // Create item
      const response = await createItem(itemData);
      const createdItem = response.preview || response.confirmation || response;
      
      loadingOverlay?.classList.add('hidden');
      
      toast.success('Item Created', `${createdItem.shortName} has been created successfully.`);
      
      // Show action modal
      await actionModal.show(createdItem.id, createdItem.shortName);
      
    } catch (error) {
      console.error('Error creating item:', error);
      loadingOverlay?.classList.add('hidden');
      toast.error('Create Failed', error.message);
    }
  }
}

// Global instance
const itemFormPage = new ItemFormPage();

// Make available globally
if (typeof window !== 'undefined') {
  window.itemFormPage = itemFormPage;
}

export function renderItemForm() {
  itemFormPage.render();
}