// DeploymentCompleteView.js
// Review UI for completing a deployment
// Displays deployment header stats, per-zone sections with item cards and session links

import { fetchImageById } from '../../utils/deployment-api.js';

const ZONE_LABELS = { FY: 'Front Yard', BY: 'Back Yard', SY: 'Side Yard' };

export class DeploymentCompleteView {
  constructor(container, data, callbacks) {
    this.container = container;
    this.data = data;
    this.callbacks = callbacks;
    this.confirming = false;
  }

  render() {
    const { metadata, zones, deploymentId, itemsAdminUrl } = this.data;
    this.itemsAdminUrl = itemsAdminUrl || '';
    const stats = metadata.statistics || {};

    this.container.innerHTML = `
      <div class="complete-page">
        ${this._renderBreadcrumb(deploymentId, metadata)}
        ${this._renderHeader(metadata, stats)}
        ${this._renderZones(zones, deploymentId)}
        ${this._renderFooter()}
      </div>
    `;

    this._attachFooterListeners();
    this._initLazyPhotos();
  }

  _renderBreadcrumb(deploymentId, metadata) {
    return `
      <nav class="breadcrumb">
        <a href="/deployments">Deployments</a>
        <span class="breadcrumb-sep">›</span>
        <a href="/deployments/builder/${deploymentId}/zones">${metadata.season} ${metadata.year}</a>
        <span class="breadcrumb-sep">›</span>
        <span>Complete Deployment</span>
      </nav>
    `;
  }

  _renderHeader(metadata, stats) {
    const startedAt = metadata.setup_started_at
      ? new Date(metadata.setup_started_at).toLocaleString()
      : '—';

    const totalItems = this.data.zones.reduce(
      (sum, z) => sum + (z.items_deployed?.length || z.items?.length || 0), 0
    );

    return `
      <div class="complete-header">
        <div class="complete-header-top">
          <div>
            <h1 class="complete-title">${metadata.season} ${metadata.year}</h1>
            <span class="complete-status-badge status-${metadata.status}">${metadata.status.replace('_', ' ')}</span>
          </div>
          <div class="complete-header-meta">
            <span class="meta-label">Setup started</span>
            <span class="meta-value">${startedAt}</span>
          </div>
        </div>

        <div class="complete-stats-row">
          <div class="stat-card">
            <span class="stat-value">${totalItems}</span>
            <span class="stat-label">Items Deployed</span>
          </div>
          <div class="stat-card">
            <span class="stat-value">${stats.total_sessions || 0}</span>
            <span class="stat-label">Sessions</span>
          </div>
          <div class="stat-card">
            <span class="stat-value">${stats.total_setup_minutes || 0}m</span>
            <span class="stat-label">Setup Time</span>
          </div>
          <div class="stat-card">
            <span class="stat-value">${this.data.zones.length}</span>
            <span class="stat-label">Zones</span>
          </div>
        </div>

        ${this._renderClassBreakdown(stats)}
      </div>
    `;
  }

  _renderClassBreakdown(stats) {
    const byClass = stats.by_class || {};
    const entries = Object.entries(byClass);
    if (!entries.length) return '';

    const pills = entries
      .map(([cls, count]) => `<span class="class-pill">${cls}: ${count}</span>`)
      .join('');

    return `<div class="class-breakdown">${pills}</div>`;
  }

  _renderZones(zones, deploymentId) {
    if (!zones.length) return '<p class="no-zones">No zones found.</p>';
    return zones
      .map(zone => this._renderZone(zone, deploymentId))
      .join('');
  }

  _renderZone(zone, deploymentId) {
    const zoneStats = zone.statistics || {};
    const label = ZONE_LABELS[zone.zone_code] || zone.zone_name || zone.zone_code;

    return `
      <section class="zone-section">
        <div class="zone-section-header">
          <div>
            <h2 class="zone-title">${label}</h2>
            <div class="zone-meta">
              <span>${zone.items?.length || 0} items</span>
              <span class="sep">·</span>
              <span>${zoneStats.session_count || 0} sessions</span>
              <span class="sep">·</span>
              <span>${zoneStats.total_setup_minutes || 0}m setup</span>
            </div>
          </div>
        </div>

        ${this._renderSessionLinks(zone.sessions || [], deploymentId, zone.zone_code)}
        ${this._renderItemCards(zone.items || [])}
      </section>
    `;
  }

  _renderSessionLinks(sessions, deploymentId, zoneCode) {
    if (!sessions.length) return '';
    const links = sessions
      .filter(s => s.session_id)
      .map(s => {
        const duration = s.duration_seconds
          ? `${Math.round(s.duration_seconds / 60)}m`
          : 'active';
        const date = s.start_time
          ? new Date(s.start_time).toLocaleDateString()
          : '';
        return `
          <a class="session-link"
             href="/deployments/builder/${deploymentId}/zones/${zoneCode}/sessions/${s.session_id}">
            Session · ${date} · ${duration}
          </a>
        `;
      })
      .join('');

    return `<div class="session-links">${links}</div>`;
  }

