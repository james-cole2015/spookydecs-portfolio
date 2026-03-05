/**
 * ContentsPanel Component
 * Display storage contents with item details and thumbnails
 */

import { getPlaceholderImage } from '../utils/storage-config.js';
import { navigate } from '../utils/router.js';

export class ContentsPanel {
  constructor(options = {}) {
    this.contents = options.contents || [];
    this.storageUnit = options.storageUnit || {};
    this.showManageButton = options.showManageButton !== false;
    this.onRemoveItems = options.onRemoveItems || null;
    this.container = null;
    this._removeMode = false;
    this._selectedIds = new Set();
  }

  render(containerElement) {
    this.container = containerElement;
    if (!this.container) return;
    this._removeMode = false;
    this._selectedIds = new Set();
    this._doRender();
  }

  _doRender() {
    const panel = document.createElement('div');
    panel.className = 'contents-panel';

    const contentsCount = this.contents.length;
    const isSelfContained = this.storageUnit.class_type === 'Self';
    const showRemoveBtn = this.onRemoveItems && !isSelfContained && contentsCount > 0;

    panel.innerHTML = `
      <div class="panel-header">
        <h2 class="panel-title">Contents (${contentsCount} ${contentsCount === 1 ? 'item' : 'items'})</h2>
        <div class="panel-header-actions">
          ${this._removeMode ? `
            <span class="remove-selection-count" id="remove-count">0 selected</span>
            <button class="btn btn-danger btn-sm" id="btn-confirm-remove" disabled>Remove Selected</button>
            <button class="btn btn-secondary btn-sm" id="btn-cancel-remove">Cancel</button>
          ` : `
            ${this.showManageButton && !isSelfContained ? `
              <button class="btn btn-secondary btn-sm" id="btn-manage-contents">
                Manage via Tote Builder
              </button>
            ` : ''}
            ${showRemoveBtn ? `
              <button class="btn btn-secondary btn-sm" id="btn-remove-mode">Remove Items</button>
            ` : ''}
          `}
        </div>
      </div>

      ${isSelfContained ? `
        <div class="panel-notice">
          <p>ℹ️ Self-contained storage units have immutable contents.</p>
        </div>
      ` : ''}

      <div class="contents-list">
        ${contentsCount === 0 ? this.renderEmpty() : this.renderContents()}
      </div>
    `;

    this.container.innerHTML = '';
    this.container.appendChild(panel);

    this.attachEventListeners();
  }

  renderEmpty() {
    return `
      <div class="contents-empty">
        <div class="empty-icon">📦</div>
        <p>This storage unit is empty</p>
        ${this.storageUnit.class_type !== 'Self' ? `
          <button class="btn btn-primary btn-sm" onclick="window.location.href='/storage/pack/${this.storageUnit.id}'">
            Pack Items
          </button>
        ` : ''}
      </div>
    `;
  }

  renderContents() {
    return this.contents.map(item => {
      const photoUrl = item.images?.photo_url || getPlaceholderImage();
      const isSelected = this._selectedIds.has(item.id);

      return `
        <div class="content-item${this._removeMode ? ' remove-selectable' : ''}${isSelected ? ' remove-selected' : ''}" data-id="${item.id}">
          ${this._removeMode ? `
            <div class="content-checkbox">
              <input type="checkbox" class="remove-checkbox" data-id="${item.id}" ${isSelected ? 'checked' : ''}>
            </div>
          ` : ''}

          <div class="content-photo">
            <img src="${photoUrl}" alt="${item.short_name}">
          </div>

          <div class="content-info">
            <div class="content-id-name">
              <span class="content-name">${item.short_name}</span>
            </div>
          </div>

          ${!this._removeMode ? `
            <div class="content-actions">
              <button class="btn btn-sm btn-secondary btn-view-item" data-id="${item.id}">
                View Item
              </button>
            </div>
          ` : ''}
        </div>
      `;
    }).join('');
  }

  async attachEventListeners() {
    const manageBtn = this.container.querySelector('#btn-manage-contents');
    if (manageBtn) {
      manageBtn.addEventListener('click', () => navigate(`/storage/pack/${this.storageUnit.id}`));
    }

    const removeModeBtn = this.container.querySelector('#btn-remove-mode');
    if (removeModeBtn) {
      removeModeBtn.addEventListener('click', () => {
        this._removeMode = true;
        this._selectedIds = new Set();
        this._doRender();
      });
    }

    const cancelBtn = this.container.querySelector('#btn-cancel-remove');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        this._removeMode = false;
        this._selectedIds = new Set();
        this._doRender();
      });
    }

    const confirmBtn = this.container.querySelector('#btn-confirm-remove');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => {
        if (this._selectedIds.size > 0 && this.onRemoveItems) {
          this.onRemoveItems([...this._selectedIds]);
        }
      });
    }

    if (this._removeMode) {
      const checkboxes = this.container.querySelectorAll('.remove-checkbox');
      checkboxes.forEach(cb => {
        cb.addEventListener('change', (e) => {
          const itemId = e.target.dataset.id;
          if (e.target.checked) {
            this._selectedIds.add(itemId);
          } else {
            this._selectedIds.delete(itemId);
          }

          const countEl = this.container.querySelector('#remove-count');
          if (countEl) countEl.textContent = `${this._selectedIds.size} selected`;

          const btn = this.container.querySelector('#btn-confirm-remove');
          if (btn) btn.disabled = this._selectedIds.size === 0;

          const itemEl = e.target.closest('.content-item');
          if (itemEl) itemEl.classList.toggle('remove-selected', e.target.checked);
        });
      });

      // Clicking anywhere on the row toggles the checkbox
      const contentItems = this.container.querySelectorAll('.content-item');
      contentItems.forEach(item => {
        item.addEventListener('click', (e) => {
          if (e.target.type !== 'checkbox') {
            const cb = item.querySelector('.remove-checkbox');
            if (cb) {
              cb.checked = !cb.checked;
              cb.dispatchEvent(new Event('change'));
            }
          }
        });
      });
    } else {
      const { ITEMS_ADMIN } = await window.SpookyConfig.get();
      const itemsAdminUrl = ITEMS_ADMIN || 'https://dev-items.spookydecs.com';

      const viewButtons = this.container.querySelectorAll('.btn-view-item');
      viewButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
          const itemId = e.target.dataset.id;
          window.location.href = `${itemsAdminUrl}/items/${itemId}`;
        });
      });

      const contentItems = this.container.querySelectorAll('.content-item');
      contentItems.forEach(item => {
        item.addEventListener('click', (e) => {
          if (!e.target.closest('button')) {
            window.location.href = `${itemsAdminUrl}/items/${item.dataset.id}`;
          }
        });
      });
    }
  }

  updateData(contents, storageUnit) {
    this.contents = contents;
    if (storageUnit) this.storageUnit = storageUnit;
    this.render(this.container);
  }
}

export default ContentsPanel;
