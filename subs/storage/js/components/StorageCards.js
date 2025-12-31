/**
 * StorageCards Component
 * Mobile card view for storage units
 */

import { getPackedLabel, getPlaceholderImage } from '../utils/storage-config.js';
import { navigate } from '../utils/router.js';

export class StorageCards {
  constructor(options = {}) {
    this.data = options.data || [];
    this.onDelete = options.onDelete || (() => {});
    this.container = null;
  }

  /**
   * Render the cards
   */
  render(containerElement) {
    this.container = containerElement;
    
    if (this.data.length === 0) {
      this.renderEmpty();
      return;
    }
    
    const cardsContainer = document.createElement('div');
    cardsContainer.className = 'storage-cards';
    
    this.data.forEach(unit => {
      const card = this.createCard(unit);
      cardsContainer.appendChild(card);
    });
    
    this.container.innerHTML = '';
    this.container.appendChild(cardsContainer);
  }

  /**
   * Create storage card
   */
  createCard(unit) {
    const card = document.createElement('div');
    card.className = 'storage-card';
    card.dataset.id = unit.id;
    
    const photoUrl = unit.images?.photo_url || getPlaceholderImage();
    const season = unit.season || unit.category || 'Unknown';
    const classType = unit.class_type || 'Tote';
    
    card.innerHTML = `
      <div class="card-photo">
        <img src="${photoUrl}" alt="${unit.short_name}">
        <span class="packed-badge-overlay ${unit.packed ? 'packed' : 'unpacked'}">
          ${getPackedLabel(unit.packed)}
        </span>
      </div>
      
      <div class="card-body">
        <div class="card-header">
          <h3 class="card-title">${unit.short_name}</h3>
          <code class="card-id">${unit.id}</code>
        </div>
        
        <div class="card-meta">
          <div class="card-meta-item">
            <span class="meta-label">Type:</span>
            <span class="meta-value">${classType}</span>
          </div>
          
          <div class="card-meta-item">
            <span class="meta-label">Season:</span>
            <span class="badge badge-${season.toLowerCase()}">${season}</span>
          </div>
          
          <div class="card-meta-item">
            <span class="meta-label">Location:</span>
            <span class="meta-value">${unit.location || '-'}</span>
          </div>
          
          ${unit.size ? `
            <div class="card-meta-item">
              <span class="meta-label">Size:</span>
              <span class="meta-value">${unit.size}</span>
            </div>
          ` : ''}
          
          <div class="card-meta-item">
            <span class="meta-label">Contents:</span>
            <span class="meta-value">${unit.contents_count || 0} items</span>
          </div>
        </div>
        
        ${unit.general_notes ? `
          <div class="card-notes">
            <p>${unit.general_notes}</p>
          </div>
        ` : ''}
        
        <div class="card-actions">
          <button class="btn btn-primary btn-view" data-id="${unit.id}">
            View
          </button>
          <button class="btn btn-secondary btn-edit" data-id="${unit.id}">
            Edit
          </button>
          <button class="btn btn-danger btn-delete" data-id="${unit.id}">
            Delete
          </button>
        </div>
      </div>
    `;
    
    // Attach event listeners
    this.attachCardListeners(card, unit);
    
    return card;
  }

  /**
   * Attach event listeners to card buttons
   */
  attachCardListeners(card, unit) {
    const viewBtn = card.querySelector('.btn-view');
    const editBtn = card.querySelector('.btn-edit');
    const deleteBtn = card.querySelector('.btn-delete');
    
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
    
    if (deleteBtn) {
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.onDelete(unit);
      });
    }
    
    // Make entire card clickable (except buttons)
    card.addEventListener('click', (e) => {
      if (!e.target.closest('button')) {
        navigate(`/storage/${unit.id}`);
      }
    });
  }

  /**
   * Render empty state
   */
  renderEmpty() {
    this.container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📦</div>
        <h3>No Storage Units Found</h3>
        <p>No storage units match your filters.</p>
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
    this.render(this.container);
  }
}

export default StorageCards;
