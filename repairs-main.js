/**
 * SpookyDecs Repairs - Main Application
 * Initializes the app and handles global events
 */

// Global state
let currentItem = null;

/**
 * Initialize the application
 */
document.addEventListener('DOMContentLoaded', async () => {
  console.log('SpookyDecs Repair Management initializing...');

  // Load configuration first
  const configLoaded = await loadConfig();
  if (!configLoaded) {
    console.error('Failed to load configuration. Cannot start application.');
    return;
  }

  // Check authentication
  if (!AUTH.isAuthenticated()) {
    // Redirect to login if not authenticated
    // window.location.href = '/login.html';
    console.log('Auth check skipped (not implemented yet)');
  }

  // Initialize filters
  setupFilters();

  // Initialize tab navigation
  setupTabs();

  // Initialize action buttons
  setupActionButtons();

  // Initialize flag form
  setupFlagForm();

  // Initialize complete repair form
  setupCompleteRepairForm();

  // Load initial view
  RepairQueue.load();
  
  console.log('SpookyDecs Repair Management initialized successfully');
});

/**
 * Setup filter dropdowns
 */
function setupFilters() {
  // Repair Queue filters
  const filterCriticality = document.getElementById('filterCriticality');
  const filterStatus = document.getElementById('filterStatus');
  const filterClassType = document.getElementById('filterClassType');

  filterCriticality.addEventListener('change', (e) => {
    RepairQueue.applyFilters({ criticality: e.target.value });
  });

  filterStatus.addEventListener('change', (e) => {
    RepairQueue.applyFilters({ status: e.target.value });
  });

  filterClassType.addEventListener('change', (e) => {
    RepairQueue.applyFilters({ class_type: e.target.value });
  });

  // History filters
  const filterHistoryType = document.getElementById('filterHistoryType');
  const searchHistoryItem = document.getElementById('searchHistoryItem');

  filterHistoryType.addEventListener('change', (e) => {
    RepairHistory.applyFilters({ type: e.target.value });
  });

  searchHistoryItem.addEventListener('input', (e) => {
    RepairHistory.applyFilters({ search: e.target.value });
  });
}

/**
 * Setup tab navigation
 */
function setupTabs() {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      const viewName = e.target.dataset.view;
      UI.switchView(viewName);
    });
  });
}

/**
 * Setup action buttons in detail modal
 */
function setupActionButtons() {
  // Start Repair button
  document.getElementById('btnStartRepair').addEventListener('click', async () => {
    if (!RepairDetailModal.currentItem) return;

    try {
      const itemId = RepairDetailModal.currentItem.id;
      await API.startRepair(itemId);
      
      UI.showToast('Repair started successfully!', 'success');
      
      // Reload detail view
      const response = await API.getRepairDetail(itemId);
      RepairDetailModal.open(response.item);
      
      // Reload queue
      RepairQueue.load();
    } catch (error) {
      UI.showToast('Failed to start repair: ' + error.message, 'error');
    }
  });

  // Complete Repair button
  document.getElementById('btnCompleteRepair').addEventListener('click', () => {
    if (!RepairDetailModal.currentItem) return;
    
    const itemId = RepairDetailModal.currentItem.id;
    CompleteRepairModal.open(itemId);
  });

  // Retire Item button
  document.getElementById('btnRetireItem').addEventListener('click', async () => {
    if (!RepairDetailModal.currentItem) return;

    const confirmed = confirm('Are you sure you want to retire this item? This action marks the item as permanently out of service.');
    if (!confirmed) return;

    try {
      const itemId = RepairDetailModal.currentItem.id;
      const notes = prompt('Retirement notes (optional):') || 'Item retired from service';
      
      await API.retireItem(itemId, notes);
      
      UI.showToast('Item retired successfully', 'success');
      
      RepairDetailModal.close();
      RepairQueue.load();
    } catch (error) {
      UI.showToast('Failed to retire item: ' + error.message, 'error');
    }
  });

  // Logout button
  document.getElementById('btnLogout').addEventListener('click', () => {
    AUTH.logout();
  });

  // Admin link
  document.getElementById('adminLink').addEventListener('click', (e) => {
    e.preventDefault();
    // Navigate to admin page from config
    if (CONFIG.ADMIN_URL) {
      window.location.href = CONFIG.ADMIN_URL;
    } else {
      alert('Admin URL not configured');
    }
  });
}

/**
 * Setup flag for repair form
 */
function setupFlagForm() {
  const searchBtn = document.getElementById('btnSearchItem');
  const flagBtn = document.getElementById('btnFlagItem');
  const cancelBtn = document.getElementById('btnCancelFlag');

  // Search for item
  searchBtn.addEventListener('click', async () => {
    const itemId = document.getElementById('flagItemId').value.trim();
    
    if (!itemId) {
      UI.showToast('Please enter an item ID', 'error');
      return;
    }

    try {
      const response = await API.getRepairDetail(itemId);
      const item = response.item;
      
      // Show preview
      document.getElementById('previewName').textContent = item.short_name || 'Unknown';
      document.getElementById('previewClass').textContent = item.class || 'N/A';
      document.getElementById('previewType').textContent = item.class_type || 'N/A';
      document.getElementById('previewStatus').textContent = item.status || 'N/A';
      
      document.getElementById('flagItemPreview').style.display = 'block';
      currentItem = item;
    } catch (error) {
      UI.showToast('Item not found: ' + error.message, 'error');
      document.getElementById('flagItemPreview').style.display = 'none';
    }
  });

  // Flag item
  flagBtn.addEventListener('click', async () => {
    if (!currentItem) return;

    const criticality = document.getElementById('flagCriticality').value;
    const notes = document.getElementById('flagNotes').value.trim();
    const estimatedCost = parseFloat(document.getElementById('flagEstimatedCost').value) || null;

    try {
      await API.flagForRepair(currentItem.id, {
        criticality,
        notes,
        estimated_cost: estimatedCost
      });

      UI.showToast('Item flagged for repair successfully!', 'success');
      
      // Reset form
      document.getElementById('flagItemId').value = '';
      document.getElementById('flagNotes').value = '';
      document.getElementById('flagEstimatedCost').value = '';
      document.getElementById('flagItemPreview').style.display = 'none';
      currentItem = null;

      // Switch to queue view
      UI.switchView('queue');
    } catch (error) {
      UI.showToast('Failed to flag item: ' + error.message, 'error');
    }
  });

  // Cancel flag
  cancelBtn.addEventListener('click', () => {
    document.getElementById('flagItemId').value = '';
    document.getElementById('flagNotes').value = '';
    document.getElementById('flagEstimatedCost').value = '';
    document.getElementById('flagItemPreview').style.display = 'none';
    currentItem = null;
  });
}

/**
 * Setup complete repair form
 */
function setupCompleteRepairForm() {
  document.getElementById('btnSubmitComplete').addEventListener('click', async () => {
    const itemId = CompleteRepairModal.currentItemId;
    if (!itemId) return;

    const description = document.getElementById('completeDescription').value.trim();
    const cost = parseFloat(document.getElementById('completeCost').value) || null;
    const performedBy = document.getElementById('completePerformedBy').value.trim() || 'Unknown';

    if (!description) {
      UI.showToast('Please provide a repair description', 'error');
      return;
    }

    try {
      await API.completeRepair(itemId, {
        description,
        cost,
        performed_by: performedBy
      });

      UI.showToast('Repair completed successfully!', 'success');
      
      CompleteRepairModal.close();
      RepairDetailModal.close();
      RepairQueue.load();
    } catch (error) {
      UI.showToast('Failed to complete repair: ' + error.message, 'error');
    }
  });
}