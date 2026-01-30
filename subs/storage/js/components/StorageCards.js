/**
 * StorageCards Component
 * Responsive card grid view for storage units (desktop + mobile)
 */

import { getPackedLabel } from '../utils/storage-config.js';
import { navigate } from '../utils/router.js';

export class StorageCards {
  constructor(options = {}) {
    this.data = options.data || [];
    this.onDelete = options.onDelete || (() => {});
    this.container = null;
  }

  /**
   * Render the card grid
   */
  render(containerElement) {
    this.container = containerElement;
    
    if (this.data.length === 0) {
      this.renderEmpty();
      return;
    }
    
    const cardsGrid = document.createElement('div');
    cardsGrid.className = 'storage-cards-grid';
    
    this.data.forEach(unit => {
      const card = this.createCard(unit);
      cardsGrid.appendChild(card);
    });
    
    this.container.innerHTML = '';
    this.container.appendChild(cardsGrid);
  }

  /**
   * Create individual storage card
   */
  createCard(unit) {
    const card = document.createElement('div');
    card.className = 'storage-card';
    card.dataset.id = unit.id;
    
    // Make entire card clickable
    card.addEventListener('click', (e) => {
      // Don't navigate if clicking on a button
      if (!e.target.closest('.card-footer-btn')) {
        navigate(`/storage/${unit.id}`);
      }
    });
    
    // Determine image source
    const imageUrl = this.getImageUrl(unit);
    const packedStatus = unit.packed ? 'packed' : 'unpacked';
    const packedLabel = unit.packed ? 'Packed' : 'Unpacked';
    
    card.innerHTML = `
      <div class="card-image-container">
        ${imageUrl ? `
          <img src="${imageUrl}" alt="${unit.short_name}" class="card-image">
        ` : `
          <div class="card-image-placeholder">
            <svg class="placeholder-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
              <line x1="12" y1="22.08" x2="12" y2="12"></line>
            </svg>
          </div>
        `}
        <span class="card-badge card-badge-${packedStatus}">${packedLabel}</span>
      </div>
      
      <div class="card-content">
        <h3 class="card-title">${unit.short_name}</h3>
        <div class="card-id">${unit.id}</div>
        <div class="card-info">
          <span class="card-info-item">${unit.season || 'Unknown'}</span>
          <span class="card-info-separator">•</span>
          <span class="card-info-item">${unit.location || 'Unknown'}</span>
        </div>
      </div>
      
      <div class="card-footer">
        <button class="card-footer-btn btn-view" data-action="view" data-id="${unit.id}">
          View
        </button>
        <button class="card-footer-btn btn-edit" data-action="edit" data-id="${unit.id}">
          Edit
        </button>
        <button class="card-footer-btn btn-pack" data-action="pack" data-id="${unit.id}" disabled>
          Pack
        </button>
      </div>
    `;
    
    // Attach footer button listeners
    this.attachFooterListeners(card, unit);
    
    return card;
  }

  /**
   * Get image URL from unit data
   */
  getImageUrl(unit) {
    if (!unit.images) return null;
    
    // Prefer thumbnail, fallback to full photo
    return unit.images.thumb_cloudfront_url || 
           unit.images.photo_url || 
           null;
  }

  /**
   * Attach event listeners to footer buttons
   */
  attachFooterListeners(card, unit) {
    const viewBtn = card.querySelector('[data-action="view"]');
    const editBtn = card.querySelector('[data-action="edit"]');
    const packBtn = card.querySelector('[data-action="pack"]');
    
    if (viewBtn) {
      viewBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        navigate(`/storage/${unit.id}`);
      });
    }
    
    if (editBtn) {
      editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        navigate(`/storage/${unit.id}/edit`);
      });
    }
    
    if (packBtn) {
      packBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        // Pack functionality disabled for now
        console.log('Pack button clicked (disabled)');
      });
    }
  }

  /**
   * Render empty state
   */
  renderEmpty() {
    this.container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📦</div>
        <h3>No Storage Units Found</h3>
        <p>No storage units match your current filters.</p>
        <button class="btn btn-primary" onclick="window.location.href='/storage/create'">
          Create Storage Unit
        </button>
      </div>
    `;
  }

  /**
   * Update data and re-render
   */
  updateData(data) {
    this.data = data;
    if (this.container) {
      this.render(this.container);
    }
  }
}

export default StorageCards;