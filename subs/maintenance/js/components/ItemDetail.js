// Item detail view component with mobile enhancements

import { fetchItem, fetchRecordsByItem, getItemUrl, getCostsUrl } from '../api.js';
import { appState } from '../state.js';
import { navigateTo } from '../router.js';
import { formatDate, formatCurrency, formatStatus, formatRecordTypePill, formatSeverity } from '../utils/formatters.js';import { StatsCards } from './StatsCards.js';
import { isMobile } from '../utils/responsive.js';

export class ItemDetailView {
  constructor(itemId) {
    this.itemId = itemId;
    this.item = null;
    this.records = [];
    this.activeTab = 'upcoming';
  }
  
  async render(container) {
    try {
      // Fetch item and records
      this.item = await fetchItem(this.itemId);
      appState.cacheItem(this.itemId, this.item);
      
      const recordsData = await fetchRecordsByItem(this.itemId);
      this.records = recordsData.records || [];
      
      container.innerHTML = this.renderView();
      this.attachEventListeners(container);
      
    } catch (error) {
      console.error('Failed to load item:', error);
      container.innerHTML = this.renderError();
    }
  }
  
  renderBreadcrumbs() {
    return `
      <nav class="breadcrumbs">
        <a href="/" class="breadcrumb-link">All Records</a>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-current">${this.itemId}</span>
      </nav>
    `;
  }
  
  renderView() {
    const mobile = isMobile();
    
    return `
      <div class="detail-view item-detail-view">
        ${this.renderBreadcrumbs()}
        
        ${mobile ? '' : `
          <div class="detail-header">
            <div class="header-actions">
              <a href="/create?item_id=${this.itemId}" class="btn-primary">+ Create Record</a>
            </div>
          </div>
        `}
        
        <div class="detail-title">
          <h1>${this.item.short_name || this.itemId}</h1>
          ${mobile ? `
            <div class="header-actions">
              <a href="/create?item_id=${this.itemId}" class="btn-primary">+ Create Record</a>
            </div>
          ` : ''}
          ${mobile ? '' : `
            <div class="title-meta">
              ${this.item.class || 'Unknown'} • ${this.item.class_type || 'Unknown'} • ${this.item.season || 'Unknown'}
            </div>
          `}
        </div>
        
        <div class="item-links">
          <a href="${getItemUrl(this.itemId)}" class="btn-link" target="_blank">
            View in Items Subdomain →
          </a>
        </div>
        
        ${mobile ? '' : StatsCards.renderItemStats(this.records)}
        
        ${this.renderTabs()}
        
        <div class="detail-content">
          ${this.renderTabContent()}
        </div>
      </div>
    `;
  }
  
  renderTabs() {
    const mobile = isMobile();
    
    if (mobile) {
      return `
        <div class="view-selector-label">View Selector</div>
        <div class="detail-tabs">
          <select class="tabs-mobile-select" id="item-tabs-select">
            <option value="upcoming" ${this.activeTab === 'upcoming' ? 'selected' : ''}>
              📅 Upcoming Tasks (${this.getUpcomingCount()})
            </option>
            <option value="history" ${this.activeTab === 'history' ? 'selected' : ''}>
              📋 Historical Records (${this.getHistoricalCount()})
            </option>
            <option value="costs" ${this.activeTab === 'costs' ? 'selected' : ''}>
              💰 Costs
            </option>
            <option value="recurring" ${this.activeTab === 'recurring' ? 'selected' : ''}>
              🔄 Recurring Maintenance
            </option>
          </select>
        </div>
      `;
    }
    
    // Desktop tabs
    return `
      <div class="detail-tabs">
        <button class="tab-btn ${this.activeTab === 'upcoming' ? 'active' : ''}" data-tab="upcoming">
          Upcoming Tasks
          <span class="tab-count">${this.getUpcomingCount()}</span>
        </button>
        <button class="tab-btn ${this.activeTab === 'history' ? 'active' : ''}" data-tab="history">
          Historical Records
          <span class="tab-count">${this.getHistoricalCount()}</span>
        </button>
        <button class="tab-btn ${this.activeTab === 'costs' ? 'active' : ''}" data-tab="costs">
          Costs
        </button>
        <button class="tab-btn ${this.activeTab === 'recurring' ? 'active' : ''}" data-tab="recurring">
          Recurring Maintenance
        </button>
      </div>
    `;
  }
  
