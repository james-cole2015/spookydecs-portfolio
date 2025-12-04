// Event Handlers and Initialization

// Close modal
function closeModal(modalId) {
  document.getElementById(modalId).style.display = 'none';
}

// Initialize event listeners
// Create button
document.getElementById('btnCreateItem').addEventListener('click', openCreateModal);

  // Delete button
  document.getElementById('btnDeleteItem').addEventListener('click', () => {
    document.getElementById('deleteModal').style.display = 'flex';
  });

  // Logout button
  document.getElementById('btnLogout').addEventListener('click', () => {
    alert('Logout clicked');
  });

  // Close modals when clicking outside
  window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
      e.target.style.display = 'none';
    }
  });

// Initialize the filter system when the page loads
document.addEventListener('DOMContentLoaded', function() {
  // Initialize filter system
  FilterSystem.init();
  });

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
  initializeEventListeners();
  loadConfig();
});

document.getElementById('btnDeleteItem').addEventListener('click', openDeleteModal);