// Zone Cards Component
// Displays clickable zone cards with item counts and active session indicators

import { navigate } from '../../utils/router.js';

export class ZoneCards {
  constructor(deploymentId, zones, activeSessions = {}) {
    this.deploymentId = deploymentId;
    this.zones = zones;
    this.activeSessions = activeSessions; // { zone_code: session }
    this.clickCallback = null;
  }

  render() {
    const container = document.createElement('div');
    container.className = 'zone-cards';

    if (!this.zones || this.zones.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>No zones found for this deployment.</p>
        </div>
      `;
      return container;
    }

    // Sort zones by code (FY, BY, SY)
    const sortedZones = [...this.zones].sort((a, b) => {
      const order = { 'FY': 1, 'BY': 2, 'SY': 3 };
      return (order[a.zone_code] || 99) - (order[b.zone_code] || 99);
    });

    sortedZones.forEach(zone => {
      const card = this.createZoneCard(zone);
      container.appendChild(card);
    });

    return container;
  }

  createZoneCard(zone) {
    const card = document.createElement('div');
    card.className = 'zone-card';
    card.dataset.zoneCode = zone.zone_code;

    const itemCount = zone.statistics?.item_count || 0;
    const sessionCount = zone.statistics?.session_count || 0;
    const hasActiveSession = !!this.activeSessions[zone.zone_code];

    card.innerHTML = `
      ${hasActiveSession ? `
        <div class="active-session-dot" title="Active session in progress">
          <span class="dot-ring"></span>
          <span class="dot-core"></span>
        </div>
      ` : ''}

      <div class="zone-card-header">
        <div class="zone-icon">${this.getZoneIcon(zone.zone_code)}</div>
        <div class="zone-title">
          <h3>${zone.zone_name}</h3>
          <p class="zone-code">${zone.zone_code}</p>
        </div>
      </div>

      <div class="zone-card-body">
        <div class="zone-stat">
          <span class="stat-value">${itemCount}</span>
          <span class="stat-label">Items Deployed</span>
        </div>

        <div class="zone-stat">
          <span class="stat-value">${sessionCount}</span>
          <span class="stat-label">Sessions</span>
        </div>

        ${zone.receptacle_id ? `
          <div class="zone-receptacle">
            <span class="receptacle-icon">🔌</span>
            <span class="receptacle-id">${zone.receptacle_id}</span>
          </div>
        ` : ''}
      </div>

      <div class="zone-card-footer">
        <button class="btn-zone-action">
          ${hasActiveSession ? 'Resume Session' : itemCount > 0 ? 'View Details' : 'Get Started'}
          <span class="icon">→</span>
        </button>
      </div>
    `;

    // Attach click handler - navigate to zone detail page
    card.addEventListener('click', () => {
      const zoneCode = zone.zone_code;
      navigate(`/deployments/builder/${this.deploymentId}/zones/${zoneCode}`);
      
      if (this.clickCallback) {
        this.clickCallback(zoneCode);
      }
    });

    return card;
  }

  getZoneIcon(zoneCode) {
    const icons = {
      'FY': '🏡',
      'BY': '🌳',
      'SY': '🏠'
    };
    return icons[zoneCode] || '📍';
  }

  onZoneClick(callback) {
    this.clickCallback = callback;
  }
}