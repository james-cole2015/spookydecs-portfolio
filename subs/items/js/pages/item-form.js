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
      <div class="view-header view-header--wizard">
        <button class="btn-back" onclick="itemFormPage.handleCancel()">
          ← Back to Items
        </button>
        <h1>Item Creation Wizard</h1>
      </div>

      <div id="step-indicator" class="step-indicator"></div>

      <div class="wizard-body">
        <div id="wizard-step-1" class="wizard-step"></div>
        <div id="wizard-step-2" class="wizard-step wizard-step--hidden"></div>
        <div id="wizard-step-3" class="wizard-step wizard-step--hidden"></div>
        <div id="wizard-step-4" class="wizard-step wizard-step--hidden"></div>
      </div>
    `;

    this.wizard = new ItemFormWizard();
    this.wizard.render();
  }

  handleCancel() {
    navigate('/');
  }

  handleReview() {
    this.wizard.handleReview();
  }

  async handleSave() {
    const loadingOverlay = document.getElementById('loading-overlay');

    try {
      loadingOverlay?.classList.remove('hidden');

      this.wizard.collectFormData();
      const itemData = this.wizard.prepareItemData();

      console.log('Creating item:', itemData);

      const response = await createItem(itemData);
      const createdItem = response.preview || response.confirmation || response;

      loadingOverlay?.classList.add('hidden');

      toast.success('Item Created', `${createdItem.shortName} has been created successfully.`);

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

if (typeof window !== 'undefined') {
  window.itemFormPage = itemFormPage;
}

export function renderItemForm() {
  itemFormPage.render();
}
