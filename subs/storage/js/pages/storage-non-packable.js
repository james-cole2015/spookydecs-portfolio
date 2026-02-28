/**
 * Large & Oversized Items Page
 * Displays all non-packable items (packing_data.packable === false)
 * at /storage/non-packable
 */

import { itemsAPI } from '../utils/storage-api.js';
import { getPlaceholderImage } from '../utils/storage-config.js';
import { renderBreadcrumb } from '../shared/breadcrumb.js';

let allItems = [];
let filteredItems = [];
let currentFilters = { season: 'All', stored: 'All', search: '' };
let expandedItemId = null;
let itemsAdminUrl = 'https://dev-items.spookydecs.com';

/**
 * Render the Large & Oversized page
 */
export async function renderNonPackablePage() {
  const app = document.getElementById('app');

  app.innerHTML = `
    <div class="storage-list-page">
      <div id="breadcrumb"></div>

      <div class="page-header">
        <h1 class="page-title">
          <span class="page-icon">📐</span>
          Large &amp; Oversized
        </h1>
      </div>

      <div id="filter-container"></div>

      <div class="list-controls">
        <div class="item-count" id="item-count">Loading...</div>
      </div>

      <div id="cards-container"></div>
    </div>
  `;

  renderBreadcrumb(document.getElementById('breadcrumb'), [
    { label: 'Storage', route: '/' },
    { label: 'Large & Oversized' }
  ]);

  await loadData();
}

/**
 * Fetch all items and filter to non-packable ones
 */
async function loadData() {
  const cardsContainer = document.getElementById('cards-container');
  cardsContainer.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Loading items...</p>
    </div>
  `;

  try {
    const { ITEMS_ADMIN } = await window.SpookyConfig.get();
    itemsAdminUrl = ITEMS_ADMIN || 'https://dev-items.spookydecs.com';

    const items = await itemsAPI.getAll({});

    allItems = items.filter(item =>
      item.packing_data?.packable === false &&
      item.class !== 'Deployment' &&
      item.class !== 'Storage' &&
      item.class_type !== 'Receptacle'
    );

    renderFilterBar();
    applyFiltersAndRender();

  } catch (error) {
    console.error('Failed to load non-packable items:', error);
    cardsContainer.innerHTML = `
      <div class="error-state">
        <div class="error-icon">⚠️</div>
        <h3>Error Loading Items</h3>
        <p>Failed to load items. Please try again.</p>
        <button class="btn btn-primary" onclick="window.location.reload()">Retry</button>
      </div>
    `;
  }
}

/**
 * Render inline filter bar (season, stored status, search)
 */
function renderFilterBar() {
  const filterContainer = document.getElementById('filter-container');
  if (!filterContainer) return;

  filterContainer.innerHTML = `
    <div class="filter-bar">
      <div class="filter-search-row">
        <input
          type="text"
          class="filter-search-input"
          placeholder="🔍 Search items..."
          id="np-search"
          value="${currentFilters.search}"
        >
        <button class="btn-filters-toggle" id="np-filter-toggle">
          <span>Filters</span>
          <span class="toggle-arrow">▼</span>
        </button>
      </div>
      <div class="filter-dropdowns" id="np-filter-dropdowns">
        <div class="filter-group">
          <select class="filter-select" id="np-season-filter">
            <option value="All"       ${currentFilters.season === 'All'       ? 'selected' : ''}>Season: All</option>
            <option value="Halloween" ${currentFilters.season === 'Halloween' ? 'selected' : ''}>Season: Halloween</option>
            <option value="Christmas" ${currentFilters.season === 'Christmas' ? 'selected' : ''}>Season: Christmas</option>
            <option value="Shared"    ${currentFilters.season === 'Shared'    ? 'selected' : ''}>Season: Shared</option>
          </select>
        </div>
        <div class="filter-group">
          <select class="filter-select" id="np-stored-filter">
            <option value="All"      ${currentFilters.stored === 'All'      ? 'selected' : ''}>Status: All</option>
            <option value="stored"   ${currentFilters.stored === 'stored'   ? 'selected' : ''}>Status: Stored</option>
            <option value="unstored" ${currentFilters.stored === 'unstored' ? 'selected' : ''}>Status: Not Stored</option>
          </select>
        </div>
      </div>
    </div>
  `;

  document.getElementById('np-search').addEventListener('input', (e) => {
    currentFilters.search = e.target.value;
    applyFiltersAndRender();
  });

  document.getElementById('np-season-filter').addEventListener('change', (e) => {
    currentFilters.season = e.target.value;
    applyFiltersAndRender();
  });

  document.getElementById('np-stored-filter').addEventListener('change', (e) => {
    currentFilters.stored = e.target.value;
    applyFiltersAndRender();
  });

  document.getElementById('np-filter-toggle').addEventListener('click', () => {
    const dropdowns = document.getElementById('np-filter-dropdowns');
    const toggle = document.getElementById('np-filter-toggle');
    const arrow = toggle.querySelector('.toggle-arrow');
    const isExpanded = dropdowns.classList.toggle('expanded');
    toggle.classList.toggle('expanded', isExpanded);
    arrow.textContent = isExpanded ? '▲' : '▼';
  });
}

/**
 * Apply current filters to allItems and re-render the card grid
 */
function applyFiltersAndRender() {
  let result = [...allItems];

  if (currentFilters.season && currentFilters.season !== 'All') {
    result = result.filter(item => item.season === currentFilters.season);
  }

  if (currentFilters.stored && currentFilters.stored !== 'All') {
    if (currentFilters.stored === 'stored') {
      result = result.filter(item => item.packing_data?.packing_status === true);
    } else {
      result = result.filter(item => item.packing_data?.packing_status !== true);
    }
  }

  if (currentFilters.search && currentFilters.search.trim()) {
    const term = currentFilters.search.toLowerCase().trim();
    result = result.filter(item =>
      item.id.toLowerCase().includes(term) ||
      item.short_name.toLowerCase().includes(term)
    );
  }

  filteredItems = result;
  renderCards();
}

/**
 * Render item cards grid
 */
function renderCards() {
  const cardsContainer = document.getElementById('cards-container');
  const countEl = document.getElementById('item-count');

  const filtered = filteredItems.length;
  const total = allItems.length;

  if (countEl) {
    countEl.textContent = filtered === total
      ? `${total} ${total === 1 ? 'item' : 'items'}`
      : `${filtered} of ${total} ${total === 1 ? 'item' : 'items'}`;
  }

  if (!cardsContainer) return;

  if (filteredItems.length === 0) {
    expandedItemId = null;
    cardsContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📐</div>
        <h3>No Items Found</h3>
        <p>${allItems.length === 0
          ? 'No large or oversized items are in the inventory yet.'
          : 'No items match the current filters.'
        }</p>
      </div>
    `;
    return;
  }

  expandedItemId = null;
  cardsContainer.innerHTML = '<div class="storage-cards-grid" id="np-cards-grid"></div>';
  const grid = document.getElementById('np-cards-grid');

  filteredItems.forEach(item => {
    const wrapper = document.createElement('div');
    wrapper.className = 'np-card-wrapper';
    wrapper.dataset.id = item.id;
    wrapper.innerHTML = renderItemCard(item);
    grid.appendChild(wrapper);
  });

  grid.querySelectorAll('.storage-card').forEach(card => {
    card.addEventListener('click', () => toggleDetailPanel(card.dataset.id));
  });
}

