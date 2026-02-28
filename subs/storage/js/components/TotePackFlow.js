/**
 * TotePackFlow Component
 * Vertical 3-step progressive wizard for packing an individual tote:
 *   Step 1 — Select items to pack into the tote
 *   Step 2 — Optional photo of the packed tote
 *   Step 3 — Review + mark as packed (shows existing + newly selected items)
 */

import { showError } from '../shared/toast.js';
import { getPlaceholderImage } from '../utils/storage-config.js';

export class TotePackFlow {
  constructor(options = {}) {
    this.toteData = options.toteData || {};
    this.availableItems = options.availableItems || [];
    this.onComplete = options.onComplete || (() => {});
    this.onCancel = options.onCancel || (() => {});
    this.container = null;

    // Wizard state
    this.stepsRevealed = 1;
    this.selectedItemIds = [];
    this.photoUploaded = false;

    // Pagination state
    this.itemsPerPage = 10;
    this.currentItemPage = 1;
    this.filteredItems = [];
    this.isLoadingMore = false;
  }

  // --- Render entry point ---

  render(containerElement) {
    this.container = containerElement;

    this.container.innerHTML = `
      <div class="wizard-container--vertical">
        <div class="view-header view-header--wizard">
          <button class="btn-back-wizard" id="btn-back-wizard">← Back</button>
          <h1>Pack Tote</h1>
        </div>

        <div id="step-indicator" class="step-indicator"></div>

        <div class="wizard-body" id="wizard-body">
          <div id="wizard-step-1" class="wizard-step"></div>
          <div id="wizard-step-2" class="wizard-step wizard-step--hidden"></div>
          <div id="wizard-step-3" class="wizard-step wizard-step--hidden"></div>
        </div>
      </div>
    `;

    this.container.querySelector('#btn-back-wizard').addEventListener('click', () => this.onCancel());

    this.renderStep1(this.container.querySelector('#wizard-step-1'));
    this.renderStepIndicator();
  }

  // --- Step indicator ---

