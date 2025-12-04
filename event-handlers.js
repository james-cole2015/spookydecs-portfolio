// Event Handlers and Initialization

// Note: closeModal is now in modal-utils.js, so this duplicate can be removed

// Initialize event listeners
document.getElementById('btnCreateItem').addEventListener('click', openCreateModal);

// Delete button
document.getElementById('btnDeleteItem').addEventListener('click', () => {
  document.getElementById('deleteModal').style.display = 'flex';
});

// Logout button
document.getElementById('btnLogout').addEventListener('click', () => {
  alert('Logout clicked');
});

// Note: Modal backdrop closing is handled in modal-utils.js, so removing duplicate

// Initialize the filter system and load config when page loads
document.addEventListener('DOMContentLoaded', function() {
  // Initialize filter system
  FilterSystem.init();
  
  // Load config
  loadConfig();
});