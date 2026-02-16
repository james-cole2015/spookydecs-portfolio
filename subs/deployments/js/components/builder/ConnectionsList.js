// ConnectionsList.js
// Renders list of active connections

export class ConnectionsList {
  constructor(connections) {
    this.connections = connections;
    this.container = null;
  }
  
  render() {
    this.container = document.createElement('div');
    
    if (this.connections.length === 0) {
      console.log('[ConnectionsList] Rendering empty state');
      this.container.innerHTML = `
        <div class="empty-state">
          <p>No connections yet</p>
          <p class="empty-hint">Start by connecting to the receptacle</p>
        </div>
      `;
      return this.container;
    }
    
    console.log('[ConnectionsList] Rendering connection cards:', this.connections.length);
    
    this.container.innerHTML = this.connections.map(conn => `
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
        <button class="btn-remove-connection" title="Deactivate connection">×</button>
      </div>
    `).join('');
    
    this.attachEventListeners();
    
    return this.container;
  }
  
  attachEventListeners() {
    this.container.querySelectorAll('.btn-remove-connection').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const card = btn.closest('.connection-card');
        const connectionId = card.dataset.connectionId;
        
        console.log('[ConnectionsList] Remove button clicked for:', connectionId);
        
        // Dispatch event for parent to handle
        this.container.dispatchEvent(new CustomEvent('remove-connection', {
          detail: { connectionId }
        }));
      });
    });
  }
}