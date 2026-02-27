// ZoneItemsDrawer Component
// Side drawer showing all items deployed in a zone

import { getItem } from '../../utils/deployment-api.js';

const ACCESSORY_SVG = `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="64" height="64" rx="8" fill="#F3F4F6"/>
  <rect x="28" y="8" width="4" height="16" rx="2" fill="#9CA3AF"/>
  <rect x="36" y="8" width="4" height="16" rx="2" fill="#9CA3AF"/>
  <path d="M20 24h24v8a12 12 0 01-24 0v-8z" fill="#6B7280"/>
  <rect x="30" y="44" width="4" height="12" rx="2" fill="#6B7280"/>
  <rect x="24" y="54" width="16" height="4" rx="2" fill="#6B7280"/>
</svg>`;

const LIGHT_SVG = `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="64" height="64" rx="8" fill="#FEF9C3"/>
  <circle cx="32" cy="26" r="14" fill="#FCD34D"/>
  <path d="M26 40h12l-2 10H28l-2-10z" fill="#F59E0B"/>
  <rect x="27" y="50" width="10" height="3" rx="1.5" fill="#D97706"/>
  <rect x="29" y="53" width="6" height="2" rx="1" fill="#D97706"/>
  <line x1="32" y1="8" x2="32" y2="4" stroke="#FCD34D" stroke-width="2" stroke-linecap="round"/>
  <line x1="18" y1="14" x2="15" y2="11" stroke="#FCD34D" stroke-width="2" stroke-linecap="round"/>
  <line x1="46" y1="14" x2="49" y2="11" stroke="#FCD34D" stroke-width="2" stroke-linecap="round"/>
  <line x1="12" y1="26" x2="8" y2="26" stroke="#FCD34D" stroke-width="2" stroke-linecap="round"/>
  <line x1="52" y1="26" x2="56" y2="26" stroke="#FCD34D" stroke-width="2" stroke-linecap="round"/>
</svg>`;

const DECORATION_SVG = `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="64" height="64" rx="8" fill="#FFF7ED"/>
  <path d="M32 10L38 24H52L41 33L45 47L32 38L19 47L23 33L12 24H26L32 10Z" fill="#FB923C"/>
  <circle cx="32" cy="32" r="6" fill="#FED7AA"/>
</svg>`;

export class ZoneItemsDrawer {
  constructor(zone) {
    this.zone = zone;
    this.itemIds = zone.items_deployed || [];
    this.items = null;
    this.itemsAdminUrl = null;
    this.drawerEl = null;
    this.isOpen = false;
  }

  async _fetchItems() {
    if (this.items !== null) return;
    if (!this.itemsAdminUrl) {
      const { ITEMS_ADMIN = '' } = await window.SpookyConfig.get();
      this.itemsAdminUrl = ITEMS_ADMIN;
    }

    try {
      const results = await Promise.all(
        this.itemIds.map(id =>
          getItem(id)
            .then(res => res.data || res)
            .catch(err => {
              console.warn(`[ZoneItemsDrawer] Failed to fetch item ${id}:`, err);
              return { id, short_name: id, class: 'Unknown', class_type: 'Unknown', _error: true };
            })
        )
      );
      this.items = results;
    } catch (e) {
      console.error('[ZoneItemsDrawer] Error fetching items:', e);
      this.items = [];
    }
  }

  // ── Public API ───────────────────────────────────────────

