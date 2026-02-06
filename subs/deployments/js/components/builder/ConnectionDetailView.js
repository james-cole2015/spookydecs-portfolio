// ConnectionDetailView Component
// Main layout for connection detail page

export class ConnectionDetailView {
  constructor(deployment, zone, connection, fromItem, toItem, illuminatedItems = [], itemsBaseUrl = '') {
    this.deployment = deployment;
    this.zone = zone;
    this.connection = connection;
    this.fromItem = fromItem;
    this.toItem = toItem;
    this.illuminatedItems = illuminatedItems;
    this.itemsBaseUrl = itemsBaseUrl;
  }
  
  render() {
    const container = document.createElement('div');
    container.className = 'connection-detail-container';
    
    container.innerHTML = `
      ${this.renderBreadcrumbs()}
      
      <div class="connection-detail-header">
        <div class="connection-header-info">
          <div class="connection-title">
            <div class="connection-icon">🔌</div>
            <div>
              <h1>Connection ${this.truncateConnectionId(this.connection.connection_id)}</h1>
              <p class="connection-subtitle">
                <span class="zone-badge">${this.zone.zone_code}</span>
                <span class="session-badge">Session ${this.truncateSessionId(this.connection.session_id)}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <div class="connection-detail-content">
        ${this.renderConnectionFlow()}
        ${this.renderItemsSection()}
        ${this.renderIlluminatesSection()}
        ${this.renderMetadataSection()}
        ${this.renderNotesSection()}
      </div>
    `;
    
    return container;
  }
  
  renderBreadcrumbs() {
    const zonesRoute = `/deployments/${this.deployment.deployment_id}/zones`;
    const zoneRoute = `/deployments/${this.deployment.deployment_id}/zones/${this.zone.zone_code}`;
    const sessionRoute = `/deployments/${this.deployment.deployment_id}/zones/${this.zone.zone_code}/sessions/${this.connection.session_id}`;
    
    return `
      <nav class="breadcrumbs">
        <a href="#" class="breadcrumb-link" data-route="${zonesRoute}">Zones</a>
        <span class="breadcrumb-separator">›</span>
        <a href="#" class="breadcrumb-link" data-route="${zoneRoute}">${this.zone.zone_name}</a>
        <span class="breadcrumb-separator">›</span>
        <a href="#" class="breadcrumb-link" data-route="${sessionRoute}">Session ${this.truncateSessionId(this.connection.session_id)}</a>
        <span class="breadcrumb-separator">›</span>
        <span class="breadcrumb-current">Connection ${this.truncateConnectionId(this.connection.connection_id)}</span>
      </nav>
    `;
  }
  
  renderConnectionFlow() {
    return `
      <div class="connection-flow-section">
        <h2>Connection Flow</h2>
        <div class="flow-diagram">
          <div class="flow-item flow-from">
            <div class="flow-label">From</div>
            <div class="flow-item-id">${this.connection.from_item_id}</div>
            <div class="flow-port">${this.connection.from_port}</div>
          </div>
          
          <div class="flow-arrow">
            <div class="arrow-line"></div>
            <div class="arrow-head">→</div>
          </div>
          
          <div class="flow-item flow-to">
            <div class="flow-label">To</div>
            <div class="flow-item-id">${this.connection.to_item_id}</div>
            <div class="flow-port">${this.connection.to_port}</div>
          </div>
        </div>
      </div>
    `;
  }
  
  renderItemsSection() {
    return `
      <div class="items-section">
        <h2>Connected Items</h2>
        <div class="items-grid">
          ${this.renderItemCard(this.fromItem, 'Source')}
          ${this.renderItemCard(this.toItem, 'Destination')}
        </div>
      </div>
    `;
  }
  
  renderItemCard(item, label) {
    const photoUrl = this.getItemPhotoUrl(item);
    const statusClass = this.getStatusClass(item.status);
    const placeholderIcon = this.getPlaceholderIcon(item);
    
    return `
      <div class="item-detail-card">
        <div class="item-card-label">${label}</div>
        
        ${photoUrl ? `
          <div class="item-photo">
            <img src="${photoUrl}" alt="${item.short_name || item.id}" />
          </div>
        ` : `
          <div class="item-photo-placeholder">
            <span class="placeholder-icon">${placeholderIcon}</span>
          </div>
        `}
        
        <div class="item-card-info">
          <div class="item-card-name">${item.short_name || 'Unnamed Item'}</div>
          <div class="item-card-id">${item.id}</div>
          <div class="item-card-meta">
            <span class="item-class">${item.class}</span>
            <span class="item-separator">•</span>
            <span class="item-type">${item.class_type}</span>
          </div>
          <span class="item-status ${statusClass}">${item.status}</span>
        </div>
        
        <button class="item-detail-link" data-item-id="${item.id}">
          View Item Details →
        </button>
      </div>
    `;
  }
  
