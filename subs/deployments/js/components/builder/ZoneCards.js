// Zone Cards Component
// Displays clickable zone cards with item counts

export class ZoneCards {
  constructor(deploymentId, zones) {
    this.deploymentId = deploymentId;
    this.zones = zones;
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

    card.innerHTML = `
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
          ${itemCount > 0 ? 'Manage Items' : 'Start Deployment'}
          <span class="icon">→</span>
        </button>
      </div>
    `;

    // Attach click handler
    card.addEventListener('click', () => {
      if (this.clickCallback) {
        this.clickCallback(zone.zone_code);
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
