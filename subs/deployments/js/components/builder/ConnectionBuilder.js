// ConnectionBuilder.js
// Main orchestrator for connection topology building

import { getAvailablePorts } from '../../utils/deployment-api.js';
import { SourcesList } from './SourcesList.js';
import { ConnectionsList } from './ConnectionsList.js';
import { ConnectionModal } from './ConnectionModal.js';
import { EndSessionReview } from './EndSessionReview.js';

export class ConnectionBuilder {
  constructor(deployment, zone, session, zones = []) {
    this.deployment = deployment;
    this.zone = zone;
    this.session = session;
    this.zones = zones;      // all deployment zones for cross-zone item exclusion
    this.portsData = {};
    this.connections = [];
    this.pendingPhotoIds = {};

    this.sourcesList = null;
    this.connectionsList = null;
    this.connectionModal = null;
    this.endSessionReview = null;
  }

  render() {
    const container = document.createElement('div');
    container.className = 'connection-builder';

    container.innerHTML = `
      <div class="builder-header">
        <div class="session-info">
          <h2>
            <span class="zone-badge">${this.zone.zone_code}</span>
            ${this.zone.zone_name}
          </h2>
          <p class="session-id">Session: ${this.session.session_id}</p>
          <p class="session-meta">
            Started at ${this.formatTime(this.session.start_time)}
          </p>
        </div>
        <button class="btn btn-danger btn-end-session">End Session</button>
      </div>

      <div class="builder-content">
        <div class="sources-panel">
          <div class="panel-header">
            <h3>Sources</h3>
          </div>
          <div class="sources-list"></div>
        </div>

        <div class="connections-panel">
          <div class="panel-header">
            <h3>Connections</h3>
            <span class="connections-count">0</span>
          </div>
          <div class="connections-list"></div>
        </div>
      </div>
    `;

    this.container = container;
    this.attachEventListeners();
    this.loadData();

    return container;
  }

  attachEventListeners() {
    this.container.querySelector('.btn-end-session').addEventListener('click', () => {
      this.handleEndSessionClick();
    });
  }

  async loadData() {
    try {
      console.log('[ConnectionBuilder] Fetching available ports for:', {
        deployment_id: this.deployment.deployment_id,
        zone_code: this.zone.zone_code
      });

      const response = await getAvailablePorts(this.deployment.deployment_id, this.zone.zone_code);

      console.log('[ConnectionBuilder] Raw API response:', response);

      this.portsData = response.data || {};
      this.connections = response.data.connections || [];

      this.pendingPhotoIds = {};
      this.connections.forEach(conn => {
        this.pendingPhotoIds[conn.connection_id] = [...(conn.photo_ids || [])];
      });

      console.log('[ConnectionBuilder] Parsed data:', {
        connections: this.connections.length,
        hasEligibleItems: !!response.data?.eligible_items
      });

      this.renderChildren();

    } catch (error) {
      console.error('[ConnectionBuilder] Error loading data:', error);
      this.showToast('Failed to load connection data', 'error');

      this.portsData = {};
      this.connections = [];
      this.renderChildren();
    }
  }

  renderChildren() {
    const sourcesContainer = this.container.querySelector('.sources-list');
    this.sourcesList = new SourcesList(this.portsData);
    sourcesContainer.innerHTML = '';
    sourcesContainer.appendChild(this.sourcesList.render());

    this.sourcesList.container.addEventListener('connect-item', (e) => {
      this.handleConnectItem(e.detail.item);
    });

    const connectionsContainer = this.container.querySelector('.connections-list');
    const countBadge = this.container.querySelector('.connections-count');
    this.connectionsList = new ConnectionsList(this.connections);
    connectionsContainer.innerHTML = '';
    connectionsContainer.appendChild(this.connectionsList.render());
    countBadge.textContent = this.connections.length;

    this.connectionsList.container.addEventListener('remove-connection', (e) => {
      this.handleRemoveItem(e.detail.connectionId);
    });
  }

