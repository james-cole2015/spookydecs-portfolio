// Cost History List Component

import { navigateTo } from '../utils/router.js';

export class CostHistoryList {
  constructor(costs, itemId) {
    this.costs = costs || [];
    this.itemId = itemId;
  }

  render(container) {
    if (this.costs.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>No cost records found for this item.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="cost-history-list">
        ${this.costs.map(cost => this.renderCostCard(cost)).join('')}
      </div>
    `;

    this.attachEventListeners(container);
  }

  renderCostCard(cost) {
    const date = new Date(cost.cost_date);
    const formattedDate = date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });

    const hasReceipt = cost.receipt_data?.image_id || cost.receipt_data?.image_url;

    return `
      <div class="cost-card" data-cost-id="${cost.cost_id}">
        <div class="cost-card-header">
          <div class="cost-date">${formattedDate}</div>
          ${hasReceipt ? '<span class="receipt-badge">📄</span>' : ''}
        </div>
        
        <div class="cost-card-body">
          <div class="cost-info">
            <div class="cost-type">${this.formatCostType(cost.cost_type)}</div>
            <div class="cost-amount">$${parseFloat(cost.total_cost).toFixed(2)}</div>
          </div>
          
          ${cost.description ? `
            <div class="cost-description">${cost.description}</div>
          ` : ''}
          
          <div class="cost-meta">
            <span class="cost-vendor">${cost.vendor}</span>
            ${cost.category ? `<span class="cost-category">• ${this.formatCategory(cost.category)}</span>` : ''}
          </div>
        </div>
        
        <div class="cost-card-actions">
          <button class="btn-link" data-action="view-details" data-cost-id="${cost.cost_id}">
            View Details
          </button>
          ${hasReceipt ? `
            <button class="btn-link" data-action="view-receipt" data-cost-id="${cost.cost_id}">
              View Receipt
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }

  formatCostType(type) {
    const typeMap = {
      'acquisition': 'Purchase',
      'repair': 'Repair',
      'maintenance': 'Maintenance',
      'build': 'Build',
      'supply_purchase': 'Supply Purchase',
      'gift': 'Gift',
      'other': 'Other'
    };
    return typeMap[type] || type;
  }

  formatCategory(category) {
    const categoryMap = {
      'materials': 'Materials',
      'labor': 'Labor',
      'parts': 'Parts',
      'consumables': 'Consumables',
      'decoration': 'Decoration',
      'light': 'Light',
      'accessory': 'Accessory',
      'other': 'Other'
    };
    return categoryMap[category] || category;
  }

  attachEventListeners(container) {
    // View details
    container.querySelectorAll('[data-action="view-details"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const costId = e.target.dataset.costId;
        navigateTo(`/costs/${costId}`);
      });
    });

    // View receipt (placeholder for now)
    container.querySelectorAll('[data-action="view-receipt"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const costId = e.target.dataset.costId;
        console.log('View receipt for cost:', costId);
        // TODO: Implement receipt modal/viewer
      });
    });
  }
}
