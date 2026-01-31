// ActionModal Component
// Post-create modal with Skip, Add Cost, Add Photo options

import { loadConfig } from '../api/items.js';

export class ActionModal {
  constructor() {
    this.modal = null;
    this.itemData = null;
  }
  
  async show(itemId, itemName) {
    this.itemData = { itemId, itemName };
    
    if (!this.modal) {
      this.createModal();
    }
    
    // Update content
    this.modal.querySelector('.modal-message').innerHTML = `
      You've successfully created <strong>${this.escapeHtml(itemName)}</strong>!<br>
      What would you like to do next?
    `;
    
    // Show modal
    this.modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }
  
  hide() {
    if (this.modal) {
      this.modal.style.display = 'none';
      document.body.style.overflow = '';
    }
  }
  
  createModal() {
    this.modal = document.createElement('div');
    this.modal.className = 'action-modal';
    this.modal.innerHTML = `
      <div class="modal-overlay"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h2 class="modal-title">✓ Item Created</h2>
        </div>
        <div class="modal-body">
          <p class="modal-message"></p>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn-secondary btn-close">
            Close
          </button>
          <div class="modal-actions">
            <button type="button" class="btn-success btn-add-cost">
              💰 Add Cost
            </button>
            <button type="button" class="btn-primary btn-add-photo">
              📷 Add Photo
            </button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(this.modal);
    this.attachStyles();
    this.attachEventListeners();
  }

  attachEventListeners() {
    // Use event delegation on the entire modal
    this.modal.addEventListener('click', (e) => {
      const target = e.target;

      // Clicking overlay closes modal
      if (target.classList.contains('modal-overlay')) {
        this.handleSkip();
        return;
      }

      // Check for button clicks
      if (target.closest('.btn-close')) {
        e.preventDefault();
        this.handleSkip();
        return;
      }

      if (target.closest('.btn-add-cost')) {
        e.preventDefault();
        this.handleAddCost();
        return;
      }

      if (target.closest('.btn-add-photo')) {
        e.preventDefault();
        this.handleAddPhoto();
        return;
      }
    });
  }
  
  attachStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .action-modal {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 10000;
        display: none;
        align-items: center;
        justify-content: center;
      }
      
      .action-modal .modal-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 1;
      }

      .action-modal .modal-content {
        position: relative;
        background: white;
        border-radius: 8px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
        max-width: 500px;
        width: 90%;
        z-index: 2;
      }

      .action-modal .btn-secondary,
      .action-modal .btn-primary,
      .action-modal .btn-success {
        cursor: pointer;
        padding: 10px 20px;
        border-radius: 6px;
        font-weight: 500;
        border: none;
        position: relative;
        z-index: 3;
        pointer-events: auto;
        min-width: 120px;
        font-size: 14px;
        text-align: center;
      }

      .action-modal .btn-secondary {
        background-color: #e5e7eb;
        color: #374151;
      }

      .action-modal .btn-secondary:hover {
        background-color: #d1d5db;
      }

      .action-modal .btn-primary {
        background-color: #3b82f6;
        color: white;
      }

      .action-modal .btn-primary:hover {
        background-color: #2563eb;
      }
      
      .action-modal .modal-header {
        padding: 20px 24px;
        border-bottom: 1px solid #e5e7eb;
      }
      
      .action-modal .modal-title {
        font-size: 18px;
        font-weight: 600;
        color: #111827;
        margin: 0;
      }
      
      .action-modal .modal-body {
        padding: 24px;
      }
      
      .action-modal .modal-message {
        font-size: 14px;
        color: #6b7280;
        line-height: 1.6;
        margin: 0;
      }
      
      .action-modal .modal-message strong {
        color: #111827;
        font-weight: 600;
      }
      
      .action-modal .modal-footer {
        padding: 16px 24px;
        border-top: 1px solid #e5e7eb;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .action-modal .modal-actions {
        display: flex;
        gap: 12px;
      }

      .action-modal .btn-success {
        background-color: #16a34a;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 500;
      }

      .action-modal .btn-success:hover {
        background-color: #15803d;
      }

      @media (max-width: 768px) {
        .action-modal .modal-footer {
          flex-direction: column;
          gap: 12px;
        }

        .action-modal .modal-actions {
          width: 100%;
          flex-direction: column;
        }

        .action-modal .modal-footer .btn-primary,
        .action-modal .modal-footer .btn-secondary,
        .action-modal .modal-footer .btn-success {
          width: 100%;
        }
      }
    `;
    document.head.appendChild(style);
  }
  
  async handleAddCost() {
    try {
      const config = await loadConfig();
      const financeUrl = config.FINANCE_URL || 'https://dev-finance.spookydecs.com';
      
      // Construct URL with item_id parameter
      const url = `${financeUrl}/new?item_id=${this.itemData.itemId}`;
      
      // Open in new tab
      window.open(url, '_blank');
      
      // Close modal and navigate
      this.hide();
      this.navigateToItems();
    } catch (error) {
      console.error('Failed to open finance page:', error);
      alert('Failed to open finance page. Please try again.');
    }
  }
  
  handleAddPhoto() {
    // Show photo upload modal
    const photoModal = document.createElement('photo-upload-modal');
    photoModal.setAttribute('context', 'item');
    photoModal.setAttribute('photo-type', 'catalog');
    photoModal.setAttribute('season', 'shared');
    photoModal.setAttribute('item-id', this.itemData.itemId);
    photoModal.setAttribute('max-photos', '5');
    
    photoModal.addEventListener('upload-complete', (e) => {
      console.log('Photos uploaded:', e.detail.photo_ids);
      this.hide();
      this.navigateToItems();
    });
    
    photoModal.addEventListener('upload-cancel', () => {
      // User cancelled photo upload, stay on action modal
      photoModal.remove();
    });
    
    document.body.appendChild(photoModal);
    this.hide();
  }
  
  handleSkip() {
    this.hide();
    this.navigateToItems();
  }
  
  navigateToItems() {
    setTimeout(() => {
      window.location.href = '/';
    }, 100);
  }
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Global instance
export const actionModal = new ActionModal();

// Make available globally for onclick handlers
if (typeof window !== 'undefined') {
  window.actionModal = actionModal;
}