  mount(parentEl) {
    const el = document.createElement('div');
    el.className = 'items-drawer-root';
    el.innerHTML = `
      <div class="items-drawer-backdrop"></div>
      <div class="items-drawer" role="dialog" aria-label="Zone Items" aria-hidden="true">
        <div class="items-drawer-header">
          <div class="items-drawer-title">
            <h2>Items in ${this.zone.zone_name}</h2>
            <span class="items-drawer-count">${this.itemIds.length} item${this.itemIds.length !== 1 ? 's' : ''}</span>
          </div>
          <button class="items-drawer-close" aria-label="Close">✕</button>
        </div>
        <div class="items-drawer-body">
          <div class="items-drawer-loading">
            <div class="spinner"></div>
            <p>Loading items...</p>
          </div>
        </div>
      </div>
    `;

    this.drawerEl = el;
    parentEl.appendChild(el);

    el.querySelector('.items-drawer-backdrop').addEventListener('click', () => this.close());
    el.querySelector('.items-drawer-close').addEventListener('click', () => this.close());

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) this.close();
    });
  }

  async open() {
    if (!this.drawerEl) return;
    this.isOpen = true;

    const drawer = this.drawerEl.querySelector('.items-drawer');
    drawer.setAttribute('aria-hidden', 'false');
    this.drawerEl.classList.add('is-open');
    document.body.style.overflow = 'hidden';

    if (this.items === null) {
      await this._fetchItems();
      this._renderItems();
    }
  }

  close() {
    if (!this.drawerEl) return;
    this.isOpen = false;

    const drawer = this.drawerEl.querySelector('.items-drawer');
    drawer.setAttribute('aria-hidden', 'true');
    this.drawerEl.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  // ── Rendering ────────────────────────────────────────────

  _renderItems() {
    const body = this.drawerEl.querySelector('.items-drawer-body');

    if (!this.items || this.items.length === 0) {
      body.innerHTML = `
        <div class="items-drawer-empty">
          <div class="empty-icon">📦</div>
          <p>No items deployed in this zone yet.</p>
        </div>
      `;
      return;
    }

    const list = document.createElement('div');
    list.className = 'items-card-list';

    this.items.forEach(item => {
      list.appendChild(this._buildRow(item));
    });

    body.innerHTML = '';
    body.appendChild(list);
  }

  _buildRow(item) {
    const classType = item.class_type || '';
    const shortName = item.short_name || item.id;
    const itemId = item.id;

    const row = document.createElement('a');
    row.className = 'item-list-row';
    if (item._error) row.classList.add('item-list-row--error');
    row.href = `${this.itemsAdminUrl}/${itemId}`;
    row.target = '_blank';
    row.rel = 'noopener noreferrer';

    row.innerHTML = `
      <div class="item-row-thumb"></div>
      <div class="item-row-info">
        <span class="item-row-name">${shortName}</span>
        <span class="item-row-type">${classType}</span>
      </div>
    `;

    row.querySelector('.item-row-thumb').appendChild(this._buildThumb(item));

    return row;
  }

  _buildThumb(item) {
    const wrapper = document.createElement('div');
    wrapper.className = 'item-thumb-wrapper';

    const primaryPhotoId = item.images?.primary_photo_id;

    if (primaryPhotoId && !item._error) {
      const img = document.createElement('img');
      img.className = 'item-thumb-img';
      img.alt = item.short_name || '';

      this._resolvePhotoUrl(primaryPhotoId).then(url => {
        if (url) {
          img.src = url;
          img.onerror = () => {
            wrapper.innerHTML = this._svgPlaceholder(item.class);
          };
        } else {
          wrapper.innerHTML = this._svgPlaceholder(item.class);
        }
      });

      wrapper.appendChild(img);
    } else {
      wrapper.innerHTML = this._svgPlaceholder(item.class);
    }

    return wrapper;
  }

  async _resolvePhotoUrl(photoId) {
    try {
      const { fetchImageById } = await import('../../utils/deployment-api.js');
      const imageData = await fetchImageById(photoId);
      return imageData?.thumb_cloudfront_url || imageData?.cloudfront_url || null;
    } catch (e) {
      return null;
    }
  }

  _svgPlaceholder(itemClass) {
    switch ((itemClass || '').toLowerCase()) {
      case 'accessory': return ACCESSORY_SVG;
      case 'light':     return LIGHT_SVG;
      default:          return DECORATION_SVG;
    }
  }
}