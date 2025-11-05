/**
 * SpookyDecs Repairs - UI Utilities
 * Common UI functions, modals, and helpers
 */

const UI = {
  /**
   * Show a notification toast
   */
  showToast(message, type = 'info') {
    // Simple alert for now - can be enhanced with a toast library
    alert(message);
  },

  /**
   * Format date for display
   */
  formatDate(dateString) {
    if (!dateString || dateString === 'unknown') return 'N/A';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (e) {
      return dateString;
    }
  },

  /**
   * Format currency
   */
  formatCurrency(amount) {
    if (amount === null || amount === undefined) return 'N/A';
    return `$${parseFloat(amount).toFixed(2)}`;
  },

  /**
   * Get badge HTML for criticality
   */
  getCriticalityBadge(criticality) {
    const level = criticality.toLowerCase();
    return `<span class="badge ${level}">${criticality}</span>`;
  },

  /**
   * Get badge HTML for status
   */
  getStatusBadge(status) {
    const statusClass = status.toLowerCase().replace(/\s+/g, '-');
    return `<span class="badge ${statusClass}">${status}</span>`;
  },

  /**
   * Switch between views/tabs
   */
  switchView(viewName) {
    // Hide all views
    document.querySelectorAll('.view').forEach(view => {
      view.classList.remove('active');
    });

    // Remove active class from all tabs
    document.querySelectorAll('.tab').forEach(tab => {
      tab.classList.remove('active');
    });

    // Show selected view
    const viewElement = document.getElementById(`view${viewName.charAt(0).toUpperCase() + viewName.slice(1)}`);
    if (viewElement) {
      viewElement.classList.add('active');
    }

    // Activate selected tab
    const tabElement = document.querySelector(`.tab[data-view="${viewName}"]`);
    if (tabElement) {
      tabElement.classList.add('active');
    }

    // Load data for the view
    if (viewName === 'queue') {
      RepairQueue.load();
    } else if (viewName === 'analytics') {
      Analytics.load();
    }
  }
};

/**
 * Repair Detail Modal
 */
const RepairDetailModal = {
  currentItem: null,

  open(item) {
    this.currentItem = item;
    this.render(item);
    document.getElementById('modalRepairDetail').style.display = 'flex';
  },

  close() {
    document.getElementById('modalRepairDetail').style.display = 'none';
    this.currentItem = null;
  },

  render(item) {
    const repairStatus = item.repair_status || {};

    // Basic info
    document.getElementById('detailItemId').textContent = item.id;
    document.getElementById('detailShortName').textContent = item.short_name || 'N/A';
    document.getElementById('detailClass').textContent = item.class || 'N/A';
    document.getElementById('detailClassType').textContent = item.class_type || 'N/A';
    document.getElementById('detailStatus').textContent = item.status || 'N/A';

    // Repair status
    document.getElementById('detailNeedsRepair').innerHTML = repairStatus.needs_repair 
      ? '<span class="badge" style="background:#fef3c7;color:#d97706;">Yes</span>'
      : '<span class="badge" style="background:#d1fae5;color:#059669;">No</span>';
    
    document.getElementById('detailCriticality').innerHTML = UI.getCriticalityBadge(repairStatus.criticality || 'n/a');
    document.getElementById('detailRepairStatus').innerHTML = UI.getStatusBadge(repairStatus.status || 'Operational');
    document.getElementById('detailStartedDate').textContent = UI.formatDate(repairStatus.repair_started_date);
    document.getElementById('detailLastRepair').textContent = UI.formatDate(repairStatus.last_repair_date);
    document.getElementById('detailEstCost').textContent = UI.formatCurrency(repairStatus.estimated_repair_cost);

    // Repair history
    this.renderHistory(repairStatus.repair_notes || []);

    // Action buttons visibility
    this.updateActionButtons(repairStatus);
  },

  renderHistory(notes) {
    const container = document.getElementById('detailRepairHistory');
    
    if (!notes || notes.length === 0) {
      container.innerHTML = '<p class="muted">No repair history available.</p>';
      return;
    }

    const historyHTML = notes.map(note => `
      <div class="repair-history-item ${note.type}">
        <div>
          <span class="history-date">${UI.formatDate(note.date)}</span>
          <span class="history-type">${note.type}</span>
        </div>
        <div class="history-description">${note.description}</div>
        ${note.cost ? `<div class="history-meta">Cost: ${UI.formatCurrency(note.cost)}</div>` : ''}
        ${note.performed_by ? `<div class="history-meta">By: ${note.performed_by}</div>` : ''}
      </div>
    `).reverse().join('');

    container.innerHTML = historyHTML;
  },

  updateActionButtons(repairStatus) {
    const btnStart = document.getElementById('btnStartRepair');
    const btnComplete = document.getElementById('btnCompleteRepair');
    const btnRetire = document.getElementById('btnRetireItem');

    // Hide all by default
    btnStart.style.display = 'none';
    btnComplete.style.display = 'none';
    btnRetire.style.display = 'none';

    if (repairStatus.status === 'Needs Repair') {
      btnStart.style.display = 'inline-block';
      btnRetire.style.display = 'inline-block';
    } else if (repairStatus.status === 'In Repair') {
      btnComplete.style.display = 'inline-block';
      btnRetire.style.display = 'inline-block';
    }
  }
};

/**
 * Complete Repair Modal
 */
const CompleteRepairModal = {
  currentItemId: null,

  open(itemId) {
    this.currentItemId = itemId;
    // Clear form
    document.getElementById('completeDescription').value = '';
    document.getElementById('completeCost').value = '';
    document.getElementById('completePerformedBy').value = '';
    
    document.getElementById('modalCompleteRepair').style.display = 'flex';
  },

  close() {
    document.getElementById('modalCompleteRepair').style.display = 'none';
    this.currentItemId = null;
  }
};

// Global modal close functions for inline onclick handlers
function closeRepairDetailModal() {
  RepairDetailModal.close();
}

function closeCompleteRepairModal() {
  CompleteRepairModal.close();
}