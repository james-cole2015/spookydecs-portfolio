// ZoneDetailView Component
// Main layout for zone detail page

import { SessionHistory } from './SessionHistory.js';

export class ZoneDetailView {
  constructor(deployment, zone, sessions, activeSession) {
    this.deployment = deployment;
    this.zone = zone;
    this.sessions = sessions;
    this.activeSession = activeSession;
  }
  
  render() {
    const container = document.createElement('div');
    container.className = 'zone-detail-container';
    
    container.innerHTML = `
      <div class="zone-detail-header">
        <button class="btn-back">← Back to Zones</button>
        
        <div class="zone-header-info">
          <div class="zone-title">
            <span class="zone-icon">${this.getZoneIcon()}</span>
            <div>
              <h1>${this.zone.zone_name}</h1>
              <p class="zone-subtitle">
                <span class="zone-code-badge">${this.zone.zone_code}</span>
                ${this.zone.receptacle_id ? `<span class="receptacle-badge">🔌 ${this.zone.receptacle_id}</span>` : ''}
              </p>
            </div>
          </div>
        </div>
      </div>

      ${this.activeSession ? this.renderActiveSessionBanner() : ''}

      <div class="zone-detail-content">
        ${this.renderStatsSection()}
        ${this.renderQuickActions()}
        ${this.renderSessionHistorySection()}
      </div>
    `;
    
    return container;
  }
  
  renderActiveSessionBanner() {
    const startTime = new Date(this.activeSession.start_time);
    const timeStr = startTime.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
    
    return `
      <div class="active-session-banner">
        <div class="banner-content">
          <div class="banner-icon">⚡</div>
          <div class="banner-text">
            <strong>Session in progress</strong>
            <span>Started at ${timeStr}</span>
          </div>
        </div>
        <div class="banner-actions">
          <button class="btn btn-primary btn-resume-session">Resume Session</button>
          <button class="btn btn-secondary btn-end-session">End Session</button>
        </div>
      </div>
    `;
  }
  
  renderStatsSection() {
    const stats = this.zone.statistics || {};
    const itemCount = stats.item_count || 0;
    const sessionCount = stats.session_count || 0;
    const totalMinutes = stats.total_setup_minutes || 0;
    const longestMinutes = stats.longest_session_minutes || 0;
    
    return `
      <div class="stats-section">
        <div class="stat-card">
          <div class="stat-icon">📦</div>
          <div class="stat-content">
            <div class="stat-value">${itemCount}</div>
            <div class="stat-label">Items Deployed</div>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon">🔧</div>
          <div class="stat-content">
            <div class="stat-value">${sessionCount}</div>
            <div class="stat-label">Total Sessions</div>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon">⏱️</div>
          <div class="stat-content">
            <div class="stat-value">${this.formatMinutes(totalMinutes)}</div>
            <div class="stat-label">Total Time</div>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon">⏲️</div>
          <div class="stat-content">
            <div class="stat-value">${this.formatMinutes(longestMinutes)}</div>
            <div class="stat-label">Longest Session</div>
          </div>
        </div>
      </div>
    `;
  }
  
  renderQuickActions() {
    const hasItems = (this.zone.statistics?.item_count || 0) > 0;
    const hasActiveSession = !!this.activeSession;
    
    return `
      <div class="quick-actions-section">
        <h2>Quick Actions</h2>
        <div class="quick-actions-grid">
          ${!hasActiveSession ? `
            <button class="action-card btn-start-session">
              <div class="action-icon">▶️</div>
              <div class="action-content">
                <h3>Start New Session</h3>
                <p>Begin deploying items and making connections</p>
              </div>
            </button>
          ` : ''}
          
          ${hasItems ? `
            <button class="action-card btn-view-items">
              <div class="action-icon">📋</div>
              <div class="action-content">
                <h3>View Items</h3>
                <p>See all ${this.zone.statistics.item_count} items in this zone</p>
              </div>
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }
  
  renderSessionHistorySection() {
    const sessionHistory = new SessionHistory(this.sessions);
    const historyContainer = document.createElement('div');
    historyContainer.className = 'session-history-section';
    
    const header = document.createElement('div');
    header.className = 'section-header';
    header.innerHTML = `
      <h2>Session History</h2>
      <span class="session-count">${this.sessions.length} ${this.sessions.length === 1 ? 'session' : 'sessions'}</span>
    `;
    
    historyContainer.appendChild(header);
    historyContainer.appendChild(sessionHistory.render());
    
    return historyContainer.outerHTML;
  }
  
  getZoneIcon() {
    const icons = {
      'FY': '🏡',
      'BY': '🌳',
      'SY': '🏠'
    };
    return icons[this.zone.zone_code] || '📍';
  }
  
  formatMinutes(minutes) {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (mins === 0) {
      return `${hours}h`;
    }
    
    return `${hours}h ${mins}m`;
  }
}
