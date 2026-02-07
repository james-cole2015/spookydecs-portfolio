// SessionDetailView Component
// Main layout for session detail page

export class SessionDetailView {
  constructor(deployment, zone, session) {
    this.deployment = deployment;
    this.zone = zone;
    this.session = session;
  }
  
  render() {
    const container = document.createElement('div');
    container.className = 'session-detail-container';
    
    container.innerHTML = `
      ${this.renderBreadcrumbs()}
      
      <div class="session-detail-header">
        <div class="session-header-info">
          <div class="session-title">
            <div class="session-icon">📋</div>
            <div>
              <h1>Session ${this.truncateSessionId(this.session.session_id)}</h1>
              <p class="session-subtitle">
                <span class="zone-badge">${this.zone.zone_code}</span>
                ${this.session.end_time ? 
                  `<span class="status-badge completed">Completed</span>` : 
                  `<span class="status-badge active">Active</span>`
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      <div class="session-detail-content">
        ${this.renderMetadataSection()}
        ${this.renderItemsSection()}
        ${this.renderConnectionsSection()}
        ${this.renderNotesSection()}
      </div>
    `;
    
    return container;
  }
  
  renderBreadcrumbs() {
    const zonesRoute = `/deployments/builder/${this.deployment.deployment_id}/zones`;
    const zoneRoute = `/deployments/builder/${this.deployment.deployment_id}/zones/${this.zone.zone_code}`;
    
    return `
      <nav class="breadcrumbs">
        <a href="#" class="breadcrumb-link" data-route="${zonesRoute}">Zones</a>
        <span class="breadcrumb-separator">›</span>
        <a href="#" class="breadcrumb-link" data-route="${zoneRoute}">${this.zone.zone_name}</a>
        <span class="breadcrumb-separator">›</span>
        <span class="breadcrumb-current">Session ${this.truncateSessionId(this.session.session_id)}</span>
      </nav>
    `;
  }
  
  renderMetadataSection() {
    const startTime = new Date(this.session.start_time);
    const endTime = this.session.end_time ? new Date(this.session.end_time) : null;
    
    const startDateStr = startTime.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric',
      year: 'numeric'
    });
    const startTimeStr = startTime.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
    
    const endTimeStr = endTime ? endTime.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    }) : 'In progress';
    
    const duration = this.formatDuration(this.session.duration_seconds);
    
    return `
      <div class="metadata-section">
        <h2>Session Details</h2>
        <div class="metadata-grid">
          <div class="metadata-card">
            <div class="metadata-label">Started</div>
            <div class="metadata-value">${startDateStr}</div>
            <div class="metadata-subvalue">${startTimeStr}</div>
          </div>
          
          <div class="metadata-card">
            <div class="metadata-label">Ended</div>
            <div class="metadata-value">${endTime ? endTime.toLocaleDateString('en-US', { 
              month: 'long', 
              day: 'numeric',
              year: 'numeric'
            }) : '—'}</div>
            <div class="metadata-subvalue">${endTimeStr}</div>
          </div>
          
          <div class="metadata-card">
            <div class="metadata-label">Duration</div>
            <div class="metadata-value">${duration}</div>
          </div>
          
          <div class="metadata-card">
            <div class="metadata-label">Session ID</div>
            <div class="metadata-value metadata-mono">${this.session.session_id}</div>
          </div>
        </div>
      </div>
    `;
  }
  
  renderItemsSection() {
    const items = this.session.items_deployed || [];
    
    return `
      <div class="items-section">
        <div class="section-header">
          <h2>Items Deployed</h2>
          <span class="item-count">${items.length} ${items.length === 1 ? 'item' : 'items'}</span>
        </div>
        
        ${items.length === 0 ? `
          <div class="empty-state">
            <div class="empty-icon">📦</div>
            <p>No items deployed in this session</p>
          </div>
        ` : `
          <div class="items-grid">
            ${items.map(itemId => `
              <div class="item-card">
                <div class="item-icon">📦</div>
                <div class="item-info">
                  <div class="item-id">${itemId}</div>
                  <button class="item-link" data-item-id="${itemId}">View Details →</button>
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>
    `;
  }
  
  renderConnectionsSection() {
    const connectionIds = this.session.connections_created || [];
    
    return `
      <div class="connections-section">
        <div class="section-header">
          <h2>Connections Created</h2>
          <span class="connection-count">${connectionIds.length} ${connectionIds.length === 1 ? 'connection' : 'connections'}</span>
        </div>
        
        ${connectionIds.length === 0 ? `
          <div class="empty-state">
            <div class="empty-icon">🔌</div>
            <p>No connections created in this session</p>
          </div>
        ` : `
          <div class="connections-list">
            ${connectionIds.map(connId => `
              <a href="/deployments/builder/${this.deployment.deployment_id}/${this.session.session_id}/${connId}" class="connection-card connection-link">
                <div class="connection-icon">🔌</div>
                <div class="connection-info">
                  <div class="connection-id">${connId}</div>
                  <div class="connection-link-text">View Details →</div>
                </div>
              </a>
            `).join('')}
          </div>
        `}
      </div>
    `;
  }
  
  renderNotesSection() {
    const notes = this.session.notes || '';
    
    return `
      <div class="notes-section">
        <h2>Notes</h2>
        ${notes ? `
          <div class="notes-content">${notes}</div>
        ` : `
          <div class="empty-state">
            <p class="empty-hint">No notes recorded for this session</p>
          </div>
        `}
      </div>
    `;
  }
  
  truncateSessionId(sessionId) {
    // session-abc123def456 → abc123
    const parts = sessionId.split('-');
    return parts[1]?.substring(0, 6) || sessionId;
  }
  
  formatDuration(seconds) {
    if (!seconds) return '—';
    
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    
    if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    }
    
    return `${seconds}s`;
  }
}