// Modal Utilities - Common functions for all modals

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = 'none';
  }
  
  // Re-enable body scroll
  document.body.style.overflow = '';
  document.body.style.position = '';
  document.body.style.width = '';
  
  // Clear any stored items
  if (modalId === 'viewModal') {
    window.currentViewItem = null;
  } else if (modalId === 'editModal') {
    window.currentEditItem = null;
  }
}

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = 'flex';
    
    // Prevent body scroll on mobile
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
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