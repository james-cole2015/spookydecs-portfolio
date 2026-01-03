// Item Cost View Component

import { navigateTo } from '../utils/router.js';
import { CostHistoryList } from './CostHistoryList.js';

export class ItemCostView {
  constructor(data) {
    this.data = data;
    this.itemId = data.item_id || data.idea_id || data.record_id;
    this.itemDetails = data.item_details || data.idea_details || data.record_details;
    this.costs = data.costs || [];
    
    // Calculate summary from costs if not provided
    this.summary = this.calculateSummary(data.summary);
  }

  calculateSummary(providedSummary) {
    // If summary is provided and has valid data, use it
    if (providedSummary && providedSummary.total_cost > 0) {
      return providedSummary;
    }

    // Otherwise, calculate from costs array
    const summary = {
      total_cost: 0,
      current_value: 0,
      breakdown: {}
    };

    this.costs.forEach(cost => {
      const totalCost = parseFloat(cost.total_cost) || 0;
      const value = parseFloat(cost.value) || totalCost;

      summary.total_cost += totalCost;
      summary.current_value += value;

      // Build breakdown by cost_type
      const costType = cost.cost_type || 'other';
      if (!summary.breakdown[costType]) {
        summary.breakdown[costType] = { count: 0, amount: 0 };
      }
      summary.breakdown[costType].count++;
      summary.breakdown[costType].amount += totalCost;
    });

    return summary;
  }

  async render(container) {
    console.log('🎨 Rendering ItemCostView');
    console.log('📊 Summary data:', this.summary);
    console.log('📋 Costs count:', this.costs.length);
    
    container.innerHTML = this.getHTML();
    this.attachEventListeners();
    
    // Render cost history list
    const historyContainer = container.querySelector('#cost-history-container');
    if (historyContainer) {
      const historyList = new CostHistoryList(this.costs, this.itemId);
      historyList.render(historyContainer);
    }
  }

  getHTML() {
    const itemName = this.itemDetails?.short_name || this.itemId;
    const itemClass = this.itemDetails?.class || '';
    const itemClassType = this.itemDetails?.class_type || '';
    
    return `
      <div class="item-costs-page">
        <!-- Header -->
        <div class="page-header">
          <button class="btn-back" data-action="back">
            ← Back to Finance
          </button>
          
          <div class="item-title">
            <h1>${itemName}</h1>
            <p class="item-subtitle">${this.itemId}${itemClassType ? ` • ${itemClassType}` : ''}</p>
          </div>
          
          ${this.itemDetails ? `
            <button class="btn-secondary" data-action="view-item">
              View Item Details →
            </button>
          ` : ''}
        </div>

        <!-- Financial Summary -->
        <div class="financial-summary">
          <h2>💰 Financial Summary</h2>
          
          <div class="summary-cards">
            <div class="summary-card">
              <div class="card-label">Total Cost</div>
              <div class="card-value">$${this.summary.total_cost.toFixed(2)}</div>
            </div>
            
            <div class="summary-card">
              <div class="card-label">Current Value</div>
              <div class="card-value">$${this.summary.current_value.toFixed(2)}</div>
            </div>
            
            <div class="summary-card">
              <div class="card-label">Total Records</div>
              <div class="card-value">${this.costs.length}</div>
            </div>
          </div>
        </div>

        <!-- Cost Breakdown -->
        ${this.renderBreakdown()}

        <!-- Add Cost Button -->
        <div class="action-bar">
          <button class="btn-primary" data-action="add-cost">
            + Add New Cost
          </button>
        </div>

        <!-- Cost History -->
        <div class="cost-history-section">
          <h2>Cost History (${this.costs.length} records)</h2>
          <div id="cost-history-container"></div>
        </div>
      </div>
    `;
  }

  renderBreakdown() {
    if (!this.summary?.breakdown || Object.keys(this.summary.breakdown).length === 0) {
      return '';
    }

    const breakdownItems = Object.entries(this.summary.breakdown)
      .map(([type, data]) => `
        <div class="breakdown-item">
          <div class="breakdown-label">${this.formatCostType(type)}</div>
          <div class="breakdown-details">
            <span class="breakdown-count">${data.count} record${data.count !== 1 ? 's' : ''}</span>
            <span class="breakdown-amount">$${data.amount?.toFixed(2) || '0.00'}</span>
          </div>
        </div>
      `)
      .join('');

    return `
      <div class="cost-breakdown">
        <h3>📊 Cost Breakdown</h3>
        <div class="breakdown-list">
          ${breakdownItems}
        </div>
      </div>
    `;
  }

  formatCostType(type) {
    const typeMap = {
      'acquisition': 'Purchase',
      'repair': 'Repairs',
      'maintenance': 'Maintenance',
      'build': 'Build',
      'supply_purchase': 'Supplies',
      'gift': 'Gifts',
      'other': 'Other'
    };
    return typeMap[type] || type;
  }

  attachEventListeners() {
    // Back button
    document.querySelectorAll('[data-action="back"]').forEach(btn => {
      btn.addEventListener('click', () => {
        navigateTo('/');
      });
    });

    // View item details
    document.querySelectorAll('[data-action="view-item"]').forEach(btn => {
      btn.addEventListener('click', () => {
        // Navigate to items subdomain
        window.location.href = `https://dev-items.spookydecs.com/${this.itemId}`;
      });
    });

    // Add new cost
    document.querySelectorAll('[data-action="add-cost"]').forEach(btn => {
      btn.addEventListener('click', () => {
        navigateTo(`/new?item_id=${this.itemId}`);
      });
    });
  }
}