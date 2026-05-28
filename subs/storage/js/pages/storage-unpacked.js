/**
 * Unpacked Items Audit Page
 * Post-pack sanity check — shows all items where storage_data.is_stored
 * is false or absent, scoped by season.
 * Route: /storage/unpacked
 */

import { itemsAPI } from '../utils/storage-api.js';
import { renderBreadcrumb } from '../shared/breadcrumb.js';

let allItems = [];
let currentSeason = 'All';
let itemsAdminUrl = 'https://dev-items.spookydecs.com';
let storageAdminUrl = '';

export async function renderUnpackedPage() {
  const app = document.getElementById('app');

  app.innerHTML = `
    <div class="storage-list-page">
      <div id="breadcrumb"></div>

      <div class="page-header">
        <h1 class="page-title">
          <span class="page-icon">🔍</span>
          Unpacked Items
        </h1>
        <p class="page-subtitle">Items not yet in storage. Check after packing to catch anything missed.</p>
      </div>

      <div id="filter-container"></div>

      <div class="list-controls">
        <div class="item-count" id="item-count">Loading...</div>
      </div>

      <div id="list-container"></div>
    </div>
  `;

  renderBreadcrumb(document.getElementById('breadcrumb'), [
    { label: 'Storage', route: '/' },
    { label: 'Unpacked Items' }
  ]);

  await loadData();
}

async function loadData() {
  const listContainer = document.getElementById('list-container');
  listContainer.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Loading items...</p>
    </div>
  `;

  try {
    const config = await window.SpookyConfig.get();
    itemsAdminUrl = config.ITEMS_ADMIN || 'https://dev-items.spookydecs.com';
    storageAdminUrl = config.STORAGE_ADMIN || '';

    allItems = (await itemsAPI.getUnpacked()).filter(item => item.class !== 'Receptacle');

    renderFilterBar();
    applySeasonAndRender();

  } catch (error) {
    console.error('Failed to load unpacked items:', error);
    listContainer.innerHTML = `
      <div class="error-state">
        <div class="error-icon">⚠️</div>
        <h3>Error Loading Items</h3>
        <p>Failed to load unpacked items. Please try again.</p>
        <button class="btn btn-primary" onclick="window.location.reload()">Retry</button>
      </div>
    `;
  }
}

function renderFilterBar() {
  const filterContainer = document.getElementById('filter-container');
  if (!filterContainer) return;

  filterContainer.innerHTML = `
    <div class="filter-bar">
      <div class="filter-dropdowns expanded">
        <div class="filter-group">
          <select class="filter-select" id="unpacked-season-filter">
            <option value="All"       ${currentSeason === 'All'       ? 'selected' : ''}>Season: All</option>
            <option value="Halloween" ${currentSeason === 'Halloween' ? 'selected' : ''}>Season: Halloween</option>
            <option value="Christmas" ${currentSeason === 'Christmas' ? 'selected' : ''}>Season: Christmas</option>
            <option value="Shared"    ${currentSeason === 'Shared'    ? 'selected' : ''}>Season: Shared</option>
          </select>
        </div>
      </div>
    </div>
  `;

  document.getElementById('unpacked-season-filter').addEventListener('change', (e) => {
    currentSeason = e.target.value;
    applySeasonAndRender();
  });
}

function applySeasonAndRender() {
  const filtered = currentSeason === 'All'
    ? allItems
    : allItems.filter(item => item.season === currentSeason);

  renderList(filtered);
}

function renderList(items) {
  const listContainer = document.getElementById('list-container');
  const countEl = document.getElementById('item-count');

  if (countEl) {
    countEl.textContent = `${items.length} ${items.length === 1 ? 'item' : 'items'} unpacked`;
  }

  if (!listContainer) return;

  if (items.length === 0) {
    const seasonLabel = currentSeason === 'All' ? 'all seasons' : currentSeason;
    listContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">✓</div>
        <h3>All packed</h3>
        <p>No unpacked items for ${seasonLabel}.</p>
      </div>
    `;
    return;
  }

  listContainer.innerHTML = `
    <div class="unpacked-list">
      ${items.map(item => renderRow(item)).join('')}
    </div>
  `;
}

function renderRow(item) {
  const sd = item.storage_data || {};
  const toteId = sd.tote_id || null;
  const classType = item.class_type || item.class || '—';
  const season = item.season || '—';

  const toteCell = toteId
    ? `<span class="unpacked-tote">Tote: ${toteId}</span>`
    : `<span class="unpacked-tote unpacked-tote--none">No tote assigned</span>`;

  const itemLink = `<a class="unpacked-link" href="${itemsAdminUrl}/${item.id}">View item →</a>`;
  const toteLink = toteId && storageAdminUrl
    ? `<a class="unpacked-link" href="${storageAdminUrl}/storage/${toteId}">View tote →</a>`
    : '';

  return `
    <div class="unpacked-row">
      <div class="unpacked-row__name">
        <span class="unpacked-name">${item.short_name || 'Unnamed'}</span>
        <span class="unpacked-meta">${classType} · <span class="badge badge-${season.toLowerCase()}">${season}</span></span>
      </div>
      <div class="unpacked-row__tote">${toteCell}</div>
      <div class="unpacked-row__actions">
        ${itemLink}
        ${toteLink}
      </div>
    </div>
  `;
}
