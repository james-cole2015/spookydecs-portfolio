// StagingView.js
// Main staging area view component

import { navigate } from '../../utils/router.js';

export class StagingView {
  constructor({ deployment, totes, deploymentId, onStage }) {
    this.deployment = deployment;
    this.totes = totes;
    this.deploymentId = deploymentId;
    this.onStage = onStage;
    this.stagedToteIds = new Set();
    this.expandedToteIds = new Set();
    this.container = null;
  }

  render() {
    this.container = document.createElement('div');
    this.container.className = 'staging-page';
    this.container.innerHTML = this._buildHTML();
    this._attachListeners();
    return this.container;
  }

  _buildSeasonLabel() {
    const season = this.deployment?.season || '';
    const year = this.deployment?.year || '';
    return `${season} ${year}`.trim();
  }

  _buildHTML() {
    return `
      ${this._buildBreadcrumb()}
      <div class="staging-header">
        <h1 class="staging-title">Staging Area</h1>
        <p class="staging-subtitle">Select totes to stage for this deployment</p>
      </div>
      <div class="staging-error-banner" id="staging-error-banner" style="display:none;"></div>
      <div class="staging-totes" id="staging-totes">
        ${this._buildToteCards()}
      </div>
    `;
  }

  _buildBreadcrumb() {
    const label = this._buildSeasonLabel();
    return `
      <nav class="staging-breadcrumb">
        <button class="breadcrumb-link" data-nav="/deployments">Deployments</button>
        <span class="breadcrumb-sep">›</span>
        <button class="breadcrumb-link" data-nav="/deployments/builder/${this.deploymentId}/zones">${label}</button>
        <span class="breadcrumb-sep">›</span>
        <span class="breadcrumb-current">Staging</span>
      </nav>
    `;
  }

  _buildToteCards() {
    if (!this.totes || this.totes.length === 0) {
      return `
        <div class="staging-empty">
          <p>No totes available for staging for this deployment.</p>
        </div>
      `;
    }

    return this.totes.map(tote => this._buildToteCard(tote)).join('');
  }

  _buildToteCard(tote) {
    const isStaged = this.stagedToteIds.has(tote.id);
    const isExpanded = this.expandedToteIds.has(tote.id);
    const itemCount = tote.contents_count || 0;
    const season = tote.season || '';
    const location = tote.location || '';
    const size = tote.size || '';

    return `
      <div class="staging-tote-card ${isStaged ? 'is-staged' : ''}" data-tote-id="${tote.id}">
        <div class="tote-card-header">
          <div class="tote-card-meta">
            <h2 class="tote-card-name">${tote.short_name}</h2>
            <div class="tote-card-tags">
              <span class="tote-tag">${season}</span>
              <span class="tote-tag">${location}</span>
              <span class="tote-tag">${size}</span>
            </div>
          </div>
          <div class="tote-card-actions">
            ${isStaged
              ? `<span class="tote-staged-badge">✓ Staged</span>`
              : `<button class="btn-stage-tote" data-tote-id="${tote.id}" data-item-ids='${JSON.stringify((tote.contents || []))}'>
                  Stage Tote
                </button>`
            }
          </div>
        </div>

        <div class="tote-card-summary">
          <span class="tote-item-count">${itemCount} item${itemCount !== 1 ? 's' : ''}</span>
          ${itemCount > 0
            ? `<button class="btn-see-items" data-tote-id="${tote.id}">
                ${isExpanded ? 'Hide Items' : 'See Items'}
              </button>`
            : ''
          }
        </div>

        <div class="tote-items-list ${isExpanded ? 'is-expanded' : ''}" id="tote-items-${tote.id}">
          ${this._buildItemsList(tote.contents_details || [], isStaged)}
        </div>
      </div>
    `;
  }

  _buildItemsList(items, isStaged) {
    if (!items || items.length === 0) {
      return `<p class="tote-items-empty">No item details available.</p>`;
    }

    return `
      <ul class="tote-items-ul">
        ${items.map(item => `
          <li class="tote-item-row ${isStaged ? 'item-staged' : ''}">
            <span class="tote-item-name">${item.id}: ${item.short_name}</span>
            ${isStaged ? `<span class="tote-item-staged-label">Staged</span>` : ''}
            <span class="tote-item-meta">${item.class_type || ''}</span>
          </li>
        `).join('')}
      </ul>
    `;
  }

  _attachListeners() {
    // Breadcrumb navigation
    this.container.addEventListener('click', (e) => {
      const navTarget = e.target.dataset.nav;
      if (navTarget) {
        navigate(navTarget);
        return;
      }

      // Stage Tote button
      if (e.target.classList.contains('btn-stage-tote')) {
        const toteId = e.target.dataset.toteId;
        const itemIds = JSON.parse(e.target.dataset.itemIds || '[]');
        this._confirmAndStage(toteId, itemIds);
        return;
      }

      // See Items toggle
      if (e.target.classList.contains('btn-see-items')) {
        const toteId = e.target.dataset.toteId;
        this._toggleItemsList(toteId, e.target);
        return;
      }
    });
  }

  _confirmAndStage(toteId, itemIds) {
    const tote = this.totes.find(t => t.id === toteId);
    const toteName = tote?.short_name || toteId;
    const itemCount = itemIds.length;

    const confirmed = window.confirm(
      `Stage "${toteName}"?\n\nThis will mark ${itemCount} item${itemCount !== 1 ? 's' : ''} as Staged and open the tote.`
    );

    if (!confirmed) return;

    // Disable button while in flight
    const btn = this.container.querySelector(`.btn-stage-tote[data-tote-id="${toteId}"]`);
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Staging...';
    }

    this.onStage(toteId, itemIds);
  }

  _toggleItemsList(toteId, btn) {
    const list = this.container.querySelector(`#tote-items-${toteId}`);
    if (!list) return;

    const isExpanded = this.expandedToteIds.has(toteId);

    if (isExpanded) {
      this.expandedToteIds.delete(toteId);
      list.classList.remove('is-expanded');
      btn.textContent = 'See Items';
    } else {
      this.expandedToteIds.add(toteId);
      list.classList.add('is-expanded');
      btn.textContent = 'Hide Items';
    }
  }

  markToteAsStaged(toteId, itemIds) {
    this.stagedToteIds.add(toteId);

    const card = this.container.querySelector(`.staging-tote-card[data-tote-id="${toteId}"]`);
    if (!card) return;

    // Grey out the card
    card.classList.add('is-staged');

    // Replace button with checkmark badge
    const actions = card.querySelector('.tote-card-actions');
    if (actions) {
      actions.innerHTML = `<span class="tote-staged-badge">✓ Staged</span>`;
    }

    // Update items list to show staged state
    const itemsList = card.querySelector('.tote-items-list');
    if (itemsList) {
      const tote = this.totes.find(t => t.id === toteId);
      itemsList.innerHTML = this._buildItemsList(tote?.contents_details || [], true);
    }
  }

  showError(message) {
    const banner = this.container.querySelector('#staging-error-banner');
    if (!banner) return;
    banner.textContent = message;
    banner.style.display = 'block';
    setTimeout(() => {
      banner.style.display = 'none';
    }, 5000);
  }
}