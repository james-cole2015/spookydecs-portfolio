// Add Cost Modal Component
// Prompts user to add a cost record after creating an item

export class AddCostModal {
  constructor() {
    this.modal = null;
    this.config = null;
  }
  
  show(itemId, itemName, newCostUrl) {
    this.config = { itemId, itemName, newCostUrl };
    
    if (!this.modal) {
      this.createModal();
    }
    
    // Update content
    this.modal.querySelector('.modal-message').innerHTML = `
      You've successfully created <strong>${itemName}</strong>.<br>
      Would you like to add cost information now?
    `;
    
    // Show modal
    this.modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }
  
  hide() {
    if (this.modal) {
      this.modal.style.display = 'none';
      document.body.style.overflow = '';
    }
  }
  
  createModal() {
    this.modal = document.createElement('div');
    this.modal.className = 'add-cost-modal';
    this.modal.innerHTML = `
      <div class="modal-overlay"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h2 class="modal-title">💰 Add Cost Record</h2>
        </div>
        <div class="modal-body">
          <p class="modal-message"></p>
          <p class="modal-hint">This will open the finance section in a new tab.</p>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" onclick="addCostModal.handleSkip()">
            Skip for Now
          </button>
          <button class="btn-primary" onclick="addCostModal.handleAddCost()">
            Add Cost →
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(this.modal);
  }
  
  handleAddCost() {
    // Open finance URL in new tab
    window.open(this.config.newCostUrl, '_blank');
    
    // Close modal and navigate
    this.hide();
    this.navigateToItems();
  }
  
  handleSkip() {
    // Just close and navigate
    this.hide();
    this.navigateToItems();
  }
  
  navigateToItems() {
    setTimeout(() => {
      window.location.href = '/';
    }, 100);
  }
}

// Global instance
export const addCostModal = new AddCostModal();

// Make it available globally for onclick handlers
if (typeof window !== 'undefined') {
  window.addCostModal = addCostModal;
}
