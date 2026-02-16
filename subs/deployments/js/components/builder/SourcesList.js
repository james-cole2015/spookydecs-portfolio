// SourcesList.js
// Eligible source items panel (Accessory / Receptacle) with search and card grid.
// Fires 'connect-item' on this.container when a card is clicked.
//
// Expected data shape from getAvailablePorts (current + future):
//   response.data.items          → in-zone items with port data (current)
//   response.data.eligible_items → { season: [], shared: [], other_zones: [] } (future)
//
// Gracefully handles missing eligible_items until backend is extended.

import { createEligibleItemCard } from './EligibleItemCard.js';

export class SourcesList {
  constructor(data) {
    // data = full response.data from getAvailablePorts
    this.seasonItems = data?.eligible_items?.season || [];
    this.sharedItems = data?.eligible_items?.shared || [];
    this.otherZoneItems = data?.eligible_items?.other_zones || [];

    // Fall back to legacy items array if eligible_items not yet present
    this.legacyItems = (!data?.eligible_items && Array.isArray(data?.items))
      ? data.items
      : [];

    this.searchQuery = '';
    this.container = null;
  }

  get allItems() {
    if (this.legacyItems.length > 0) return this.legacyItems;
    return [
      ...this.seasonItems,
      ...this.sharedItems,
      ...this.otherZoneItems
    ];
  }

  get hasData() {
    return this.allItems.length > 0;
  }

  render() {
    this.container = document.createElement('div');
    this.container.className = 'sources-list-panel';

    if (!this.hasData) {
      this.renderEmpty();
      return this.container;
    }

    this.renderSearch();
    this.renderGrid();

    return this.container;
  }

  renderEmpty() {
    // Backend not yet returning eligible_items — show a non-alarming state
    this.container.innerHTML = `
      <div class="empty-state">
        <p>No sources available</p>
        <p class="empty-hint">Items with available ports will appear here</p>
      </div>
    `;
  }

  renderSearch() {
    const searchWrapper = document.createElement('div');
    searchWrapper.className = 'sources-search';
    searchWrapper.innerHTML = `
      <input
        type="text"
        class="sources-search__input"
        placeholder="Search sources..."
        autocomplete="off"
      />
    `;

    const input = searchWrapper.querySelector('input');
    input.addEventListener('input', (e) => {
      this.searchQuery = e.target.value.toLowerCase().trim();
      this.updateGrid();
    });

    this.container.appendChild(searchWrapper);
  }

  renderGrid() {
    this.gridEl = document.createElement('div');
    this.gridEl.className = 'sources-grid';
    this.container.appendChild(this.gridEl);
    this.updateGrid();
  }

  updateGrid() {
    this.gridEl.innerHTML = '';

    const q = this.searchQuery;

    const matches = (item) => {
      if (!q) return true;
      return (
        item.short_name?.toLowerCase().includes(q) ||
        item.item_id?.toLowerCase().includes(q)
      );
    };

    if (this.legacyItems.length > 0) {
      // Legacy path: flat list, no section headers
      const filtered = this.legacyItems.filter(matches);
      if (filtered.length === 0) {
        this.renderNoResults();
        return;
      }
      filtered.forEach(item => {
        this.gridEl.appendChild(createEligibleItemCard(item, (i) => this.fireConnect(i)));
      });
      return;
    }

    // New path: bucketed sections
    const seasonFiltered = this.seasonItems.filter(matches);
    const sharedFiltered = this.sharedItems.filter(matches);
    const otherFiltered = this.otherZoneItems.filter(matches);
    const total = seasonFiltered.length + sharedFiltered.length + otherFiltered.length;

    if (total === 0) {
      this.renderNoResults();
      return;
    }

    if (seasonFiltered.length > 0) {
      seasonFiltered.forEach(item => {
        this.gridEl.appendChild(createEligibleItemCard(item, (i) => this.fireConnect(i)));
      });
    }

    if (sharedFiltered.length > 0) {
      this.gridEl.appendChild(this.renderSectionDivider('Shared'));
      sharedFiltered.forEach(item => {
        this.gridEl.appendChild(createEligibleItemCard(item, (i) => this.fireConnect(i)));
      });
    }

    if (otherFiltered.length > 0) {
      this.gridEl.appendChild(this.renderSectionDivider('Other Zones'));
      otherFiltered.forEach(item => {
        this.gridEl.appendChild(createEligibleItemCard(item, (i) => this.fireConnect(i)));
      });
    }
  }

  renderSectionDivider(label) {
    const divider = document.createElement('div');
    divider.className = 'sources-section-divider';
    divider.innerHTML = `<span>${label}</span>`;
    return divider;
  }

  renderNoResults() {
    const el = document.createElement('div');
    el.className = 'empty-state';
    el.innerHTML = `
      <p>No sources match "${this.searchQuery}"</p>
    `;
    this.gridEl.appendChild(el);
  }

  fireConnect(item) {
    console.log('[SourcesList] connect-item fired for:', item.item_id);
    this.container.dispatchEvent(new CustomEvent('connect-item', {
      bubbles: true,
      detail: { item }
    }));
  }
}