/**
 * Render a single item card (storage-card style, from wizard pattern)
 */
function renderItemCard(item) {
  const photoUrl = item.images?.thumb_cloudfront_url || item.images?.photo_url || getPlaceholderImage();
  const isStored = item.packing_data?.packing_status === true;
  const location = item.packing_data?.tote_location;
  const season = item.season || '';

  const storedBadge = isStored
    ? `<span class="badge card-badge-packed">Stored @ ${location || '?'}</span>`
    : `<span class="badge card-badge-unpacked">Not Stored</span>`;

  return `
    <div class="storage-card" data-id="${item.id}">
      <div class="card-photo">
        <img src="${photoUrl}" alt="${item.short_name || 'Item'}">
      </div>
      <div class="card-body">
        <div class="card-header">
          <h3 class="card-title">${item.short_name || 'Unnamed Item'}</h3>
          <code class="card-id">${item.id}</code>
        </div>
        <div class="card-meta">
          <div class="card-meta-item">
            <span class="meta-label">Season</span>
            <span class="badge badge-${season.toLowerCase()}">${season || '—'}</span>
          </div>
          <div class="card-meta-item">
            <span class="meta-label">Storage</span>
            ${storedBadge}
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Toggle the inline detail panel for a given item
 */
function toggleDetailPanel(itemId) {
  const grid = document.getElementById('np-cards-grid');
  if (!grid) return;

  if (expandedItemId === itemId) {
    collapseDetailPanel(grid);
    return;
  }

  collapseDetailPanel(grid);

  expandedItemId = itemId;
  const wrapper = grid.querySelector(`.np-card-wrapper[data-id="${itemId}"]`);
  const item = allItems.find(i => i.id === itemId);
  if (!wrapper || !item) return;

  wrapper.querySelector('.storage-card').classList.add('selected');

  const panel = document.createElement('div');
  panel.className = 'np-detail-panel';
  panel.dataset.panelFor = itemId;
  panel.innerHTML = renderDetailPanel(item);
  wrapper.appendChild(panel);

  panel.querySelector('#btn-view-in-items').addEventListener('click', (e) => {
    e.stopPropagation();
    window.location.href = `${itemsAdminUrl}/items/${itemId}`;
  });
}

/**
 * Collapse any open detail panel
 */
function collapseDetailPanel(grid) {
  if (!expandedItemId || !grid) return;

  const wrapper = grid.querySelector(`.np-card-wrapper[data-id="${expandedItemId}"]`);
  if (wrapper) {
    wrapper.querySelector('.storage-card')?.classList.remove('selected');
    wrapper.querySelector('.np-detail-panel')?.remove();
  }

  expandedItemId = null;
}

/**
 * Render the inline detail panel content
 */
function renderDetailPanel(item) {
  const pd = item.packing_data || {};
  const isStored = pd.packing_status === true;
  const location = pd.tote_location;

  return `
    <div class="np-detail-content">
      <div class="review-grid">
        <div class="review-item">
          <span class="review-label">Class</span>
          <span class="review-value">${item.class || '—'}</span>
        </div>
        ${item.class_type ? `
        <div class="review-item">
          <span class="review-label">Type</span>
          <span class="review-value">${item.class_type}</span>
        </div>
        ` : ''}
        <div class="review-item">
          <span class="review-label">Season</span>
          <span class="review-value">${item.season || '—'}</span>
        </div>
        <div class="review-item">
          <span class="review-label">Status</span>
          <span class="review-value">${item.status || '—'}</span>
        </div>
        <div class="review-item">
          <span class="review-label">Storage</span>
          <span class="review-value">${isStored ? `Stored @ ${location || '?'}` : 'Not Stored'}</span>
        </div>
        ${item.general_notes ? `
        <div class="review-item">
          <span class="review-label">Notes</span>
          <span class="review-value">${item.general_notes}</span>
        </div>
        ` : ''}
      </div>
      <div class="np-detail-actions">
        <button class="btn btn-primary btn-sm" id="btn-view-in-items">View in Items →</button>
      </div>
    </div>
  `;
}