  renderTabContent() {
    switch (this.activeTab) {
      case 'upcoming':
        return this.renderUpcomingTab();
      case 'history':
        return this.renderHistoryTab();
      case 'costs':
        return this.renderCostsTab();
      case 'recurring':
        return this.renderRecurringTab();
      default:
        return '';
    }
  }
  
  getUpcomingCount() {
    return this.records.filter(r => 
      r.status === 'scheduled' || r.status === 'in_progress'
    ).length;
  }
  
  getHistoricalCount() {
    return this.records.filter(r => 
      r.status === 'completed' || r.status === 'cancelled'
    ).length;
  }
  
  renderUpcomingTab() {
    const upcoming = this.records.filter(r => 
      r.status === 'scheduled' || r.status === 'in_progress'
    ).sort((a, b) => new Date(a.date_performed) - new Date(b.date_performed));
    
    if (upcoming.length === 0) {
      return `
        <div class="empty-state">
          <div class="empty-icon">📅</div>
          <h3>No upcoming tasks</h3>
          <p>All maintenance and repairs are up to date</p>
        </div>
      `;
    }
    
    return `
      <div class="records-list">
        ${this.renderRecordsTable(upcoming)}
      </div>
    `;
  }
  
  renderHistoryTab() {
    const history = this.records.filter(r => 
      r.status === 'completed' || r.status === 'cancelled'
    ).sort((a, b) => new Date(b.date_performed) - new Date(a.date_performed));
    
    if (history.length === 0) {
      return `
        <div class="empty-state">
          <div class="empty-icon">📋</div>
          <h3>No historical records</h3>
          <p>No completed or cancelled records for this item</p>
        </div>
      `;
    }
    
    return `
      <div class="records-list">
        ${this.renderRecordsTable(history)}
      </div>
    `;
  }
  
renderRecordsTable(records) {
    const mobile = isMobile();
    
    if (mobile) {
      return this.renderMobileCards(records);
    }
    
    // Desktop table
    return `
      <table class="data-table">
        <thead>
          <tr>
            <th>Status</th>
            <th>Title</th>
            <th>Type</th>
            <th>Severity</th>
            <th>Date</th>
            <th>Cost</th>
          </tr>
        </thead>
        <tbody>
          ${records.map(record => `
            <tr class="table-row" data-record-id="${record.record_id}">
              <td>${formatStatus(record.status)}</td>
              <td class="table-title">${record.title}</td>
              <td>${formatRecordTypePill(record.record_type)}</td>
              <td>${formatSeverity(record.criticality)}</td>
              <td>${formatDate(record.date_performed || record.created_at)}</td>
              <td>${formatCurrency(record.total_cost || 0)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }
  
renderMobileCards(records) {
    return `
      <div class="mobile-records-cards">
        ${records.map(record => `
          <div class="mobile-record-card" data-record-id="${record.record_id}">
            <div class="mobile-record-card-header">
              <div class="mobile-record-card-title">${record.title}</div>
            </div>
            <div class="mobile-record-card-meta">
              ${formatStatus(record.status)}
              ${formatRecordTypePill(record.record_type)}
              ${formatSeverity(record.criticality)}
            </div>
            <div class="mobile-record-card-footer">
              <div class="mobile-record-card-date">${formatDate(record.date_performed || record.created_at)}</div>
              <div class="mobile-record-card-cost">${formatCurrency(record.total_cost || 0)}</div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }
  
  renderCostsTab() {
    const totalCost = this.records.reduce((sum, r) => sum + (r.total_cost || 0), 0);
    const allCostIds = this.records.flatMap(r => r.cost_record_ids || []);
    const uniqueCostIds = [...new Set(allCostIds)];
    
    return `
      <div class="costs-tab">
        <div class="placeholder-section">
          <div class="placeholder-icon">🚧</div>
          <h3>Cost Records Under Development</h3>
          <p>Detailed cost tracking and analysis will be available soon.</p>
        </div>
        
        <div class="cost-summary">
          <h3>Current Summary</h3>
          <div class="detail-row">
            <span class="detail-label">Total Cost (All Records)</span>
            <span class="detail-value cost-value">${formatCurrency(totalCost)}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Number of Records</span>
            <span class="detail-value">${this.records.length}</span>
          </div>
          ${uniqueCostIds.length > 0 ? `
            <div class="detail-row">
              <span class="detail-label">Associated Cost Record IDs</span>
              <span class="detail-value">
                <ul class="cost-ids-list">
                  ${uniqueCostIds.slice(0, 10).map(id => `<li><code>${id}</code></li>`).join('')}
                  ${uniqueCostIds.length > 10 ? `<li>... and ${uniqueCostIds.length - 10} more</li>` : ''}
                </ul>
              </span>
            </div>
          ` : ''}
        </div>
        
        <div class="link-buttons">
          <a href="${getCostsUrl()}" class="btn-link disabled" target="_blank">
            View in Finance Subdomain (Coming Soon) →
          </a>
        </div>
      </div>
    `;
  }
  
  renderRecurringTab() {
    return `
      <div class="recurring-tab">
        <div class="placeholder-section">
          <div class="placeholder-icon">🔄</div>
          <h3>Recurring Maintenance - Coming Soon</h3>
          <p style="color: #6B7280;">
            Schedule and track recurring maintenance tasks for your items. 
            This feature will allow you to set up automated reminders and 
            maintenance schedules.
          </p>
        </div>
      </div>
    `;
  }
  
  renderError() {
    return `
      <div class="error-container">
        <h1>Item Not Found</h1>
        <p>The item you're looking for could not be found.</p>
        <button onclick="history.back()">Go Back</button>
      </div>
    `;
  }
  
  attachEventListeners(container) {
    const mobile = isMobile();
    
    if (mobile) {
      // Mobile dropdown listener
      const select = container.querySelector('#item-tabs-select');
      if (select) {
        select.addEventListener('change', (e) => {
          this.activeTab = e.target.value;
          const contentDiv = container.querySelector('.detail-content');
          if (contentDiv) {
            contentDiv.innerHTML = this.renderTabContent();
            this.attachTableListeners(contentDiv);
          }
        });
      }
    } else {
      // Desktop tab buttons
      const tabBtns = container.querySelectorAll('.tab-btn');
      tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          this.activeTab = btn.getAttribute('data-tab');
          const contentDiv = container.querySelector('.detail-content');
          if (contentDiv) {
            contentDiv.innerHTML = this.renderTabContent();
            this.attachTableListeners(contentDiv);
          }
          
          // Update active tab button
          tabBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
        });
      });
    }
    
    // Initial table listeners
    this.attachTableListeners(container);
  }
  
  attachTableListeners(container) {
    const rows = container.querySelectorAll('.table-row');
    rows.forEach(row => {
      row.addEventListener('click', () => {
        const recordId = row.getAttribute('data-record-id');
        navigateTo(`/${this.itemId}/${recordId}`);
      });
    });
    
    // Mobile card listeners
    const cards = container.querySelectorAll('.mobile-record-card');
    cards.forEach(card => {
      card.addEventListener('click', () => {
        const recordId = card.getAttribute('data-record-id');
        navigateTo(`/${this.itemId}/${recordId}`);
      });
    });
  }
}