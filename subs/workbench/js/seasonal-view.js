// Seasonal Monitor View — read-only 3-column layout by work bucket

import { getSeasonalSummary } from './api.js';
import { spinner } from './spinner.js';
import { toast } from './toast.js';
import { modal } from './modal.js';

const CONTAINER_ID = 'app-container';

const CURRENT_YEAR = new Date().getFullYear();

// Available years: current year ± 1
function getAvailableYears() {
  const years = [];
  for (let y = CURRENT_YEAR - 1; y <= CURRENT_YEAR + 1; y++) years.push(y);
  return years;
}

function getDefaultSeason(summary, buckets) {
  // Prefer the first bucket that has active work; fall back to month-based default
  const active = buckets.find(b => {
    const bucket = summary[b.key] || {};
    return SECTIONS.some(s => (bucket[s.key] || []).length > 0);
  });
  if (active) return active.key;
  const month = new Date().getMonth();
  return (month === 9 || month === 10) ? 'halloween'
       : (month === 11 || month === 0) ? 'christmas'
       : 'off_season';
}

function getBuckets(year) {
  return [
    { key: 'off_season', label: `${year} Off-Season`, colorClass: 'off-season' },
    { key: 'halloween',  label: `${year} Halloween`,  colorClass: 'halloween'  },
    { key: 'christmas',  label: `${year} Christmas`,  colorClass: 'christmas'  },
  ];
}

const SECTIONS = [
  { key: 'ideas',             label: 'Ideas' },
  { key: 'inspections',       label: 'Inspections' },
  { key: 'repairs',           label: 'Repairs' },
  { key: 'maintenance_tasks', label: 'Maintenance Tasks' },
];

// ── Formatters ────────────────────────────────────────────────────────────────

