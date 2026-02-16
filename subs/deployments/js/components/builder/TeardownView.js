// TeardownView Component
// Tabbed zone view listing deployed items with Tear Down buttons

export class TeardownView {
  constructor({ deployment, zones, deploymentId, onStart, onTeardownItem, onComplete, onBack, onDone }) {
    this.deployment = deployment;
    this.zones = zones;
    this.deploymentId = deploymentId;
    this.onStart = onStart;
    this.onTeardownItem = onTeardownItem;
    this.onComplete = onComplete;
    this.onBack = onBack;
    this.onDone = onDone;

    this.activeTab = null;
    this.container = null;
    this.isStarted = deployment.status === 'active_teardown';

    this.sortedZones = [...zones].sort((a, b) => {
      const order = { FY: 1, BY: 2, SY: 3 };
      return (order[a.zone_code] || 99) - (order[b.zone_code] || 99);
    });

    if (this.sortedZones.length > 0) {
      this.activeTab = this.sortedZones[0].zone_code;
    }
  }

  render() {
    this.container = document.createElement('div');
    this.container.className = 'teardown-container';
    this.container.innerHTML = this._buildHTML();
    this._attachEvents();
    return this.container;
  }

  _buildHTML() {
    const { deployment, deploymentId } = this;
    const status = deployment.status || 'unknown';
    const startedAt = deployment.teardown_started_at
      ? new Date(deployment.teardown_started_at).toLocaleDateString()
      : null;

    return `
      <div class="teardown-breadcrumb">
        <button class="btn-back">← Back to Zones</button>
      </div>

      <div class="teardown-header">
        <div class="teardown-header-top">
          <div>
            <h1 class="teardown-title">${deployment.deployment_id || deploymentId}</h1>
            <div class="teardown-header-badges">
              <span class="season-badge">${deployment.season || 'Unknown'}</span>
              <span class="year-badge">${deployment.year || 'N/A'}</span>
              <span class="status-badge status-${status}">${status.replace(/_/g, ' ')}</span>
            </div>
          </div>
          ${startedAt ? `
            <div class="teardown-header-meta">
              <span class="meta-label">Teardown Started</span>
              <span class="meta-value">${startedAt}</span>
            </div>
          ` : ''}
        </div>
      </div>

      ${!this.isStarted ? this._buildStartBanner() : this._buildTeardownContent()}

      ${this._buildCompleteModal()}
    `;
  }

  _buildStartBanner() {
    return `
      <div class="teardown-start-banner">
        <div class="start-banner-icon">🧹</div>
        <h2>Ready to Begin Teardown?</h2>
        <p>This will mark the deployment as <strong>active teardown</strong> and allow you to remove items zone by zone.</p>
        <button class="btn btn-primary btn-start-teardown">Start Teardown</button>
      </div>
    `;
  }

  _buildTeardownContent() {
    return `
      <div class="teardown-tabs">
        ${this._buildTabBar()}
      </div>
      <div class="teardown-tab-content">
        ${this._buildTabPanels()}
      </div>
      <div class="teardown-footer">
        <div class="teardown-footer-inner">
          <p class="teardown-disclaimer">Completing teardown will archive this deployment. This cannot be undone.</p>
          <button class="btn btn-danger btn-complete-teardown">Complete Teardown</button>
        </div>
      </div>
    `;
  }

  _buildTabBar() {
    return this.sortedZones.map(zone => {
      const items = zone.items_deployed || [];
      const tornDown = items.filter(i => i.status === 'TearDown').length;
      const isActive = zone.zone_code === this.activeTab;
      const allDone = items.length > 0 && tornDown === items.length;

      return `
        <button class="teardown-tab ${isActive ? 'teardown-tab--active' : ''} ${allDone ? 'teardown-tab--done' : ''}"
          data-zone="${zone.zone_code}">
          ${this._getZoneIcon(zone.zone_code)} ${zone.zone_name}
          <span class="tab-count">${tornDown}/${items.length}</span>
          ${allDone ? '<span class="tab-check">✓</span>' : ''}
        </button>
      `;
    }).join('');
  }

