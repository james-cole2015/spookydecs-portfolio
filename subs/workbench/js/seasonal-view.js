// Seasonal Monitor View — read-only 3-column layout by decoration season

import { getSeasonalSummary } from './api.js';
import { spinner } from './spinner.js';
import { toast } from './toast.js';

const CONTAINER_ID = 'app-container';

const SEASONS = [
  { key: 'halloween', label: 'Halloween' },
  { key: 'christmas', label: 'Christmas' },
  { key: 'shared',    label: 'Shared' },
];

const SECTIONS = [
  { key: 'ideas',             label: 'Ideas' },
  { key: 'inspections',       label: 'Inspections' },
  { key: 'repairs',           label: 'Repairs' },
  { key: 'maintenance_tasks', label: 'Maintenance Tasks' },
];

// ── Link helpers ──────────────────────────────────────────────────────────────

function ideaLink(ideaId) {
  return `https://ideas.spookydecs.com/#/idea/${ideaId}`;
}

function maintenanceLink() {
  return 'https://admin.spookydecs.com/#/maintenance';
}

// ── Card renderers ────────────────────────────────────────────────────────────

function renderIdeaCard(idea) {
  const desc = idea.description
    ? `<p class="card-description">${idea.description.substring(0, 100)}${idea.description.length > 100 ? '…' : ''}</p>`
    : '';

  return `
    <a class="seasonal-card" href="${ideaLink(idea.idea_id)}" target="_blank" rel="noopener">
      <div class="card-header">
        <span class="card-title">${escapeHtml(idea.title)}</span>
        <span class="badge badge-status badge-status--${idea.status.toLowerCase()}">${idea.status}</span>
      </div>
      ${desc}
    </a>`;
}

function renderMaintenanceCard(record) {
  const dateLabel = record.date_scheduled
    ? `<span class="card-meta-item">Scheduled: ${record.date_scheduled}</span>`
    : '';
  const critLabel = record.criticality
    ? `<span class="badge badge-criticality badge-criticality--${record.criticality}">${record.criticality}</span>`
    : '';

  return `
    <a class="seasonal-card" href="${maintenanceLink()}" target="_blank" rel="noopener">
      <div class="card-header">
        <span class="card-title">${escapeHtml(record.title || 'Untitled')}</span>
        <span class="badge badge-status badge-status--${record.status.replace('_', '-')}">${record.status}</span>
      </div>
      <div class="card-meta">
        ${dateLabel}
        ${critLabel}
      </div>
    </a>`;
}

// ── Section + column renderers ────────────────────────────────────────────────

function renderSection(sectionDef, items, seasonKey) {
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

function renderColumn(seasonDef, buckets) {
  const bucket = buckets[seasonDef.key] || {};
  const totalCount = SECTIONS.reduce((sum, s) => sum + (bucket[s.key] || []).length, 0);
  const emptyNotice = totalCount === 0
    ? '<p class="column-empty">No active work this season</p>'
    : '';

  const sections = SECTIONS
    .map(s => renderSection(s, bucket[s.key] || [], seasonDef.key))
    .join('');

  return `
    <div class="season-column season-column--${seasonDef.key}">
      <div class="column-header">
        <h2 class="column-title">${seasonDef.label}</h2>
        ${totalCount > 0 ? `<span class="column-count">${totalCount}</span>` : ''}
      </div>
      ${emptyNotice || sections}
    </div>`;
}

function renderView(summary) {
  const columns = SEASONS.map(s => renderColumn(s, summary)).join('');
  return `
    <div class="seasonal-monitor">
      <div class="monitor-columns">${columns}</div>
    </div>`;
}

// ── Entry point ───────────────────────────────────────────────────────────────

export async function renderSeasonalView() {
  const container = document.getElementById(CONTAINER_ID);
  if (!container) return;

  spinner.show('Loading seasonal summary…');

  try {
    const summary = await getSeasonalSummary();
    container.innerHTML = renderView(summary);
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
