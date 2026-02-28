/**
 * PackingWizard Component
 * Vertical progressive disclosure wizard for packing operations.
 *
 * Tote mode:         Step 1 (choose type) → Step 2 (pick tote) → navigates to /storage/pack/:id
 * Single/Store mode: Step 1 (choose type) → Step 2 (items) → Step 3 (location) → Step 4 (confirm)
 */

import { getPlaceholderImage } from '../utils/storage-config.js';
import { navigate } from '../utils/router.js';
import { showError } from '../shared/toast.js';

const PACKING_MODES = {
  TOTE: 'tote',
  SINGLE: 'single',
  STORE: 'store'
};

export class PackingWizard {
  constructor(options = {}) {
    this.storageUnits = options.storageUnits || [];
    this.availableItems = options.availableItems || [];
    this.onComplete = options.onComplete || (() => {});
    this.onCancel = options.onCancel || (() => {});
    this.container = null;

    // Wizard state
    this.mode = null;
    this.stepsRevealed = 1;
    this.selectedStorage = null;
    this.selectedItems = [];
    this.location = '';
    this.customLocation = '';

    // Pagination state
    this.itemsPerPage = 10;
    this.currentItemPage = 1;
    this.filteredItems = [];
    this.isLoadingMore = false;
  }

  render(containerElement) {
    this.container = containerElement;

    this.container.innerHTML = `
      <div class="wizard-container--vertical">
        <div class="view-header view-header--wizard">
          <button class="btn-back-wizard" id="btn-back-wizard">← Back</button>
          <h1>Packing Wizard</h1>
        </div>

        <div id="step-indicator" class="step-indicator"></div>

        <div class="wizard-body" id="wizard-body">
          <div id="wizard-step-1" class="wizard-step"></div>
          <div id="wizard-step-2" class="wizard-step wizard-step--hidden"></div>
          <div id="wizard-step-3" class="wizard-step wizard-step--hidden"></div>
          <div id="wizard-step-4" class="wizard-step wizard-step--hidden"></div>
        </div>
      </div>
    `;

    this.container.querySelector('#btn-back-wizard').addEventListener('click', () => this.onCancel());

    this.renderStep1(this.container.querySelector('#wizard-step-1'));
    this.renderStepIndicator();
  }

  // --- Step indicator ---

  getStepLabels() {
    switch (this.mode) {
      case PACKING_MODES.TOTE:   return ['Type', 'Tote'];
      case PACKING_MODES.SINGLE: return ['Type', 'Items', 'Location', 'Confirm'];
      case PACKING_MODES.STORE:  return ['Type', 'Items', 'Location', 'Confirm'];
      default:                   return ['Type'];
    }
  }

  renderStepIndicator() {
    const container = this.container.querySelector('#step-indicator');
    if (!container) return;

    const labels = this.getStepLabels();

    container.innerHTML = labels.map((label, i) => {
      const stepNum = i + 1;
      const isActive = this.stepsRevealed === stepNum;
      const isCompleted = this.stepsRevealed > stepNum;

      const connector = i < labels.length - 1
        ? `<div class="step-connector ${isCompleted ? 'step-connector--completed' : ''}"></div>`
        : '';

      return `
        <div class="step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''} ${!isActive && !isCompleted ? 'upcoming' : ''}">
          <div class="step-number">${isCompleted ? '✓' : stepNum}</div>
          <div class="step-label">${label}</div>
        </div>
        ${connector}
      `;
    }).join('');
  }

  // --- Step reveal ---

  revealStep(stepNum) {
    const stepEl = this.container.querySelector(`#wizard-step-${stepNum}`);
    if (!stepEl) return;

    stepEl.classList.remove('wizard-step--hidden');
    stepEl.classList.add('wizard-step--revealing');
    stepEl.addEventListener('animationend', () => {
      stepEl.classList.remove('wizard-step--revealing');
    }, { once: true });

    switch (stepNum) {
      case 2: this.renderStep2(stepEl); break;
      case 3: this.renderStep3(stepEl); break;
      case 4: this.renderStep4(stepEl); break;
    }

    this.stepsRevealed = Math.max(this.stepsRevealed, stepNum);
    this.renderStepIndicator();
    this.scrollToStep(stepNum);
  }

