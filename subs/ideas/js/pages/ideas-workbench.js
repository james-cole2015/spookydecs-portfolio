// Ideas Workbench — Active Builds View

import { listIdeas } from '../utils/ideas-api.js';
import { navigateTo } from '../utils/router.js';
import { showToast } from '../shared/toast.js';

export async function renderIdeasWorkbench(container) {
  container.innerHTML = `
    <div class="workbench-page">
      <div class="workbench-header">
        <button class="btn-back" id="wb-back-btn" aria-label="Back to landing">&#8592; Back</button>
        <div>
          <h1 class="workbench-title">Active Builds</h1>
          <p class="workbench-subtitle">Ideas currently in the build pipeline.</p>
        </div>
      </div>
      <div id="wb-grid" class="workbench-grid">
        <div class="empty-state">
          <div class="loading-spinner" style="margin:0 auto"></div>
        </div>
      </div>
    </div>
  `;

  container.querySelector('#wb-back-btn').addEventListener('click', () => navigateTo('/'));

  let ideas;
  try {
    const all = await listIdeas();
    ideas = all.filter(i => i.status === 'Workbench');
  } catch (err) {
    showToast('Failed to load builds', 'error');
    container.querySelector('#wb-grid').innerHTML = `
      <div class="error-container">
        <div class="error-content">
          <h2>Failed to load</h2>
          <p>${_escHtml(err.message)}</p>
          <button class="btn btn-secondary" onclick="window.location.reload()">Retry</button>
        </div>
      </div>
    `;
    return;
  }

  _renderGrid(container.querySelector('#wb-grid'), ideas);
}

function _renderGrid(grid, ideas) {
  if (!ideas.length) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-state-icon">🔨</div>
        <div class="empty-state-title">No active builds</div>
        <div class="empty-state-desc">Move an idea to the workbench to start tracking its build.</div>
      </div>
    `;
    return;
  }

  grid.innerHTML = ideas.map(idea => _renderBuildCard(idea)).join('');

  grid.querySelectorAll('.wb-card').forEach(card => {
    card.addEventListener('click', () => navigateTo(`/workbench/${card.dataset.id}`));
  });
}

function _renderBuildCard(idea) {
  const seasonKey = (idea.season || '').toLowerCase();

  // Progress indicator: derive from which timeline fields are filled
  const stages = [
    { key: 'prep_start',     label: 'Prep' },
    { key: 'build_start',    label: 'Build' },
    { key: 'build_complete', label: 'Complete' },
  ];
  const lastFilledIdx = stages.reduce((acc, s, i) => idea[s.key] ? i : acc, -1);

  const progressHtml = `
    <div class="wb-progress">
      <div class="wb-progress-label">Progress</div>
      <div class="wb-progress-stages">
        <div class="wb-stage${lastFilledIdx >= -1 ? ' active' : ''}">Idea</div>
        ${stages.map((s, i) => `
          <div class="wb-stage-connector"></div>
          <div class="wb-stage${i <= lastFilledIdx ? ' active' : ''}">${s.label}</div>
        `).join('')}
      </div>
    </div>
  `;

  const costHtml = idea.estimated_cost != null
    ? `<div class="wb-meta-item"><span class="wb-meta-label">Est. Cost</span> $${parseFloat(idea.estimated_cost).toFixed(2)}</div>`
    : '';

  const prepHtml = idea.prep_start
    ? `<div class="wb-meta-item"><span class="wb-meta-label">Prep Start</span> ${_formatDate(idea.prep_start)}</div>`
    : '';

  const buildHtml = idea.build_start
    ? `<div class="wb-meta-item"><span class="wb-meta-label">Build Start</span> ${_formatDate(idea.build_start)}</div>`
    : '';

  const materialsCount = (idea.materials || []).length;
  const materialsHtml = materialsCount > 0
    ? `<div class="wb-meta-item"><span class="wb-meta-label">Materials</span> ${materialsCount} item${materialsCount !== 1 ? 's' : ''}</div>`
    : '';

  return `
    <div class="wb-card" data-id="${_escAttr(idea.id)}" tabindex="0" role="button" aria-label="${_escAttr(idea.title)}">
      <div class="wb-card-header">
        <span class="badge badge-season-${seasonKey}">${idea.season}</span>
        <h3 class="wb-card-title">${_escHtml(idea.title)}</h3>
      </div>
      ${progressHtml}
      <div class="wb-meta">
        ${costHtml}${prepHtml}${buildHtml}${materialsHtml}
      </div>
      ${idea.description ? `<div class="wb-card-desc">${_escHtml(idea.description)}</div>` : ''}
    </div>
  `;
}

function _formatDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso + (iso.length === 10 ? 'T00:00:00' : '')).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  } catch { return iso; }
}

function _escHtml(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function _escAttr(str) {
  return (str || '').replace(/"/g, '&quot;');
}
