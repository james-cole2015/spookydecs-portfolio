// Event Handlers and Initialization

// Close modal
function closeModal(modalId) {
  document.getElementById(modalId).style.display = 'none';
}

// Initialize event listeners
function initializeEventListeners() {
  // Create button
  document.getElementById('btnCreateItem').addEventListener('click', () => {
    openCreateModal();
  });

  // Delete button
  document.getElementById('btnDeleteItem').addEventListener('click', () => {
    document.getElementById('deleteModal').style.display = 'flex';
  });

  // Logout button
  document.getElementById('btnLogout').addEventListener('click', () => {
    alert('Logout clicked');
  });

  // Search functionality
  document.getElementById('searchInput').addEventListener('input', (e) => {
    console.log('Search:', e.target.value);
  });

  // Close modals when clicking outside
  window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
      e.target.style.display = 'none';
    }
  });
}

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
  initializeEventListeners();
  loadConfig();
});