  renderIlluminatesSection() {
    if (!this.illuminatedItems || this.illuminatedItems.length === 0) {
      return '';
    }
    
    return `
      <div class="illuminates-section">
        <div class="section-header">
          <h2>💡 Illuminated Items</h2>
          <span class="illuminates-count">${this.illuminatedItems.length} ${this.illuminatedItems.length === 1 ? 'item' : 'items'}</span>
        </div>
        
        <div class="illuminates-grid">
          ${this.illuminatedItems.map(item => this.renderIlluminatedItemCard(item)).join('')}
        </div>
      </div>
    `;
  }
  
  renderIlluminatedItemCard(item) {
    const photoUrl = this.getItemPhotoUrl(item);
    const placeholderIcon = this.getPlaceholderIcon(item);
    
    return `
      <div class="illuminated-item-card">
        ${photoUrl ? `
          <div class="illuminated-photo">
            <img src="${photoUrl}" alt="${item.short_name || item.id}" />
          </div>
        ` : `
          <div class="illuminated-photo-placeholder">
            <span class="placeholder-icon">${placeholderIcon}</span>
          </div>
        `}
        
        <div class="illuminated-info">
          <div class="illuminated-name">${item.short_name || 'Unnamed Item'}</div>
          <div class="illuminated-id">${item.id}</div>
        </div>
      </div>
    `;
  }
  
  renderMetadataSection() {
    const connectedAt = new Date(this.connection.connected_at);
    const dateStr = connectedAt.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric',
      year: 'numeric'
    });
    const timeStr = connectedAt.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
    
    return `
      <div class="metadata-section">
        <h2>Connection Details</h2>
        <div class="metadata-grid">
          <div class="metadata-card">
            <div class="metadata-label">Connected At</div>
            <div class="metadata-value">${dateStr}</div>
            <div class="metadata-subvalue">${timeStr}</div>
          </div>
          
          <div class="metadata-card">
            <div class="metadata-label">Zone</div>
            <div class="metadata-value">${this.zone.zone_name}</div>
            <div class="metadata-subvalue">${this.zone.zone_code}</div>
          </div>
          
          <div class="metadata-card">
            <div class="metadata-label">Session ID</div>
            <div class="metadata-value metadata-mono">${this.connection.session_id}</div>
          </div>
          
          <div class="metadata-card">
            <div class="metadata-label">Connection ID</div>
            <div class="metadata-value metadata-mono">${this.connection.connection_id}</div>
          </div>
        </div>
      </div>
    `;
  }
  
  renderNotesSection() {
    const notes = this.connection.notes || '';
    
    return `
      <div class="notes-section">
        <h2>Notes</h2>
        ${notes ? `
          <div class="notes-content">${notes}</div>
        ` : `
          <div class="empty-state">
            <p class="empty-hint">No notes recorded for this connection</p>
          </div>
        `}
      </div>
    `;
  }
  
  getItemPhotoUrl(item) {
    // Use placeholders for Light and Accessory classes
    if (item.class === 'Light' || item.class === 'Accessory') {
      return null; // Let placeholder show with class-specific emoji
    }
    
    // For Decoration, use actual photo if available
    if (item.images?.primary_photo_url) {
      return item.images.primary_photo_url;
    }
    
    return null;
  }
  
  getPlaceholderIcon(item) {
    // Return class-specific emoji for placeholder
    if (item.class === 'Light') {
      return '💡';
    }
    if (item.class === 'Accessory') {
      return '⚙️';
    }
    return '📦'; // Default for Decoration
  }
  
  getStatusClass(status) {
    const statusMap = {
      'Active': 'status-active',
      'Deployed': 'status-deployed',
      'Packed': 'status-packed',
      'Retired': 'status-retired'
    };
    
    return statusMap[status] || 'status-default';
  }
  
  truncateConnectionId(connectionId) {
    // conn-abc123def456 → abc123
    const parts = connectionId.split('-');
    return parts[1]?.substring(0, 6) || connectionId;
  }
  
  truncateSessionId(sessionId) {
    // session-abc123def456 → abc123
    const parts = sessionId.split('-');
    return parts[1]?.substring(0, 6) || sessionId;
  }
}