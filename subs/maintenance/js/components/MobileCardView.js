// Mobile card view component - renders records as cards instead of table rows

export class MobileCardView {
  constructor(onCardClick) {
    this.onCardClick = onCardClick;
  }
  
  render(records) {
    if (records.length === 0) {
      return this.renderEmptyState();
    }
    
    const cardsHtml = records.map(record => this.renderCard(record)).join('');
    
    return `
      <div class="mobile-cards-container">
        ${cardsHtml}
      </div>
    `;
  }
  
  renderCard(record) {
    const statusClass = this.getStatusClass(record.status);
    const typeClass = this.getTypeClass(record.record_type);
    const criticalityData = this.getCriticalityData(record.criticality);
    
    // Show schedule badge if record is from a schedule
    const scheduleBadge = record.is_scheduled_task 
      ? `<span class="mobile-card-schedule-badge">📅</span>` 
      : '';
    
    return `
      <div class="mobile-card" data-record-id="${record.record_id}" data-item-id="${record.item_id || 'N/A'}">
        <div class="mobile-card-header">
          <div class="mobile-card-status ${statusClass}">
            ${this.formatStatus(record.status)}
          </div>
          <div class="mobile-card-criticality">
            <div class="mobile-card-criticality-dot ${criticalityData.class}"></div>
            <span class="mobile-card-criticality-label">${criticalityData.label}</span>
          </div>
        </div>
        
        <div class="mobile-card-title">
          ${scheduleBadge}${record.title}
        </div>
        
        <div class="mobile-card-meta">
          <div class="mobile-card-type ${typeClass}">
            ${this.getTypeIcon(record.record_type)} ${this.formatType(record.record_type)}
          </div>
        </div>
      </div>
    `;
  }
  
  getStatusClass(status) {
    const statusLower = status.toLowerCase();
    return `status-${statusLower.replace(' ', '_')}`;
  }
  
  formatStatus(status) {
    return status.replace('_', ' ').split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
  
  getTypeClass(recordType) {
    return `type-${recordType}`;
  }
  
  getTypeIcon(recordType) {
    const icons = {
      'repair': '🔧',
      'maintenance': '🔨',
      'inspection': '🔍'
    };
    return icons[recordType] || '📋';
  }
  
  formatType(recordType) {
    return recordType.charAt(0).toUpperCase() + recordType.slice(1);
  }
  
  getCriticalityData(criticality) {
    const criticalityLower = criticality ? criticality.toLowerCase() : 'none';
    
    const criticalityMap = {
      'critical': { class: 'critical', label: 'Critical' },
      'high': { class: 'high', label: 'High' },
      'medium': { class: 'medium', label: 'Medium' },
      'low': { class: 'low', label: 'Low' },
      'none': { class: 'none', label: 'None' }
    };
    
    return criticalityMap[criticalityLower] || criticalityMap['none'];
  }
  
  renderEmptyState() {
    return `
      <div class="empty-state">
        <div class="empty-icon">📋</div>
        <h3>No records found</h3>
        <p>Try adjusting your filters or create a new record</p>
      </div>
    `;
  }
  
  attachEventListeners(container) {
    const cards = container.querySelectorAll('.mobile-card');
    
    cards.forEach(card => {
      card.addEventListener('click', () => {
        const recordId = card.getAttribute('data-record-id');
        const itemId = card.getAttribute('data-item-id');
        
        if (this.onCardClick) {
          this.onCardClick(recordId, itemId);
        }
      });
    });
  }
}
