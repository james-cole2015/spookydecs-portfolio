// Confirmation Modal Component
// Detailed confirmation dialogs for destructive actions

export class ConfirmationModal {
  constructor() {
    this.modal = null;
    this.onConfirm = null;
    this.onCancel = null;
  }
  
  show(config) {
    // Config: { title, message, details, confirmText, cancelText, isDangerous, onConfirm, onCancel }
    this.onConfirm = config.onConfirm;
    this.onCancel = config.onCancel;
    
    // Create modal if it doesn't exist
    if (!this.modal) {
      this.createModal();
    }
    
    // Update content
    this.modal.querySelector('.modal-title').textContent = config.title;
    this.modal.querySelector('.modal-message').textContent = config.message;
    
    const detailsContainer = this.modal.querySelector('.modal-details');
    if (config.details && config.details.length > 0) {
      detailsContainer.innerHTML = `
        <ul class="consequence-list">
          ${config.details.map(detail => `<li>${detail}</li>`).join('')}
        </ul>
      `;
      detailsContainer.style.display = 'block';
    } else {
      detailsContainer.style.display = 'none';
    }
    
    const confirmBtn = this.modal.querySelector('.btn-confirm');
    confirmBtn.textContent = config.confirmText || 'Confirm';
    confirmBtn.className = config.isDangerous ? 'btn-confirm btn-danger' : 'btn-confirm btn-primary';
    
    const cancelBtn = this.modal.querySelector('.btn-cancel');
    cancelBtn.textContent = config.cancelText || 'Cancel';
    
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
    this.modal.className = 'confirmation-modal';
    this.modal.innerHTML = `
      <div class="modal-overlay" onclick="confirmationModal.handleCancel()"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h2 class="modal-title"></h2>
        </div>
        <div class="modal-body">
          <p class="modal-message"></p>
          <div class="modal-details"></div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" onclick="confirmationModal.handleCancel()">Cancel</button>
          <button class="btn-confirm" onclick="confirmationModal.handleConfirm()">Confirm</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(this.modal);
  }
  
  handleConfirm() {
    if (this.onConfirm) {
      this.onConfirm();
    }
    this.hide();
  }
  
  handleCancel() {
    if (this.onCancel) {
      this.onCancel();
    }
    this.hide();
  }
}

// Global instance
export const confirmationModal = new ConfirmationModal();

// Make it available globally for onclick handlers
if (typeof window !== 'undefined') {
  window.confirmationModal = confirmationModal;
}
