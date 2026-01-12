// Mobile card view component for maintenance items

import { formatDate, formatCriticality, formatCurrency } from '../../utils/formatters.js';

export class MobileItemCardView {
  constructor(onItemClick) {
    this.onItemClick = onItemClick;
  }
  
  render(items) {
    if (!items || items.length === 0) {
      return '<div class="mobile-empty">No items found</div>';
    }
    
    const cardsHtml = items.map(item => this.renderItemCard(item)).join('');
    
    return `
      <div class="mobile-card-list">
        ${cardsHtml}
      </div>
    `;
  }
  
  renderItemCard(item) {
    const totalRecords = item.repairs + item.maintenance + item.inspections;
    
    return `
      <div class="mobile-card item-card" data-item-id="${item.item_id}">
        <div class="mobile-card-header">
          <div class="mobile-card-header-left">
            <span class="mobile-card-icon">📦</span>
            <div class="mobile-card-title-group">
              <h3 class="mobile-card-title">
                <code>${item.item_id}</code>
              </h3>
              <span class="mobile-card-subtitle">${item.season}</span>
            </div>
          </div>
          <div class="mobile-card-header-right">
            ${formatCriticality(item.criticality)}
          </div>
        </div>
        
        <div class="mobile-card-body">
          <div class="mobile-card-stats-grid">
            <div class="mobile-card-stat">
              <span class="mobile-card-stat-label">Total Records</span>
              <span class="mobile-card-stat-value">${totalRecords}</span>
            </div>
            <div class="mobile-card-stat">
              <span class="mobile-card-stat-label">Total Cost</span>
              <span class="mobile-card-stat-value">${formatCurrency(item.total_cost)}</span>
            </div>
          </div>
          
          <div class="mobile-card-record-counts">
            <span class="mobile-card-count-badge">
              <span class="count-badge-icon">🔧</span>
              ${item.repairs} Repairs
            </span>
            <span class="mobile-card-count-badge">
              <span class="count-badge-icon">🔨</span>
              ${item.maintenance} Maintenance
            </span>
            <span class="mobile-card-count-badge">
              <span class="count-badge-icon">🔍</span>
              ${item.inspections} Inspections
            </span>
          </div>
          
          <div class="mobile-card-footer">
            <span class="mobile-card-footer-label">Last Record:</span>
            <span class="mobile-card-footer-value">${formatDate(item.last_record_date)}</span>
          </div>
        </div>
        
        <div class="mobile-card-tap-indicator">
          <span class="tap-icon">→</span>
          <span class="tap-text">Tap to view details</span>
        </div>
      </div>
    `;
  }
  
  attachEventListeners(container) {
    const cards = container.querySelectorAll('.item-card');
    
    cards.forEach(card => {
      card.addEventListener('click', () => {
        const itemId = card.getAttribute('data-item-id');
        
        if (this.onItemClick) {
          this.onItemClick(itemId);
        }
      });
    });
  }
}