  _renderItemCards(items) {
    const decorations = items.filter(i => i.class === 'Decoration');
    const lights = items.filter(i => i.class === 'Light');
    const accessories = items.filter(i => i.class === 'Accessory');

    const sections = [
      { label: 'Decorations', items: decorations, type: 'decoration' },
      { label: 'Lights', items: lights, type: 'light' },
      { label: 'Accessories', items: accessories, type: 'accessory' }
    ].filter(s => s.items.length > 0);

    if (!sections.length) return '<p class="no-items">No items in this zone.</p>';

    return sections.map(s => `
      <div class="item-class-section">
        <div class="item-class-header">
          <span class="item-class-label">${s.label}</span>
          <span class="item-class-count">${s.items.length}</span>
        </div>
        ${s.type === 'decoration'
          ? this._renderDecorationCards(s.items)
          : this._renderItemList(s.items, s.type)
        }
      </div>
    `).join('');
  }

  _renderDecorationCards(items) {
    const baseUrl = this.itemsAdminUrl;
    return `
      <div class="item-cards-grid">
        ${items.map(item => {
          const hasPhotos = item.photo_ids?.length > 0;
          return `
            <a class="item-card" href="${baseUrl + '/' + item.id}" data-item-id="${item.id}">
              <div class="item-card-photo ${hasPhotos ? 'has-photos' : 'no-photos'}"
                   data-photo-ids="${hasPhotos ? JSON.stringify(item.photo_ids) : '[]'}"
                   data-loaded="false">
                ${hasPhotos
                  ? `<div class="photo-placeholder">
                       <span class="photo-count-badge">${item.photo_ids.length}</span>
                     </div>`
                  : `<div class="no-photo-icon">${this._decorationIcon(item.class_type)}</div>`
                }
              </div>
              <div class="item-card-body">
                <div class="item-name">${item.short_name || item.id}</div>
              </div>
            </a>
          `;
        }).join('')}
      </div>
    `;
  }

  _renderItemList(items, type) {
    const icon = type === 'light' ? '💡' : '🔌';
    const baseUrl = this.itemsAdminUrl;
    return `
      <ul class="item-list">
        ${items.map(item => `
          <li class="item-list-row">
            <a class="item-list-link" href="${baseUrl + '/' + item.id}">
              <span class="item-list-icon">${icon}</span>
              <span class="item-list-name">${item.short_name || item.id}</span>
            </a>
          </li>
        `).join('')}
      </ul>
    `;
  }

  _decorationIcon(classType) {
    const icons = {
      'Inflatable': '🎈',
      'Animatronic': '🤖',
      'Static Prop': '💀'
    };
    return icons[classType] || '🎃';
  }

  _renderFooter() {
    return `
      <div class="complete-footer">
        <div id="complete-status-banner" class="complete-status-banner" style="display:none;"></div>
        <div class="complete-footer-inner">
          <button class="btn btn-secondary btn-back">← Back to Zones</button>
          <div class="complete-footer-right">
            <p class="complete-disclaimer">
              This will mark all deployed items as <strong>Deployed</strong> and lock the deployment.
            </p>
            <button class="btn btn-confirm" id="btn-confirm-complete">
              Confirm &amp; Complete Deployment
            </button>
          </div>
        </div>
      </div>
    `;
  }

  _attachFooterListeners() {
    const confirmBtn = this.container.querySelector('#btn-confirm-complete');
    const backBtn = this.container.querySelector('.btn-back');
    const statusBanner = this.container.querySelector('#complete-status-banner');

    const setStatus = (type, message) => {
      if (!statusBanner) return;
      statusBanner.className = `complete-status-banner ${type}`;
      statusBanner.textContent = message;
      statusBanner.style.display = 'block';

      if (type !== 'success') {
        this.confirming = false;
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'Confirm & Complete Deployment';
      }
    };

    confirmBtn?.addEventListener('click', async () => {
      if (this.confirming) return;
      this.confirming = true;
      confirmBtn.disabled = true;
      confirmBtn.textContent = 'Completing...';
      if (statusBanner) statusBanner.style.display = 'none';
      await this.callbacks.onConfirm(setStatus);
    });

    backBtn?.addEventListener('click', () => this.callbacks.onBack());
  }

  _initLazyPhotos() {
    const photoEls = this.container.querySelectorAll('.item-card-photo.has-photos');

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          if (el.dataset.loaded === 'false') {
            this._loadPhoto(el);
            observer.unobserve(el);
          }
        }
      });
    }, { rootMargin: '100px' });

    photoEls.forEach(el => observer.observe(el));
  }

  async _loadPhoto(el) {
    el.dataset.loaded = 'true';
    try {
      const photoIds = JSON.parse(el.dataset.photoIds || '[]');
      if (!photoIds.length) return;

      // Load first photo only for the card thumbnail
      const photo = await fetchImageById(photoIds[0]);
      if (!photo) return;

      const url = photo.thumb_cloudfront_url || photo.cloudfront_url;
      if (!url) return;

      el.innerHTML = `
        <img src="${url}" alt="Item photo" class="item-photo-img" loading="lazy" />
        ${photoIds.length > 1
          ? `<span class="photo-count-overlay">+${photoIds.length - 1}</span>`
          : ''}
      `;
    } catch (e) {
      console.warn('[DeploymentCompleteView] Photo load failed:', e);
    }
  }
}