// StagingView.js
// Main staging area view component

import { navigate } from '../../utils/router.js';

export class StagingView {
  constructor({ deployment, totes, stagedTotes, deploymentId, onStage }) {
    this.deployment = deployment;
    this.totes = totes;
    this.stagedTotes = stagedTotes || [];
    this.deploymentId = deploymentId;
    this.onStage = onStage;
    this.newlyStagedToteIds = new Set(); // tracks totes staged this session
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
        <p class="staging-subtitle">Stage totes for deployment, or review what's already been staged.</p>
      </div>
      <div class="staging-error-banner" id="staging-error-banner" style="display:none;"></div>
      <div class="staging-columns">
        <div class="staging-column staging-column--available">
          <div class="staging-column-header">
            <h2 class="staging-column-title">Available to Stage</h2>
            <span class="staging-column-count">${this.totes.length} tote${this.totes.length !== 1 ? 's' : ''}</span>
          </div>
          <div class="staging-totes" id="staging-totes-available">
            ${this._buildAvailableToteCards()}
          </div>
        </div>

        <div class="staging-column staging-column--staged">
          <div class="staging-column-header">
            <h2 class="staging-column-title">Already Staged</h2>
            <span class="staging-column-count" id="staged-column-count">${this.stagedTotes.length} tote${this.stagedTotes.length !== 1 ? 's' : ''}</span>
          </div>
          <div class="staging-totes" id="staging-totes-staged">
            ${this._buildStagedToteCards()}
          </div>
        </div>
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

  _buildAvailableToteCards() {
    if (!this.totes || this.totes.length === 0) {
      return `<div class="staging-empty"><p>No totes available to stage.</p></div>`;
    }
    return this.totes.map(tote => this._buildToteCard(tote, false)).join('');
  }

  _buildStagedToteCards() {
    if (!this.stagedTotes || this.stagedTotes.length === 0) {
      return `<div class="staging-empty"><p>No totes have been staged yet.</p></div>`;
    }
    return this.stagedTotes.map(tote => this._buildToteCard(tote, true)).join('');
  }

  _buildToteCard(tote, isReadOnly) {
    const isExpanded = this.expandedToteIds.has(tote.id);
    const itemCount = tote.contents_count || 0;
    const season = tote.season || '';
    const location = tote.location || '';
    const size = tote.size || '';

    return `
      <div class="staging-tote-card ${isReadOnly ? 'is-readonly' : ''}" data-tote-id="${tote.id}">
        <div class="tote-card-header">
          <div class="tote-card-meta">
            <h2 class="tote-card-name">${tote.short_name}</h2>
            <div class="tote-card-tags">
              ${season ? `<span class="tote-tag">${season}</span>` : ''}
              ${location ? `<span class="tote-tag">${location}</span>` : ''}
              ${size ? `<span class="tote-tag">${size}</span>` : ''}
            </div>
          </div>
          <div class="tote-card-actions">
            ${isReadOnly
              ? `<span class="tote-staged-badge">✓ Staged</span>`
              : `<button class="btn-stage-tote" data-tote-id="${tote.id}" data-item-ids='${JSON.stringify(tote.contents || [])}'>
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
          ${this._buildItemsList(tote.contents_details || [], isReadOnly)}
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
    this.container.addEventListener('click', (e) => {
      const navTarget = e.target.dataset.nav;
      if (navTarget) {
        navigate(navTarget);
        return;
      }

      if (e.target.classList.contains('btn-stage-tote')) {
        const toteId = e.target.dataset.toteId;
        const itemIds = JSON.parse(e.target.dataset.itemIds || '[]');
        this._confirmAndStage(toteId, itemIds);
        return;
      }

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
    this.newlyStagedToteIds.add(toteId);

    // Remove card from left column
    const availableCard = this.container.querySelector(`#staging-totes-available .staging-tote-card[data-tote-id="${toteId}"]`);
    const tote = this.totes.find(t => t.id === toteId);

    if (availableCard) {
      availableCard.remove();
    }

    // Update left column empty state if no totes remain
    const availableContainer = this.container.querySelector('#staging-totes-available');
    if (availableContainer && availableContainer.querySelectorAll('.staging-tote-card').length === 0) {
      availableContainer.innerHTML = `<div class="staging-empty"><p>No totes available to stage.</p></div>`;
    }

    // Update left column count
    const remaining = this.totes.filter(t => !this.newlyStagedToteIds.has(t.id)).length;
    const availableHeader = this.container.querySelector('.staging-column--available .staging-column-count');
    if (availableHeader) {
      availableHeader.textContent = `${remaining} tote${remaining !== 1 ? 's' : ''}`;
    }

    // Add card to right column (remove empty state if present)
    const stagedContainer = this.container.querySelector('#staging-totes-staged');
    if (stagedContainer) {
      const emptyState = stagedContainer.querySelector('.staging-empty');
      if (emptyState) emptyState.remove();

      if (tote) {
        // Mark contents_details items as staged
        tote.contents_details = (tote.contents_details || []).map(item => ({
          ...item,
          status: itemIds.includes(item.id) ? 'Staged' : item.status
        }));
        stagedContainer.insertAdjacentHTML('beforeend', this._buildToteCard(tote, true));
      }
    }

    // Update right column count
    const newStagedCount = this.stagedTotes.length + this.newlyStagedToteIds.size;
    const stagedCountEl = this.container.querySelector('#staged-column-count');
    if (stagedCountEl) {
      stagedCountEl.textContent = `${newStagedCount} tote${newStagedCount !== 1 ? 's' : ''}`;
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
