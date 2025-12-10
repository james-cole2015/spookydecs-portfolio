/**
 * SpookyDecs Repairs - Main Application
 * Initializes the app and handles global events
 */

// Global state
let currentItem = null;

/**
 * Flag Item Table Manager
 */
const FlagItemTable = {
  allItems: [],
  filteredItems: [],
  currentPage: 1,
  itemsPerPage: 10,
  filterText: '',

  async load() {
    try {
      const response = await API.listItemsByClass(['Decoration', 'Light']);
      this.allItems = response.items || [];
      this.applyFilter();
      this.render();
    } catch (error) {
      console.error('Error loading flag table:', error);
      document.getElementById('flagTableContainer').innerHTML = 
        '<div class="empty-state"><p>Failed to load items</p></div>';
    }
  },

  applyFilter() {
    const searchTerm = this.filterText.toLowerCase();
    this.filteredItems = this.allItems.filter(item => {
      const shortName = (item.short_name || '').toLowerCase();
      return shortName.includes(searchTerm);
    });
    this.currentPage = 1;
  },

  render() {
    const container = document.getElementById('flagTableContainer');
    const pagination = document.getElementById('flagTablePagination');

    if (this.filteredItems.length === 0) {
      container.innerHTML = '<div class="empty-state"><p>No items found</p></div>';
      pagination.style.display = 'none';
      return;
    }

    // Calculate pagination
    const totalPages = Math.ceil(this.filteredItems.length / this.itemsPerPage);
    const startIdx = (this.currentPage - 1) * this.itemsPerPage;
    const endIdx = startIdx + this.itemsPerPage;
    const pageItems = this.filteredItems.slice(startIdx, endIdx);

    // Render table
    const tableHTML = `
      <table class="repair-table flag-browse-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Short Name</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${pageItems.map(item => `
            <tr>
              <td><code>${item.id}</code></td>
              <td>${item.short_name || 'N/A'}</td>
              <td>${UI.getStatusBadge(item.status || 'Active')}</td>
              <td>
                <button class="btn-small btn-primary" onclick="FlagItemTable.selectItem('${item.id}')">
                  Select
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    container.innerHTML = tableHTML;

    // Update pagination
    document.getElementById('flagPageInfo').textContent = `Page ${this.currentPage} of ${totalPages}`;
    document.getElementById('btnFlagPrev').disabled = this.currentPage === 1;
    document.getElementById('btnFlagNext').disabled = this.currentPage === totalPages;
    pagination.style.display = 'flex';
  },

  async selectItem(itemId) {
    try {
      const response = await API.getRepairDetail(itemId);
      const item = response.item;

      // Populate form
      document.getElementById('flagItemId').value = item.id;
      document.getElementById('previewName').textContent = item.short_name || 'Unknown';
      document.getElementById('previewClass').textContent = item.class || 'N/A';
      document.getElementById('previewType').textContent = item.class_type || 'N/A';
      document.getElementById('previewStatus').textContent = item.status || 'N/A';
      document.getElementById('flagItemPreview').style.display = 'block';
      
      currentItem = item;

      // On mobile, scroll form into view
      if (window.innerWidth <= 640) {
        document.querySelector('.flag-search-section').scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      }
    } catch (error) {
      UI.showToast('Failed to load item: ' + error.message, 'error');
    }
  },

  nextPage() {
    const totalPages = Math.ceil(this.filteredItems.length / this.itemsPerPage);
    if (this.currentPage < totalPages) {
      this.currentPage++;
      this.render();
    }
  },

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.render();
    }
  }
};

/**
 * Initialize the application
 */
document.addEventListener('DOMContentLoaded', async () => {
  console.log('SpookyDecs Repair Management initializing...');

  const configLoaded = await loadConfig();
  if (!configLoaded) {
    console.error('Failed to load configuration. Cannot start application.');
    return;
  }

  if (!AUTH.isAuthenticated()) {
    console.log('Auth check skipped (not implemented yet)');
  }

  setupFilters();
  setupTabs();
  setupActionButtons();
  setupFlagForm();
  setupCompleteRepairForm();

  RepairQueue.load();
  
  console.log('SpookyDecs Repair Management initialized successfully');
});

/**
 * Setup filter dropdowns
 */
function setupFilters() {
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

  const filterHistoryType = document.getElementById('filterHistoryType');
  const searchHistoryItem = document.getElementById('searchHistoryItem');

  filterHistoryType.addEventListener('change', (e) => {
    RepairHistory.applyFilters({ type: e.target.value });
  });

  searchHistoryItem.addEventListener('input', (e) => {
    RepairHistory.applyFilters({ search: e.target.value });
  });

  // Flag table filter
  const filterFlagTable = document.getElementById('filterFlagTable');
  filterFlagTable.addEventListener('input', (e) => {
    FlagItemTable.filterText = e.target.value;
    FlagItemTable.applyFilter();
    FlagItemTable.render();
  });

  // Flag table pagination
  document.getElementById('btnFlagPrev').addEventListener('click', () => {
    FlagItemTable.prevPage();
  });

  document.getElementById('btnFlagNext').addEventListener('click', () => {
    FlagItemTable.nextPage();
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
      
      // Load data when switching to specific views
      if (viewName === 'flag') {
        FlagItemTable.load();
      } else if (viewName === 'history') {
        RepairHistory.load();
      } else if (viewName === 'analytics') {
        Analytics.load();
      }
    });
  });
}

/**
 * Setup action buttons in detail modal
 */
function setupActionButtons() {
  document.getElementById('btnStartRepair').addEventListener('click', async () => {
    if (!RepairDetailModal.currentItem) return;

    try {
      const itemId = RepairDetailModal.currentItem.id;
      await API.startRepair(itemId);
      
      UI.showToast('Repair started successfully!', 'success');
      
      const response = await API.getRepairDetail(itemId);
      RepairDetailModal.open(response.item);
      
      RepairQueue.load();
    } catch (error) {
      UI.showToast('Failed to start repair: ' + error.message, 'error');
    }
  });

  document.getElementById('btnCompleteRepair').addEventListener('click', () => {
    if (!RepairDetailModal.currentItem) return;
    
    const itemId = RepairDetailModal.currentItem.id;
    CompleteRepairModal.open(itemId);
  });

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

  document.getElementById('btnLogout').addEventListener('click', () => {
    AUTH.logout();
  });

  document.getElementById('adminLink').addEventListener('click', (e) => {
    e.preventDefault();
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

  searchBtn.addEventListener('click', async () => {
    const itemId = document.getElementById('flagItemId').value.trim();
    
    if (!itemId) {
      UI.showToast('Please enter an item ID', 'error');
      return;
    }

    try {
      const response = await API.getRepairDetail(itemId);
      const item = response.item;
      
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
      
      document.getElementById('flagItemId').value = '';
      document.getElementById('flagNotes').value = '';
      document.getElementById('flagEstimatedCost').value = '';
      document.getElementById('flagItemPreview').style.display = 'none';
      currentItem = null;

      UI.switchView('queue');
    } catch (error) {
      UI.showToast('Failed to flag item: ' + error.message, 'error');
    }
  });

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