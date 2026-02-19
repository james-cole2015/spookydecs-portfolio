// Stats Panel Component

import { formatCurrency } from '../utils/finance-config.js';
import { getCostStats, getItems } from '../utils/finance-api.js';
import { stateManager } from '../utils/state.js';
import { navigateTo } from '../utils/router.js';

export class StatsPanel {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.stats = null;
    this.valueStats = null;
    this.activeFilter = null;
    this.render();
  }

  async loadStats(filters = {}) {
    try {
      this.stats = await getCostStats(filters);
      await this.loadValueStats();
      this.render();
    } catch (error) {
      console.error('Failed to load stats:', error);
      this.renderError();
    }
  }

  async loadValueStats() {
    try {
      // Fetch all items with no status filter, exclude Retired client-side
      const response = await getItems({});
      const allItems = Array.isArray(response) ? response : (response.items || []);
      const items = allItems.filter(item => item.status !== 'Retired');

      this.valueStats = {
        totalValue: 0,
        bySeason: {},
        byCategory: {},
        itemCount: items.length
      };

      items.forEach(item => {
        const value = parseFloat(item.vendor_metadata?.value || 0);
        this.valueStats.totalValue += value;

        const season = item.season || 'Unknown';
        if (!this.valueStats.bySeason[season]) {
          this.valueStats.bySeason[season] = 0;
        }
        this.valueStats.bySeason[season] += value;

        const category = item.class_type || 'Unknown';
        if (!this.valueStats.byCategory[category]) {
          this.valueStats.byCategory[category] = 0;
        }
        this.valueStats.byCategory[category] += value;
      });
    } catch (error) {
      console.error('Failed to load value stats:', error);
      this.valueStats = null;
    }
  }

  render() {
    if (!this.stats) {
      this.renderLoading();
      return;
    }

    const state = stateManager.getState();
    this.activeFilter = state.categoryFilter || null;

    this.container.innerHTML = `
      <div class="stats-container">
        ${this.activeFilter ? this.renderFilterBanner() : ''}
        ${this.renderSpendingSummary()}
        ${this.renderValueSummary()}
        ${this.renderCategoryCards()}
        ${this.renderInsights()}
        ${this.renderBreakdowns()}
      </div>
    `;

    this.attachEventListeners();
  }

  renderFilterBanner() {
    return `
      <div class="filter-banner">
        <span class="filter-text">Filtering by category: <strong>${this.activeFilter}</strong></span>
        <button class="btn-clear-filter" data-action="clear-filter">
          <span class="clear-icon">×</span> Clear Filter
        </button>
      </div>
    `;
  }

  renderSpendingSummary() {
    const totalAmount = this.stats.total_amount || 0;
    const totalRecords = this.stats.total_records || 0;
    const avgCost = totalRecords > 0 ? totalAmount / totalRecords : 0;

    const thisYearAmount = Object.entries(this.stats.by_month || {})
      .filter(([month]) => month.startsWith('2026'))
      .reduce((sum, [_, data]) => sum + data.amount, 0);

    return `
      <div class="stat-section">
        <h3 class="section-title">💰 Spending Summary</h3>
        <div class="summary-cards">
          <div class="summary-card">
            <div class="card-label">Total Spend</div>
            <div class="card-value">${formatCurrency(totalAmount)}</div>
          </div>
          <div class="summary-card">
            <div class="card-label">This Year</div>
            <div class="card-value">${formatCurrency(thisYearAmount)}</div>
          </div>
          <div class="summary-card">
            <div class="card-label">Total Records</div>
            <div class="card-value">${totalRecords}</div>
          </div>
          <div class="summary-card">
            <div class="card-label">Avg per Record</div>
            <div class="card-value">${formatCurrency(avgCost)}</div>
          </div>
        </div>
      </div>
    `;
  }

  renderValueSummary() {
    if (!this.valueStats) {
      return `
        <div class="stat-section">
          <h3 class="section-title">💎 Value Summary</h3>
          <p class="empty-message">Value data unavailable</p>
        </div>
      `;
    }

    const halloweenValue = this.valueStats.bySeason['Halloween'] || 0;
    const christmasValue = this.valueStats.bySeason['Christmas'] || 0;
    const sharedValue = this.valueStats.bySeason['Shared'] || 0;

    return `
      <div class="stat-section">
        <h3 class="section-title">💎 Value Summary</h3>
        <div class="summary-cards">
          <div class="summary-card">
            <div class="card-label">Total Value</div>
            <div class="card-value">${formatCurrency(this.valueStats.totalValue)}</div>
          </div>
          <div class="summary-card">
            <div class="card-label">Halloween</div>
            <div class="card-value">${formatCurrency(halloweenValue)}</div>
          </div>
          <div class="summary-card">
            <div class="card-label">Christmas</div>
            <div class="card-value">${formatCurrency(christmasValue)}</div>
          </div>
          <div class="summary-card">
            <div class="card-label">Shared</div>
            <div class="card-value">${formatCurrency(sharedValue)}</div>
          </div>
        </div>
      </div>
    `;
  }

  renderCategoryCards() {
    const categories = this.stats.by_category || {};
    
    return `
      <div class="stat-section">
        <h3 class="section-title">💸 Spending by Category</h3>
        <p class="section-subtitle">Click a category to filter records</p>
        <div class="category-cards">
          ${Object.entries(categories)
            .sort((a, b) => b[1].amount - a[1].amount)
            .map(([category, data]) => `
              <div class="category-card ${this.activeFilter === category ? 'active' : ''}" data-category="${category}">
                <div class="category-name">${category}</div>
                <div class="category-amount">${formatCurrency(data.amount)}</div>
                <div class="category-count">${data.count} record${data.count !== 1 ? 's' : ''}</div>
              </div>
            `).join('')}
        </div>
      </div>
    `;
  }

  renderInsights() {
    const categories = this.stats.by_category || {};
    const vendors = this.stats.by_vendor || {};
    const types = this.stats.by_type || {};

    const mostExpensiveCategory = Object.entries(categories)
      .sort((a, b) => b[1].amount - a[1].amount)[0];
    
    const topVendor = Object.entries(vendors)
      .sort((a, b) => b[1].amount - a[1].amount)[0];

    const giftValue = types['gift']?.amount || 0;
    const totalSpend = this.stats.total_amount || 0;
    const giftPercentage = totalSpend > 0 ? (giftValue / totalSpend * 100).toFixed(0) : 0;

    const overheadCategories = ['materials', 'consumables', 'labor', 'other'];
    const overheadCost = Object.entries(categories)
      .filter(([cat]) => overheadCategories.includes(cat))
      .reduce((sum, [_, data]) => sum + data.amount, 0);
    const overheadPercentage = totalSpend > 0 ? (overheadCost / totalSpend * 100).toFixed(0) : 0;

    return `
      <div class="stat-section">
        <h3 class="section-title">🏆 Insights</h3>
        <div class="insights-list">
          ${mostExpensiveCategory ? `
            <div class="insight-item">
              <span class="insight-icon">📊</span>
              <span class="insight-text">
                Most spending in <strong>${mostExpensiveCategory[0]}</strong> 
                (${formatCurrency(mostExpensiveCategory[1].amount)})
              </span>
            </div>
          ` : ''}
          ${topVendor ? `
            <div class="insight-item">
              <span class="insight-icon">🪀</span>
              <span class="insight-text">
                Top vendor: <strong>${topVendor[0]}</strong> 
                (${formatCurrency(topVendor[1].amount)} across ${topVendor[1].count} purchases)
              </span>
            </div>
          ` : ''}
          ${giftValue > 0 ? `
            <div class="insight-item">
              <span class="insight-icon">🎁</span>
              <span class="insight-text">
                Gifts received: ${formatCurrency(giftValue)} value (${giftPercentage}% of total)
              </span>
            </div>
          ` : ''}
          ${overheadCost > 0 ? `
            <div class="insight-item">
              <span class="insight-icon">📦</span>
              <span class="insight-text">
                Overhead costs: ${formatCurrency(overheadCost)} (${overheadPercentage}% of total)
              </span>
            </div>
          ` : ''}
          ${this.valueStats ? `
            <div class="insight-item">
              <span class="insight-icon">💎</span>
              <span class="insight-text">
                Total value vs cost: ${formatCurrency(this.valueStats.totalValue)} value 
                from ${formatCurrency(totalSpend)} spent
              </span>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  renderBreakdowns() {
    return `
      <div class="breakdowns-grid">
        ${this.renderTypeBreakdown()}
        ${this.renderTopVendors()}
      </div>
    `;
  }

  renderTypeBreakdown() {
    const types = this.stats.by_type || {};
    const maxAmount = Math.max(...Object.values(types).map(t => t.amount), 1);

    return `
      <div class="stat-card">
        <h4 class="stat-card-title">By Cost Type</h4>
        <ul class="stat-list">
          ${Object.entries(types)
            .sort((a, b) => b[1].amount - a[1].amount)
            .map(([type, data]) => {
              const percentage = (data.amount / maxAmount) * 100;
              const label = type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
              return `
                <li class="stat-item">
                  <div class="stat-item-content">
                    <div class="stat-item-header">
                      <span class="stat-item-label">${label}</span>
                      <span class="stat-item-value">${formatCurrency(data.amount)}</span>
                    </div>
                    <div class="stat-bar">
                      <div class="stat-bar-fill" style="width: ${percentage}%"></div>
                    </div>
                  </div>
                </li>
              `;
            }).join('')}
        </ul>
      </div>
    `;
  }

  renderTopVendors() {
    const vendors = this.stats.by_vendor || {};
    const topVendors = Object.entries(vendors)
      .sort((a, b) => b[1].amount - a[1].amount)
      .slice(0, 5);

    if (topVendors.length === 0) {
      return `
        <div class="stat-card">
          <h4 class="stat-card-title">Top 5 Vendors</h4>
          <p class="empty-message">No vendor data available</p>
        </div>
      `;
    }

    const maxAmount = Math.max(...topVendors.map(([_, data]) => data.amount), 1);

    return `
      <div class="stat-card">
        <h4 class="stat-card-title">Top 5 Vendors</h4>
        <ul class="stat-list">
          ${topVendors.map(([vendor, data]) => {
            const percentage = (data.amount / maxAmount) * 100;
            return `
              <li class="stat-item">
                <div class="stat-item-content">
                  <div class="stat-item-header">
                    <span class="stat-item-label">${vendor}</span>
                    <span class="stat-item-value">${formatCurrency(data.amount)}</span>
                  </div>
                  <div class="stat-bar">
                    <div class="stat-bar-fill" style="width: ${percentage}%"></div>
                  </div>
                </div>
              </li>
            `;
          }).join('')}
        </ul>
      </div>
    `;
  }

  attachEventListeners() {
    document.querySelectorAll('[data-action="clear-filter"]').forEach(btn => {
      btn.addEventListener('click', () => {
        stateManager.setState({ categoryFilter: null });
        this.activeFilter = null;
        this.render();
        navigateTo('/records');
      });
    });

    document.querySelectorAll('.category-card').forEach(card => {
      card.addEventListener('click', (e) => {
        const category = e.currentTarget.dataset.category;
        stateManager.setState({ categoryFilter: category });
        navigateTo('/records');
      });
    });
  }

  renderLoading() {
    this.container.innerHTML = `
      <div class="loading-spinner">
        <p>Loading statistics...</p>
      </div>
    `;
  }

  renderError() {
    this.container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⚠️</div>
        <p class="empty-state-text">Failed to load statistics</p>
      </div>
    `;
  }
}