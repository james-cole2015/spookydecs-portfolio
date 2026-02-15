// StatsDetailView Component
// Intra-deployment stats — single deployment drill-down with zone breakdown,
// item composition donuts, and efficiency metrics

export class StatsDetailView {
  constructor(deployment, zones) {
    this.deployment = deployment;
    this.zones = zones;
    this._charts = [];
  }

  render() {
    const container = document.createElement('div');
    container.className = 'stats-page';

    container.innerHTML = `
      <div class="stats-page-header">
        <button class="btn-back">← Back to Stats</button>
      </div>

      ${this._renderDeploymentHeader()}

      <div class="time-metrics">
        ${this._renderTimeMetrics()}
      </div>

      <p class="stats-section-title">Zone Breakdown</p>
      <div class="zone-stats-grid">
        ${this.zones.map(z => this._renderZoneCard(z)).join('')}
      </div>

      <p class="stats-section-title">Item Composition</p>
      <div class="charts-section">
        <div class="chart-card">
          <h3>By Class</h3>
          <div class="chart-container">
            <canvas id="chart-by-class"></canvas>
          </div>
          <div class="chart-legend" id="legend-by-class"></div>
        </div>
        <div class="chart-card">
          <h3>By Class Type</h3>
          <div class="chart-container">
            <canvas id="chart-by-class-type"></canvas>
          </div>
          <div class="chart-legend" id="legend-by-class-type"></div>
        </div>
      </div>

      <p class="stats-section-title">Efficiency Metrics</p>
      <div class="efficiency-section">
        <div class="efficiency-grid">
          ${this._renderEfficiencyCards()}
        </div>
      </div>
    `;

    // Charts need the canvas to be in the DOM — mount after returning
    requestAnimationFrame(() => {
      this._mountCharts(container);
    });

    return container;
  }

  _renderDeploymentHeader() {
    const d = this.deployment;
    return `
      <div class="deployment-detail-header">
        <div class="deployment-identity">
          <div class="deployment-id-block">
            <h2>${d.deployment_id}</h2>
            <div class="deployment-badges">
              ${this._seasonBadge(d.season)}
              ${this._statusBadge(d.status)}
              <span style="font-size:0.8rem;color:#9CA3AF;">${d.year}</span>
            </div>
          </div>
        </div>

        <div class="deployment-timestamps">
          <div class="timestamp-item">
            <span class="timestamp-label">Setup Started</span>
            <span class="timestamp-value ${d.setup_started_at ? '' : 'none'}">
              ${d.setup_started_at ? this._formatTimestamp(d.setup_started_at) : 'Not started'}
            </span>
          </div>
          <div class="timestamp-item">
            <span class="timestamp-label">Setup Completed</span>
            <span class="timestamp-value ${d.setup_completed_at ? '' : 'none'}">
              ${d.setup_completed_at ? this._formatTimestamp(d.setup_completed_at) : '—'}
            </span>
          </div>
          <div class="timestamp-item">
            <span class="timestamp-label">Teardown Started</span>
            <span class="timestamp-value ${d.teardown_started_at ? '' : 'none'}">
              ${d.teardown_started_at ? this._formatTimestamp(d.teardown_started_at) : '—'}
            </span>
          </div>
          <div class="timestamp-item">
            <span class="timestamp-label">Teardown Completed</span>
            <span class="timestamp-value ${d.teardown_completed_at ? '' : 'none'}">
              ${d.teardown_completed_at ? this._formatTimestamp(d.teardown_completed_at) : '—'}
            </span>
          </div>
        </div>
      </div>
    `;
  }

