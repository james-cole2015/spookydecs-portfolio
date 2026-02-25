// Items Page — card list of all decoration/light/accessory items with maintenance summaries

import { fetchAllItems, fetchAllRecords } from '../api.js';
import { navigateTo } from '../router.js';

const SEASON_ICONS = {
  Halloween: '🎃',
  Christmas: '🎄',
};

const ALLOWED_CLASSES = new Set(['Decoration', 'Light', 'Accessory']);

const CLASS_TYPES = ['Inflatable', 'Animatronic', 'Static Prop', 'Spot Light', 'String Light', 'Cord', 'Plug'];

export async function renderItemsPage(container) {
  container.innerHTML = `<div class="items-page-loading">Loading items...</div>`;

  const [allItems, { records }] = await Promise.all([
    fetchAllItems(),
    fetchAllRecords()
  ]);

  const items = allItems.filter(item => ALLOWED_CLASSES.has(item.class));

  // Group records by item_id
  const recordsByItem = new Map();
  for (const record of records) {
    if (!recordsByItem.has(record.item_id)) {
      recordsByItem.set(record.item_id, []);
    }
    recordsByItem.get(record.item_id).push(record);
  }

  // Sort alphabetically by short_name
  const sorted = [...items].sort((a, b) =>
    (a.short_name || a.id).localeCompare(b.short_name || b.id)
  );

  container.innerHTML = `
    <div class="items-page">
      <div class="page-header">
        <h1>Items</h1>
        <p>All items with their maintenance history. Click an item to view records.</p>
      </div>
      <div class="items-filters"></div>
      <div class="items-grid"></div>
    </div>
  `;

  const activeClasses = new Set();
  const activeClassTypes = new Set();
  const filtersEl = container.querySelector('.items-filters');
  const gridEl = container.querySelector('.items-grid');

  function refresh() {
    updateFilterButtons(filtersEl, activeClasses, activeClassTypes);
    renderGrid(gridEl, applyFilters(sorted, activeClasses, activeClassTypes), recordsByItem);
  }

  function onToggle(filterType, value) {
    const set = filterType === 'class' ? activeClasses : activeClassTypes;
    if (set.has(value)) { set.delete(value); } else { set.add(value); }
    refresh();
  }

  function onClear() {
    activeClasses.clear();
    activeClassTypes.clear();
    refresh();
  }

  renderFilters(filtersEl, onToggle, onClear);
  renderGrid(gridEl, sorted, recordsByItem);

  gridEl.addEventListener('click', e => {
    const card = e.target.closest('.item-card');
    if (card) navigateTo('/' + card.dataset.itemId);
  });
}

function renderFilters(filtersEl, onToggle, onClear) {
  filtersEl.innerHTML = `
    <div class="filter-group">
      <span class="filter-group-label">Class</span>
      <div class="filter-btn-group">
        ${['Decoration', 'Light', 'Accessory'].map(v =>
          `<button class="filter-btn" data-filter="class" data-value="${v}">${v}</button>`
        ).join('')}
      </div>
    </div>
    <div class="filter-group">
      <span class="filter-group-label">Class Type</span>
      <div class="filter-btn-group">
        ${CLASS_TYPES.map(v =>
          `<button class="filter-btn" data-filter="class_type" data-value="${v}">${v}</button>`
        ).join('')}
      </div>
    </div>
    <button class="filter-clear-btn" hidden>Clear</button>
  `;

  filtersEl.addEventListener('click', e => {
    if (e.target.closest('.filter-clear-btn')) { onClear(); return; }
    const btn = e.target.closest('.filter-btn');
    if (btn) onToggle(btn.dataset.filter, btn.dataset.value);
  });
}

function updateFilterButtons(filtersEl, activeClasses, activeClassTypes) {
  filtersEl.querySelectorAll('.filter-btn').forEach(btn => {
    const set = btn.dataset.filter === 'class' ? activeClasses : activeClassTypes;
    btn.classList.toggle('active', set.has(btn.dataset.value));
  });
  const hasActive = activeClasses.size > 0 || activeClassTypes.size > 0;
  filtersEl.querySelector('.filter-clear-btn').hidden = !hasActive;
}

function applyFilters(items, activeClasses, activeClassTypes) {
  return items.filter(item => {
    const classOk = activeClasses.size === 0 || activeClasses.has(item.class);
    const typeOk = activeClassTypes.size === 0 || activeClassTypes.has(item.class_type);
    return classOk && typeOk;
  });
}

function renderGrid(gridEl, items, recordsByItem) {
  gridEl.innerHTML = items.length
    ? items.map(item => renderItemCard(item, buildSummary(recordsByItem.get(item.id) || []))).join('')
    : `<div class="items-empty">No items match the selected filters.</div>`;
}

function buildSummary(records) {
  const totalRecords = records.length;
  const openRecords = records.filter(
    r => r.status === 'scheduled' || r.status === 'in_progress'
  ).length;
  const lastRecord = records.length
    ? records.reduce((latest, r) =>
        new Date(r.created_at) > new Date(latest.created_at) ? r : latest
      )
    : null;
  return { totalRecords, openRecords, lastRecordDate: lastRecord?.created_at || null };
}

function renderItemCard(item, summary) {
  const icon = SEASON_ICONS[item.season] || '🏷️';
  const { totalRecords, openRecords, lastRecordDate } = summary;

  const statsHtml = totalRecords > 0
    ? `${totalRecords} record${totalRecords !== 1 ? 's' : ''} &middot; Last: ${formatDate(lastRecordDate)}`
    : 'No records yet';

  const badgeHtml = openRecords > 0
    ? `<span class="item-card-open-badge">${openRecords} open</span>`
    : '';

  return `
    <div class="item-card" data-item-id="${item.id}">
      <div class="item-card-icon">${icon}</div>
      <div class="item-card-body">
        <div class="item-card-name">${item.short_name || item.id}</div>
        <div class="item-card-meta">${item.season || ''}${item.season && item.class_type ? ' &middot; ' : ''}${item.class_type || ''}</div>
        <div class="item-card-stats">${statsHtml}</div>
        ${badgeHtml}
      </div>
    </div>
  `;
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}
