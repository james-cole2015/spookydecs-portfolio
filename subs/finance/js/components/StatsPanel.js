// Stats Panel Component

import { formatCurrency } from '../utils/finance-config.js';
import { getCostStats } from '../utils/finance-api.js';

export class StatsPanel {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.stats = null;
    this.render();
  }

  async loadStats(filters = {}) {
    try {
      this.stats = await getCostStats(filters);
      this.render();
    } catch (error) {
      console.error('Failed to load stats:', error);
      this.renderError();
    }
  }

  render() {
    if (!this.stats) {
      this.renderLoading();
      return;
    }

    this.container.innerHTML = `
      <div class="stats-container">
        ${this.renderOverview()}
        ${this.renderCategoryBreakdown()}
        ${this.renderTypeBreakdown()}
        ${this.renderTopVendors()}
        ${this.renderMonthlyTrend()}
      </div>

      <style>
        .stats-container {
          display: grid;
          gap: 24px;
        }

        .stat-card {
          background: white;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          padding: 24px;
        }

        .stat-card-title {
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 16px;
          color: #0f172a;
        }

        .overview-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
        }

        .overview-item {
          text-align: center;
        }

        .overview-value {
          font-size: 32px;
          font-weight: 700;
          color: #3b82f6;
          margin-bottom: 8px;
        }

        .overview-label {
          font-size: 13px;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .stat-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .stat-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 0;
          border-bottom: 1px solid #f1f5f9;
        }

        .stat-item:last-child {
          border-bottom: none;
        }

        .stat-item-label {
          font-size: 14px;
          color: #0f172a;
        }

        .stat-item-value {
          font-size: 14px;
          font-weight: 600;
          color: #64748b;
        }

        .stat-bar {
          margin-top: 8px;
          height: 8px;
          background: #e2e8f0;
          border-radius: 4px;
          overflow: hidden;
        }

        .stat-bar-fill {
          height: 100%;
          background: #3b82f6;
          transition: width 0.3s ease;
        }

        .placeholder-chart {
          background: #f8fafc;
          border: 2px dashed #cbd5e1;
          border-radius: 8px;
          padding: 60px 20px;
          text-align: center;
          color: #64748b;
        }

        .placeholder-icon {
          font-size: 48px;
          margin-bottom: 12px;
        }

        @media (max-width: 768px) {
          .overview-grid {
            grid-template-columns: 1fr;
          }
        }
      </style>
    `;
  }

  renderOverview() {
    const totalAmount = this.stats.total_amount || 0;
    const totalRecords = this.stats.total_records || 0;
    const avgCost = totalRecords > 0 ? totalAmount / totalRecords : 0;

    return `
      <div class="stat-card">
        <h3 class="stat-card-title">Overview</h3>
        <div class="overview-grid">
          <div class="overview-item">
            <div class="overview-value">${totalRecords}</div>
            <div class="overview-label">Total Records</div>
          </div>
          <div class="overview-item">
            <div class="overview-value">${formatCurrency(totalAmount)}</div>
            <div class="overview-label">Total Spend</div>
          </div>
          <div class="overview-item">
            <div class="overview-value">${formatCurrency(avgCost)}</div>
            <div class="overview-label">Average Cost</div>
          </div>
        </div>
      </div>
    `;
  }

  renderCategoryBreakdown() {
    const categories = this.stats.by_category || {};
    const maxAmount = Math.max(...Object.values(categories).map(c => c.amount), 1);

    return `
      <div class="stat-card">
        <h3 class="stat-card-title">By Category</h3>
        <ul class="stat-list">
          ${Object.entries(categories)
            .sort((a, b) => b[1].amount - a[1].amount)
            .map(([category, data]) => {
              const percentage = (data.amount / maxAmount) * 100;
              return `
                <li class="stat-item">
                  <div style="flex: 1;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                      <span class="stat-item-label">${category}</span>
                      <span class="stat-item-value">${formatCurrency(data.amount)}</span>
                    </div>
                    <div class="stat-bar">
                      <div class="stat-bar-fill" style="width: ${percentage}%"></div>
                    </div>
                  </div>
                </li>
              `;
            })
            .join('')}
        </ul>
      </div>
    `;
  }

  renderTypeBreakdown() {
    const types = this.stats.by_type || {};
    const maxAmount = Math.max(...Object.values(types).map(t => t.amount), 1);

    return `
      <div class="stat-card">
        <h3 class="stat-card-title">By Cost Type</h3>
        <ul class="stat-list">
          ${Object.entries(types)
            .sort((a, b) => b[1].amount - a[1].amount)
            .map(([type, data]) => {
              const percentage = (data.amount / maxAmount) * 100;
              const label = type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
              return `
                <li class="stat-item">
                  <div style="flex: 1;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                      <span class="stat-item-label">${label}</span>
                      <span class="stat-item-value">${formatCurrency(data.amount)}</span>
                    </div>
                    <div class="stat-bar">
                      <div class="stat-bar-fill" style="width: ${percentage}%"></div>
                    </div>
                  </div>
                </li>
              `;
            })
            .join('')}
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
          <h3 class="stat-card-title">Top 5 Vendors</h3>
          <p style="color: #64748b; text-align: center; padding: 20px;">No vendor data available</p>
        </div>
      `;
    }

    const maxAmount = Math.max(...topVendors.map(([_, data]) => data.amount), 1);

    return `
      <div class="stat-card">
        <h3 class="stat-card-title">Top 5 Vendors</h3>
        <ul class="stat-list">
          ${topVendors.map(([vendor, data]) => {
            const percentage = (data.amount / maxAmount) * 100;
            return `
              <li class="stat-item">
                <div style="flex: 1;">
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span class="stat-item-label">${vendor}</span>
                    <span class="stat-item-value">${formatCurrency(data.amount)} (${data.count} purchases)</span>
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

  renderMonthlyTrend() {
    return `
      <div class="stat-card">
        <h3 class="stat-card-title">Monthly Trend</h3>
        <div class="placeholder-chart">
          <div class="placeholder-icon">📊</div>
          <p>Chart visualization coming soon</p>
          <p style="font-size: 12px; margin-top: 8px;">Suggestion: Use Chart.js or Recharts for line/bar charts</p>
        </div>
      </div>
    `;
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