  _renderTimeMetrics() {
    const d = this.deployment;

    const setupMins = d.setup_started_at && d.setup_completed_at
      ? this._durationMinutes(d.setup_started_at, d.setup_completed_at) : null;

    const teardownMins = d.teardown_started_at && d.teardown_completed_at
      ? this._durationMinutes(d.teardown_started_at, d.teardown_completed_at) : null;

    const totalMins = d.setup_started_at && d.teardown_completed_at
      ? this._durationMinutes(d.setup_started_at, d.teardown_completed_at) : null;

    return `
      <div class="stat-card">
        <div class="stat-icon">🏗️</div>
        <div class="stat-content">
          <span class="stat-value">${setupMins !== null ? this._formatMinutes(setupMins) : '—'}</span>
          <span class="stat-label">Setup Duration</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">📦</div>
        <div class="stat-content">
          <span class="stat-value">${teardownMins !== null ? this._formatMinutes(teardownMins) : '—'}</span>
          <span class="stat-label">Teardown Duration</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🕐</div>
        <div class="stat-content">
          <span class="stat-value">${totalMins !== null ? this._formatMinutes(totalMins) : '—'}</span>
          <span class="stat-label">Total Elapsed</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">📦</div>
        <div class="stat-content">
          <span class="stat-value">${d.statistics?.total_items ?? 0}</span>
          <span class="stat-label">Items Deployed</span>
        </div>
      </div>
    `;
  }

  _renderZoneCard(zone) {
    const s = zone.statistics || {};
    const icons = { FY: '🏡', BY: '🌳', SY: '🏠' };
    const icon = icons[zone.zone_code] || '📍';

    return `
      <div class="zone-stat-card">
        <div class="zone-stat-card-header">
          <span class="zone-icon">${icon}</span>
          <h3>${zone.zone_name}</h3>
          <span class="zone-code">${zone.zone_code}</span>
        </div>
        <div class="zone-stat-card-body">
          <div class="zone-mini-stat">
            <span class="mini-value">${s.item_count ?? 0}</span>
            <span class="mini-label">Items</span>
          </div>
          <div class="zone-mini-stat">
            <span class="mini-value">${s.session_count ?? 0}</span>
            <span class="mini-label">Sessions</span>
          </div>
          <div class="zone-mini-stat">
            <span class="mini-value">${this._formatMinutes(s.total_setup_minutes ?? 0)}</span>
            <span class="mini-label">Total Time</span>
          </div>
          <div class="zone-mini-stat">
            <span class="mini-value">${this._formatMinutes(s.longest_session_minutes ?? 0)}</span>
            <span class="mini-label">Longest Session</span>
          </div>
        </div>
      </div>
    `;
  }

  _renderEfficiencyCards() {
    const d = this.deployment;
    const stats = d.statistics || {};
    const totalItems = stats.total_items || 0;
    const totalSessions = stats.total_sessions || 0;

    // Sum zone setup minutes since metadata total_setup_minutes may be 0
    const totalSetupMinutes = this.zones.reduce((sum, z) =>
      sum + (z.statistics?.total_setup_minutes || 0), 0
    );

    const minsPerItem = totalItems > 0 && totalSetupMinutes > 0
      ? (totalSetupMinutes / totalItems).toFixed(1) : null;

    const avgSessionMins = totalSessions > 0 && totalSetupMinutes > 0
      ? Math.round(totalSetupMinutes / totalSessions) : null;

    const activeZones = this.zones.filter(z =>
      (z.statistics?.item_count || 0) > 0
    ).length;

    const totalSessAll = this.zones.reduce((sum, z) =>
      sum + (z.statistics?.session_count || 0), 0
    );

    return `
      <div class="efficiency-card">
        <span class="efficiency-value">${minsPerItem !== null ? `${minsPerItem}m` : '—'}</span>
        <span class="efficiency-label">Minutes per Item</span>
        <span class="efficiency-sub">Based on zone setup time</span>
      </div>
      <div class="efficiency-card">
        <span class="efficiency-value">${avgSessionMins !== null ? this._formatMinutes(avgSessionMins) : '—'}</span>
        <span class="efficiency-label">Avg Session Length</span>
        <span class="efficiency-sub">Across all zones</span>
      </div>
      <div class="efficiency-card">
        <span class="efficiency-value">${activeZones} / ${this.zones.length}</span>
        <span class="efficiency-label">Zones Used</span>
        <span class="efficiency-sub">Zones with items deployed</span>
      </div>
      <div class="efficiency-card">
        <span class="efficiency-value">${totalSessAll}</span>
        <span class="efficiency-label">Total Sessions</span>
        <span class="efficiency-sub">Across all zones</span>
      </div>
    `;
  }

  // ── Chart.js donuts ──────────────────────────────────────

