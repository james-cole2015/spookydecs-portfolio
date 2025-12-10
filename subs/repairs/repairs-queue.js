/**
 * SpookyDecs Repairs - Queue Module
 * Handles the repair queue view and operations
 */

const RepairQueue = {
  items: [],
  filters: {
    criticality: '',
    status: '',
    class_type: ''
  },

  /**
   * Load repair queue
   */
  async load() {
    try {
      const container = document.getElementById('repairQueueContainer');
      container.innerHTML = '<div class="loading">Loading repairs...</div>';

      const response = await API.listRepairs(this.filters);
      this.items = response.items || [];

      this.updateStats();
      this.render();
    } catch (error) {
      console.error('Failed to load repairs:', error);
      document.getElementById('repairQueueContainer').innerHTML = 
        '<div class="empty-state"><h3>Error Loading Repairs</h3><p>Please try again later.</p></div>';
    }
  },

  /**
   * Update statistics cards
   */
  updateStats() {
    const stats = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    };

    this.items.forEach(item => {
      const criticality = item.repair_status?.criticality?.toLowerCase();
      if (stats.hasOwnProperty(criticality)) {
        stats[criticality]++;
      }
    });

    document.querySelector('.stat-card.critical .stat-value').textContent = stats.critical;
    document.querySelector('.stat-card.high .stat-value').textContent = stats.high;
    document.querySelector('.stat-card.medium .stat-value').textContent = stats.medium;
    document.querySelector('.stat-card.low .stat-value').textContent = stats.low;
  },

  /**
   * Render repair queue table
   */
  render() {
    const container = document.getElementById('repairQueueContainer');

    if (this.items.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <h3>No Items Need Repair</h3>
          <p>All items are in good condition! 🎉</p>
        </div>
      `;
      return;
    }

    const tableHTML = `
      <table class="repair-table">
        <thead>
          <tr>
            <th>Item ID</th>
            <th>Name</th>
            <th>Type</th>
            <th>Criticality</th>
            <th>Status</th>
            <th>Est. Cost</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${this.items.map(item => this.renderRow(item)).join('')}
        </tbody>
      </table>
    `;

    container.innerHTML = tableHTML;
    this.attachEventListeners();
  },

  /**
   * Render a single table row
   */
  renderRow(item) {
    const repairStatus = item.repair_status || {};
    
    return `
      <tr>
        <td><strong>${item.id}</strong></td>
        <td>${item.short_name || 'N/A'}</td>
        <td>${item.class_type || 'N/A'}</td>
        <td>${UI.getCriticalityBadge(repairStatus.criticality || 'n/a')}</td>
        <td>${UI.getStatusBadge(repairStatus.status || 'Unknown')}</td>
        <td>${UI.formatCurrency(repairStatus.estimated_repair_cost)}</td>
        <td>
          <button class="btn-primary btn-small view-details" data-id="${item.id}">
            View Details
          </button>
        </td>
      </tr>
    `;
  },

  /**
   * Attach event listeners to action buttons
   */
  attachEventListeners() {
    document.querySelectorAll('.view-details').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const itemId = e.target.dataset.id;
        const item = this.items.find(i => i.id === itemId);
        if (item) {
          RepairDetailModal.open(item);
        }
      });
    });
  },

  /**
   * Apply filters and reload
   */
  applyFilters(filters) {
    this.filters = { ...this.filters, ...filters };
    this.load();
  }
};