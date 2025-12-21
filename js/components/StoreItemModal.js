/**
 * StoreItemModal Component
 * Modal for storing a single non-packable item in a location
 */

export class StoreItemModal {
  constructor(options = {}) {
    this.item = options.item || {};
    this.onConfirm = options.onConfirm || (() => {});
    this.onCancel = options.onCancel || (() => {});
    this.modal = null;
    this.location = '';
    this.customLocation = '';
  }

  /**
   * Show the modal
   */
  show() {
    // Create modal backdrop
    this.modal = document.createElement('div');
    this.modal.className = 'modal-backdrop';
    
    this.modal.innerHTML = `
      <div class="modal-dialog store-item-modal">
        <div class="modal-header">
          <h2 class="modal-title">Store Item</h2>
          <button class="modal-close" id="modal-close">&times;</button>
        </div>
        
        <div class="modal-body">
          <div class="modal-item-info">
            <div class="item-info-icon">📦</div>
            <div class="item-info-text">
              <div class="item-info-name">${this.item.short_name}</div>
              <code class="item-info-id">${this.item.id}</code>
            </div>
          </div>
          
          <div class="form-field">
            <label class="form-label">Storage Location</label>
            <select class="form-select" id="location-select">
              <option value="">-- Select Location --</option>
              <option value="Attic">Attic</option>
              <option value="Crawl Space">Crawl Space</option>
              <option value="Shed">Shed</option>
              <option value="Custom">Custom</option>
            </select>
          </div>
          
          <div class="form-field hidden" id="custom-location-field">
            <label class="form-label">Custom Location (Max 20 characters)</label>
            <input 
              type="text" 
              class="form-input" 
              id="custom-location-input"
              placeholder="Enter custom location..."
              maxlength="20"
            >
            <span class="form-help" id="char-count">0 / 20 characters</span>
          </div>
          
          <div class="modal-help">
            This item will be marked as stored in the selected location.
          </div>
        </div>
        
        <div class="modal-footer">
          <button class="btn btn-secondary" id="btn-cancel">Cancel</button>
          <button class="btn btn-primary" id="btn-confirm" disabled>Store Item</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(this.modal);
    
    // Attach event listeners
    this.attachEventListeners();
    
    // Focus on select
    setTimeout(() => {
      const select = this.modal.querySelector('#location-select');
      if (select) select.focus();
    }, 100);
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    const closeBtn = this.modal.querySelector('#modal-close');
    const cancelBtn = this.modal.querySelector('#btn-cancel');
    const confirmBtn = this.modal.querySelector('#btn-confirm');
    const locationSelect = this.modal.querySelector('#location-select');
    const customField = this.modal.querySelector('#custom-location-field');
    const customInput = this.modal.querySelector('#custom-location-input');
    const charCount = this.modal.querySelector('#char-count');
    
    // Close handlers
    closeBtn.addEventListener('click', () => this.close());
    cancelBtn.addEventListener('click', () => this.close());
    
    // Confirm handler
    confirmBtn.addEventListener('click', () => this.handleConfirm());
    
    // Location select handler
    locationSelect.addEventListener('change', (e) => {
      this.location = e.target.value;
      
      if (this.location === 'Custom') {
        customField.classList.remove('hidden');
        customInput.focus();
      } else {
        customField.classList.add('hidden');
        this.customLocation = '';
      }
      
      this.updateConfirmButton();
    });
    
    // Custom input handler
    if (customInput) {
      customInput.addEventListener('input', (e) => {
        this.customLocation = e.target.value;
        charCount.textContent = `${this.customLocation.length} / 20 characters`;
        this.updateConfirmButton();
      });
    }
    
    // Close on backdrop click
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.close();
      }
    });
    
    // Close on Escape key
    document.addEventListener('keydown', this.handleEscape);
  }

  /**
   * Update confirm button state
   */
  updateConfirmButton() {
    const confirmBtn = this.modal.querySelector('#btn-confirm');
    
    if (this.location === 'Custom') {
      confirmBtn.disabled = !this.customLocation.trim();
    } else {
      confirmBtn.disabled = !this.location;
    }
  }

  /**
   * Handle confirm
   */
  handleConfirm() {
    const finalLocation = this.location === 'Custom' ? this.customLocation : this.location;
    
    if (!finalLocation) {
      alert('Please select a location');
      return;
    }
    
    this.onConfirm(finalLocation);
    this.close();
  }

  /**
   * Handle escape key
   */
  handleEscape = (e) => {
    if (e.key === 'Escape') {
      this.close();
    }
  }

  /**
   * Close modal
   */
  close() {
    document.removeEventListener('keydown', this.handleEscape);
    if (this.modal && this.modal.parentNode) {
      this.modal.parentNode.removeChild(this.modal);
    }
    this.modal = null;
    this.onCancel();
  }
}

export default StoreItemModal;
