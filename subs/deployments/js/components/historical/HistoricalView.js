/**
 * HistoricalView.js
 * Rendering component for the historical deployments page.
 * Handles: sidebar list, empty state, detail panel, zone sections, item cards.
 */

// ─── Class placeholder icons ──────────────────────────────────────────────

const CLASS_ICONS = {
  'Decoration': '🎃',
  'Light': '💡',
  'Accessory': '🔌',
  'Storage': '📦'
};

// ─── Breadcrumb ───────────────────────────────────────────────────────────

function renderBreadcrumb(current) {
  return `
    <div class="breadcrumbs">
      <a href="#" class="breadcrumb-link" data-path="/deployments">Deployments</a>
      <span class="breadcrumb-separator">›</span>
      <span class="breadcrumb-current">${current}</span>
    </div>
  `;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function formatDate(iso) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
  } catch {
    return null;
  }
}

function formatMinutes(mins) {
  if (!mins && mins !== 0) return '—';
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function seasonLabel(season, year) {
  return `${season || '—'} ${year || ''}`.trim();
}

// ─── Sidebar ──────────────────────────────────────────────────────────────

export function renderSidebar(deployments, selectedId) {
  if (!deployments || deployments.length === 0) {
    return `
      <div class="historical-sidebar-header">
        <h2>Deployment IDs</h2>
      </div>
      <div class="historical-sidebar-empty">No archived deployments yet.</div>
    `;
  }

  const items = deployments.map(d => {
    const isActive = d.deployment_id === selectedId;
    const totalItems = d.statistics?.total_items ?? '—';
    const label = seasonLabel(d.season, d.year);
    return `
      <div
        class="historical-deployment-item${isActive ? ' active' : ''}"
        data-id="${d.deployment_id}"
        role="button"
        tabindex="0"
        aria-label="${d.deployment_id}"
      >
        <span class="dep-id">${d.deployment_id}</span>
        <span class="dep-meta">${label} · ${totalItems} items</span>
      </div>
    `;
  }).join('');

  return `
    <div class="historical-sidebar-header">
      <h2>Deployment IDs</h2>
    </div>
    <div class="historical-deployment-list" id="deployment-list">
      ${items}
    </div>
  `;
}

// ─── Empty State ──────────────────────────────────────────────────────────

export function renderEmptyState() {
  return `
    ${renderBreadcrumb('Historical')}
    <div class="historical-empty-state">
      <div class="empty-icon">📋</div>
      <p>Select a deployment from the list to view details</p>
    </div>
  `;
}

// ─── Loading / Error ──────────────────────────────────────────────────────

export function renderLoading() {
  return `<div class="historical-loading">⏳ Loading deployment...</div>`;
}

export function renderError(message) {
  return `<div class="historical-error">⚠️ ${message || 'Failed to load deployment.'}</div>`;
}

// ─── Stats Cards ──────────────────────────────────────────────────────────

function renderStatsGrid(stats) {
  const totalItems = stats?.total_items ?? '—';
  const totalSessions = stats?.total_sessions ?? '—';
  const totalMinutes = stats?.total_setup_minutes != null
    ? formatMinutes(stats.total_setup_minutes) : '—';
  const totalZones = stats?.total_zones ?? 3;

  return `
    <div class="historical-stats-grid">
      <div class="historical-stat-card">
        <span class="stat-label">Total Items</span>
        <span class="stat-value">${totalItems}</span>
      </div>
      <div class="historical-stat-card">
        <span class="stat-label">Sessions</span>
        <span class="stat-value">${totalSessions}</span>
      </div>
      <div class="historical-stat-card">
        <span class="stat-label">Setup Time</span>
        <span class="stat-value">${totalMinutes}</span>
      </div>
      <div class="historical-stat-card">
        <span class="stat-label">Zones</span>
        <span class="stat-value">${totalZones}</span>
      </div>
    </div>
  `;
}

// ─── Breakdowns ───────────────────────────────────────────────────────────

function renderBreakdownCard(title, data) {
  if (!data || Object.keys(data).length === 0) {
    return `
      <div class="historical-breakdown-card">
        <h3>${title}</h3>
        <div class="breakdown-empty">No data available</div>
      </div>
    `;
  }

  const rows = Object.entries(data)
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => `
      <div class="breakdown-row">
        <span class="breakdown-label">${label}</span>
        <span class="breakdown-count">${count}</span>
      </div>
    `).join('');

  return `
    <div class="historical-breakdown-card">
      <h3>${title}</h3>
      ${rows}
    </div>
  `;
}

