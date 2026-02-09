// ConnectionBuilder.js
// Main orchestrator for connection topology building

import { getAvailablePorts } from '../../utils/deployment-api.js';
import { SourcesList } from './SourcesList.js';
import { ConnectionsList } from './ConnectionsList.js';
import { ConnectionModal } from './ConnectionModal.js';
import { EndSessionReview } from './EndSessionReview.js';

export class ConnectionBuilder {
  constructor(deployment, zone, session) {
    this.deployment = deployment;
    this.zone = zone;
    this.session = session;
    this.availablePorts = [];
    this.connections = [];
    this.pendingPhotoIds = {}; // { connection_id: [photo_ids] }
    
    // Child components
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
        <!-- Left: Available sources -->
        <div class="sources-panel">
          <div class="panel-header">
            <h3>Available Connections</h3>
          </div>
          <div class="sources-list"></div>
        </div>
        
        <!-- Right: Connections made -->
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
    // End session button
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
      
      this.availablePorts = response.data.items || [];
      this.connections = response.data.connections || [];
      
      // Initialize pendingPhotoIds from existing connection photo_ids
      this.pendingPhotoIds = {};
      this.connections.forEach(conn => {
        this.pendingPhotoIds[conn.connection_id] = [...(conn.photo_ids || [])];
      });
      
      console.log('[ConnectionBuilder] Parsed data:', {
        availablePorts: this.availablePorts.length,
        connections: this.connections.length
      });
      
      this.renderChildren();
      
    } catch (error) {
      console.error('[ConnectionBuilder] Error loading data:', error);
      this.showToast('Failed to load connection data', 'error');
    }
  }
  
  renderChildren() {
    // Render sources list
    const sourcesContainer = this.container.querySelector('.sources-list');
    this.sourcesList = new SourcesList(this.availablePorts);
    sourcesContainer.innerHTML = '';
    sourcesContainer.appendChild(this.sourcesList.render());
    
    // Listen for connect requests
    this.sourcesList.container.addEventListener('connect-item', (e) => {
      this.handleConnectItem(e.detail.item);
    });
    
    // Render connections list
    const connectionsContainer = this.container.querySelector('.connections-list');
    const countBadge = this.container.querySelector('.connections-count');
    this.connectionsList = new ConnectionsList(this.connections);
    connectionsContainer.innerHTML = '';
    connectionsContainer.appendChild(this.connectionsList.render());
    countBadge.textContent = this.connections.length;
    
    // Listen for remove requests
    this.connectionsList.container.addEventListener('remove-connection', (e) => {
      this.handleRemoveConnection(e.detail.connectionId);
    });
  }
  
  handleConnectItem(item) {
    console.log('[ConnectionBuilder] Starting connection from:', item);
    
    // Create and show connection modal
    this.connectionModal = new ConnectionModal(item, this.deployment, this.zone, this.session);
    document.body.appendChild(this.connectionModal.render());
    
    // Listen for connection created
    this.connectionModal.container.addEventListener('connection-created', async (e) => {
      const { connectionId } = e.detail;
      
      // Initialize pending photos for new connection
      if (connectionId) {
        this.pendingPhotoIds[connectionId] = [];
      }
      
      this.showToast('Connection created', 'success');
      await this.loadData(); // Reload
    });
  }
  
  async handleRemoveConnection(connectionId) {
    console.log('[ConnectionBuilder] Removing connection:', connectionId);
    
    const confirmed = confirm('Remove this connection?');
    if (!confirmed) return;
    
    try {
      const { removeConnection } = await import('../../utils/deployment-api.js');
      await removeConnection(this.deployment.deployment_id, connectionId);
      
      console.log('[ConnectionBuilder] Connection removed successfully');
      
      // Remove from pending photos
      delete this.pendingPhotoIds[connectionId];
      
      this.showToast('Connection removed', 'success');
      await this.loadData(); // Reload
      
    } catch (error) {
      console.error('[ConnectionBuilder] Error removing connection:', error);
      this.showToast('Failed to remove connection', 'error');
    }
  }
  
  async handleEndSessionClick() {
    console.log('[ConnectionBuilder] End session clicked');
    
    // Create and show end session review
    this.endSessionReview = new EndSessionReview(
      this.deployment,
      this.zone,
      this.session,
      this.connections,
      this.pendingPhotoIds
    );
    
    document.body.appendChild(this.endSessionReview.render());
    
    // Listen for photo updates
    this.endSessionReview.container.addEventListener('photos-updated', (e) => {
      const { connectionId, photoIds } = e.detail;
      
      if (!this.pendingPhotoIds[connectionId]) {
        this.pendingPhotoIds[connectionId] = [];
      }
      
      // Append new photo IDs (avoid duplicates)
      photoIds.forEach(pid => {
        if (!this.pendingPhotoIds[connectionId].includes(pid)) {
          this.pendingPhotoIds[connectionId].push(pid);
        }
      });
      
      console.log('[ConnectionBuilder] Updated pendingPhotoIds:', this.pendingPhotoIds);
    });
    
    // Listen for end session confirmation
    this.endSessionReview.container.addEventListener('end-session-confirmed', async (e) => {
      const { notes, skipPhotos } = e.detail;
      
      try {
        await this.handleEndSession(notes, skipPhotos);
        // Success - modal will be closed by parent navigation
      } catch (error) {
        // Error - show in modal and re-enable buttons
        console.error('[ConnectionBuilder] End session failed:', error);
        this.endSessionReview.showError(error.message || 'Failed to end session. Please try again.');
      }
    });
  }
  
  async handleEndSession(notes, skipPhotos) {
    console.log('[ConnectionBuilder] Ending session, skipPhotos:', skipPhotos);
    
    // 1. Update connections with photos (if not skipping)
    if (!skipPhotos) {
      const { updateConnectionPhotos } = await import('../../utils/deployment-api.js');
      
      const updatePromises = Object.keys(this.pendingPhotoIds)
        .filter(connectionId => {
          const photoIds = this.pendingPhotoIds[connectionId];
          const connection = this.connections.find(c => c.connection_id === connectionId);
          const existingPhotos = connection?.photo_ids || [];
          const newPhotos = photoIds.filter(pid => !existingPhotos.includes(pid));
          return newPhotos.length > 0;
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
    
    // 2. Fire end-session event (deployment-session.js handles the API call and navigation)
    const event = new CustomEvent('end-session', {
      detail: { notes }
    });
    this.container.dispatchEvent(event);
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