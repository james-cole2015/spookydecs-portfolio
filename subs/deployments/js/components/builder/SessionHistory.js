// SessionHistory Component
// Displays session history table with expandable connection details

export class SessionHistory {
  constructor(sessions) {
    this.sessions = sessions;
    this.expandedSessions = new Set();
    console.log('[SessionHistory] Constructor called with sessions:', sessions);
  }
  
  render() {
    const container = document.createElement('div');
    container.className = 'session-history-container';
    
    if (this.sessions.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📝</div>
          <p>No sessions yet</p>
          <p class="empty-hint">Start a new session to begin tracking your work</p>
        </div>
      `;
      return container;
    }
    
    // Sort sessions by start time (most recent first)
    const sortedSessions = [...this.sessions].sort((a, b) => {
      return new Date(b.start_time) - new Date(a.start_time);
    });
    
    const table = document.createElement('div');
    table.className = 'session-history-table';
    
    table.innerHTML = `
      <div class="table-header">
        <div class="col-session-id">Session</div>
        <div class="col-started">Started</div>
        <div class="col-duration">Duration</div>
        <div class="col-items">Items</div>
        <div class="col-connections">Connections</div>
        <div class="col-notes">Notes</div>
        <div class="col-expand"></div>
      </div>
    `;
    
    sortedSessions.forEach(session => {
      const row = this.createSessionRow(session);
      table.appendChild(row);
    });
    
    container.appendChild(table);
    
    console.log('[SessionHistory] Rendered table with', sortedSessions.length, 'sessions');
    
    return container;
  }
  
  createSessionRow(session) {
    const row = document.createElement('div');
    row.className = 'session-row';
    row.dataset.sessionId = session.session_id;
    
    const isActive = !session.end_time;
    const isExpanded = this.expandedSessions.has(session.session_id);
    
    if (isActive) {
      row.classList.add('active-session');
    }
    
    if (isExpanded) {
      row.classList.add('expanded');
    }
    
    // Make row clickable
    row.style.cursor = 'pointer';
    
    const startTime = new Date(session.start_time);
    const dateStr = startTime.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
    const timeStr = startTime.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
    
    const duration = this.formatDuration(session.duration_seconds);
    const itemsCount = session.items_deployed?.length || 0;
    const connectionsCount = session.connections_created?.length || 0;
    const notes = session.notes || '—';
    
    row.innerHTML = `
      <div class="row-main">
        <div class="col-session-id">
          ${isActive ? '<span class="active-badge">Active</span>' : ''}
          <span class="session-id-short">${this.truncateSessionId(session.session_id)}</span>
        </div>
        <div class="col-started">
          <div class="date">${dateStr}</div>
          <div class="time">${timeStr}</div>
        </div>
        <div class="col-duration">
          ${isActive ? '<span class="in-progress">In progress</span>' : duration}
        </div>
        <div class="col-items">${itemsCount}</div>
        <div class="col-connections">${connectionsCount}</div>
        <div class="col-notes">
          <span class="notes-preview">${this.truncateText(notes, 30)}</span>
        </div>
        <div class="col-expand">
          ${connectionsCount > 0 ? `
            <button class="btn-expand" aria-label="Expand connections">
              <span class="expand-icon">${isExpanded ? '▼' : '▶'}</span>
            </button>
          ` : ''}
        </div>
      </div>
      
      ${isExpanded ? this.renderConnectionsDetail(session) : ''}
    `;
    
    // Attach row click handler BEFORE expand button handler
    row.addEventListener('click', (e) => {
      console.log('[SessionHistory] Row clicked:', session.session_id);
      console.log('[SessionHistory] Click target:', e.target);
      console.log('[SessionHistory] Is expand button?', e.target.closest('.btn-expand'));
      
      // Don't navigate if clicking expand button
      if (e.target.closest('.btn-expand')) {
        console.log('[SessionHistory] Click was on expand button, ignoring');
        return;
      }
      
      console.log('[SessionHistory] Dispatching session-click event');
      
      // Dispatch event to parent to handle navigation
      const event = new CustomEvent('session-click', {
        detail: { session },
        bubbles: true
      });
      row.dispatchEvent(event);
    });
    
    // Attach expand/collapse handler
    const expandBtn = row.querySelector('.btn-expand');
    if (expandBtn) {
      expandBtn.addEventListener('click', (e) => {
        console.log('[SessionHistory] Expand button clicked');
        e.stopPropagation();
        this.toggleSessionExpansion(session.session_id, row);
      });
    }
    
    return row;
  }
  
  renderConnectionsDetail(session) {
    const connections = session.connections || [];
    
    if (connections.length === 0) {
      return `
        <div class="row-detail">
          <div class="detail-content">
            <p class="no-connections">No connections recorded for this session</p>
          </div>
        </div>
      `;
    }
    
    return `
      <div class="row-detail">
        <div class="detail-content">
          <h4>Connections (${connections.length})</h4>
          <div class="connections-list">
            ${connections.map(conn => `
              <a href="/deployments/${session.deployment_id || ''}/sessions/${session.session_id}/connections/${conn.connection_id}" class="connection-item connection-item-link">
                <div class="connection-flow">
                  <span class="conn-from">${conn.from_item_id}</span>
                  <span class="conn-port">${conn.from_port}</span>
                  <span class="conn-arrow">→</span>
                  <span class="conn-to">${conn.to_item_id}</span>
                  <span class="conn-port">${conn.to_port}</span>
                </div>
                ${conn.illuminates?.length > 0 ? `
                  <div class="connection-illuminates">
                    💡 Illuminates: ${conn.illuminates.join(', ')}
                  </div>
                ` : ''}
                ${conn.notes ? `
                  <div class="connection-notes">${conn.notes}</div>
                ` : ''}
              </a>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }
  
  toggleSessionExpansion(sessionId, rowElement) {
    if (this.expandedSessions.has(sessionId)) {
      this.expandedSessions.delete(sessionId);
      rowElement.classList.remove('expanded');
      
      const detailElement = rowElement.querySelector('.row-detail');
      if (detailElement) {
        detailElement.remove();
      }
      
      const expandIcon = rowElement.querySelector('.expand-icon');
      if (expandIcon) {
        expandIcon.textContent = '▶';
      }
    } else {
      this.expandedSessions.add(sessionId);
      rowElement.classList.add('expanded');
      
      const session = this.sessions.find(s => s.session_id === sessionId);
      if (session) {
        const detailHTML = this.renderConnectionsDetail(session);
        rowElement.insertAdjacentHTML('beforeend', detailHTML);
      }
      
      const expandIcon = rowElement.querySelector('.expand-icon');
      if (expandIcon) {
        expandIcon.textContent = '▼';
      }
    }
  }
  
  formatDuration(seconds) {
    if (!seconds) return '—';
    
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    
    return `${minutes}m`;
  }
  
  truncateSessionId(sessionId) {
    // session-abc123def456 → abc123
    const parts = sessionId.split('-');
    return parts[1]?.substring(0, 6) || sessionId;
  }
  
  truncateText(text, maxLength) {
    if (!text || text === '—') return text;
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }
}