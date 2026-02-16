// StatsView Component
// Inter-deployment stats overview — all deployments with season filter

export class StatsView {
  constructor(deployments) {
    this.deployments = deployments;
    this.activeFilter = 'all';
  }

  render() {
    const container = document.createElement('div');
    container.className = 'stats-page';

    container.innerHTML = `
      <div class="stats-page-header">
        <button class="btn-back">← Back to Deployments</button>
        <h1>📊 Deployment Stats</h1>
        <p>Performance metrics and history across all deployments</p>
      </div>

      <div class="season-filter-tabs">
        <button class="season-tab active" data-filter="all">All Seasons</button>
        <button class="season-tab" data-filter="Halloween">🎃 Halloween</button>
        <button class="season-tab" data-filter="Christmas">🎄 Christmas</button>
      </div>

      <div class="summary-stats" id="summary-stats"></div>

      <div class="section-header">
        <h2>Deployments</h2>
        <span class="record-count" id="record-count">—</span>
      </div>

      <div id="deployments-table-area"></div>
    `;

    this._attachTabHandlers(container);
    this._renderFiltered(container, this.deployments);

    return container;
  }

  _attachTabHandlers(container) {
    container.querySelectorAll('.season-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        container.querySelectorAll('.season-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.activeFilter = tab.dataset.filter;
        const filtered = this._filterDeployments(this.deployments, this.activeFilter);
        this._renderFiltered(container, filtered);
      });
    });
  }

  _filterDeployments(deployments, filter) {
    if (filter === 'all') return deployments;
    return deployments.filter(d => d.season === filter);
  }

  _renderFiltered(container, deployments) {
    this._renderSummaryStats(container, deployments);
    this._renderTable(container, deployments);
  }

  _renderSummaryStats(container, deployments) {
    const el = container.querySelector('#summary-stats');

    const total = deployments.length;
    const completed = deployments.filter(d =>
      d.status === 'completed' || d.status === 'archived'
    );

    const avgItems = total === 0 ? 0 : Math.round(
      deployments.reduce((sum, d) => sum + (d.statistics?.total_items || 0), 0) / total
    );

    const setupTimes = completed
      .filter(d => d.setup_started_at && d.setup_completed_at)
      .map(d => this._durationMinutes(d.setup_started_at, d.setup_completed_at));

    const avgSetup = setupTimes.length === 0 ? null :
      Math.round(setupTimes.reduce((a, b) => a + b, 0) / setupTimes.length);

    const totalSessions = deployments.reduce((sum, d) =>
      sum + (d.statistics?.total_sessions || 0), 0
    );

    el.innerHTML = `
      <div class="stat-card">
        <div class="stat-icon">🚀</div>
        <div class="stat-content">
          <span class="stat-value">${total}</span>
          <span class="stat-label">Total Deployments</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">📦</div>
        <div class="stat-content">
          <span class="stat-value">${avgItems}</span>
          <span class="stat-label">Avg Items / Deployment</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">⏱️</div>
        <div class="stat-content">
          <span class="stat-value">${avgSetup !== null ? this._formatMinutes(avgSetup) : '—'}</span>
          <span class="stat-label">Avg Setup Time</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🔧</div>
        <div class="stat-content">
          <span class="stat-value">${totalSessions}</span>
          <span class="stat-label">Total Sessions</span>
        </div>
      </div>
    `;
  }

  _renderTable(container, deployments) {
    const area = container.querySelector('#deployments-table-area');
    const count = container.querySelector('#record-count');

    count.textContent = `${deployments.length} deployment${deployments.length !== 1 ? 's' : ''}`;

    if (deployments.length === 0) {
      area.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📭</div>
          <h3>No deployments found</h3>
          <p>No deployments match the selected season filter.</p>
        </div>
      `;
      return;
    }

    // Sort newest first
    const sorted = [...deployments].sort((a, b) =>
      new Date(b.created_at) - new Date(a.created_at)
    );

    area.innerHTML = `
      <div class="deployments-table-wrapper">
        <div class="deployments-table-header">
          <span>Deployment</span>
          <span>Season</span>
          <span>Status</span>
          <span>Items</span>
          <span>Setup Time</span>
          <span>Teardown</span>
          <span></span>
        </div>
        ${sorted.map(d => this._renderRow(d)).join('')}
      </div>
    `;

    area.querySelectorAll('.deployment-row').forEach(row => {
      row.addEventListener('click', () => {
        const id = row.dataset.deploymentId;
        container.dispatchEvent(new CustomEvent('stats-detail-navigate', {
          bubbles: true,
          detail: { deploymentId: id }
        }));
      });
    });
  }

  _renderRow(d) {
    const setupDuration = d.setup_started_at && d.setup_completed_at
      ? this._formatMinutes(this._durationMinutes(d.setup_started_at, d.setup_completed_at))
      : null;

    const teardownDuration = d.teardown_started_at && d.teardown_completed_at
      ? this._formatMinutes(this._durationMinutes(d.teardown_started_at, d.teardown_completed_at))
      : null;

    const items = d.statistics?.total_items ?? 0;

    return `
      <div class="deployment-row" data-deployment-id="${d.deployment_id}">
        <div>
          <div class="dep-id">${d.deployment_id}</div>
          <div class="dep-meta">${d.year} · Created ${this._formatDate(d.created_at)}</div>
        </div>
        <div>${this._seasonBadge(d.season)}</div>
        <div>${this._statusBadge(d.status)}</div>
        <div class="dep-number">${items}</div>
        <div class="dep-duration ${setupDuration ? '' : 'none'}">${setupDuration || '—'}</div>
        <div class="dep-duration ${teardownDuration ? '' : 'none'}">${teardownDuration || '—'}</div>
        <div class="row-arrow">›</div>
      </div>
    `;
  }

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
    if (minutes < 0) minutes = 0;
    if (minutes < 60) return `${minutes}m`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m === 0 ? `${h}h` : `${h}h ${m}m`;
  }

  _formatDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
  }
}
