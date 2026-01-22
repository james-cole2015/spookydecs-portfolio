// Modal Dialog Component
export function showModal(title, content, actions = []) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  
  modal.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <h2>${title}</h2>
        <button class="modal-close" aria-label="Close">&times;</button>
      </div>
      <div class="modal-body">
        ${content}
      </div>
      <div class="modal-footer">
        ${actions.map(action => `
          <button class="btn ${action.className || ''}" data-action="${action.id}">
            ${action.label}
          </button>
        `).join('')}
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Handle close
  const closeBtn = modal.querySelector('.modal-close');
  closeBtn.addEventListener('click', () => closeModal(modal));
  
  // Handle backdrop click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal(modal);
    }
  });
  
  // Handle action buttons
  actions.forEach(action => {
    const btn = modal.querySelector(`[data-action="${action.id}"]`);
    if (btn && action.handler) {
      btn.addEventListener('click', async () => {
        const result = await action.handler();
        if (result !== false) {
          closeModal(modal);
        }
      });
    }
  });
  
  return modal;
}

export function closeModal(modal) {
  modal.classList.add('closing');
  setTimeout(() => modal.remove(), 300);
}

export function confirmAction(message, onConfirm) {
  return showModal('Confirm', `<p>${message}</p>`, [
    {
      id: 'cancel',
      label: 'Cancel',
      className: 'btn-secondary',
      handler: () => true
    },
    {
      id: 'confirm',
      label: 'Confirm',
      className: 'btn-danger',
      handler: onConfirm
    }
  ]);
}
