// Modal Utilities - Common functions for all modals

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = 'none';
  }
  
  // Clear any stored items
  if (modalId === 'viewModal') {
    window.currentViewItem = null;
  } else if (modalId === 'editModal') {
    window.currentEditItem = null;
  }
}

function formatFieldName(fieldName) {
  return fieldName
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Close modal on backdrop click
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal')) {
    const modalId = e.target.id;
    closeModal(modalId);
  }
});

// Close modal on ESC key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const modals = ['viewModal', 'editModal', 'createModal', 'deleteModal'];
    modals.forEach(modalId => {
      const modal = document.getElementById(modalId);
      if (modal && modal.style.display === 'flex') {
        closeModal(modalId);
      }
    });
  }
});