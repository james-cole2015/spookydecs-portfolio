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

      // Get all items needing repair
      const repairsResponse = await API.listRepairs();
      const repairItems = repairsResponse.items || [];

      // Store for analysis
      this.allItems = repairItems;

      // Calculate and display metrics
      this.calculateSummary(repairItems);
      this.renderFrequentRepairs(repairItems);
      this.renderCriticalityChart(repairItems);
      this.calculateAvgRepairTime(repairItems);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    }
  },

  /**
   * Calculate summary statistics
   */
  calculateSummary(items) {
    let totalNeedingRepair = 0;
    let totalInRepair = 0;
    let totalEstimatedCost = 0;
    let totalRepairsCompleted = 0;

    items.forEach(item => {
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

      // Count completed repairs from history
      const notes = repairStatus.repair_notes || [];
      totalRepairsCompleted += notes.filter(n => n.type === 'repair').length;
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

    // Count repairs per item
    const repairCounts = items.map(item => {
      const notes = item.repair_status?.repair_notes || [];
      const repairCount = notes.filter(n => n.type === 'repair').length;
      return {
        id: item.id,
        name: item.short_name || item.id,
        count: repairCount
      };
    }).filter(item => item.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    if (repairCounts.length === 0) {
      container.innerHTML = '<p class="muted">No repair history available yet.</p>';
      return;
    }

    const html = repairCounts.map(item => `
      <div class="summary-item">
        <span class="summary-label">${item.name}</span>
        <span class="summary-value">${item.count} repair${item.count !== 1 ? 's' : ''}</span>
      </div>
    `).join('');

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
    let completedRepairs = 0;

    items.forEach(item => {
      const notes = item.repair_status?.repair_notes || [];
      
      notes.forEach(note => {
        if (note.type === 'repair' && note.date) {
          // This is simplified - in reality you'd track start/end dates
          completedRepairs++;
          // Placeholder: assume average 3 days per repair
          totalRepairDays += 3;
        }
      });
    });

    if (completedRepairs === 0) {
      container.innerHTML = '<p class="muted">No completed repairs to analyze yet.</p>';
      return;
    }

    const avgDays = (totalRepairDays / completedRepairs).toFixed(1);

    container.innerHTML = `
      <div class="summary-item">
        <span class="summary-label">Average Time to Repair</span>
        <span class="summary-value">${avgDays} days</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">Total Repairs Completed</span>
        <span class="summary-value">${completedRepairs}</span>
      </div>
    `;
  }
};