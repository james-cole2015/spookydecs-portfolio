// ConnectionModal.js
// Modal for selecting port and destination to create a connection

import { searchItems, createConnection } from '../../utils/deployment-api.js';

export class ConnectionModal {
  constructor(sourceItem, deployment, zone, session) {
    this.sourceItem = sourceItem;
    this.deployment = deployment;
    this.zone = zone;
    this.session = session;
    this.selectedPort = null;
    this.selectedDestination = null;
    this.currentStep = 'select-port'; // 'select-port' or 'select-destination'
    this.container = null;
  }
  
  render() {
    this.container = document.createElement('div');
    this.container.className = 'connection-modal';
    this.container.style.display = 'flex';
    
    this.container.innerHTML = `
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
    `;
    
    this.attachEventListeners();
    this.renderPortSelection();
    
    return this.container;
  }
  
  attachEventListeners() {
    this.container.querySelector('.btn-close-modal').addEventListener('click', () => {
      this.close();
    });
    
    this.container.querySelector('.btn-cancel-connection').addEventListener('click', () => {
      this.close();
    });
    
    this.container.querySelector('.btn-confirm-connection').addEventListener('click', () => {
      this.confirmConnection();
    });
  }
  
  renderPortSelection() {
    console.log('[ConnectionModal] Rendering port selection for:', {
      item: this.sourceItem.item_id,
      available_ports: this.sourceItem.available_ports
    });
    
    const modalBody = this.container.querySelector('.modal-body');
    
    modalBody.innerHTML = `
      <div class="port-selection">
        <p class="selection-label">Select port on ${this.sourceItem.short_name}:</p>
        <div class="ports-grid">
          ${this.sourceItem.available_ports.map(port => `
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
        
        this.selectedPort = btn.dataset.port;
        console.log('[ConnectionModal] Port selected:', this.selectedPort);
        
        this.currentStep = 'select-destination';
        this.renderDestinationSelection();
      });
    });
  }
  
  async renderDestinationSelection() {
    console.log('[ConnectionModal] Rendering destination selection');
    
    const modalBody = this.container.querySelector('.modal-body');
    const confirmBtn = this.container.querySelector('.btn-confirm-connection');
    
    try {
      const response = await searchItems({
        season: this.deployment.season,
        connection_building: 'true'
      });
      
      console.log('[ConnectionModal] Search items response:', response);
      
      const items = response.data.items || [];
      
      // Filter to items that can be connected (have male_end or power_inlet)
      const connectableItems = items.filter(item => {
        const hasMaleEnd = parseInt(item.male_ends || 0) > 0;
        const hasPowerInlet = item.power_inlet === true;
        return hasMaleEnd || hasPowerInlet;
      });
      
      console.log('[ConnectionModal] Connectable items:', connectableItems.length);
      
      modalBody.innerHTML = `
        <div class="destination-selection">
          <p class="selection-label">
            Connect ${this.sourceItem.short_name} (${this.selectedPort}) to:
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
          
          console.log('[ConnectionModal] Destination selected:', this.selectedDestination);
          
          confirmBtn.disabled = false;
        });
      });
      
    } catch (error) {
      console.error('[ConnectionModal] Error loading items:', error);
      modalBody.innerHTML = `<p class="error-text">Failed to load items</p>`;
    }
  }
  
  async confirmConnection() {
    if (!this.sourceItem || !this.selectedPort || !this.selectedDestination) {
      console.warn('[ConnectionModal] Cannot confirm - missing data');
      return;
    }
    
    console.log('[ConnectionModal] Confirming connection:', {
      from: this.sourceItem.item_id,
      fromPort: this.selectedPort,
      to: this.selectedDestination.id
    });
    
    const confirmBtn = this.container.querySelector('.btn-confirm-connection');
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Connecting...';
    
    try {
      // Determine to_port (Male_1 or power_inlet)
      const toPort = parseInt(this.selectedDestination.male_ends || this.selectedDestination.maleEnds || 0) > 0 
        ? 'Male_1' 
        : 'Power_Inlet';
      
      const sessionId = this.session.session_id;
      const deploymentItemId = this.session.deployment_item_id;
      const zoneCode = this.zone.zone_code || this.zone.zoneCode;
      
      if (!sessionId) {
        console.error('[ConnectionModal] ERROR - No session_id found');
        throw new Error('Session ID is missing');
      }
      
      const connectionData = {
        session_id: sessionId,
        session_deployment_item_id: deploymentItemId,
        zone_code: zoneCode,
        from_item_id: this.sourceItem.item_id,
        from_port: this.selectedPort,
        to_item_id: this.selectedDestination.id,
        to_port: toPort,
        illuminates: [],
        notes: ''
      };
      
      console.log('[ConnectionModal] Creating connection with data:', connectionData);
      
      const response = await createConnection(this.deployment.deployment_id, connectionData);
      
      console.log('[ConnectionModal] Connection created successfully:', response);
      
      // Dispatch event
      this.container.dispatchEvent(new CustomEvent('connection-created', {
        detail: { 
          connectionId: response.data?.connection_id 
        }
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
