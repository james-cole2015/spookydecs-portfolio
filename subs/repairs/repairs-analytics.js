/**
 * SpookyDecs Repairs - Analytics Module
 * Handles analytics dashboard and statistics
 */

const Analytics = {
  allItems: [],

  /**
   * Load analytics data
   */
  async load() {
    try {
      // Show loading state
      document.getElementById('totalNeedingRepair').textContent = '...';
      document.getElementById('totalInRepair').textContent = '...';
      document.getElementById('totalRepairsCompleted').textContent = '...';
      document.getElementById('totalEstimatedCost').textContent = '...';

      // Get all items from the main endpoint
      const allItemsResponse = await API.request('/items');
      const allItems = allItemsResponse.items || [];

      // Get all items needing repair (current queue)
      const repairsResponse = await API.listRepairs();
      const queueItems = repairsResponse.items || [];

      console.log('Analytics loaded:', {
        totalItems: allItems.length,
        queueItems: queueItems.length
      });

      // Store for analysis
      this.allItems = allItems;

      // Calculate and display metrics
      this.calculateSummary(allItems, queueItems);
      this.renderFrequentRepairs(allItems);
      this.renderCriticalityChart(queueItems); // Only current queue items have criticality
      this.calculateAvgRepairTime(allItems);
    } catch (error) {
      console.error('Failed to load analytics:', error);
      
      // Show error state
      document.getElementById('totalNeedingRepair').textContent = 'Error';
      document.getElementById('totalInRepair').textContent = 'Error';
      document.getElementById('totalRepairsCompleted').textContent = 'Error';
      document.getElementById('totalEstimatedCost').textContent = 'Error';
    }
  },

  /**
   * Calculate summary statistics
   */
  calculateSummary(allItems, queueItems) {
    let totalNeedingRepair = 0;
    let totalInRepair = 0;
    let totalEstimatedCost = 0;
    let totalRepairsCompleted = 0;

    // Count items needing repair and in repair from queue
    queueItems.forEach(item => {
      const repairStatus = item.repair_status || {};
      
      if (repairStatus.needs_repair) {
        totalNeedingRepair++;
      }

      if (repairStatus.status === 'In Repair') {
        totalInRepair++;
      }

      if (repairStatus.estimated_repair_cost) {
        totalEstimatedCost += parseFloat(repairStatus.estimated_repair_cost);
      }
    });

    // Count completed repairs from all items (both current and archived)
    allItems.forEach(item => {
      // Count repairs from current repair_notes
      const currentNotes = item.repair_status?.repair_notes || [];
      totalRepairsCompleted += currentNotes.filter(n => n.type === 'repair').length;

      // Count repairs from archived repair_history
      const archivedHistory = item.repair_history || [];
      archivedHistory.forEach(archived => {
        const archivedNotes = archived.repair_notes || [];
        totalRepairsCompleted += archivedNotes.filter(n => n.type === 'repair').length;
      });
    });

    document.getElementById('totalNeedingRepair').textContent = totalNeedingRepair;
    document.getElementById('totalInRepair').textContent = totalInRepair;
    document.getElementById('totalRepairsCompleted').textContent = totalRepairsCompleted;
    document.getElementById('totalEstimatedCost').textContent = UI.formatCurrency(totalEstimatedCost);
  },

  /**
   * Render most frequently repaired items
   */
  renderFrequentRepairs(items) {
    const container = document.getElementById('frequentRepairsChart');

    // Count repairs per item (including archived history)
    const repairCounts = items.map(item => {
      let repairCount = 0;

      // Count current repairs
      const currentNotes = item.repair_status?.repair_notes || [];
      repairCount += currentNotes.filter(n => n.type === 'repair').length;

      // Count archived repairs
      const archivedHistory = item.repair_history || [];
      archivedHistory.forEach(archived => {
        const archivedNotes = archived.repair_notes || [];
        repairCount += archivedNotes.filter(n => n.type === 'repair').length;
      });

      // Also count number of times item has been flagged (repair_history length)
      const timesFlagged = archivedHistory.length;

      return {
        id: item.id,
        name: item.short_name || item.id,
        count: repairCount,
        timesFlagged: timesFlagged
      };
    }).filter(item => item.count > 0 || item.timesFlagged > 0)
      .sort((a, b) => {
        // Sort by number of repairs first, then by times flagged
        if (b.count !== a.count) return b.count - a.count;
        return b.timesFlagged - a.timesFlagged;
      })
      .slice(0, 5);

    if (repairCounts.length === 0) {
      container.innerHTML = '<p class="muted">No repair history available yet.</p>';
      return;
    }

    const html = repairCounts.map(item => {
      const parts = [];
      if (item.count > 0) {
        parts.push(`${item.count} repair${item.count !== 1 ? 's' : ''}`);
      }
      if (item.timesFlagged > 0) {
        parts.push(`${item.timesFlagged} flag${item.timesFlagged !== 1 ? 's' : ''}`);
      }
      const detail = parts.join(', ');

      return `
        <div class="summary-item">
          <span class="summary-label">${item.name}</span>
          <span class="summary-value">${detail}</span>
        </div>
      `;
    }).join('');

    container.innerHTML = html;
  },

  /**
   * Render criticality distribution chart
   */
  renderCriticalityChart(items) {
    const container = document.getElementById('criticalityChart');

    const counts = {
      Critical: 0,
      High: 0,
      Medium: 0,
      Low: 0
    };

    items.forEach(item => {
      const criticality = item.repair_status?.criticality;
      if (counts.hasOwnProperty(criticality)) {
        counts[criticality]++;
      }
    });

    const total = Object.values(counts).reduce((sum, val) => sum + val, 0);

    if (total === 0) {
      container.innerHTML = '<p class="muted">No items flagged for repair.</p>';
      return;
    }

    const html = Object.entries(counts).map(([level, count]) => {
      const percentage = ((count / total) * 100).toFixed(1);
      return `
        <div class="summary-item">
          <span class="summary-label">${level}</span>
          <span class="summary-value">${count} (${percentage}%)</span>
        </div>
      `;
    }).join('');

    container.innerHTML = html;
  },

  /**
   * Calculate average repair time
   */
  calculateAvgRepairTime(items) {
    const container = document.getElementById('avgRepairTime');

    let totalRepairDays = 0;
    let completedRepairsWithDates = 0;
    let totalCompletedRepairs = 0;

    items.forEach(item => {
      // Check current repair notes
      const currentNotes = item.repair_status?.repair_notes || [];
      
      currentNotes.forEach(note => {
        if (note.type === 'repair') {
          totalCompletedRepairs++;
          
          // Try to calculate actual repair time if we have started date
          const repairStatus = item.repair_status || {};
          if (repairStatus.repair_started_date && note.date) {
            const startDate = new Date(repairStatus.repair_started_date);
            const endDate = new Date(note.date);
            const days = Math.round((endDate - startDate) / (1000 * 60 * 60 * 24));
            
            if (days > 0 && days < 365) { // Sanity check
              totalRepairDays += days;
              completedRepairsWithDates++;
            }
          }
        }
      });

      // Check archived repair history
      const archivedHistory = item.repair_history || [];
      archivedHistory.forEach(archived => {
        const archivedNotes = archived.repair_notes || [];
        
        archivedNotes.forEach(note => {
          if (note.type === 'repair') {
            totalCompletedRepairs++;
            
            // Try to calculate repair time from archived data
            if (archived.repair_started_date && note.date) {
              const startDate = new Date(archived.repair_started_date);
              const endDate = new Date(note.date);
              const days = Math.round((endDate - startDate) / (1000 * 60 * 60 * 24));
              
              if (days > 0 && days < 365) { // Sanity check
                totalRepairDays += days;
                completedRepairsWithDates++;
              }
            }
          }
        });
      });
    });

    if (totalCompletedRepairs === 0) {
      container.innerHTML = '<p class="muted">No completed repairs to analyze yet.</p>';
      return;
    }

    // Calculate average if we have date information
    let avgDisplay = 'N/A';
    if (completedRepairsWithDates > 0) {
      const avgDays = (totalRepairDays / completedRepairsWithDates).toFixed(1);
      avgDisplay = `${avgDays} days`;
    }

    container.innerHTML = `
      <div class="summary-item">
        <span class="summary-label">Average Time to Repair</span>
        <span class="summary-value">${avgDisplay}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">Total Repairs Completed</span>
        <span class="summary-value">${totalCompletedRepairs}</span>
      </div>
      ${completedRepairsWithDates > 0 ? `
        <div class="summary-item">
          <span class="summary-label">Repairs with Date Data</span>
          <span class="summary-value">${completedRepairsWithDates} of ${totalCompletedRepairs}</span>
        </div>
      ` : ''}
    `;
  }
};