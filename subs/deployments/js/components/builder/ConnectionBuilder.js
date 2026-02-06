// ConnectionBuilder.js
// Connection topology builder with port tracking

import { searchItems } from '../../utils/deployment-api.js';
import { getAvailablePorts, createConnection, removeConnection } from '../../utils/deployment-api.js';

export class ConnectionBuilder {
  constructor(deployment, zone, session) {
    this.deployment = deployment;
    this.zone = zone;
    this.session = session;
    this.availablePorts = [];
    this.connections = [];
    this.currentStep = null; // null, 'select-source', 'select-destination'
    this.selectedSource = null;
    this.selectedSourcePort = null;
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
          <p class="session-meta">
            Session started at ${this.formatTime(this.session.start_time)}
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
      
      <!-- Connection Modal -->
      <div class="connection-modal" style="display: none;">
        <div class="modal-content">
          <div class="modal-header">
            <h3>Create Connection</h3>
            <button class="btn-close-modal">&times;</button>
          </div>
          <div class="modal-body"></div>
          <div class="modal-footer">
            <button class="btn btn-secondary btn-cancel-connection">Cancel</button>
            <button class="btn btn-primary btn-confirm-connection" disabled>Connect</button>
          </div>
        </div>
      </div>
    `;
    
    this.container = container;
    this.attachEventListeners();
    this.loadData();
    
    return container;
  }
  
  attachEventListeners() {
    // End session
    this.container.querySelector('.btn-end-session').addEventListener('click', () => {
      this.endSession();
    });
    
    // Modal close
    this.container.querySelector('.btn-close-modal').addEventListener('click', () => {
      this.closeModal();
    });
    
    this.container.querySelector('.btn-cancel-connection').addEventListener('click', () => {
      this.closeModal();
    });
    
    this.container.querySelector('.btn-confirm-connection').addEventListener('click', () => {
      this.confirmConnection();
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
      console.log('[ConnectionBuilder] Response data:', response.data);
      
      this.availablePorts = response.data.items || [];
      this.connections = response.data.connections || [];
      
      console.log('[ConnectionBuilder] Parsed availablePorts:', this.availablePorts);
      console.log('[ConnectionBuilder] Number of available ports:', this.availablePorts.length);
      console.log('[ConnectionBuilder] Parsed connections:', this.connections);
      console.log('[ConnectionBuilder] Number of connections:', this.connections.length);
      
      // Log each available port item in detail
      if (this.availablePorts.length > 0) {
        console.log('[ConnectionBuilder] Available port items:');
        this.availablePorts.forEach((item, index) => {
          console.log(`  [${index}]`, {
            item_id: item.item_id,
            short_name: item.short_name,
            class: item.class,
            total_ports: item.total_ports,
            available_count: item.available_count,
            available_ports: item.available_ports
          });
        });
      } else {
        console.warn('[ConnectionBuilder] No available ports found in response');
      }
      
      this.renderSources();
      this.renderConnections();
    } catch (error) {
      console.error('[ConnectionBuilder] Error loading data:', error);
      console.error('[ConnectionBuilder] Error details:', {
        message: error.message,
        stack: error.stack
      });
      this.showToast('Failed to load connection data', 'error');
    }
  }
  
  renderSources() {
    console.log('[ConnectionBuilder] renderSources called with:', {
      availablePortsCount: this.availablePorts.length,
      availablePorts: this.availablePorts
    });
    
    const sourcesList = this.container.querySelector('.sources-list');
    
    if (this.availablePorts.length === 0) {
      console.log('[ConnectionBuilder] Rendering empty state for sources');
      sourcesList.innerHTML = `
        <div class="empty-state">
          <p>No available connection ports</p>
          <p class="empty-hint">All items are fully connected</p>
        </div>
      `;
      return;
    }
    
    console.log('[ConnectionBuilder] Rendering source cards for items:', 
      this.availablePorts.map(i => i.item_id)
    );
    
    sourcesList.innerHTML = this.availablePorts.map(item => `
      <div class="source-card" data-item-id="${item.item_id}">
        <div class="source-info">
          <div class="source-header">
            <span class="source-id">${item.item_id}</span>
            <span class="source-class">${item.class}</span>
          </div>
          <div class="source-name">${item.short_name}</div>
          <div class="source-ports">
            <span class="port-badge">${item.available_count} of ${item.total_ports} ports available</span>
          </div>
        </div>
        <button class="btn-connect">Connect</button>
      </div>
    `).join('');
    
    // Attach connect handlers
    sourcesList.querySelectorAll('.btn-connect').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const card = btn.closest('.source-card');
        const itemId = card.dataset.itemId;
        const item = this.availablePorts.find(i => i.item_id === itemId);
        console.log('[ConnectionBuilder] Connect button clicked for:', itemId, item);
        this.startConnection(item);
      });
    });
  }
  
  renderConnections() {
    console.log('[ConnectionBuilder] renderConnections called with:', {
      connectionsCount: this.connections.length,
      connections: this.connections
    });
    
    const connectionsList = this.container.querySelector('.connections-list');
    const countBadge = this.container.querySelector('.connections-count');
    
    countBadge.textContent = this.connections.length;
    
    if (this.connections.length === 0) {
      console.log('[ConnectionBuilder] Rendering empty state for connections');
      connectionsList.innerHTML = `
        <div class="empty-state">
          <p>No connections yet</p>
          <p class="empty-hint">Start by connecting to the receptacle</p>
        </div>
      `;
      return;
    }
    
    console.log('[ConnectionBuilder] Rendering connection cards');
    
    connectionsList.innerHTML = this.connections.map(conn => `
      <div class="connection-card" data-connection-id="${conn.connection_id}">
        <div class="connection-flow">
          <div class="connection-node">
            <div class="node-id">${conn.from_item_id}</div>
            <div class="node-port">${conn.from_port}</div>
          </div>
          <div class="connection-arrow">→</div>
          <div class="connection-node">
            <div class="node-id">${conn.to_item_id}</div>
            <div class="node-port">${conn.to_port}</div>
          </div>
        </div>
        <button class="btn-remove-connection" title="Remove connection">×</button>
      </div>
    `).join('');
    
    // Attach remove handlers
    connectionsList.querySelectorAll('.btn-remove-connection').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const card = btn.closest('.connection-card');
        const connectionId = card.dataset.connectionId;
        this.removeConnectionConfirm(connectionId);
      });
    });
  }
  
  startConnection(sourceItem) {
    console.log('[ConnectionBuilder] Starting connection from:', sourceItem);
    
    this.selectedSource = sourceItem;
    this.selectedSourcePort = null;
    this.currentStep = 'select-port';
    
    this.showModal();
    this.renderPortSelection();
  }
  
  renderPortSelection() {
    console.log('[ConnectionBuilder] Rendering port selection for:', {
      item: this.selectedSource.item_id,
      available_ports: this.selectedSource.available_ports
    });
    
    const modalBody = this.container.querySelector('.modal-body');
    
    modalBody.innerHTML = `
      <div class="port-selection">
        <p class="selection-label">Select port on ${this.selectedSource.short_name}:</p>
        <div class="ports-grid">
          ${this.selectedSource.available_ports.map(port => `
            <button class="port-btn" data-port="${port}">
              <span class="port-icon">🔌</span>
              <span class="port-label">${port}</span>
            </button>
          `).join('')}
        </div>
      </div>
    `;
    
    // Attach port selection handlers
    modalBody.querySelectorAll('.port-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        // Remove previous selection
        modalBody.querySelectorAll('.port-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        
        this.selectedSourcePort = btn.dataset.port;
        console.log('[ConnectionBuilder] Port selected:', this.selectedSourcePort);
        this.currentStep = 'select-destination';
        this.renderDestinationSelection();
      });
    });
  }
  
  async renderDestinationSelection() {
    console.log('[ConnectionBuilder] Rendering destination selection');
    
    const modalBody = this.container.querySelector('.modal-body');
    const confirmBtn = this.container.querySelector('.btn-confirm-connection');
    
    // Fetch available items using connection_building mode
    // This includes: Shared + seasonal items, Active + Pre-Deployment, connectable classes only
    try {
      const response = await searchItems({
        season: this.deployment.season,
        connection_building: 'true'
      });
      
      console.log('[ConnectionBuilder] Search items response:', response);
      
      const items = response.data.items || [];
      
      console.log('[ConnectionBuilder] Found items:', items.length);
      
      // Filter to items that can be connected (have male_end or power_inlet)
      const connectableItems = items.filter(item => {
        const hasMaleEnd = parseInt(item.male_ends || 0) > 0;
        const hasPowerInlet = item.power_inlet === true;
        return hasMaleEnd || hasPowerInlet;
      });
      
      console.log('[ConnectionBuilder] Connectable items:', connectableItems.length);
      
      modalBody.innerHTML = `
        <div class="destination-selection">
          <p class="selection-label">
            Connect ${this.selectedSource.short_name} (${this.selectedSourcePort}) to:
          </p>
          <div class="search-box">
            <input type="text" class="destination-search" placeholder="Search items...">
          </div>
          <div class="destinations-list">
            ${connectableItems.map(item => `
              <div class="destination-item" data-item-id="${item.id}">
                <div class="item-info">
                  <span class="item-id">${item.id}</span>
                  <span class="item-name">${item.short_name}</span>
                  <span class="item-class">${item.class}</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
      
      // Search functionality
      const searchInput = modalBody.querySelector('.destination-search');
      const destItems = modalBody.querySelectorAll('.destination-item');
      
      searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        destItems.forEach(item => {
          const text = item.textContent.toLowerCase();
          item.style.display = text.includes(query) ? 'flex' : 'none';
        });
      });
      
      // Attach destination selection handlers
      destItems.forEach(item => {
        item.addEventListener('click', () => {
          destItems.forEach(i => i.classList.remove('selected'));
          item.classList.add('selected');
          
          const itemId = item.dataset.itemId;
          const selectedItem = connectableItems.find(i => i.id === itemId);
          this.selectedDestination = selectedItem;
          
          console.log('[ConnectionBuilder] Destination selected:', this.selectedDestination);
          
          confirmBtn.disabled = false;
        });
      });
      
    } catch (error) {
      console.error('[ConnectionBuilder] Error loading items:', error);
      modalBody.innerHTML = `<p class="error-text">Failed to load items</p>`;
    }
  }
  
  async confirmConnection() {
    if (!this.selectedSource || !this.selectedSourcePort || !this.selectedDestination) {
      console.warn('[ConnectionBuilder] Cannot confirm connection - missing data:', {
        hasSource: !!this.selectedSource,
        hasSourcePort: !!this.selectedSourcePort,
        hasDestination: !!this.selectedDestination
      });
      return;
    }
    
    console.log('[ConnectionBuilder] Confirming connection:', {
      from: this.selectedSource.item_id,
      fromPort: this.selectedSourcePort,
      to: this.selectedDestination.id
    });
    
    const confirmBtn = this.container.querySelector('.btn-confirm-connection');
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Connecting...';
    
    try {
      // Determine to_port (Male_1 or power_inlet)
      const toPort = parseInt(this.selectedDestination.male_ends || this.selectedDestination.maleEnds || 0) > 0 ? 'Male_1' : 'Power_Inlet';
      
      // Use session_id (not deployment_item_id)
      const sessionId = this.session.session_id;
      const deploymentItemId = this.session.deployment_item_id;  // Also send this
      const zoneCode = this.zone.zone_code || this.zone.zoneCode;
      
      if (!sessionId) {
        console.error('[ConnectionBuilder] ERROR - No session_id found in session object:', this.session);
        throw new Error('Session ID is missing. Cannot create connection.');
      }
      
      const connectionData = {
        session_id: sessionId,
        session_deployment_item_id: deploymentItemId,  // Backend can use this for direct lookup
        zone_code: zoneCode,
        from_item_id: this.selectedSource.item_id,
        from_port: this.selectedSourcePort,
        to_item_id: this.selectedDestination.id,
        to_port: toPort,
        illuminates: [],
        notes: ''
      };
      
      console.log('[ConnectionBuilder] Creating connection with data:', connectionData);
      
      await createConnection(this.deployment.deployment_id, connectionData);
      
      console.log('[ConnectionBuilder] Connection created successfully');
      
      this.showToast('Connection created', 'success');
      this.closeModal();
      await this.loadData(); // Reload
      
    } catch (error) {
      console.error('[ConnectionBuilder] Error creating connection:', error);
      this.showToast(error.message || 'Failed to create connection', 'error');
      confirmBtn.disabled = false;
      confirmBtn.textContent = 'Connect';
    }
  }
  
  async removeConnectionConfirm(connectionId) {
    console.log('[ConnectionBuilder] Confirming removal of connection:', connectionId);
    
    const confirmed = confirm('Remove this connection?');
    if (!confirmed) return;
    
    try {
      await removeConnection(this.deployment.deployment_id, connectionId);
      console.log('[ConnectionBuilder] Connection removed successfully');
      this.showToast('Connection removed', 'success');
      await this.loadData(); // Reload
    } catch (error) {
      console.error('[ConnectionBuilder] Error removing connection:', error);
      this.showToast('Failed to remove connection', 'error');
    }
  }
  
  showModal() {
    const modal = this.container.querySelector('.connection-modal');
    modal.style.display = 'flex';
  }
  
  closeModal() {
    const modal = this.container.querySelector('.connection-modal');
    modal.style.display = 'none';
    
    this.selectedSource = null;
    this.selectedSourcePort = null;
    this.selectedDestination = null;
    this.currentStep = null;
    
    const confirmBtn = this.container.querySelector('.btn-confirm-connection');
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Connect';
  }
  
  endSession() {
    const event = new CustomEvent('end-session', {
      detail: { notes: '' }
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