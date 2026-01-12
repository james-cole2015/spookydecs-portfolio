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
    this.container = null;
  }

  /**
   * Render the contents panel
   */
  render(containerElement) {
    this.container = containerElement;
    
    const panel = document.createElement('div');
    panel.className = 'contents-panel';
    
    const contentsCount = this.contents.length;
    const isSelfContained = this.storageUnit.class_type === 'Self';
    
    panel.innerHTML = `
      <div class="panel-header">
        <h2 class="panel-title">Contents (${contentsCount} ${contentsCount === 1 ? 'item' : 'items'})</h2>
        ${this.showManageButton && !isSelfContained ? `
          <button class="btn btn-secondary btn-sm" id="btn-manage-contents">
            Manage via Tote Builder
          </button>
        ` : ''}
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
    
    // Attach event listeners
    this.attachEventListeners();
  }

  /**
   * Render empty state
   */
  renderEmpty() {
    return `
      <div class="contents-empty">
        <div class="empty-icon">📦</div>
        <p>This storage unit is empty</p>
        ${this.storageUnit.class_type !== 'Self' ? `
          <button class="btn btn-primary btn-sm" onclick="window.location.href='/storage/pack'">
            Pack Items
          </button>
        ` : ''}
      </div>
    `;
  }

  /**
   * Render contents list
   */
  renderContents() {
    return this.contents.map(item => {
      const photoUrl = item.images?.photo_url || getPlaceholderImage();
      
      return `
        <div class="content-item" data-id="${item.id}">
          <div class="content-photo">
            <img src="${photoUrl}" alt="${item.short_name}">
          </div>
          
          <div class="content-info">
            <div class="content-id-name">
              <span class="content-name">${item.short_name}</span>
            </div>
          </div>
          
          <div class="content-actions">
            <button class="btn btn-sm btn-secondary btn-view-item" data-id="${item.id}">
              View Item
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Manage contents button
    const manageBtn = this.container.querySelector('#btn-manage-contents');
    if (manageBtn) {
      manageBtn.addEventListener('click', () => {
        navigate('/storage/pack');
      });
    }
    
    // View item buttons
    const viewButtons = this.container.querySelectorAll('.btn-view-item');
    viewButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const itemId = e.target.dataset.id;
        // Navigate to items subdomain using config
        const itemsAdminUrl = window.CONFIG?.ITEMS_ADMIN || 'https://dev-items.spookydecs.com';
        window.location.href = `${itemsAdminUrl}/items/${itemId}`;
      });
    });
    
    // Make content items clickable
    const contentItems = this.container.querySelectorAll('.content-item');
    contentItems.forEach(item => {
      item.addEventListener('click', (e) => {
        if (!e.target.closest('button')) {
          const itemId = item.dataset.id;
          // Navigate to items subdomain using config
          const itemsAdminUrl = window.CONFIG?.ITEMS_ADMIN || 'https://dev-items.spookydecs.com';
          window.location.href = `${itemsAdminUrl}/items/${itemId}`;
        }
      });
    });
  }

  /**
   * Update contents data
   */
  updateData(contents, storageUnit) {
    this.contents = contents;
    if (storageUnit) {
      this.storageUnit = storageUnit;
    }
    this.render(this.container);
  }
}

export default ContentsPanel;