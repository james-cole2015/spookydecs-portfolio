/**
 * SpookyDecs Repairs - History Module
 * Handles the repair history view showing all past repairs
 */

const RepairHistory = {
  allItems: [],
  allHistory: [],
  filters: {
    type: '',
    search: ''
  },

  /**
   * Load all items and build repair history
   */
  async load() {
    try {
      const container = document.getElementById('repairHistoryContainer');
      container.innerHTML = '<div class="loading">Loading repair history...</div>';

      // Fetch all items with repair history
      await this.fetchAllItems();
      
      this.buildHistoryFromItems();
      this.updateStats();
      this.render();
    } catch (error) {
      console.error('Failed to load repair history:', error);
      document.getElementById('repairHistoryContainer').innerHTML = 
        '<div class="empty-state"><h3>Error Loading History</h3><p>Please try again later.</p></div>';
    }
  },

  /**
   * Fetch all items with repair history
   */
  async fetchAllItems() {
    try {
      // Fetch all items directly from the /items endpoint
      const response = await API.request('/items');
      this.allItems = response.items || [];
      
      // Filter to only items that have repair history
      this.allItems = this.allItems.filter(item => {
        const repairStatus = item.repair_status || {};
        const notes = repairStatus.repair_notes || [];
        const history = item.repair_history || [];
        return notes.length > 0 || history.length > 0;
      });
      
      return this.allItems;
    } catch (error) {
      console.error('Error fetching items:', error);
      this.allItems = [];
      return [];
    }
  },

  /**
   * Build flat history list from all items' repair_notes and repair_history
   */
  buildHistoryFromItems() {
    this.allHistory = [];
    
    this.allItems.forEach(item => {
      const repairStatus = item.repair_status || {};
      const currentNotes = repairStatus.repair_notes || [];
      const archivedHistory = item.repair_history || [];
      
      // Add current repair notes
      currentNotes.forEach(note => {
        this.allHistory.push({
          id: `${item.id}-${note.date}`,
          item_id: item.id,
          item_name: item.short_name || item.id,
          item_class: item.class_type || 'Unknown',
          date: note.date,
          type: note.type,
          description: note.description,
          cost: note.cost,
          performed_by: note.performed_by,
          source: 'current'
        });
      });
      
      // Add archived repair history
      archivedHistory.forEach(archived => {
        const notes = archived.repair_notes || [];
        notes.forEach(note => {
          this.allHistory.push({
            id: `${item.id}-archived-${note.date}`,
            item_id: item.id,
            item_name: item.short_name || item.id,
            item_class: item.class_type || 'Unknown',
            date: note.date,
            type: note.type,
            description: note.description,
            cost: note.cost,
            performed_by: note.performed_by,
            source: 'archived'
          });
        });
        
        // Add unflag event as a history entry
        if (archived.unflagged_date) {
          this.allHistory.push({
            id: `${item.id}-unflagged-${archived.unflagged_date}`,
            item_id: item.id,
            item_name: item.short_name || item.id,
            item_class: item.class_type || 'Unknown',
            date: archived.unflagged_date,
            type: 'unflagged',
            description: `Repair flag removed. Was ${archived.criticality} priority with estimated cost of ${archived.estimated_repair_cost ? '$' + archived.estimated_repair_cost.toFixed(2) : 'unknown'}`,
            cost: null,
            performed_by: archived.unflagged_by || 'Unknown',
            source: 'archived'
          });
        }
      });
    });
    
    // Sort by date (newest first)
    this.allHistory.sort((a, b) => new Date(b.date) - new Date(a.date));
  },

  /**
   * Update statistics
   */
  updateStats() {
    const stats = {
      totalRepairs: 0,
      totalCost: 0,
      itemsServiced: new Set()
    };
    
    this.allHistory.forEach(entry => {
      if (entry.type === 'repair') {
        stats.totalRepairs++;
        if (entry.cost) {
          stats.totalCost += parseFloat(entry.cost);
        }
      }
      stats.itemsServiced.add(entry.item_id);
    });
    
    document.querySelector('#historyStatsRow .stat-card:nth-child(1) .stat-value').textContent = stats.totalRepairs;
    document.querySelector('#historyStatsRow .stat-card:nth-child(2) .stat-value').textContent = UI.formatCurrency(stats.totalCost);
    document.querySelector('#historyStatsRow .stat-card:nth-child(3) .stat-value').textContent = stats.itemsServiced.size;
  },

  /**
   * Apply filters to history
   */
  getFilteredHistory() {
    let filtered = [...this.allHistory];
    
    // Filter by type
    if (this.filters.type) {
      filtered = filtered.filter(entry => entry.type === this.filters.type);
    }
    
    // Filter by search term
    if (this.filters.search) {
      const searchLower = this.filters.search.toLowerCase();
      filtered = filtered.filter(entry => 
        entry.item_id.toLowerCase().includes(searchLower) ||
        entry.item_name.toLowerCase().includes(searchLower) ||
        entry.description.toLowerCase().includes(searchLower)
      );
    }
    
    return filtered;
  },

  /**
   * Render repair history table
   */
  render() {
    const container = document.getElementById('repairHistoryContainer');
    const filtered = this.getFilteredHistory();
    
    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <h3>No Repair History</h3>
          <p>No repair history found matching your filters.</p>
        </div>
      `;
      return;
    }
    
    const tableHTML = `
      <table class="repair-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Item ID</th>
            <th>Item Name</th>
            <th>Type</th>
            <th>Description</th>
            <th>Cost</th>
            <th>Performed By</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${filtered.map(entry => this.renderRow(entry)).join('')}
        </tbody>
      </table>
    `;
    
    container.innerHTML = tableHTML;
    this.attachEventListeners();
  },

  /**
   * Render a single history row
   */
  renderRow(entry) {
    const typeBadge = this.getTypeBadge(entry.type);
    const costDisplay = entry.cost ? UI.formatCurrency(entry.cost) : '-';
    
    return `
      <tr>
        <td>${UI.formatDate(entry.date)}</td>
        <td><strong>${entry.item_id}</strong></td>
        <td>${entry.item_name}</td>
        <td>${typeBadge}</td>
        <td style="max-width: 300px;">${entry.description}</td>
        <td>${costDisplay}</td>
        <td>${entry.performed_by || 'Unknown'}</td>
        <td>
          <button class="btn-small btn-secondary view-item-btn" data-id="${entry.item_id}">
            View Item
          </button>
        </td>
      </tr>
    `;
  },

  /**
   * Get badge for entry type
   */
  getTypeBadge(type) {
    const badges = {
      'repair': '<span class="badge" style="background:#d1fae5;color:#059669;">Repair</span>',
      'inspection': '<span class="badge" style="background:#dbeafe;color:#2563eb;">Inspection</span>',
      'retired': '<span class="badge" style="background:#fee2e2;color:#dc2626;">Retired</span>',
      'update': '<span class="badge" style="background:#fef3c7;color:#d97706;">Update</span>',
      'unflagged': '<span class="badge" style="background:#f3e8ff;color:#7c3aed;">Unflagged</span>'
    };
    return badges[type] || `<span class="badge">${type}</span>`;
  },

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // View item buttons
    document.querySelectorAll('.view-item-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const itemId = e.target.dataset.id;
        try {
          const response = await API.getRepairDetail(itemId);
          RepairDetailModal.open(response.item);
        } catch (error) {
          UI.showToast('Failed to load item details: ' + error.message, 'error');
        }
      });
    });
  },

  /**
   * Apply filters and reload
   */
  applyFilters(filters) {
    this.filters = { ...this.filters, ...filters };
    this.render();
  }
};