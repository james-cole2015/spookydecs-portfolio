// SourcesList.js
// Renders list of items available for connections

export class SourcesList {
  constructor(availablePorts) {
    this.availablePorts = availablePorts;
    this.container = null;
  }
  
  render() {
    this.container = document.createElement('div');
    
    if (this.availablePorts.length === 0) {
      console.log('[SourcesList] Rendering empty state');
      this.container.innerHTML = `
        <div class="empty-state">
          <p>No available connection ports</p>
          <p class="empty-hint">All items are fully connected</p>
        </div>
      `;
      return this.container;
    }
    
    console.log('[SourcesList] Rendering source cards for items:', 
      this.availablePorts.map(i => i.item_id)
    );
    
    this.container.innerHTML = this.availablePorts.map(item => `
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
    
    this.attachEventListeners();
    
    return this.container;
  }
  
  attachEventListeners() {
    this.container.querySelectorAll('.btn-connect').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const card = btn.closest('.source-card');
        const itemId = card.dataset.itemId;
        const item = this.availablePorts.find(i => i.item_id === itemId);
        
        console.log('[SourcesList] Connect button clicked for:', itemId, item);
        
        // Dispatch event for parent to handle
        this.container.dispatchEvent(new CustomEvent('connect-item', {
          detail: { item }
        }));
      });
    });
  }
}