function formatStatus(status) {
  return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ── Link helpers ──────────────────────────────────────────────────────────────

function ideaLink(ideaId) {
  return `${_ideasAdminUrl}/${ideaId}`;
}

function maintenanceLink(itemId, recordId) {
  return `${_maintUrl}/${itemId}/${recordId}`;
}

// ── Card renderers ────────────────────────────────────────────────────────────

function renderIdeaCard(idea) {
  const desc = idea.description
    ? `<p class="card-description">${idea.description.substring(0, 100)}${idea.description.length > 100 ? '…' : ''}</p>`
    : '';

  return `
    <div class="seasonal-card"
      data-type="idea"
      data-href="${ideaLink(idea.idea_id)}"
      data-title="${escapeAttr(idea.title)}"
      data-status="${escapeAttr(idea.status)}"
      data-description="${encodeURIComponent(idea.description || '')}"
      data-link="${escapeAttr(idea.link || '')}"
      data-notes="${encodeURIComponent(idea.notes || '')}">
      <div class="card-header">
        <span class="card-title">${escapeHtml(idea.title)}</span>
        <span class="badge badge-status badge-status--${idea.status.toLowerCase()}">${idea.status}</span>
      </div>
      ${desc}
    </div>`;
}

function renderMaintenanceCard(record) {
  const dateLabel = record.date_scheduled
    ? `<span class="card-meta-item">Scheduled: ${record.date_scheduled}</span>`
    : '';
  const critLabel = record.criticality
    ? `<span class="badge badge-criticality badge-criticality--${record.criticality}">${formatStatus(record.criticality)}</span>`
    : '';

  return `
    <div class="seasonal-card"
      data-type="maintenance"
      data-href="${maintenanceLink(record.item_id, record.record_id)}"
      data-title="${escapeAttr(record.title || 'Untitled')}"
      data-status="${escapeAttr(record.status)}"
      data-scheduled="${escapeAttr(record.date_scheduled || '')}"
      data-criticality="${escapeAttr(record.criticality || '')}"
      data-description="${encodeURIComponent(record.description || '')}">
      <div class="card-header">
        <span class="card-title">${escapeHtml(record.title || 'Untitled')}</span>
        <span class="badge badge-status badge-status--${record.status.replace('_', '-')}">${formatStatus(record.status)}</span>
      </div>
      <div class="card-meta">
        ${dateLabel}
        ${critLabel}
      </div>
    </div>`;
}

// ── Section + column renderers ────────────────────────────────────────────────

function renderSection(sectionDef, items) {
  const isIdea = sectionDef.key === 'ideas';
  const cards = items.length
    ? items.map(item => isIdea ? renderIdeaCard(item) : renderMaintenanceCard(item)).join('')
    : '<p class="empty-state">None</p>';

  return `
    <div class="season-section">
      <h3 class="section-label">${sectionDef.label}</h3>
      <div class="section-cards">${cards}</div>
    </div>`;
}

function renderCompletedDisclosure(completed) {
  const allItems = [
    ...(completed.ideas || []).map(i => ({ ...i, _type: 'idea' })),
    ...(completed.inspections || []).map(r => ({ ...r, _type: 'maintenance' })),
    ...(completed.repairs || []).map(r => ({ ...r, _type: 'maintenance' })),
    ...(completed.maintenance_tasks || []).map(r => ({ ...r, _type: 'maintenance' })),
  ];
  if (!allItems.length) return '';
  const cards = allItems.map(item =>
    item._type === 'idea' ? renderIdeaCard(item) : renderMaintenanceCard(item)
  ).join('');
  return `
    <div class="completed-disclosure">
      <button class="completed-disclosure__toggle" type="button">
        <span class="completed-disclosure__label">${allItems.length} completed</span>
        <span class="completed-disclosure__chevron">▶</span>
      </button>
      <div class="completed-disclosure__content">${cards}</div>
    </div>`;
}

function renderColumn(bucketDef, summary, defaultSeason) {
  const bucket = summary[bucketDef.key] || {};
  const totalCount = SECTIONS.reduce((sum, s) => sum + (bucket[s.key] || []).length, 0);
  const emptyNotice = totalCount === 0
    ? '<p class="column-empty">No active work this period</p>'
    : '';

  const sections = SECTIONS
    .map(s => renderSection(s, bucket[s.key] || []))
    .join('');

  return `
    <div class="season-column season-column--${bucketDef.colorClass}${bucketDef.key === defaultSeason ? ' tab-active' : ''}" data-season="${bucketDef.key}">
      <div class="column-header">
        <h2 class="column-title">${bucketDef.label}</h2>
        ${totalCount > 0 ? `<span class="column-count">${totalCount}</span>` : ''}
      </div>
      ${emptyNotice || sections}
      ${renderCompletedDisclosure(bucket.completed || {})}
    </div>`;
}

function renderYearSelector(activePillYear) {
  const pills = getAvailableYears()
    .map(y => `<button class="year-pill${y === activePillYear ? ' year-pill--active' : ''}" data-year="${y}">${y}</button>`)
    .join('');
  return `
    <div class="year-selector">
      <span class="year-selector__label">Year</span>
      ${pills}
      <button class="year-pill year-pill--clear${activePillYear === null ? ' hidden' : ''}" data-year="clear">Clear</button>
    </div>`;
}

function renderSeasonTabs(buckets, defaultSeason) {
  return `<div class="season-tabs">
    ${buckets.map(b => `<button class="season-tab season-tab--${b.colorClass}${b.key === defaultSeason ? ' season-tab--active' : ''}" data-season="${b.key}">${b.label.split(' ').slice(1).join(' ')}</button>`).join('')}
  </div>`;
}

function renderView(summary, year, activePillYear) {
  const buckets = getBuckets(year);
  const defaultSeason = getDefaultSeason(summary, buckets);
  const columns = buckets.map(b => renderColumn(b, summary, defaultSeason)).join('');
  return `
    <div class="seasonal-monitor">
      ${renderYearSelector(activePillYear)}
      ${renderSeasonTabs(buckets, defaultSeason)}
      <div class="monitor-columns">${columns}</div>
    </div>`;
}

// ── Card preview modal ────────────────────────────────────────────────────────

function buildPreviewHtml(el) {
  const type = el.dataset.type;
  const status = el.dataset.status || '';
  const statusClass = type === 'idea'
    ? `badge-status--${status.toLowerCase()}`
    : `badge-status--${status.replace('_', '-')}`;

  const rows = [];

  rows.push(`<div style="margin-bottom:12px;">
    <span class="badge badge-status ${statusClass}">${escapeHtml(formatStatus(status))}</span>
  </div>`);

  if (type === 'idea') {
    const description = decodeURIComponent(el.dataset.description || '');
    const link = el.dataset.link || '';
    const notes = decodeURIComponent(el.dataset.notes || '');

    if (description) {
      rows.push(`<div style="margin-bottom:10px;">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#64748b;margin-bottom:4px;">Description</div>
        <div style="font-size:13px;color:#334155;line-height:1.5;">${escapeHtml(description)}</div>
      </div>`);
    }
    if (link) {
      rows.push(`<div style="margin-bottom:10px;">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#64748b;margin-bottom:4px;">Link</div>
        <a href="${escapeAttr(link)}" target="_blank" rel="noopener" style="font-size:13px;color:#3b82f6;word-break:break-all;">${escapeHtml(link)}</a>
      </div>`);
    }
    if (notes) {
      rows.push(`<div style="margin-bottom:10px;">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#64748b;margin-bottom:4px;">Notes</div>
        <div style="font-size:13px;color:#334155;line-height:1.5;white-space:pre-wrap;">${escapeHtml(notes)}</div>
      </div>`);
    }
  } else {
    const scheduled = el.dataset.scheduled || '';
    const criticality = el.dataset.criticality || '';
    const description = decodeURIComponent(el.dataset.description || '');

    if (scheduled) {
      rows.push(`<div style="margin-bottom:10px;">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#64748b;margin-bottom:4px;">Scheduled</div>
        <div style="font-size:13px;color:#334155;">${escapeHtml(scheduled)}</div>
      </div>`);
    }
    if (criticality) {
      rows.push(`<div style="margin-bottom:10px;">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#64748b;margin-bottom:4px;">Criticality</div>
        <span class="badge badge-criticality badge-criticality--${escapeAttr(criticality)}">${escapeHtml(formatStatus(criticality))}</span>
      </div>`);
    }
    if (description) {
      rows.push(`<div style="margin-bottom:10px;">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#64748b;margin-bottom:4px;">Notes</div>
        <div style="font-size:13px;color:#334155;line-height:1.5;white-space:pre-wrap;">${escapeHtml(description)}</div>
      </div>`);
    }
  }

  return rows.join('');
}

function showCardPreview(el) {
  modal.show({
    title: escapeHtml(el.dataset.title || ''),
    message: buildPreviewHtml(el),
    confirmText: 'View Record ↗',
    cancelText: 'Close',
    onConfirm: () => window.open(el.dataset.href, '_blank', 'noopener'),
  });
}

function attachCardListeners(container) {
  container.querySelectorAll('.seasonal-card').forEach(card => {
    card.addEventListener('click', () => showCardPreview(card));
  });

  container.querySelectorAll('.completed-disclosure__toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const content = btn.nextElementSibling;
      const isOpen = content.classList.toggle('is-open');
      btn.querySelector('.completed-disclosure__chevron').textContent = isOpen ? '▼' : '▶';
    });
  });
}

