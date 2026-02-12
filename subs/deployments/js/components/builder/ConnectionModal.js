// ConnectionModal.js
// Modal for selecting a destination item to connect to a source.
// Port selection removed — first available port on source is auto-assigned.

import { searchItems, createConnection } from '../../utils/deployment-api.js';

export class ConnectionModal {
  constructor(sourceItem, deployment, zone, session, zones = []) {
    this.sourceItem = sourceItem;
    this.deployment = deployment;
    this.zone = zone;
    this.session = session;
    this.zones = zones;      // all deployment zones for cross-zone exclusion
    this.selectedDestination = null;
    this.container = null;
    this.allItems = [];
    this.searchQuery = '';
    this.classFilter = 'all';
  }

  getExcludedItemIds() {
    // All items deployed in any zone (set by end_session across all prior sessions)
    const deployedAcrossZones = new Set(
      this.zones.flatMap(z => z.items_deployed || [])
    );

    // Items connected in the current active session (not yet ended)
    const connections = this.session?.connections || [];
    connections
      .filter(c => (c.connection_type ?? 'deployment') === 'deployment')
      .forEach(c => deployedAcrossZones.add(c.to_item_id));

    return deployedAcrossZones;
  }

  render() {
    this.container = document.createElement('div');
    this.container.className = 'connection-modal';

    this.container.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>Connect: ${this.sourceItem.short_name}</h3>
          <button class="btn-close-modal">&times;</button>
        </div>
        <div class="modal-body">
          <p class="selection-label">
            Select what to plug into <strong>${this.sourceItem.short_name}</strong>:
          </p>
          <div class="destination-filters">
            <button class="dest-filter-btn active" data-class="all">All</button>
            <button class="dest-filter-btn" data-class="Decoration">Decoration</button>
            <button class="dest-filter-btn" data-class="Light">Light</button>
            <button class="dest-filter-btn" data-class="Accessory">Accessory</button>
          </div>
          <div class="search-box">
            <input type="text" class="destination-search" placeholder="Search items..." autocomplete="off">
          </div>
          <div class="destinations-list">
            <div class="loading-state">Loading items...</div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary btn-cancel-connection">Cancel</button>
          <button class="btn btn-primary btn-confirm-connection" disabled>Connect</button>
        </div>
      </div>
    `;

    this.attachEventListeners();
    this.loadDestinations();

    return this.container;
  }

  attachEventListeners() {
    this.container.querySelector('.btn-close-modal').addEventListener('click', () => this.close());
    this.container.querySelector('.btn-cancel-connection').addEventListener('click', () => this.close());
    this.container.querySelector('.btn-confirm-connection').addEventListener('click', () => this.confirmConnection());

    this.container.querySelector('.destination-search').addEventListener('input', (e) => {
      this.searchQuery = e.target.value.toLowerCase().trim();
      this.renderDestinationList();
    });

    this.container.querySelectorAll('.dest-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.container.querySelectorAll('.dest-filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.classFilter = btn.dataset.class;
        this.renderDestinationList();
      });
    });

    this.container.addEventListener('click', (e) => {
      if (e.target === this.container) this.close();
    });
  }

  async loadDestinations() {
    try {
      const response = await searchItems({
        season: this.deployment.season,
        connection_building: 'true'
      });

      const items = response?.data?.items || [];
      const excludedIds = this.getExcludedItemIds();

      console.log('[ConnectionModal] Excluded item IDs:', [...excludedIds]);

      // Items with a male end or power inlet, excluding anything already deployed anywhere
      this.allItems = items.filter(item => {
        const hasMaleEnd = parseInt(item.male_ends || 0) > 0;
        const hasPowerInlet = item.power_inlet === true;
        return (hasMaleEnd || hasPowerInlet) && !excludedIds.has(item.id);
      });

      console.log('[ConnectionModal] Loaded destinations:', this.allItems.length);
      this.renderDestinationList();

    } catch (error) {
      console.error('[ConnectionModal] Failed to load destinations:', error);
      this.container.querySelector('.destinations-list').innerHTML = `
        <p class="error-text">Failed to load items. Please close and try again.</p>
      `;
    }
  }

  getFilteredItems() {
    return this.allItems.filter(item => {
      const matchesClass = this.classFilter === 'all' || item.class === this.classFilter;
      const matchesSearch = !this.searchQuery ||
        item.short_name?.toLowerCase().includes(this.searchQuery) ||
        item.id?.toLowerCase().includes(this.searchQuery);
      return matchesClass && matchesSearch;
    });
  }

  renderDestinationList() {
    const list = this.container.querySelector('.destinations-list');
    const filtered = this.getFilteredItems();

    if (filtered.length === 0) {
      list.innerHTML = `
        <div class="empty-state">
          <p>${this.allItems.length === 0 ? 'No items available' : 'No items match your search'}</p>
        </div>
      `;
      return;
    }

    list.innerHTML = filtered.map(item => `
      <div class="destination-item${this.selectedDestination?.id === item.id ? ' selected' : ''}"
           data-item-id="${item.id}">
        <div class="item-info">
          <span class="item-id">${item.id}</span>
          <span class="item-name">${item.short_name}</span>
          <span class="item-class">${item.class}</span>
        </div>
      </div>
    `).join('');

    list.querySelectorAll('.destination-item').forEach(el => {
      el.addEventListener('click', () => {
        list.querySelectorAll('.destination-item').forEach(i => i.classList.remove('selected'));
        el.classList.add('selected');

        const itemId = el.dataset.itemId;
        this.selectedDestination = this.allItems.find(i => i.id === itemId) || null;

        console.log('[ConnectionModal] Destination selected:', this.selectedDestination?.id);
        this.container.querySelector('.btn-confirm-connection').disabled = !this.selectedDestination;
      });
    });
  }

  async confirmConnection() {
    if (!this.sourceItem || !this.selectedDestination) return;

    const fromPort = this.sourceItem.available_ports?.[0];
    if (!fromPort) {
      console.error('[ConnectionModal] No available ports on source item');
      alert('No available ports on this source item.');
      return;
    }

    const confirmBtn = this.container.querySelector('.btn-confirm-connection');
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Connecting...';

    try {
      const toPort = parseInt(this.selectedDestination.male_ends || 0) > 0
        ? 'Male_1'
        : 'Power_Inlet';

      const connectionData = {
        session_id: this.session.session_id,
        session_deployment_item_id: this.session.deployment_item_id,
        zone_code: this.zone.zone_code || this.zone.zoneCode,
        from_item_id: this.sourceItem.item_id,
        from_port: fromPort,
        to_item_id: this.selectedDestination.id,
        to_port: toPort,
        illuminates: [],
        notes: ''
      };

      console.log('[ConnectionModal] Creating connection:', connectionData);

      const response = await createConnection(this.deployment.deployment_id, connectionData);

      console.log('[ConnectionModal] Connection created:', response?.data?.connection_id);

      this.container.dispatchEvent(new CustomEvent('connection-created', {
        detail: { connectionId: response?.data?.connection_id }
      }));

      this.close();

    } catch (error) {
      console.error('[ConnectionModal] Error creating connection:', error);
      alert('Failed to create connection: ' + error.message);
      confirmBtn.disabled = false;
      confirmBtn.textContent = 'Connect';
    }
  }

  close() {
    this.container.remove();
  }
}