  scrollToStep(stepNum) {
    const stepEl = this.container.querySelector(`#wizard-step-${stepNum}`);
    if (!stepEl) return;
    requestAnimationFrame(() => {
      stepEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  // --- Step 1: Choose Type ---

  renderStep1(el) {
    el.innerHTML = `
      <div class="step-panel">
        <h2>Choose Packing Type</h2>
        <p class="step-description">Select how you want to pack your items</p>

        <div class="type-selector">
          <div class="type-card" data-mode="${PACKING_MODES.TOTE}">
            <div class="type-icon">📦</div>
            <div class="type-label">Pack Tote</div>
            <div class="type-sublabel">Pack multiple items into a tote</div>
          </div>

          <div class="type-card" data-mode="${PACKING_MODES.SINGLE}">
            <div class="type-icon">🎁</div>
            <div class="type-label">Pack Single</div>
            <div class="type-sublabel">Items packed in their original box</div>
          </div>

          <div class="type-card" data-mode="${PACKING_MODES.STORE}">
            <div class="type-icon">📍</div>
            <div class="type-label">Store Items</div>
            <div class="type-sublabel">Store oversized items by location</div>
          </div>
        </div>
      </div>
    `;

    el.querySelectorAll('.type-card').forEach(card => {
      card.addEventListener('click', () => {
        el.querySelectorAll('.type-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        this.mode = card.dataset.mode;
        this.renderStepIndicator();
        this.revealStep(2);
      });
    });
  }

  // --- Step 2: depends on mode ---

  renderStep2(el) {
    switch (this.mode) {
      case PACKING_MODES.TOTE:
        this.renderPickTote(el);
        break;
      case PACKING_MODES.SINGLE:
        this.renderSelectItems(el, this.filterSingleItems());
        break;
      case PACKING_MODES.STORE:
        this.renderSelectItems(el, this.filterStoreItems());
        break;
    }
  }

  // --- Step 2 (Tote): Pick a tote, then navigate ---

  renderPickTote(el) {
    const totes = this.storageUnits.filter(u => u.class_type === 'Tote' && !u.packed);

    if (totes.length === 0) {
      el.innerHTML = `
        <div class="step-panel">
          <h2>Pick a Tote</h2>
          <div class="contents-empty" style="padding:40px 0;">
            <div class="empty-icon">📦</div>
            <h3>No Unpacked Totes</h3>
            <p>All totes are already packed. Create a new tote first.</p>
            <button class="btn btn-primary" id="btn-create-tote">Create Tote</button>
          </div>
        </div>
      `;
      el.querySelector('#btn-create-tote').addEventListener('click', () => navigate('/storage/create'));
      return;
    }

    el.innerHTML = `
      <div class="step-panel">
        <h2>Pick a Tote</h2>
        <p class="step-description">Select the tote you want to pack</p>

        <div class="form-field mb-md">
          <select class="form-select" id="tote-season-filter">
            <option value="">All Seasons</option>
            <option value="Halloween">Halloween</option>
            <option value="Christmas">Christmas</option>
            <option value="Shared">Shared</option>
          </select>
        </div>

        <div class="storage-cards" id="tote-selection"></div>

        <div class="step-action">
          <button class="btn btn-primary btn-review" id="btn-pack-tote" disabled>Pack This Tote →</button>
        </div>
      </div>
    `;

    this.renderToteCards(el, totes);

    el.querySelector('#tote-season-filter').addEventListener('change', (e) => {
      const season = e.target.value;
      const filtered = season ? totes.filter(t => t.season === season) : totes;
      // Clear selection if filtered tote is gone
      if (this.selectedStorage && season && this.selectedStorage.season !== season) {
        this.selectedStorage = null;
        el.querySelector('#btn-pack-tote').disabled = true;
      }
      this.renderToteCards(el, filtered);
    });

    el.querySelector('#btn-pack-tote').addEventListener('click', () => {
      if (!this.selectedStorage) {
        showError('Please select a tote first');
        return;
      }
      navigate(`/storage/pack/${this.selectedStorage.id}`);
    });
  }

  renderToteCards(el, totes) {
    const container = el.querySelector('#tote-selection');
    if (!container) return;

    if (totes.length === 0) {
      container.innerHTML = `<p style="color:#6b7280;padding:16px 0;">No totes match this season filter.</p>`;
      return;
    }

    container.innerHTML = totes.map(tote => {
      const photoUrl = tote.images?.thumb_cloudfront_url || tote.images?.photo_url || getPlaceholderImage();
      const isSelected = this.selectedStorage?.id === tote.id;
      const contentsCount = tote.contents_count || tote.contents?.length || 0;

      return `
        <div class="storage-card ${isSelected ? 'selected' : ''}" data-id="${tote.id}">
          <div class="card-photo">
            <img src="${photoUrl}" alt="${tote.short_name}">
          </div>
          <div class="card-body">
            <div class="card-header">
              <h3 class="card-title">${tote.short_name || 'Unnamed Tote'}</h3>
              <code class="card-id">${tote.id}</code>
            </div>
            <div class="card-meta">
              <div class="card-meta-item">
                <span class="meta-label">Season</span>
                <span class="badge badge-${(tote.season || '').toLowerCase()}">${tote.season || '—'}</span>
              </div>
              <div class="card-meta-item">
                <span class="meta-label">Location</span>
                <span class="meta-value">${tote.location || '—'}</span>
              </div>
              <div class="card-meta-item">
                <span class="meta-label">Size</span>
                <span class="meta-value">${tote.size || '—'}</span>
              </div>
              <div class="card-meta-item">
                <span class="meta-label">Items</span>
                <span class="meta-value">${contentsCount}</span>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.storage-card').forEach(card => {
      card.addEventListener('click', () => {
        const toteId = card.dataset.id;
        this.selectedStorage = totes.find(t => t.id === toteId);
        container.querySelectorAll('.storage-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        const packBtn = el.querySelector('#btn-pack-tote');
        if (packBtn) packBtn.disabled = false;
      });
    });
  }

  // --- Item filters (Single / Store) ---

  filterSingleItems() {
    return this.availableItems.filter(item => {
      const isSinglePacked = item.packing_data?.single_packed === true;
      const isUnpacked = item.packing_data?.packing_status === false;
      const isNotReceptacle = item.class_type !== 'Receptacle';
      return isSinglePacked && isUnpacked && isNotReceptacle;
    });
  }

  filterStoreItems() {
    return this.availableItems.filter(item => {
      const isNonPackable = item.packing_data?.packable === false;
      const isUnstored = item.packing_data?.packing_status === false;
      const isNotReceptacle = item.class_type !== 'Receptacle';
      return isNonPackable && isUnstored && isNotReceptacle;
    });
  }

  // --- Step 2 (Single/Store): Select items ---

  renderSelectItems(el, items) {
    const modeLabel = this.mode === PACKING_MODES.SINGLE ? 'single-packed' : 'oversized';

    if (items.length === 0) {
      el.innerHTML = `
        <div class="step-panel">
          <h2>Select Items</h2>
          <div class="contents-empty" style="padding:40px 0;">
            <div class="empty-icon">📦</div>
            <h3>No Items Available</h3>
            <p>No ${modeLabel} items are available to pack.</p>
          </div>
        </div>
      `;
      return;
    }

    this.filteredItems = [...items];

    el.innerHTML = `
      <div class="step-panel">
        <h2>Select Items</h2>
        <p class="step-description">${this.mode === PACKING_MODES.SINGLE ? 'Select items to pack in their original boxes' : 'Select oversized items to store by location'}</p>

        <div class="form-field mb-md">
          <input type="text" class="form-input" placeholder="🔍 Search items..." id="item-search-step2">
        </div>

        <div class="mb-md">
          <strong>Selected: <span id="selected-count-step2">0</span> items</strong>
        </div>

        <div class="contents-list" id="items-list-step2"></div>
        <div class="loading-indicator hidden" id="loading-more-step2">Loading more...</div>

        <div class="step-action">
          <button class="btn btn-primary btn-review" id="btn-continue-step2">Continue →</button>
        </div>
      </div>
    `;

    this.renderStep2ItemPage(el, items, true);
    this.setupStep2Scroll(el, items);

    el.querySelector('#item-search-step2').addEventListener('input', (e) => {
      const term = e.target.value.toLowerCase();
      this.filteredItems = items.filter(item =>
        item.id.toLowerCase().includes(term) ||
        item.short_name.toLowerCase().includes(term)
      );
      this.currentItemPage = 1;
      this.renderStep2ItemPage(el, this.filteredItems, true);
    });

    el.querySelector('#btn-continue-step2').addEventListener('click', () => {
      if (this.selectedItems.length === 0) {
        showError('Please select at least one item');
        return;
      }
      this.revealStep(3);
    });
  }

  renderStep2ItemPage(el, items, reset) {
    const listEl = el.querySelector('#items-list-step2');
    if (!listEl) return;

    if (reset) {
      this.currentItemPage = 1;
      listEl.innerHTML = '';
    }

    const pageItems = items.slice(0, this.currentItemPage * this.itemsPerPage);
    const html = pageItems.map(item => {
      const photoUrl = item.images?.thumb_cloudfront_url || item.images?.photo_url || getPlaceholderImage();
      const isSelected = this.selectedItems.includes(item.id);
      return `
        <div class="content-item ${isSelected ? 'selected' : ''}" data-id="${item.id}">
          <input type="checkbox" class="item-checkbox" ${isSelected ? 'checked' : ''} data-id="${item.id}">
          <div class="content-photo">
            <img src="${photoUrl}" alt="${item.short_name}">
          </div>
          <div class="content-info">
            <div class="content-id-name">
              <code class="content-id">${item.id}</code>
              <span class="content-name">${item.short_name}</span>
            </div>
            ${item.class || item.class_type ? `
              <div class="content-meta">
                <span class="content-class">${item.class || ''}</span>
                ${item.class_type ? `<span class="content-separator">•</span><span class="content-type">${item.class_type}</span>` : ''}
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');

    listEl.innerHTML = html;

    listEl.querySelectorAll('.item-checkbox').forEach(cb => {
      cb.addEventListener('change', (e) => {
        const itemId = e.target.dataset.id;
        if (e.target.checked) {
          if (!this.selectedItems.includes(itemId)) this.selectedItems.push(itemId);
        } else {
          this.selectedItems = this.selectedItems.filter(id => id !== itemId);
        }
        cb.closest('.content-item').classList.toggle('selected', e.target.checked);
        const countEl = el.querySelector('#selected-count-step2');
        if (countEl) countEl.textContent = this.selectedItems.length;
      });

      cb.closest('.content-item').addEventListener('click', (e) => {
        if (e.target.tagName !== 'INPUT') {
          cb.checked = !cb.checked;
          cb.dispatchEvent(new Event('change'));
        }
      });
    });
  }

  setupStep2Scroll(el, items) {
    const listEl = el.querySelector('#items-list-step2');
    if (!listEl) return;

    listEl.addEventListener('scroll', () => {
      const nearBottom = listEl.scrollTop + listEl.clientHeight >= listEl.scrollHeight - 100;
      if (!nearBottom || this.isLoadingMore) return;
      if (this.currentItemPage * this.itemsPerPage >= this.filteredItems.length) return;

      this.isLoadingMore = true;
      const loadingEl = el.querySelector('#loading-more-step2');
      if (loadingEl) loadingEl.classList.remove('hidden');

      setTimeout(() => {
        this.currentItemPage++;
        this.renderStep2ItemPage(el, this.filteredItems, false);
        this.isLoadingMore = false;
        if (loadingEl) loadingEl.classList.add('hidden');
      }, 300);
    });
  }

  // --- Step 3 (Single/Store): Choose location ---

  renderStep3(el) {
    el.innerHTML = `
      <div class="step-panel">
        <h2>Choose Location</h2>
        <p class="step-description">Where will these items be stored?</p>

        <div class="form-field mb-md">
          <label class="form-label">Storage Location</label>
          <select class="form-select" id="location-select">
            <option value="">-- Select Location --</option>
            <option value="Attic">Attic</option>
            <option value="Crawl Space">Crawl Space</option>
            <option value="Shed">Shed</option>
            <option value="Custom">Custom</option>
          </select>
        </div>

        <div class="form-field mb-md hidden" id="custom-location-field">
          <label class="form-label">Custom Location</label>
          <input type="text" class="form-input" id="custom-location-input" placeholder="Enter location..." maxlength="20" value="${this.customLocation}">
          <span class="form-help" id="char-count">${this.customLocation.length} / 20 characters</span>
        </div>

        <div class="step-action">
          <button class="btn btn-primary btn-review" id="btn-continue-step3">Continue →</button>
        </div>
      </div>
    `;

    const locationSelect = el.querySelector('#location-select');
    const customField = el.querySelector('#custom-location-field');
    const customInput = el.querySelector('#custom-location-input');
    const charCount = el.querySelector('#char-count');

    locationSelect.value = this.location;
    if (this.location === 'Custom') customField.classList.remove('hidden');

    locationSelect.addEventListener('change', (e) => {
      this.location = e.target.value;
      if (this.location === 'Custom') {
        customField.classList.remove('hidden');
      } else {
        customField.classList.add('hidden');
        this.customLocation = '';
      }
    });

    customInput.addEventListener('input', (e) => {
      this.customLocation = e.target.value;
      charCount.textContent = `${this.customLocation.length} / 20 characters`;
    });

    el.querySelector('#btn-continue-step3').addEventListener('click', () => {
      if (!this.location) {
        showError('Please select a storage location');
        return;
      }
      if (this.location === 'Custom' && !this.customLocation.trim()) {
        showError('Please enter a custom location');
        return;
      }
      this.revealStep(4);
    });
  }

  // --- Step 4 (Single/Store): Confirm & complete ---

  renderStep4(el) {
    const finalLocation = this.location === 'Custom' ? this.customLocation : this.location;
    const selectedItemsData = this.availableItems.filter(item => this.selectedItems.includes(item.id));
    const actionLabel = this.mode === PACKING_MODES.SINGLE ? 'Pack Items' : 'Store Items';

    el.innerHTML = `
      <div class="step-panel">
        <h2>Confirm &amp; ${actionLabel}</h2>
        <p class="step-description">Review before completing</p>

        <div class="review-section">
          <h3 class="review-title">Summary</h3>
          <div class="review-grid">
            <div class="review-item">
              <span class="review-label">Items</span>
              <span class="review-value"><strong>${this.selectedItems.length}</strong></span>
            </div>
            <div class="review-item">
              <span class="review-label">Location</span>
              <span class="review-value"><strong>${finalLocation}</strong></span>
            </div>
          </div>
        </div>

        <div class="review-section">
          <h3 class="review-title">Items</h3>
          <div class="review-grid">
            ${selectedItemsData.map(item => `
              <div class="review-item">
                <span class="review-label"><code>${item.id}</code></span>
                <span class="review-value">${item.short_name}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="step-action">
          <button class="btn btn-primary btn-create-storage" id="btn-complete">
            ✓ ${actionLabel}
          </button>
        </div>
      </div>
    `;

    el.querySelector('#btn-complete').addEventListener('click', () => {
      this.onComplete({
        mode: this.mode,
        storageId: null,
        itemIds: this.selectedItems,
        location: finalLocation,
        markAsPacked: false
      });
    });
  }
}

export default PackingWizard;