// ─── Date Row ─────────────────────────────────────────────────────────────

function renderDatesRow(metadata) {
  const dates = [
    { label: 'Setup Started', value: formatDate(metadata.setup_started_at) },
    { label: 'Setup Completed', value: formatDate(metadata.setup_completed_at) },
    { label: 'Teardown Completed', value: formatDate(metadata.teardown_completed_at) }
  ];

  return `
    <div class="historical-dates-row">
      ${dates.map(d => `
        <div class="historical-date-card">
          <div class="date-label">${d.label}</div>
          <div class="date-value${d.value ? '' : ' empty'}">${d.value || 'Not recorded'}</div>
        </div>
      `).join('')}
    </div>
  `;
}

// ─── Zone Items ───────────────────────────────────────────────────────────

function renderItemThumb(item) {
  const primaryId = item.images?.primary_photo_id;
  if (primaryId && primaryId !== 'null') {
    // Thumbnail will be resolved by orchestrator and injected via data attribute
    return `
      <div class="historical-item-thumb" data-photo-id="${primaryId}">
        ${CLASS_ICONS[item.class] || '📦'}
      </div>
    `;
  }
  return `
    <div class="historical-item-thumb">
      ${CLASS_ICONS[item.class] || '📦'}
    </div>
  `;
}

function renderZoneItems(items) {
  if (!items || items.length === 0) {
    return '<div class="breakdown-empty" style="padding:1rem">No items recorded</div>';
  }

  // Group by class
  const groups = {};
  items.forEach(item => {
    const cls = item.class || 'Unknown';
    if (!groups[cls]) groups[cls] = [];
    groups[cls].push(item);
  });

  const classOrder = ['Decoration', 'Light', 'Accessory'];
  const orderedKeys = [
    ...classOrder.filter(k => groups[k]),
    ...Object.keys(groups).filter(k => !classOrder.includes(k))
  ];

  return orderedKeys.map(cls => {
    const clsItems = groups[cls];
    const cards = clsItems.map(item => `
      <div class="historical-item-card" data-item-id="${item.id}">
        ${renderItemThumb(item)}
        <span class="historical-item-name">${item.short_name || item.id}</span>
        <span class="historical-item-type">${item.class_type || item.class || '—'}</span>
        <span class="historical-item-id">${item.id}</span>
      </div>
    `).join('');

    return `
      <div class="historical-class-group">
        <div class="historical-class-label">${cls}</div>
        ${cards}
      </div>
    `;
  }).join('');
}

// ─── Zone Section ─────────────────────────────────────────────────────────

function renderZoneSection(zone) {
  const { zone_code, zone_name, item_count, items } = zone;
  return `
    <div class="historical-zone-section" data-zone="${zone_code}">
      <div class="historical-zone-header">
        <h3>
          <span class="zone-code-badge">${zone_code}</span>
          ${zone_name}
        </h3>
        <div style="display:flex;align-items:center;gap:0.75rem">
          <span class="zone-count">${item_count ?? 0} items</span>
          <span class="zone-chevron">▾</span>
        </div>
      </div>
      <div class="historical-zone-items">
        ${renderZoneItems(items)}
      </div>
    </div>
  `;
}

// ─── Full Detail Panel ────────────────────────────────────────────────────

export function renderDetail(data) {
  const { metadata, zones } = data;
  const stats = metadata.statistics || {};
  const label = seasonLabel(metadata.season, metadata.year);
  const hasNotes = metadata.notes && metadata.notes.trim();

  const zoneOrder = ['FY', 'BY', 'SY'];
  const zoneSections = zoneOrder
    .filter(code => zones[code])
    .map(code => renderZoneSection(zones[code]))
    .join('');

  return `
    <button class="mobile-back-btn" id="mobile-back-btn">← All Deployments</button>

    ${renderBreadcrumb('Historical')}

    <div class="historical-detail-header">
      <div>
        <h1>${metadata.deployment_id}</h1>
        <div class="dep-subtitle">${label}</div>
      </div>
      <span class="historical-status-badge archived">Archived</span>
    </div>

    ${renderStatsGrid(stats)}

    <div class="historical-breakdowns">
      ${renderBreakdownCard('By Class', stats.by_class)}
      ${renderBreakdownCard('By Type', stats.by_class_type)}
    </div>

    ${renderDatesRow(metadata)}

    ${hasNotes ? `
      <div class="historical-notes">
        <div class="historical-notes-label">Notes</div>
        ${metadata.notes}
      </div>
    ` : ''}

    <div class="historical-zones-header">Items by Zone</div>
    ${zoneSections}
  `;
}