  _mountCharts(container) {
    if (typeof Chart === 'undefined') {
      console.warn('[StatsDetailView] Chart.js not loaded');
      this._renderChartFallback(container);
      return;
    }

    const byClass = this.deployment.statistics?.by_class || {};
    const byClassType = this.deployment.statistics?.by_class_type || {};

    this._buildDonut(
      container.querySelector('#chart-by-class'),
      container.querySelector('#legend-by-class'),
      byClass,
      ['#60A5FA', '#34D399', '#F59E0B', '#F87171', '#A78BFA']
    );

    this._buildDonut(
      container.querySelector('#chart-by-class-type'),
      container.querySelector('#legend-by-class-type'),
      byClassType,
      ['#60A5FA', '#34D399', '#F59E0B', '#F87171', '#A78BFA', '#FB923C']
    );
  }

  _buildDonut(canvas, legendEl, data, colors) {
    if (!canvas) return;

    const entries = Object.entries(data);

    if (entries.length === 0) {
      canvas.parentElement.innerHTML = `<div class="chart-empty">No data available</div>`;
      if (legendEl) legendEl.innerHTML = '';
      return;
    }

    const labels = entries.map(([k]) => k);
    const values = entries.map(([, v]) => v);
    const total = values.reduce((a, b) => a + b, 0);

    const centerTextPlugin = {
      id: 'centerText',
      beforeDraw(chart) {
        const { width, height, ctx } = chart;
        ctx.save();
        const centerX = width / 2;
        const centerY = height / 2;

        ctx.font = `700 1.75rem -apple-system, BlinkMacSystemFont, sans-serif`;
        ctx.fillStyle = '#1F2937';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(total, centerX, centerY - 10);

        ctx.font = `0.65rem -apple-system, BlinkMacSystemFont, sans-serif`;
        ctx.fillStyle = '#9CA3AF';
        ctx.fillText('items', centerX, centerY + 12);
        ctx.restore();
      }
    };

    const chart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: colors.slice(0, entries.length),
          borderWidth: 2,
          borderColor: '#ffffff',
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const pct = ((ctx.parsed / total) * 100).toFixed(0);
                return ` ${ctx.label}: ${ctx.parsed} (${pct}%)`;
              }
            }
          }
        }
      },
      plugins: [centerTextPlugin]
    });

    this._charts.push(chart);

    // Build legend
    if (legendEl) {
      legendEl.innerHTML = entries.map(([label, count], i) => {
        const pct = ((count / total) * 100).toFixed(0);
        return `
          <div class="legend-item">
            <div class="legend-dot-label">
              <div class="legend-dot" style="background:${colors[i % colors.length]}"></div>
              <span>${label}</span>
            </div>
            <span class="legend-count">${count} <span style="color:#9CA3AF;font-weight:400">(${pct}%)</span></span>
          </div>
        `;
      }).join('');
    }
  }

  _renderChartFallback(container) {
    ['chart-by-class', 'chart-by-class-type'].forEach(id => {
      const canvas = container.querySelector(`#${id}`);
      if (canvas) {
        canvas.parentElement.innerHTML = `<div class="chart-empty">Chart.js not loaded</div>`;
      }
    });
  }

  destroy() {
    this._charts.forEach(c => c.destroy());
    this._charts = [];
  }

  // ── Helpers ──────────────────────────────────────────────

  _seasonBadge(season) {
    const map = {
      Halloween: { cls: 'halloween', icon: '🎃' },
      Christmas:  { cls: 'christmas',  icon: '🎄' },
      Shared:     { cls: 'shared',     icon: '📅' }
    };
    const s = map[season] || { cls: 'shared', icon: '📅' };
    return `<span class="season-badge ${s.cls}">${s.icon} ${season}</span>`;
  }

  _statusBadge(status) {
    const label = status.replace(/_/g, ' ');
    return `<span class="status-badge ${status}">${label}</span>`;
  }

  _durationMinutes(start, end) {
    return Math.round((new Date(end) - new Date(start)) / 60000);
  }

  _formatMinutes(minutes) {
    if (!minutes || minutes <= 0) return '0m';
    if (minutes < 60) return `${minutes}m`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m === 0 ? `${h}h` : `${h}h ${m}m`;
  }

  _formatTimestamp(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    }) + ' ' + d.toLocaleTimeString('en-US', {
      hour: 'numeric', minute: '2-digit', hour12: true
    });
  }
}