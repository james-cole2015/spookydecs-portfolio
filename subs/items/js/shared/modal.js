// Modal Confirmation Dialog
// Reusable modal for confirmations, alerts, and custom content

class Modal {
  constructor() {
    this.modal = null;
    this.resolveCallback = null;
  }
  
  /**
   * Show confirmation dialog
   */
  confirm(title, message, confirmText = 'Confirm', cancelText = 'Cancel') {
    return new Promise((resolve) => {
      this.resolveCallback = resolve;
      this.show({
        title,
        message,
        buttons: [
          { text: cancelText, class: 'btn-secondary', value: false },
          { text: confirmText, class: 'btn-danger', value: true }
        ]
      });
    });
  }
  
  /**
   * Show alert dialog
   */
  alert(title, message, buttonText = 'OK') {
    return new Promise((resolve) => {
      this.resolveCallback = resolve;
      this.show({
        title,
        message,
        buttons: [
          { text: buttonText, class: 'btn-primary', value: true }
        ]
      });
    });
  }
  
  /**
   * Show custom modal
   */
  show(config) {
    this.hide(); // Remove existing modal
    
    this.modal = document.createElement('div');
    this.modal.className = 'modal-overlay';
    
    const buttons = config.buttons.map((btn, index) => `
      <button 
        class="btn ${btn.class}" 
        onclick="modal.handleButton(${index}, ${JSON.stringify(btn.value).replace(/"/g, '&quot;')})"
      >
        ${btn.text}
      </button>
    `).join('');
    
    this.modal.innerHTML = `
      <div class="modal-dialog">
        <div class="modal-header">
          <h3 class="modal-title">${config.title}</h3>
        </div>
        <div class="modal-body">
          <p class="modal-message">${config.message}</p>
        </div>
        <div class="modal-footer">
          ${buttons}
        </div>
      </div>
    `;
    
    document.body.appendChild(this.modal);
    document.body.style.overflow = 'hidden';
    
    // Show animation
    setTimeout(() => this.modal.classList.add('show'), 10);
  }
  
  hide() {
    if (this.modal) {
      this.modal.classList.remove('show');
      setTimeout(() => {
        this.modal.remove();
        this.modal = null;
        document.body.style.overflow = '';
      }, 200);
    }
  }
  
  handleButton(index, value) {
    if (this.resolveCallback) {
      this.resolveCallback(value);
      this.resolveCallback = null;
    }
    this.hide();
  }
}

// Styles
const style = document.createElement('style');
style.textContent = `
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    opacity: 0;
    transition: opacity 0.2s ease;
  }
  
  .modal-overlay.show {
    opacity: 1;
  }
  
  .modal-dialog {
    background: white;
    border-radius: 8px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
    max-width: 500px;
    width: 90%;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    transform: scale(0.9);
    transition: transform 0.2s ease;
  }
  
  .modal-overlay.show .modal-dialog {
    transform: scale(1);
  }
  
  .modal-header {
    padding: 20px 24px;
    border-bottom: 1px solid #e5e7eb;
  }
  
  .modal-title {
    font-size: 18px;
    font-weight: 600;
    color: #111827;
    margin: 0;
  }
  
  .modal-body {
    padding: 24px;
    overflow-y: auto;
  }
  
  .modal-message {
    font-size: 14px;
    color: #6b7280;
    line-height: 1.6;
    margin: 0;
  }
  
  .modal-footer {
    padding: 16px 24px;
    border-top: 1px solid #e5e7eb;
    display: flex;
    justify-content: flex-end;
    gap: 12px;
  }
  
  @media (max-width: 768px) {
    .modal-dialog {
      width: 95%;
      max-width: none;
    }
    
    .modal-footer {
      flex-direction: column-reverse;
    }
    
    .modal-footer .btn {
      width: 100%;
    }
  }
`;
document.head.appendChild(style);

// Export singleton instance
export const modal = new Modal();

// Make available globally for onclick handlers
if (typeof window !== 'undefined') {
  window.modal = modal;
}