  handleConnectItem(item) {
    console.log('[ConnectionBuilder] Starting connection from source:', item);

    this.connectionModal = new ConnectionModal(
      item,
      this.deployment,
      this.zone,
      this.session,
      this.zones
    );
    document.body.appendChild(this.connectionModal.render());

    this.connectionModal.container.addEventListener('connection-created', async (e) => {
      const { connectionId } = e.detail;

      if (connectionId) {
        this.pendingPhotoIds[connectionId] = [];
      }

      this.showToast('Connection created', 'success');
      await this.loadData();
    });
  }

  async handleRemoveItem(connectionId) {
    console.log('[ConnectionBuilder] Removing item via connection:', connectionId);

    const reason = prompt('Why are you removing this item? (optional)');
    if (reason === null) return;

    try {
      const { updateConnection } = await import('../../utils/deployment-api.js');

      await updateConnection(
        this.deployment.deployment_id,
        connectionId,
        { removal_reason: reason || 'Item removed during session' }
      );

      delete this.pendingPhotoIds[connectionId];

      this.showToast('Item removed from deployment', 'success');
      await this.loadData();

    } catch (error) {
      console.error('[ConnectionBuilder] Error removing item:', error);
      this.showToast('Failed to remove item', 'error');
    }
  }

  async handleEndSessionClick() {
    console.log('[ConnectionBuilder] End session clicked');

    this.endSessionReview = new EndSessionReview(
      this.deployment,
      this.zone,
      this.session,
      this.connections,
      this.pendingPhotoIds
    );

    document.body.appendChild(this.endSessionReview.render());

    this.endSessionReview.container.addEventListener('photos-updated', (e) => {
      const { connectionId, photoIds } = e.detail;

      if (!this.pendingPhotoIds[connectionId]) {
        this.pendingPhotoIds[connectionId] = [];
      }

      photoIds.forEach(pid => {
        if (!this.pendingPhotoIds[connectionId].includes(pid)) {
          this.pendingPhotoIds[connectionId].push(pid);
        }
      });

      console.log('[ConnectionBuilder] Updated pendingPhotoIds:', this.pendingPhotoIds);
    });

    this.endSessionReview.container.addEventListener('end-session-confirmed', async (e) => {
      const { notes, skipPhotos } = e.detail;

      try {
        await this.handleEndSession(notes, skipPhotos);
      } catch (error) {
        console.error('[ConnectionBuilder] End session failed:', error);
        this.endSessionReview.showError(error.message || 'Failed to end session. Please try again.');
      }
    });
  }

  async handleEndSession(notes, skipPhotos) {
    console.log('[ConnectionBuilder] Ending session, skipPhotos:', skipPhotos);

    if (!skipPhotos) {
      const { updateConnectionPhotos } = await import('../../utils/deployment-api.js');

      const updatePromises = Object.keys(this.pendingPhotoIds)
        .filter(connectionId => {
          const photoIds = this.pendingPhotoIds[connectionId];
          const connection = this.connections.find(c => c.connection_id === connectionId);
          const existingPhotos = connection?.photo_ids || [];
          return photoIds.filter(pid => !existingPhotos.includes(pid)).length > 0;
        })
        .map(connectionId => {
          const photoIds = this.pendingPhotoIds[connectionId];
          const connection = this.connections.find(c => c.connection_id === connectionId);
          const existingPhotos = connection?.photo_ids || [];
          const newPhotos = photoIds.filter(pid => !existingPhotos.includes(pid));

          console.log('[ConnectionBuilder] Updating connection', connectionId, 'with new photos:', newPhotos);

          return updateConnectionPhotos(
            this.deployment.deployment_id,
            connectionId,
            newPhotos
          );
        });

      if (updatePromises.length > 0) {
        console.log('[ConnectionBuilder] Waiting for photo updates...');
        await Promise.all(updatePromises);
        console.log('[ConnectionBuilder] All connections updated with photos');
      }
    }

    this.container.dispatchEvent(new CustomEvent('end-session', {
      detail: { notes }
    }));
  }

  formatTime(isoString) {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }

  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
}