  renderStepIndicator() {
    const container = this.container.querySelector('#step-indicator');
    if (!container) return;

    const steps = [
      { num: 1, label: 'Items' },
      { num: 2, label: 'Photo' },
      { num: 3, label: 'Confirm' }
    ];

    container.innerHTML = steps.map((step, i) => {
      const isActive = this.stepsRevealed === step.num;
      const isCompleted = this.stepsRevealed > step.num;

      const connector = i < steps.length - 1
        ? `<div class="step-connector ${isCompleted ? 'step-connector--completed' : ''}"></div>`
        : '';

      return `
        <div class="step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''} ${!isActive && !isCompleted ? 'upcoming' : ''}">
          <div class="step-number">${isCompleted ? '✓' : step.num}</div>
          <div class="step-label">${step.label}</div>
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

  // --- Step 1: Select Items ---

  renderStep1(el) {
    const tote = this.toteData;
    const toteSeason = tote.season || '';

    if (this.availableItems.length === 0) {
      el.innerHTML = `
        <div class="step-panel">
          <h2>Select Items</h2>
          <p class="step-description">Choose items to pack into <strong>${tote.short_name || tote.id}</strong></p>

          <div class="contents-empty" style="padding: 40px 0;">
            <div class="empty-icon">📦</div>
            <h3>No items available</h3>
            <p>All eligible items are already packed. You can still mark this tote as packed.</p>
          </div>

          <div class="step-action">
            <button class="btn btn-primary btn-review" id="btn-continue-step1">Continue →</button>
          </div>
        </div>
      `;
      el.querySelector('#btn-continue-step1').addEventListener('click', () => this.revealStep(2));
      return;
    }

    // Pre-filter to tote's season
    this.filteredItems = toteSeason
      ? this.availableItems.filter(item => item.season === toteSeason)
      : [...this.availableItems];

    el.innerHTML = `
      <div class="step-panel">
        <h2>Select Items</h2>
        <p class="step-description">Choose items to pack into <strong>${tote.short_name || tote.id}</strong></p>

        <div class="form-field mb-md">
          <input type="text" class="form-input" placeholder="🔍 Search items..." id="item-search-step1">
        </div>

        <div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap;">
          <div style="flex:1;min-width:160px;">
            <select class="form-select" id="season-filter-step1">
              <option value="">All Seasons</option>
              <option value="Halloween" ${toteSeason === 'Halloween' ? 'selected' : ''}>Halloween</option>
              <option value="Christmas" ${toteSeason === 'Christmas' ? 'selected' : ''}>Christmas</option>
              <option value="Shared" ${toteSeason === 'Shared' ? 'selected' : ''}>Shared</option>
            </select>
          </div>
          <div style="flex:1;min-width:160px;">
            <select class="form-select" id="class-filter-step1">
              <option value="">All Classes</option>
              <option value="Decoration">Decoration</option>
              <option value="Light">Light</option>
              <option value="Accessory">Accessory</option>
            </select>
          </div>
        </div>

        <div class="pack-select-all">
          <span class="pack-confirmed-count" id="selected-count-step1">0 selected</span>
        </div>

        <div class="contents-list" id="items-list-step1"></div>
        <div class="loading-indicator hidden" id="loading-more-step1">Loading more...</div>

        <div class="step-action">
          <button class="btn btn-primary btn-review" id="btn-continue-step1">Continue →</button>
        </div>
      </div>
    `;

    this.renderItemPage(el, this.filteredItems, true);
    this.setupItemScroll(el);
    this.attachStep1Listeners(el);
  }

  renderItemPage(stepEl, items, reset) {
    const listEl = stepEl.querySelector('#items-list-step1');
    if (!listEl) return;

    if (reset) {
      this.currentItemPage = 1;
      listEl.innerHTML = '';
    }

    const pageItems = items.slice(0, this.currentItemPage * this.itemsPerPage);

    const html = pageItems.map(item => {
      const photoUrl = item.images?.thumb_cloudfront_url || item.images?.photo_url || getPlaceholderImage();
      const isSelected = this.selectedItemIds.includes(item.id);
      return `
        <div class="content-item ${isSelected ? 'selected' : ''}" data-id="${item.id}">
          <input type="checkbox" class="item-checkbox pack-item-check" ${isSelected ? 'checked' : ''} data-id="${item.id}">
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

    listEl.querySelectorAll('.pack-item-check').forEach(cb => {
      cb.addEventListener('change', (e) => {
        const itemId = e.target.dataset.id;
        if (e.target.checked) {
          if (!this.selectedItemIds.includes(itemId)) this.selectedItemIds.push(itemId);
        } else {
          this.selectedItemIds = this.selectedItemIds.filter(id => id !== itemId);
        }
        cb.closest('.content-item').classList.toggle('selected', e.target.checked);
        this.updateSelectedCount(stepEl);
      });

      cb.closest('.content-item').addEventListener('click', (e) => {
        if (e.target.tagName !== 'INPUT') {
          cb.checked = !cb.checked;
          cb.dispatchEvent(new Event('change'));
        }
      });
    });
  }

  updateSelectedCount(stepEl) {
    const countEl = stepEl.querySelector('#selected-count-step1');
    if (countEl) {
      const n = this.selectedItemIds.length;
      countEl.textContent = `${n} ${n === 1 ? 'item' : 'items'} selected`;
    }
  }

  setupItemScroll(stepEl) {
    const listEl = stepEl.querySelector('#items-list-step1');
    if (!listEl) return;

    listEl.addEventListener('scroll', () => {
      const nearBottom = listEl.scrollTop + listEl.clientHeight >= listEl.scrollHeight - 100;
      if (!nearBottom || this.isLoadingMore) return;
      if (this.currentItemPage * this.itemsPerPage >= this.filteredItems.length) return;

      this.isLoadingMore = true;
      const loadingEl = stepEl.querySelector('#loading-more-step1');
      if (loadingEl) loadingEl.classList.remove('hidden');

      setTimeout(() => {
        this.currentItemPage++;
        this.renderItemPage(stepEl, this.filteredItems, false);
        this.isLoadingMore = false;
        if (loadingEl) loadingEl.classList.add('hidden');
      }, 300);
    });
  }

  attachStep1Listeners(el) {
    const searchInput = el.querySelector('#item-search-step1');
    const seasonFilter = el.querySelector('#season-filter-step1');
    const classFilter = el.querySelector('#class-filter-step1');

    const applyFilters = () => {
      const search = searchInput.value.toLowerCase();
      const season = seasonFilter.value;
      const cls = classFilter.value;

      this.filteredItems = this.availableItems.filter(item => {
        const matchesSeason = !season || item.season === season;
        const matchesClass = !cls || item.class === cls;
        const matchesSearch = !search ||
          item.id.toLowerCase().includes(search) ||
          item.short_name.toLowerCase().includes(search);
        return matchesSeason && matchesClass && matchesSearch;
      });

      this.renderItemPage(el, this.filteredItems, true);
    };

    searchInput.addEventListener('input', applyFilters);
    seasonFilter.addEventListener('change', applyFilters);
    classFilter.addEventListener('change', applyFilters);

    el.querySelector('#btn-continue-step1').addEventListener('click', () => this.revealStep(2));
  }

  // --- Step 2: Photo (optional) ---

  renderStep2(el) {
    const tote = this.toteData;

    el.innerHTML = `
      <div class="step-panel">
        <h2>Photo <span style="font-weight:400;color:#6b7280">(Optional)</span></h2>
        <p class="step-description">Add a photo of the packed tote for easy identification</p>

        <div class="photo-upload-section">
          <button type="button" class="btn btn-secondary" id="btn-trigger-photo">
            📷 ${this.photoUploaded ? 'Change Photo' : 'Upload Photo'}
          </button>
          <div class="upload-success ${this.photoUploaded ? '' : 'hidden'}" id="upload-success-pack">
            ✓ Photo uploaded successfully
          </div>
        </div>

        <div class="step-action" style="gap:12px;">
          <button class="btn btn-secondary" id="btn-skip-photo">Skip →</button>
          <button class="btn btn-primary btn-review" id="btn-continue-photo">Continue →</button>
        </div>
      </div>
    `;

    el.querySelector('#btn-trigger-photo').addEventListener('click', () => {
      this.openPhotoUploadModal(tote);
    });

    el.querySelector('#btn-skip-photo').addEventListener('click', () => this.revealStep(3));
    el.querySelector('#btn-continue-photo').addEventListener('click', () => this.revealStep(3));
  }

  openPhotoUploadModal(tote) {
    const modal = document.createElement('photo-upload-modal');
    modal.setAttribute('context', 'storage');
    modal.setAttribute('photo-type', 'storage');
    modal.setAttribute('season', (tote.season || '').toLowerCase());
    modal.setAttribute('max-photos', '1');
    modal.setAttribute('year', new Date().getFullYear().toString());
    modal.setAttribute('storage-id', tote.id);

    modal.addEventListener('upload-complete', (e) => {
      if (e.detail.photo_ids && e.detail.photo_ids.length > 0) {
        this.photoUploaded = true;
        const successEl = this.container.querySelector('#upload-success-pack');
        if (successEl) successEl.classList.remove('hidden');
        const uploadBtn = this.container.querySelector('#btn-trigger-photo');
        if (uploadBtn) uploadBtn.textContent = '📷 Change Photo';
      }
    });

    modal.addEventListener('upload-cancel', () => {});
    document.body.appendChild(modal);
  }

  // --- Step 3: Confirm & Pack ---

  renderStep3(el) {
    const tote = this.toteData;
    const existingContents = tote.contents || [];
    const newItems = this.availableItems.filter(item => this.selectedItemIds.includes(item.id));

    el.innerHTML = `
      <div class="step-panel">
        <h2>Confirm &amp; Pack</h2>
        <p class="step-description">Review everything before marking this tote as packed</p>

        <div class="review-section">
          <h3 class="review-title">Tote</h3>
          <div class="review-grid">
            <div class="review-item">
              <span class="review-label">ID</span>
              <span class="review-value"><code>${tote.id}</code></span>
            </div>
            <div class="review-item">
              <span class="review-label">Name</span>
              <span class="review-value">${tote.short_name || '—'}</span>
            </div>
            <div class="review-item">
              <span class="review-label">Season</span>
              <span class="review-value">${tote.season || '—'}</span>
            </div>
            <div class="review-item">
              <span class="review-label">Location</span>
              <span class="review-value">${tote.location || '—'}</span>
            </div>
            <div class="review-item">
              <span class="review-label">Photo</span>
              <span class="review-value">${this.photoUploaded ? '✓ Added' : 'None'}</span>
            </div>
          </div>
        </div>

        ${newItems.length > 0 ? `
          <div class="review-section">
            <h3 class="review-title">Adding ${newItems.length} ${newItems.length === 1 ? 'Item' : 'Items'}</h3>
            <div class="review-grid">
              ${newItems.map(item => `
                <div class="review-item">
                  <span class="review-label"><code>${item.id}</code></span>
                  <span class="review-value">${item.short_name}</span>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        ${existingContents.length > 0 ? `
          <div class="review-section">
            <h3 class="review-title">Already in Tote (${existingContents.length})</h3>
            <div class="review-grid">
              ${existingContents.map(item => {
                const itemId = item.id || item;
                const shortName = item.short_name || itemId;
                return `
                  <div class="review-item">
                    <span class="review-label"><code>${itemId}</code></span>
                    <span class="review-value">${shortName}</span>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        ` : ''}

        <div class="form-field" style="margin-top:8px;">
          <div class="checkbox-field">
            <label class="checkbox-label">
              <input type="checkbox" id="chk-mark-packed">
              <span>Mark as Packed</span>
            </label>
            <p class="form-help" style="margin-top:4px;">Check this if the tote is full and ready for long-term storage</p>
          </div>
        </div>

        <div class="step-action">
          <button class="btn btn-primary btn-create-storage" id="btn-finish">
            Finish
          </button>
        </div>
      </div>
    `;

    el.querySelector('#btn-finish').addEventListener('click', () => {
      const markPacked = el.querySelector('#chk-mark-packed').checked;
      this.onComplete({ newItemIds: this.selectedItemIds, photoUploaded: this.photoUploaded, markPacked });
    });
  }
}

export default TotePackFlow;
