/**
 * TotePackFlow Component
 * Vertical 3-step progressive wizard for packing an individual tote:
 *   Step 1 — Confirm which items are in the tote
 *   Step 2 — Optional photo of the packed tote
 *   Step 3 — Review + mark as packed
 */

import { showError } from '../shared/toast.js';

export class TotePackFlow {
  constructor(options = {}) {
    this.toteData = options.toteData || {};
    this.onComplete = options.onComplete || (() => {});
    this.onCancel = options.onCancel || (() => {});
    this.container = null;

    // Wizard state
    this.stepsRevealed = 1;
    this.confirmedItemIds = [];
    this.photoUploaded = false;
  }

  // --- Render entry point ---

  render(containerElement) {
    this.container = containerElement;

    // Pre-check all items
    const contents = this.toteData.contents || [];
    this.confirmedItemIds = contents.map(item => item.id || item);

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
      const isUpcoming = this.stepsRevealed < step.num;

      const connector = i < steps.length - 1
        ? `<div class="step-connector ${isCompleted ? 'step-connector--completed' : ''}"></div>`
        : '';

      return `
        <div class="step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''} ${isUpcoming ? 'upcoming' : ''}">
          <div class="step-number">${isCompleted ? '✓' : step.num}</div>
          <div class="step-label">${step.label}</div>
        </div>
        ${connector}
      `;
    }).join('');
  }

  // --- Step reveal / teardown ---

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

  tearDownFrom(stepNum) {
    for (let i = stepNum; i <= 3; i++) {
      const stepEl = this.container.querySelector(`#wizard-step-${i}`);
      if (stepEl) {
        stepEl.classList.add('wizard-step--hidden');
        stepEl.classList.remove('wizard-step--revealing');
        stepEl.innerHTML = '';
      }
    }
    this.stepsRevealed = Math.min(this.stepsRevealed, stepNum - 1);
  }

  scrollToStep(stepNum) {
    const stepEl = this.container.querySelector(`#wizard-step-${stepNum}`);
    if (!stepEl) return;
    requestAnimationFrame(() => {
      stepEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  // --- Step 1: Confirm Items ---

  renderStep1(el) {
    const contents = this.toteData.contents || [];
    const tote = this.toteData;

    if (contents.length === 0) {
      el.innerHTML = `
        <div class="step-panel step-panel--left">
          <h2>Confirm Items</h2>
          <p class="step-description">Check off the items packed in <strong>${tote.short_name || tote.id}</strong></p>

          <div class="contents-empty" style="padding: 40px 0;">
            <div class="empty-icon">📦</div>
            <h3>No items in this tote</h3>
            <p>Add items to the tote before packing it, or continue to mark it as packed without confirming items.</p>
          </div>

          <div class="step-action">
            <button class="btn btn-primary btn-review" id="btn-continue-step1">Continue →</button>
          </div>
        </div>
      `;
      el.querySelector('#btn-continue-step1').addEventListener('click', () => this.revealStep(2));
      return;
    }

    const allChecked = this.confirmedItemIds.length === contents.length;

    el.innerHTML = `
      <div class="step-panel step-panel--left">
        <h2>Confirm Items</h2>
        <p class="step-description">Check off the items packed in <strong>${tote.short_name || tote.id}</strong></p>

        <div class="pack-select-all">
          <label class="checkbox-label">
            <input type="checkbox" id="chk-select-all" ${allChecked ? 'checked' : ''}>
            <span>${allChecked ? 'Deselect all' : 'Select all'}</span>
          </label>
          <span class="pack-confirmed-count" id="confirmed-count">${this.confirmedItemIds.length} / ${contents.length} confirmed</span>
        </div>

        <div class="contents-list" id="pack-items-list">
          ${contents.map(item => {
            const itemId = item.id || item;
            const shortName = item.short_name || itemId;
            const itemClass = item.class || '';
            const classType = item.class_type || '';
            const isChecked = this.confirmedItemIds.includes(itemId);

            return `
              <div class="content-item pack-item ${isChecked ? 'selected' : ''}" data-id="${itemId}">
                <input type="checkbox" class="item-checkbox pack-item-check" ${isChecked ? 'checked' : ''} data-id="${itemId}">
                <div class="content-info">
                  <div class="content-id-name">
                    <code class="content-id">${itemId}</code>
                    <span class="content-name">${shortName}</span>
                  </div>
                  ${(itemClass || classType) ? `
                    <div class="content-meta">
                      <span class="content-class">${itemClass}</span>
                      ${classType ? `<span class="content-separator">•</span><span class="content-type">${classType}</span>` : ''}
                    </div>
                  ` : ''}
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <div class="step-action">
          <button class="btn btn-primary btn-review" id="btn-continue-step1">Continue →</button>
        </div>
      </div>
    `;

    this.attachStep1Listeners(el, contents);
  }

  attachStep1Listeners(el, contents) {
    const selectAll = el.querySelector('#chk-select-all');
    const selectAllLabel = el.querySelector('#chk-select-all + span');
    const countEl = el.querySelector('#confirmed-count');
    const checkboxes = el.querySelectorAll('.pack-item-check');

    const updateCount = () => {
      const checked = el.querySelectorAll('.pack-item-check:checked').length;
      this.confirmedItemIds = [];
      el.querySelectorAll('.pack-item-check:checked').forEach(cb => {
        this.confirmedItemIds.push(cb.dataset.id);
      });
      countEl.textContent = `${checked} / ${contents.length} confirmed`;
      selectAll.checked = checked === contents.length;
      if (selectAllLabel) selectAllLabel.textContent = checked === contents.length ? 'Deselect all' : 'Select all';
    };

    selectAll.addEventListener('change', (e) => {
      const checked = e.target.checked;
      checkboxes.forEach(cb => {
        cb.checked = checked;
        cb.closest('.pack-item').classList.toggle('selected', checked);
      });
      updateCount();
    });

    checkboxes.forEach(cb => {
      cb.addEventListener('change', (e) => {
        cb.closest('.pack-item').classList.toggle('selected', e.target.checked);
        updateCount();
      });
      // Clicking the row also toggles
      cb.closest('.pack-item').addEventListener('click', (e) => {
        if (e.target.tagName !== 'INPUT') {
          cb.checked = !cb.checked;
          cb.closest('.pack-item').classList.toggle('selected', cb.checked);
          updateCount();
        }
      });
    });

    el.querySelector('#btn-continue-step1').addEventListener('click', () => {
      if (contents.length > 0 && this.confirmedItemIds.length === 0) {
        showError('Please confirm at least one item, or uncheck all and continue');
        return;
      }
      this.revealStep(2);
    });
  }

  // --- Step 2: Photo (optional) ---

  renderStep2(el) {
    const tote = this.toteData;

    el.innerHTML = `
      <div class="step-panel step-panel--left">
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
    const contents = tote.contents || [];

    el.innerHTML = `
      <div class="step-panel step-panel--left">
        <h2>Confirm &amp; Pack</h2>
        <p class="step-description">Review the details before marking this tote as packed</p>

        <div class="review-section">
          <h3 class="review-title">Tote Summary</h3>
          <div class="review-grid">
            <div class="review-item">
              <span class="review-label">Tote ID</span>
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
              <span class="review-label">Items Confirmed</span>
              <span class="review-value"><strong>${this.confirmedItemIds.length} of ${contents.length}</strong></span>
            </div>
            <div class="review-item">
              <span class="review-label">Photo</span>
              <span class="review-value">${this.photoUploaded ? '✓ Added' : 'None'}</span>
            </div>
          </div>
        </div>

        <div class="step-action">
          <button class="btn btn-primary btn-create-storage" id="btn-mark-packed">
            ✓ Mark as Packed
          </button>
        </div>
      </div>
    `;

    el.querySelector('#btn-mark-packed').addEventListener('click', () => {
      this.onComplete({ confirmedItemIds: this.confirmedItemIds, photoUploaded: this.photoUploaded });
    });
  }
}

export default TotePackFlow;