  _buildTabPanels() {
    return this.sortedZones.map(zone => {
      const isActive = zone.zone_code === this.activeTab;
      const items = zone.items_deployed || [];

      return `
        <div class="teardown-panel ${isActive ? 'teardown-panel--active' : ''}"
          data-panel="${zone.zone_code}">
          ${items.length === 0
            ? `<div class="empty-state"><p>No items deployed in ${zone.zone_name}.</p></div>`
            : this._buildItemTable(items, zone.zone_code)
          }
        </div>
      `;
    }).join('');
  }

  _buildItemTable(items, zoneCode) {
    const grouped = {};
    items.forEach(item => {
      const cls = item.class || 'Unknown';
      if (!grouped[cls]) grouped[cls] = [];
      grouped[cls].push(item);
    });

    const classOrder = ['Decoration', 'Light', 'Accessory'];
    const sortedClasses = Object.keys(grouped).sort((a, b) => {
      return (classOrder.indexOf(a) === -1 ? 99 : classOrder.indexOf(a)) -
             (classOrder.indexOf(b) === -1 ? 99 : classOrder.indexOf(b));
    });

    return sortedClasses.map(cls => `
      <div class="teardown-class-group">
        <div class="teardown-class-header"><h3>${cls}</h3></div>
        <table class="teardown-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${grouped[cls].map(item => this._buildItemRow(item, zoneCode)).join('')}
          </tbody>
        </table>
      </div>
    `).join('');
  }

  _buildItemRow(item, zoneCode) {
    const isTornDown = item.status === 'TearDown';
    const statusClass = (item.status || 'unknown').toLowerCase().replace(/\s/g, '-');
    return `
      <tr class="teardown-row ${isTornDown ? 'teardown-row--done' : ''}"
        data-item-id="${item.id}" data-zone="${zoneCode}">
        <td class="item-id">${item.id}</td>
        <td class="item-name">${item.short_name || '—'}</td>
        <td class="item-status">
          <span class="status-pill status-${statusClass}">${item.status || 'Unknown'}</span>
        </td>
        <td class="item-action">
          ${isTornDown
            ? `<span class="torn-down-label">✓ Torn Down</span>`
            : `<button class="btn btn-sm btn-teardown-item" data-item-id="${item.id}" data-zone="${zoneCode}">Tear Down</button>`
          }
        </td>
      </tr>
    `;
  }

  _buildCompleteModal() {
    return `
      <div class="teardown-modal-backdrop" style="display:none;">
        <div class="teardown-modal">
          <h2>Complete Teardown?</h2>
          <p>This will archive the deployment and mark teardown as complete. This cannot be undone.</p>
          <div class="teardown-modal-actions">
            <button class="btn btn-secondary btn-modal-cancel">Cancel</button>
            <button class="btn btn-danger btn-modal-confirm">Yes, Complete Teardown</button>
          </div>
        </div>
      </div>
    `;
  }