function attachTabListeners(container) {
  const tabs = container.querySelectorAll('.season-tab');
  const columns = container.querySelectorAll('.season-column');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const season = tab.dataset.season;
      tabs.forEach(t => t.classList.toggle('season-tab--active', t === tab));
      columns.forEach(c => c.classList.toggle('tab-active', c.dataset.season === season));
    });
  });
}

// ── Entry point ───────────────────────────────────────────────────────────────

let _currentYear = CURRENT_YEAR;
let _ideasAdminUrl = '';
let _maintUrl = '';

export async function renderSeasonalView(year = CURRENT_YEAR) {
  const fetchYear = year ?? CURRENT_YEAR;
  _currentYear = fetchYear;
  const container = document.getElementById(CONTAINER_ID);
  if (!container) return;

  spinner.show('Loading seasonal summary…');

  try {
    const [summary, config] = await Promise.all([
      getSeasonalSummary(fetchYear),
      window.SpookyConfig.get(),
    ]);
    _ideasAdminUrl = config.IDEAS_ADMIN_URL || '';
    _maintUrl = config.MAINT_URL || '';
    container.innerHTML = renderView(summary, fetchYear, year);

    // Wire up year pills
    container.querySelectorAll('.year-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        const val = btn.dataset.year;
        renderSeasonalView(val === 'clear' ? null : parseInt(val, 10));
      });
    });

    attachCardListeners(container);
    attachTabListeners(container);
  } catch (err) {
    console.error('Failed to load seasonal summary:', err);
    toast.error('Failed to load seasonal summary. Please refresh.');
    container.innerHTML = '<p class="error-state">Could not load data. Please try again.</p>';
  } finally {
    spinner.hide();
  }
}

// ── Utility ───────────────────────────────────────────────────────────────────

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
