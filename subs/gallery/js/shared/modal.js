/**
 * Modal Dialog System
 * 
 * Reusable modal dialogs for confirmations and alerts
 */

let currentModal = null;

/**
 * Show a confirmation modal
 * @param {Object} options - Modal options
 * @returns {Promise<boolean>} True if confirmed, false if cancelled
 */
export function showConfirmModal(options = {}) {
  const {
    title = 'Confirm',
    message = 'Are you sure?',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    confirmClass = 'btn-danger',
    onConfirm = null,
    onCancel = null
  } = options;
  
  return new Promise((resolve) => {
    // Close any existing modal
    closeModal();
    
    // Create modal backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      animation: fadeIn 0.2s ease-out;
    `;
    
    // Create modal content
    const modal = document.createElement('div');
    modal.className = 'modal-content';
    modal.style.cssText = `
      background: white;
      border-radius: 8px;
      max-width: 500px;
      width: 90%;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
      animation: slideDown 0.3s ease-out;
    `;
    
    modal.innerHTML = `
      <div style="padding: 24px 24px 16px;">
        <h2 style="margin: 0 0 16px; font-size: 20px; color: #333;">${title}</h2>
        <p style="margin: 0; color: #666; line-height: 1.5;">${message}</p>
      </div>
      <div style="padding: 16px 24px; border-top: 1px solid #e0e0e0; display: flex; gap: 12px; justify-content: flex-end;">
        <button class="modal-cancel" style="
          padding: 10px 20px;
          border: 1px solid #ddd;
          background: white;
          color: #333;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s;
        ">${cancelText}</button>
        <button class="modal-confirm ${confirmClass}" style="
          padding: 10px 20px;
          border: none;
          background: #ff6b35;
          color: white;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s;
        ">${confirmText}</button>
      </div>
    `;
    
    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);
    currentModal = backdrop;
    
    // Handle confirm
    const confirmBtn = modal.querySelector('.modal-confirm');
    confirmBtn.addEventListener('click', () => {
      closeModal();
      if (onConfirm) onConfirm();
      resolve(true);
    });
    
    // Handle cancel
    const cancelBtn = modal.querySelector('.modal-cancel');
    cancelBtn.addEventListener('click', () => {
      closeModal();
      if (onCancel) onCancel();
      resolve(false);
    });
    
    // Close on backdrop click
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        closeModal();
        if (onCancel) onCancel();
        resolve(false);
      }
    });
    
    // Close on ESC key
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        closeModal();
        if (onCancel) onCancel();
        resolve(false);
        document.removeEventListener('keydown', handleEsc);
      }
    };
    document.addEventListener('keydown', handleEsc);
    
    // Add hover effects
    confirmBtn.addEventListener('mouseenter', () => {
      confirmBtn.style.background = '#e55a25';
    });
    confirmBtn.addEventListener('mouseleave', () => {
      confirmBtn.style.background = '#ff6b35';
    });
    
    cancelBtn.addEventListener('mouseenter', () => {
      cancelBtn.style.background = '#f5f5f5';
    });
    cancelBtn.addEventListener('mouseleave', () => {
      cancelBtn.style.background = 'white';
    });
  });
}

/**
 * Show an alert modal
 * @param {Object} options - Modal options
 * @returns {Promise<void>}
 */
export function showAlertModal(options = {}) {
  const {
    title = 'Alert',
    message = '',
    closeText = 'Close'
  } = options;
  
  return new Promise((resolve) => {
    closeModal();
    
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      animation: fadeIn 0.2s ease-out;
    `;
    
    const modal = document.createElement('div');
    modal.className = 'modal-content';
    modal.style.cssText = `
      background: white;
      border-radius: 8px;
      max-width: 500px;
      width: 90%;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
      animation: slideDown 0.3s ease-out;
    `;
    
    modal.innerHTML = `
      <div style="padding: 24px 24px 16px;">
        <h2 style="margin: 0 0 16px; font-size: 20px; color: #333;">${title}</h2>
        <p style="margin: 0; color: #666; line-height: 1.5;">${message}</p>
      </div>
      <div style="padding: 16px 24px; border-top: 1px solid #e0e0e0; display: flex; justify-content: flex-end;">
        <button class="modal-close" style="
          padding: 10px 20px;
          border: none;
          background: #ff6b35;
          color: white;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
        ">${closeText}</button>
      </div>
    `;
    
    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);
    currentModal = backdrop;
    
    const closeBtn = modal.querySelector('.modal-close');
    closeBtn.addEventListener('click', () => {
      closeModal();
      resolve();
    });
    
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        closeModal();
        resolve();
      }
    });
  });
}

/**
 * Close the current modal
 */
export function closeModal() {
  if (currentModal) {
    currentModal.style.animation = 'fadeOut 0.2s ease-out';
    setTimeout(() => {
      if (currentModal && currentModal.parentNode) {
        currentModal.parentNode.removeChild(currentModal);
      }
      currentModal = null;
    }, 200);
  }
}

// Add animation styles
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes fadeOut {
    from { opacity: 1; }
    to { opacity: 0; }
  }
  
  @keyframes slideDown {
    from {
      transform: translateY(-50px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
`;
document.head.appendChild(style);
