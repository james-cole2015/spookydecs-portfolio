// SessionStartModal.js
// Modal component for starting a deployment work session

export function createSessionStartModal(zoneName, zoneCode, onConfirm, onCancel) {
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.innerHTML = `
    <div class="modal-container">
      <div class="modal-header">
        <h2>Start Work Session</h2>
        <button class="btn-close" aria-label="Close">&times;</button>
      </div>
      
      <div class="modal-body">
        <p class="modal-description">
          Ready to start working on <strong>${zoneName}</strong>?
        </p>
        <p class="modal-hint">
          You'll be able to add and remove items during this session. 
          Track your work time and add notes when you're done.
        </p>
      </div>
      
      <div class="modal-footer">
        <button class="btn btn-secondary btn-cancel">Cancel</button>
        <button class="btn btn-primary btn-confirm">Start Session</button>
      </div>
    </div>
  `;
  
  // Event listeners
  const closeBtn = modal.querySelector('.btn-close');
  const cancelBtn = modal.querySelector('.btn-cancel');
  const confirmBtn = modal.querySelector('.btn-confirm');
  
  const close = () => {
    modal.remove();
    if (onCancel) onCancel();
  };
  
  const confirm = async () => {
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Starting...';
    
    try {
      await onConfirm(zoneCode);
      modal.remove();
    } catch (error) {
      confirmBtn.disabled = false;
      confirmBtn.textContent = 'Start Session';
      alert(error.message || 'Failed to start session');
    }
  };
  
  closeBtn.addEventListener('click', close);
  cancelBtn.addEventListener('click', close);
  confirmBtn.addEventListener('click', confirm);
  
  // Close on backdrop click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) close();
  });
  
  // Close on Escape key
  const escapeHandler = (e) => {
    if (e.key === 'Escape') {
      close();
      document.removeEventListener('keydown', escapeHandler);
    }
  };
  document.addEventListener('keydown', escapeHandler);
  
  return modal;
}
