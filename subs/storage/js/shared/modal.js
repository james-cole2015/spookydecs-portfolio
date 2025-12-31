/**
 * Modal Dialog System
 * Reusable modal for confirmations, alerts, and custom content
 */

let currentModal = null;

/**
 * Create and show modal
 */
export function showModal({ title, content, actions, onClose }) {
  // Remove existing modal
  if (currentModal) {
    closeModal();
  }

  // Create modal elements
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  
  const modal = document.createElement('div');
  modal.className = 'modal';
  
  modal.innerHTML = `
    <div class="modal-header">
      <h3 class="modal-title">${title}</h3>
      <button class="modal-close" aria-label="Close">&times;</button>
    </div>
    <div class="modal-body">
      ${content}
    </div>
    <div class="modal-footer">
      ${actions.map(action => `
        <button 
          class="btn ${action.className || 'btn-secondary'}" 
          data-action="${action.action}"
        >
          ${action.label}
        </button>
      `).join('')}
    </div>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  
  currentModal = overlay;

  // Add event listeners
  const closeBtn = modal.querySelector('.modal-close');
  closeBtn.addEventListener('click', () => {
    closeModal();
    if (onClose) onClose();
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closeModal();
      if (onClose) onClose();
    }
  });

  // Handle action buttons
  actions.forEach(action => {
    const btn = modal.querySelector(`[data-action="${action.action}"]`);
    if (btn) {
      btn.addEventListener('click', async () => {
        if (action.handler) {
          const result = await action.handler();
          if (result !== false) {
            closeModal();
          }
        } else {
          closeModal();
        }
      });
    }
  });

  // Show with animation
  setTimeout(() => {
    overlay.classList.add('modal-show');
  }, 10);
}

/**
 * Close current modal
 */
export function closeModal() {
  if (!currentModal) return;

  currentModal.classList.remove('modal-show');
  setTimeout(() => {
    currentModal.remove();
    currentModal = null;
  }, 300);
}

/**
 * Show confirmation dialog
 */
export function showConfirm({ title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', onConfirm, onCancel, type = 'warning' }) {
  const icon = type === 'danger' ? '⚠️' : type === 'warning' ? '⚠️' : 'ℹ️';
  
  showModal({
    title,
    content: `
      <div class="modal-confirm modal-confirm-${type}">
        <div class="modal-confirm-icon">${icon}</div>
        <p class="modal-confirm-message">${message}</p>
      </div>
    `,
    actions: [
      {
        action: 'cancel',
        label: cancelLabel,
        className: 'btn-secondary',
        handler: onCancel
      },
      {
        action: 'confirm',
        label: confirmLabel,
        className: type === 'danger' ? 'btn-danger' : 'btn-primary',
        handler: onConfirm
      }
    ]
  });
}

/**
 * Show alert dialog
 */
export function showAlert({ title, message, buttonLabel = 'OK', onClose }) {
  showModal({
    title,
    content: `<p>${message}</p>`,
    actions: [
      {
        action: 'ok',
        label: buttonLabel,
        className: 'btn-primary',
        handler: onClose
      }
    ]
  });
}

/**
 * Show delete confirmation
 */
export function showDeleteConfirm({ itemName, onConfirm, additionalMessage = '' }) {
  showConfirm({
    title: 'Delete Storage Unit?',
    message: `
      Are you sure you want to delete <strong>"${itemName}"</strong>?
      ${additionalMessage ? `<br><br>${additionalMessage}` : ''}
      <br><br>This action cannot be undone.
    `,
    confirmLabel: 'Delete',
    cancelLabel: 'Cancel',
    type: 'danger',
    onConfirm
  });
}

export default { showModal, closeModal, showConfirm, showAlert, showDeleteConfirm };