  _attachEvents() {
    const c = this.container;

    c.querySelector('.btn-back')?.addEventListener('click', () => this.onBack());
    c.querySelector('.btn-start-teardown')?.addEventListener('click', () => this._handleStart());

    c.querySelectorAll('.teardown-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this.activeTab = tab.dataset.zone;
        this._refreshTabs();
        this._refreshPanels();
      });
    });

    c.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-teardown-item');
      if (btn) this._handleTeardownItem(btn.dataset.itemId, btn.dataset.zone, btn);
    });

    c.querySelector('.btn-complete-teardown')?.addEventListener('click', () => {
      c.querySelector('.teardown-modal-backdrop').style.display = 'flex';
    });

    c.querySelector('.btn-modal-cancel')?.addEventListener('click', () => {
      c.querySelector('.teardown-modal-backdrop').style.display = 'none';
    });

    c.querySelector('.btn-modal-confirm')?.addEventListener('click', () => this._handleComplete());
  }

  async _handleStart() {
    const btn = this.container.querySelector('.btn-start-teardown');
    btn.disabled = true;
    btn.textContent = 'Starting...';

    try {
      await this.onStart();
      this.isStarted = true;
      this.deployment.status = 'active_teardown';
      this.deployment.teardown_started_at = new Date().toISOString();
      this.container.innerHTML = this._buildHTML();
      this._attachEvents();
    } catch (error) {
      console.error('[TeardownView] Start failed:', error);
      btn.disabled = false;
      btn.textContent = 'Start Teardown';
      this._showError('Failed to start teardown: ' + error.message);
    }
  }

  async _handleTeardownItem(itemId, zoneCode, btn) {
    btn.disabled = true;
    btn.textContent = 'Updating...';

    try {
      await this.onTeardownItem(itemId);

      const zone = this.sortedZones.find(z => z.zone_code === zoneCode);
      if (zone) {
        const item = (zone.items_deployed || []).find(i => i.id === itemId);
        if (item) item.status = 'TearDown';
      }

      const row = this.container.querySelector(`tr[data-item-id="${itemId}"]`);
      if (row) {
        const updatedItem = this.sortedZones
          .find(z => z.zone_code === zoneCode)
          ?.items_deployed?.find(i => i.id === itemId);
        if (updatedItem) row.outerHTML = this._buildItemRow(updatedItem, zoneCode);
      }

      this._refreshTabs();
      this._checkZoneDone(zoneCode);

    } catch (error) {
      console.error('[TeardownView] Teardown item failed:', error);
      btn.disabled = false;
      btn.textContent = 'Tear Down';
      this._showError('Failed to tear down item: ' + error.message);
    }
  }

  async _handleComplete() {
    const confirmBtn = this.container.querySelector('.btn-modal-confirm');
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Completing...';

    try {
      await this.onComplete();
      this.onDone();
    } catch (error) {
      console.error('[TeardownView] Complete failed:', error);
      confirmBtn.disabled = false;
      confirmBtn.textContent = 'Yes, Complete Teardown';
      this.container.querySelector('.teardown-modal-backdrop').style.display = 'none';
      this._showError('Failed to complete teardown: ' + error.message);
    }
  }

  _checkZoneDone(zoneCode) {
    const zone = this.sortedZones.find(z => z.zone_code === zoneCode);
    if (!zone) return;

    const items = zone.items_deployed || [];
    const allDone = items.length > 0 && items.every(i => i.status === 'TearDown');

    if (allDone) {
      const panel = this.container.querySelector(`.teardown-panel[data-panel="${zoneCode}"]`);
      if (panel && !panel.querySelector('.zone-done-banner')) {
        const banner = document.createElement('div');
        banner.className = 'zone-done-banner';
        banner.textContent = '✓ All items in this zone have been torn down.';
        panel.prepend(banner);
      }
    }
  }

  _refreshTabs() {
    const tabBar = this.container.querySelector('.teardown-tabs');
    if (tabBar) {
      tabBar.innerHTML = this._buildTabBar();
      tabBar.querySelectorAll('.teardown-tab').forEach(tab => {
        tab.addEventListener('click', () => {
          this.activeTab = tab.dataset.zone;
          this._refreshTabs();
          this._refreshPanels();
        });
      });
    }
  }

  _refreshPanels() {
    const content = this.container.querySelector('.teardown-tab-content');
    if (content) content.innerHTML = this._buildTabPanels();
  }

  _showError(message) {
    let errEl = this.container.querySelector('.teardown-error');
    if (!errEl) {
      errEl = document.createElement('div');
      errEl.className = 'teardown-error';
      this.container.prepend(errEl);
    }
    errEl.textContent = message;
    errEl.style.display = 'block';
    setTimeout(() => { errEl.style.display = 'none'; }, 5000);
  }

  _getZoneIcon(zoneCode) {
    const icons = { FY: '🏡', BY: '🌳', SY: '🏠' };
    return icons[zoneCode] || '📍';
  }
}