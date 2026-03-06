// Item detail view component with mobile enhancements

import { fetchItem, fetchRecordsByItem, getItemUrl, getCostsUrl, fetchItemCosts } from '../api.js';
import { RecordDetailTabs } from './RecordDetailTabs.js';
import { appState } from '../state.js';
import { navigateTo } from '../router.js';
import { formatDate, formatCurrency, formatStatus, formatRecordTypePill, formatSeverity } from '../utils/formatters.js';import { StatsCards } from './StatsCards.js';
import { isMobile } from '../utils/responsive.js';

export class ItemDetailView {
  constructor(itemId) {
    this.itemId = itemId;
    this.item = null;
    this.records = [];
    this.costsData = null;
    this.activeTab = 'current';
  }

  async render(container) {
    try {
      // Fetch item, records, and costs in parallel
      this.item = await fetchItem(this.itemId);
      appState.cacheItem(this.itemId, this.item);

      const [recordsData, costsResult, itemUrl] = await Promise.all([
        fetchRecordsByItem(this.itemId),
        fetchItemCosts(this.itemId).catch(() => null),
        getItemUrl(this.itemId).catch(() => '#')
      ]);
      this.records = recordsData.records || [];
      this.costsData = costsResult;
      this.itemUrl = itemUrl;

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
          <a href="${this.itemUrl}" class="btn-link" target="_blank">
            View in Items Subdomain →
          </a>
        </div>
        
        ${mobile ? '' : StatsCards.renderItemStats(this.records, { totalCost: this._getFinanceCostTotal() })}
        
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
            <option value="current" ${this.activeTab === 'current' ? 'selected' : ''}>
              🔄 Current Tasks (${this.getCurrentCount()})
            </option>
            <option value="upcoming" ${this.activeTab === 'upcoming' ? 'selected' : ''}>
              📅 Upcoming Tasks (${this.getUpcomingCount()})
            </option>
            <option value="completed" ${this.activeTab === 'completed' ? 'selected' : ''}>
              ✅ Completed Work (${this.getCompletedCount()})
            </option>
            <option value="costs" ${this.activeTab === 'costs' ? 'selected' : ''}>
              💰 Costs
            </option>
          </select>
        </div>
      `;
    }

    // Desktop tabs
    return `
      <div class="detail-tabs">
        <button class="tab-btn ${this.activeTab === 'current' ? 'active' : ''}" data-tab="current">
          Current Tasks
          <span class="tab-count">${this.getCurrentCount()}</span>
        </button>
        <button class="tab-btn ${this.activeTab === 'upcoming' ? 'active' : ''}" data-tab="upcoming">
          Upcoming Tasks
          <span class="tab-count">${this.getUpcomingCount()}</span>
        </button>
        <button class="tab-btn ${this.activeTab === 'completed' ? 'active' : ''}" data-tab="completed">
          Completed Work
          <span class="tab-count">${this.getCompletedCount()}</span>
        </button>
        <button class="tab-btn ${this.activeTab === 'costs' ? 'active' : ''}" data-tab="costs">
          Costs
        </button>
      </div>
    `;
  }
  
  renderTabContent() {
    switch (this.activeTab) {
      case 'current':
        return this.renderCurrentTab();
      case 'upcoming':
        return this.renderUpcomingTab();
      case 'completed':
        return this.renderCompletedTab();
      case 'costs':
        return this.renderCostsTab();
      default:
        return '';
    }
  }

  getCurrentCount() {
    return this.records.filter(r => r.status === 'in_progress').length;
  }

  getUpcomingCount() {
    return this.records.filter(r => r.status === 'scheduled').length;
  }

  getCompletedCount() {
    return this.records.filter(r => r.status === 'completed').length;
  }

  renderCurrentTab() {
    const current = this.records.filter(r => r.status === 'in_progress')
      .sort((a, b) => new Date(a.date_performed) - new Date(b.date_performed));

    if (current.length === 0) {
      return `
        <div class="empty-state">
          <div class="empty-icon">🔄</div>
          <h3>No tasks in progress</h3>
          <p>No maintenance or repairs are currently in progress</p>
        </div>
      `;
    }

    return `
      <div class="records-list">
        ${this.renderRecordsTable(current)}
      </div>
    `;
  }

  renderUpcomingTab() {
    const upcoming = this.records.filter(r => r.status === 'scheduled')
      .sort((a, b) => new Date(a.date_performed) - new Date(b.date_performed));

    if (upcoming.length === 0) {
      return `
        <div class="empty-state">
          <div class="empty-icon">📅</div>
          <h3>No upcoming tasks</h3>
          <p>No maintenance or repairs are currently scheduled</p>
        </div>
      `;
    }

    return `
      <div class="records-list">
        ${this.renderRecordsTable(upcoming)}
      </div>
    `;
  }

  renderCompletedTab() {
    const completed = this.records.filter(r => r.status === 'completed')
      .sort((a, b) => new Date(b.date_performed) - new Date(a.date_performed));

    if (completed.length === 0) {
      return `
        <div class="empty-state">
          <div class="empty-icon">✅</div>
          <h3>No completed work</h3>
          <p>No completed records for this item</p>
        </div>
      `;
    }

    return `
      <div class="records-list">
        ${this.renderRecordsTable(completed)}
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
  
  _getFinanceCostTotal() {
    if (!this.costsData) return undefined;
    const costs = (this.costsData.costs || []).filter(c => c.cost_type === 'maintenance');
    return costs.reduce((sum, c) => sum + (c.total_cost || 0), 0);
  }

  renderCostsTab() {
    return `
      <div class="costs-tab">
        <div class="costs-loading" id="costs-loading">
          <div class="loading-message">Loading cost records…</div>
        </div>
        <div class="costs-content" id="costs-content" style="display:none"></div>
      </div>
    `;
  }

  async loadCostsForTab(container) {
    const loadingEl = container.querySelector('#costs-loading');
    const contentEl = container.querySelector('#costs-content');
    if (!contentEl) return;

    try {
      const [data, costsUrl] = await Promise.all([
        this.costsData ? Promise.resolve(this.costsData) : fetchItemCosts(this.itemId),
        getCostsUrl().catch(() => '')
      ]);
      this.costsData = data;
      const maintenanceCosts = (data.costs || [])
        .filter(c => c.cost_type === 'maintenance')
        .sort((a, b) => (b.cost_date || '').localeCompare(a.cost_date || ''));

      const total = maintenanceCosts.reduce((sum, c) => sum + (c.total_cost || 0), 0);

      contentEl.innerHTML = RecordDetailTabs.renderCostsContent(maintenanceCosts, total, costsUrl);
      if (loadingEl) loadingEl.style.display = 'none';
      contentEl.style.display = 'block';
    } catch (error) {
      console.error('Failed to load costs:', error);
      if (loadingEl) loadingEl.innerHTML = '<p class="error-message">Failed to load cost records.</p>';
    }
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
        select.addEventListener('change', async (e) => {
          this.activeTab = e.target.value;
          const contentDiv = container.querySelector('.detail-content');
          if (contentDiv) {
            contentDiv.innerHTML = this.renderTabContent();
            this.attachTableListeners(contentDiv);
            if (this.activeTab === 'costs') await this.loadCostsForTab(contentDiv);
          }
        });
      }
    } else {
      // Desktop tab buttons
      const tabBtns = container.querySelectorAll('.tab-btn');
      tabBtns.forEach(btn => {
        btn.addEventListener('click', async () => {
          this.activeTab = btn.getAttribute('data-tab');
          const contentDiv = container.querySelector('.detail-content');
          if (contentDiv) {
            contentDiv.innerHTML = this.renderTabContent();
            this.attachTableListeners(contentDiv);
            if (this.activeTab === 'costs') await this.loadCostsForTab(contentDiv);
          }

          // Update active tab button
          tabBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
        });
      });
    }
    
    // Initial table listeners
    this.attachTableListeners(container);

    if (this.activeTab === 'costs') {
      const contentDiv = container.querySelector('.detail-content');
      if (contentDiv) this.loadCostsForTab(contentDiv);
    }
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