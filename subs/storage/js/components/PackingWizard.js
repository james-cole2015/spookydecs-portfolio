/**
 * PackingWizard Component
 * Unified wizard for all packing operations: totes, single-packed items, and storage
 * UPDATED: Fixed item eligibility filtering for all modes
 */

import { getPlaceholderImage } from '../utils/storage-config.js';
import STORAGE_CONFIG from '../utils/storage-config.js';

const PACKING_MODES = {
  TOTE: 'tote',
  SINGLE: 'single',
  STORE: 'store'
};

export class PackingWizard {
  constructor(options = {}) {
    this.mode = options.mode || null; // null means show mode selector
    this.preselectedItems = options.preselectedItems || [];
    this.storageUnits = options.storageUnits || [];
    this.availableItems = options.availableItems || [];
    this.onComplete = options.onComplete || (() => {});
    this.onCancel = options.onCancel || (() => {});
    this.container = null;
    
    // Wizard state
    this.currentStep = this.mode ? 1 : 0; // Start at 0 if no mode selected
    this.selectedStorage = null;
    this.selectedItems = [...this.preselectedItems];
    this.location = '';
    this.customLocation = '';
    this.markAsPacked = false;
    
    // Pagination state
    this.itemsPerPage = 10;
    this.currentItemPage = 1;
    this.filteredItems = [];
    this.isLoadingMore = false;
  }

  /**
   * Render the wizard
   */
  render(containerElement) {
    this.container = containerElement;
    
    const wizard = document.createElement('div');
    wizard.className = 'wizard-container';
    
    wizard.innerHTML = `
      <div class="wizard-header">
        <h1 class="wizard-title">Packing Wizard</h1>
        <p class="wizard-subtitle">${this.getSubtitle()}</p>
      </div>
      
      <div class="wizard-progress" id="wizard-progress"></div>
      
      <div class="wizard-actions">
        <button class="btn btn-secondary" id="btn-cancel">Cancel</button>
        <div style="flex: 1"></div>
        <button class="btn btn-secondary hidden" id="btn-prev">← Previous</button>
        <button class="btn btn-primary" id="btn-next">Next →</button>
      </div>
      
      <div class="wizard-body" id="wizard-body"></div>
    `;
    
    this.container.innerHTML = '';
    this.container.appendChild(wizard);
    
    // Render initial step
    this.renderProgress();
    this.renderStep();
    
    // Attach event listeners
    this.attachEventListeners();
  }

  /**
   * Get subtitle based on mode
   */
  getSubtitle() {
    switch (this.mode) {
      case PACKING_MODES.TOTE:
        return 'Pack multiple items into a tote';
      case PACKING_MODES.SINGLE:
        return 'Pack items in original boxes';
      case PACKING_MODES.STORE:
        return 'Store oversized items by location';
      default:
        return 'Choose your packing workflow';
    }
  }

  /**
   * Render progress indicator
   */
  renderProgress() {
    const progressContainer = this.container.querySelector('#wizard-progress');
    const steps = this.getStepsForMode();
    
    progressContainer.innerHTML = steps.map((step, index) => {
      const stepNum = index + (this.mode ? 1 : 0);
      const isActive = stepNum === this.currentStep;
      const isCompleted = stepNum < this.currentStep;
      
      return `
        <div class="progress-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}">
          <div class="step-indicator">${isCompleted ? '✓' : (this.mode ? stepNum : (index === 0 ? '?' : stepNum))}</div>
          <div class="step-label">${step.label}</div>
        </div>
      `;
    }).join('');
  }

  /**
   * Get steps based on mode
   */
  getStepsForMode() {
    if (!this.mode) {
      return [{ label: 'Choose Type' }];
    }
    
    switch (this.mode) {
      case PACKING_MODES.TOTE:
        return [
          { label: 'Select Tote' },
          { label: 'Select Items' },
          { label: 'Review' }
        ];
      case PACKING_MODES.SINGLE:
        return [
          { label: 'Select Items' },
          { label: 'Choose Location' },
          { label: 'Review' }
        ];
      case PACKING_MODES.STORE:
        return [
          { label: 'Select Items' },
          { label: 'Choose Location' },
          { label: 'Review' }
        ];
    }
  }

  /**
   * Render current step
   */
  renderStep() {
    const bodyContainer = this.container.querySelector('#wizard-body');
    
    if (this.currentStep === 0) {
      this.renderModeSelector(bodyContainer);
      return;
    }
    
    switch (this.mode) {
      case PACKING_MODES.TOTE:
        this.renderToteFlow(bodyContainer);
        break;
      case PACKING_MODES.SINGLE:
        this.renderSingleFlow(bodyContainer);
        break;
      case PACKING_MODES.STORE:
        this.renderStoreFlow(bodyContainer);
        break;
    }
    
    this.updateButtons();
  }

  /**
   * Step 0: Mode Selector
   */
  renderModeSelector(container) {
    container.innerHTML = `
      <div class="wizard-step active mode-selector">
        <h2 class="mode-selector-title">Choose Packing Type</h2>
        
        <div class="mode-cards">
          <div class="mode-card" data-mode="${PACKING_MODES.TOTE}">
            <div class="mode-icon">📦</div>
            <h3 class="mode-title">Pack Tote</h3>
            <p class="mode-description">Pack multiple items into a tote for storage</p>
          </div>
          
          <div class="mode-card" data-mode="${PACKING_MODES.SINGLE}">
            <div class="mode-icon">📦</div>
            <h3 class="mode-title">Pack Single Item</h3>
            <p class="mode-description">Pack items in their original boxes</p>
          </div>
          
          <div class="mode-card" data-mode="${PACKING_MODES.STORE}">
            <div class="mode-icon">📍</div>
            <h3 class="mode-title">Store Items</h3>
            <p class="mode-description">Store oversized items by location</p>
          </div>
        </div>
      </div>
    `;
    
    // Add click handlers
    container.querySelectorAll('.mode-card').forEach(card => {
      card.addEventListener('click', () => {
        this.mode = card.dataset.mode;
        this.currentStep = 1;
        this.renderProgress();
        this.renderStep();
      });
    });
  }

  /**
   * Tote Flow
   */
  renderToteFlow(container) {
    switch (this.currentStep) {
      case 1:
        this.renderSelectTote(container);
        break;
      case 2:
        this.renderSelectItems(container, this.filterToteItems());
        break;
      case 3:
        this.renderReviewTote(container);
        break;
    }
  }

  /**
   * Single Flow
   */
  renderSingleFlow(container) {
    switch (this.currentStep) {
      case 1:
        this.renderSelectItems(container, this.filterSingleItems());
        break;
      case 2:
        this.renderChooseLocation(container);
        break;
      case 3:
        this.renderReviewSingle(container);
        break;
    }
  }

  /**
   * Store Flow
   */
  renderStoreFlow(container) {
    switch (this.currentStep) {
      case 1:
        this.renderSelectItems(container, this.filterStoreItems());
        break;
      case 2:
        this.renderChooseLocation(container);
        break;
      case 3:
        this.renderReviewStore(container);
        break;
    }
  }

  /**
   * Filter items for tote packing
   * FIXED: Items that can be packed into totes
   */
  filterToteItems() {
    return this.availableItems.filter(item => {
      const isPackable = item.packing_data?.packable !== false;
      const isUnpacked = item.packing_data?.packing_status === false;
      const isNotSinglePacked = item.packing_data?.single_packed !== true;
      const isNotReceptacle = item.class_type !== 'Receptacle';
      
      return isPackable && isUnpacked && isNotSinglePacked && isNotReceptacle;
    });
  }

  /**
   * Filter items for single packing
   * FIXED: Added Receptacle check
   */
  filterSingleItems() {
    return this.availableItems.filter(item => {
      const isSinglePacked = item.packing_data?.single_packed === true;
      const isUnpacked = item.packing_data?.packing_status === false;
      const isNotReceptacle = item.class_type !== 'Receptacle'; // FIXED: Added this check
      
      return isSinglePacked && isUnpacked && isNotReceptacle; // FIXED: Added isNotReceptacle
    });
  }

  /**
   * Filter items for storage
   * Already correct - no changes needed
   */
  filterStoreItems() {
    return this.availableItems.filter(item => {
      const isNonPackable = item.packing_data?.packable === false;
      const isUnstored = item.packing_data?.packing_status === false;
      const isNotReceptacle = item.class_type !== 'Receptacle';
      
      return isNonPackable && isUnstored && isNotReceptacle;
    });
  }

  /**
   * Render: Select Tote
   */
  renderSelectTote(container) {
    const totes = this.storageUnits.filter(unit => unit.class_type === 'Tote');
    
    if (totes.length === 0) {
      container.innerHTML = `
        <div class="wizard-step active">
          <div class="contents-empty">
            <div class="empty-icon">📦</div>
            <h3>No Totes Available</h3>
            <p>Create a tote first before packing items.</p>
            <button class="btn btn-primary" onclick="window.location.href='/storage/create'">
              Create Tote
            </button>
          </div>
        </div>
      `;
      return;
    }
    
    container.innerHTML = `
      <div class="wizard-step active">        
        <div class="form-field mb-md">
          <label class="form-label">Filter by Season</label>
          <select class="form-select" id="season-filter">
            <option value="">All Seasons</option>
            <option value="Halloween">Halloween</option>
            <option value="Christmas">Christmas</option>
            <option value="Shared">Shared</option>
          </select>
        </div>
        
        <div class="storage-cards" id="storage-selection"></div>
      </div>
    `;
    
    this.renderStorageOptions(totes);
    
    const seasonFilter = container.querySelector('#season-filter');
    seasonFilter.addEventListener('change', (e) => {
      const season = e.target.value;
      const filtered = season ? totes.filter(t => t.season === season) : totes;
      this.renderStorageOptions(filtered);
    });
  }

  /**
   * Render storage options
   */
  renderStorageOptions(totes) {
    const storageContainer = this.container.querySelector('#storage-selection');
    
    if (!storageContainer) return;
    
    storageContainer.innerHTML = totes.map(unit => {
      const photoUrl = unit.images?.photo_url || getPlaceholderImage();
      const isSelected = this.selectedStorage?.id === unit.id;
      const shortName = unit.short_name || 'Unnamed Tote';
      const season = unit.season || 'Unknown';
      const location = unit.location || 'Unknown';
      const size = unit.size || 'Unknown';
      const contentsCount = unit.contents_count || unit.contents?.length || 0;
      
      return `
        <div class="storage-card ${isSelected ? 'selected' : ''}" data-id="${unit.id}">
          <div class="card-photo">
            <img src="${photoUrl}" alt="${shortName}">
          </div>
          
          <div class="card-body">
            <div class="card-header">
              <h3 class="card-title">${shortName}</h3>
              <code class="card-id">${unit.id}</code>
            </div>
            
            <div class="card-meta">
              <div class="card-meta-item">
                <span class="meta-label">Season</span>
                <span class="badge badge-${season.toLowerCase()}">${season}</span>
              </div>
              
              <div class="card-meta-item">
                <span class="meta-label">Location</span>
                <span class="meta-value">${location}</span>
              </div>
              
              <div class="card-meta-item">
                <span class="meta-label">Size</span>
                <span class="meta-value">${size}</span>
              </div>
              
              <div class="card-meta-item">
                <span class="meta-label">Contents</span>
                <span class="meta-value">${contentsCount} items</span>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
    
    storageContainer.querySelectorAll('.storage-card').forEach(card => {
      card.addEventListener('click', () => {
        const storageId = card.dataset.id;
        this.selectedStorage = totes.find(t => t.id === storageId);
        
        storageContainer.querySelectorAll('.storage-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
      });
    });
  }

  /**
   * Render: Select Items (reusable for all flows)
   */
  renderSelectItems(container, availableItems) {
    if (availableItems.length === 0) {
      container.innerHTML = `
        <div class="wizard-step active">
          <div class="contents-empty">
            <div class="empty-icon">📦</div>
            <h3>No Items Available</h3>
            <p>All items matching this criteria are already packed or deployed.</p>
          </div>
        </div>
      `;
      return;
    }
    
    this.filteredItems = availableItems;
    this.currentItemPage = 1;
    
    container.innerHTML = `
      <div class="wizard-step active">
        ${this.mode === PACKING_MODES.TOTE ? `
          <p class="form-help mb-md">Packing into: <strong>${this.selectedStorage?.short_name || 'Select tote'}</strong></p>
        ` : ''}
        
        <div class="form-field mb-md">
          <input 
            type="text" 
            class="form-input" 
            placeholder="🔍 Search items..."
            id="item-search"
          >
        </div>
        
        <div class="form-field mb-md">
          <label class="form-label">Filter by Class</label>
          <select class="form-select" id="class-filter">
            <option value="">All Classes</option>
            <option value="Decoration">Decoration</option>
            <option value="Light">Light</option>
            <option value="Accessory">Accessory</option>
          </select>
        </div>
        
        <div class="mb-md">
          <strong>Selected: <span id="selected-count">${this.selectedItems.length}</span> items</strong>
        </div>
        
        <div class="contents-list" id="items-selection"></div>
        <div class="loading-indicator hidden" id="loading-more">
          <p>Loading more items...</p>
        </div>
      </div>
    `;
    
    this.renderItemOptions(this.filteredItems, true);
    this.setupInfiniteScroll();
    
    const searchInput = container.querySelector('#item-search');
    searchInput.addEventListener('input', (e) => {
      const term = e.target.value.toLowerCase();
      const filtered = availableItems.filter(item => 
        item.id.toLowerCase().includes(term) || 
        item.short_name.toLowerCase().includes(term)
      );
      this.filteredItems = filtered;
      this.currentItemPage = 1;
      this.renderItemOptions(filtered, true);
    });
    
    const classFilter = container.querySelector('#class-filter');
    classFilter.addEventListener('change', (e) => {
      const itemClass = e.target.value;
      const filtered = itemClass ? availableItems.filter(i => i.class === itemClass) : availableItems;
      this.filteredItems = filtered;
      this.currentItemPage = 1;
      this.renderItemOptions(filtered, true);
    });
  }

  /**
   * Setup infinite scroll
   */
  setupInfiniteScroll() {
    const itemsContainer = this.container.querySelector('#items-selection');
    
    if (!itemsContainer) return;
    
    itemsContainer.addEventListener('scroll', () => {
      const scrollTop = itemsContainer.scrollTop;
      const scrollHeight = itemsContainer.scrollHeight;
      const clientHeight = itemsContainer.clientHeight;
      
      const scrolledToBottom = scrollTop + clientHeight >= scrollHeight - 100;
      
      if (scrolledToBottom && !this.isLoadingMore) {
        this.loadMoreItems();
      }
    });
  }

  /**
   * Load more items
   */
  loadMoreItems() {
    const totalItems = this.filteredItems.length;
    const itemsShown = this.currentItemPage * this.itemsPerPage;
    
    if (itemsShown >= totalItems) return;
    
    this.isLoadingMore = true;
    
    const loadingIndicator = this.container.querySelector('#loading-more');
    if (loadingIndicator) loadingIndicator.classList.remove('hidden');
    
    setTimeout(() => {
      this.currentItemPage++;
      this.renderItemOptions(this.filteredItems, false);
      
      this.isLoadingMore = false;
      if (loadingIndicator) loadingIndicator.classList.add('hidden');
    }, 300);
  }

  /**
   * Render item options with pagination
   */
  renderItemOptions(items, resetPage = false) {
    const itemsContainer = this.container.querySelector('#items-selection');
    
    if (!itemsContainer) return;
    
    const itemsToShow = resetPage 
      ? items.slice(0, this.itemsPerPage)
      : items.slice(0, this.currentItemPage * this.itemsPerPage);
    
    if (resetPage) itemsContainer.innerHTML = '';
    
    const itemsHTML = itemsToShow.map(item => {
      const photoUrl = item.images?.photo_url || getPlaceholderImage();
      const isSelected = this.selectedItems.includes(item.id);
      
      return `
        <div class="content-item ${isSelected ? 'selected' : ''}" data-id="${item.id}">
          <input 
            type="checkbox" 
            class="item-checkbox" 
            ${isSelected ? 'checked' : ''}
            data-id="${item.id}"
          >
          
          <div class="content-photo">
            <img src="${photoUrl}" alt="${item.short_name}">
          </div>
          
          <div class="content-info">
            <div class="content-id-name">
              <code class="content-id">${item.id}</code>
              <span class="content-name">${item.short_name}</span>
            </div>
            
            <div class="content-meta">
              <span class="content-class">${item.class || ''}</span>
              ${item.class_type ? `
                <span class="content-separator">•</span>
                <span class="content-type">${item.class_type}</span>
              ` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');
    
    if (resetPage) {
      itemsContainer.innerHTML = itemsHTML;
    } else {
      itemsContainer.insertAdjacentHTML('beforeend', itemsHTML);
    }
    
    itemsContainer.querySelectorAll('.item-checkbox').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const itemId = e.target.dataset.id;
        
        if (e.target.checked) {
          if (!this.selectedItems.includes(itemId)) {
            this.selectedItems.push(itemId);
          }
        } else {
          this.selectedItems = this.selectedItems.filter(id => id !== itemId);
        }
        
        const card = e.target.closest('.content-item');
        card.classList.toggle('selected', e.target.checked);
        
        this.updateSelectedCount();
      });
    });
    
    itemsContainer.querySelectorAll('.content-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.tagName !== 'INPUT') {
          const checkbox = item.querySelector('.item-checkbox');
          checkbox.click();
        }
      });
    });
    
    this.updateSelectedCount();
  }

  /**
   * Update selected item count
   */
  updateSelectedCount() {
    const countElement = this.container.querySelector('#selected-count');
    if (countElement) {
      countElement.textContent = this.selectedItems.length;
    }
  }

  /**
   * Render: Choose Location (for single and store flows)
   */
  renderChooseLocation(container) {
    container.innerHTML = `
      <div class="wizard-step active">
        <p class="form-help mb-md">Select where these items will be stored</p>
        
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
          <label class="form-label">Custom Location (Max 20 characters)</label>
          <input 
            type="text" 
            class="form-input" 
            id="custom-location-input"
            placeholder="Enter custom location..."
            maxlength="20"
            value="${this.customLocation}"
          >
          <span class="form-help" id="char-count">0 / 20 characters</span>
        </div>
      </div>
    `;
    
    const locationSelect = container.querySelector('#location-select');
    const customField = container.querySelector('#custom-location-field');
    const customInput = container.querySelector('#custom-location-input');
    const charCount = container.querySelector('#char-count');
    
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
    
    if (customInput) {
      customInput.addEventListener('input', (e) => {
        this.customLocation = e.target.value;
        charCount.textContent = `${this.customLocation.length} / 20 characters`;
      });
      
      charCount.textContent = `${this.customLocation.length} / 20 characters`;
    }
  }

  /**
   * Render: Review Tote
   */
  renderReviewTote(container) {
    const currentContents = this.selectedStorage?.contents_count || 0;
    const newTotal = currentContents + this.selectedItems.length;
    
    container.innerHTML = `
      <div class="wizard-step active">        
        <div class="review-section">
          <h3 class="review-title">Storage Unit</h3>
          <div class="review-grid">
            <div class="review-item">
              <span class="review-label">ID</span>
              <span class="review-value"><code>${this.selectedStorage?.id}</code></span>
            </div>
            
            <div class="review-item">
              <span class="review-label">Name</span>
              <span class="review-value">${this.selectedStorage?.short_name}</span>
            </div>
            
            <div class="review-item">
              <span class="review-label">Current Items</span>
              <span class="review-value">${currentContents} items</span>
            </div>
            
            <div class="review-item">
              <span class="review-label">New Total</span>
              <span class="review-value"><strong>${newTotal} items</strong></span>
            </div>
          </div>
        </div>
        
        <div class="review-section">
          <h3 class="review-title">Adding ${this.selectedItems.length} Items</h3>
          <div class="review-grid">
            ${this.selectedItems.map(itemId => {
              const item = this.filteredItems.find(i => i.id === itemId);
              return `
                <div class="review-item">
                  <span class="review-label"><code>${item?.id}</code></span>
                  <span class="review-value">${item?.short_name}</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>
        
        <div class="review-section">
          <div class="form-field">
            <label class="form-label">
              <input 
                type="checkbox" 
                id="mark-packed" 
                ${this.markAsPacked ? 'checked' : ''}
              >
              Mark tote as packed (tote is full/ready for storage)
            </label>
            <span class="form-help">Check this if the tote is now completely full and ready for long-term storage.</span>
          </div>
        </div>
      </div>
    `;
    
    const markedPackedCheckbox = container.querySelector('#mark-packed');
    markedPackedCheckbox.addEventListener('change', (e) => {
      this.markAsPacked = e.target.checked;
    });
  }

  /**
   * Render: Review Single
   */
  renderReviewSingle(container) {
    const finalLocation = this.location === 'Custom' ? this.customLocation : this.location;
    
    container.innerHTML = `
      <div class="wizard-step active">
        <div class="review-section">
          <h3 class="review-title">Storage Summary</h3>
          <div class="review-grid">
            <div class="review-item">
              <span class="review-label">Items to Pack</span>
              <span class="review-value"><strong>${this.selectedItems.length} items</strong></span>
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
            ${this.selectedItems.map(itemId => {
              const item = this.filteredItems.find(i => i.id === itemId);
              return `
                <div class="review-item">
                  <span class="review-label"><code>${item?.id}</code></span>
                  <span class="review-value">${item?.short_name}</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render: Review Store
   */
  renderReviewStore(container) {
    const finalLocation = this.location === 'Custom' ? this.customLocation : this.location;
    
    container.innerHTML = `
      <div class="wizard-step active">
        <div class="review-section">
          <h3 class="review-title">Storage Summary</h3>
          <div class="review-grid">
            <div class="review-item">
              <span class="review-label">Items to Store</span>
              <span class="review-value"><strong>${this.selectedItems.length} items</strong></span>
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
            ${this.selectedItems.map(itemId => {
              const item = this.filteredItems.find(i => i.id === itemId);
              return `
                <div class="review-item">
                  <span class="review-label"><code>${item?.id}</code></span>
                  <span class="review-value">${item?.short_name}</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Update button states
   */
  updateButtons() {
    const prevBtn = this.container.querySelector('#btn-prev');
    const nextBtn = this.container.querySelector('#btn-next');
    
    // Previous button
    if (this.currentStep === 0 || this.currentStep === 1) {
      prevBtn.classList.add('hidden');
    } else {
      prevBtn.classList.remove('hidden');
    }
    
    // Next button
    const maxStep = this.getStepsForMode().length - (this.mode ? 0 : 1);
    if (this.currentStep === maxStep) {
      nextBtn.textContent = this.mode === PACKING_MODES.TOTE ? 'Pack Items' : 'Store Items';
      nextBtn.className = 'btn btn-primary';
    } else {
      nextBtn.textContent = 'Next →';
      nextBtn.className = 'btn btn-primary';
    }
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    const cancelBtn = this.container.querySelector('#btn-cancel');
    const prevBtn = this.container.querySelector('#btn-prev');
    const nextBtn = this.container.querySelector('#btn-next');
    
    cancelBtn.addEventListener('click', () => this.onCancel());
    prevBtn.addEventListener('click', () => this.previousStep());
    nextBtn.addEventListener('click', () => this.nextStep());
  }

  /**
   * Next step
   */
  nextStep() {
    if (!this.validateStep()) return;
    
    const maxStep = this.getStepsForMode().length - (this.mode ? 0 : 1);
    
    if (this.currentStep === maxStep) {
      this.complete();
    } else {
      this.currentStep++;
      this.renderProgress();
      this.renderStep();
    }
  }

  /**
   * Previous step
   */
  previousStep() {
    if (this.currentStep > (this.mode ? 1 : 0)) {
      this.currentStep--;
      this.renderProgress();
      this.renderStep();
    }
  }

  /**
   * Validate current step
   */
  validateStep() {
    if (this.currentStep === 0) return true; // Mode selector
    
    switch (this.mode) {
      case PACKING_MODES.TOTE:
        if (this.currentStep === 1 && !this.selectedStorage) {
          alert('Please select a storage unit');
          return false;
        }
        if (this.currentStep === 2 && this.selectedItems.length === 0) {
          alert('Please select at least one item to pack');
          return false;
        }
        return true;
      
      case PACKING_MODES.SINGLE:
      case PACKING_MODES.STORE:
        if (this.currentStep === 1 && this.selectedItems.length === 0) {
          alert('Please select at least one item');
          return false;
        }
        if (this.currentStep === 2) {
          if (!this.location) {
            alert('Please select a storage location');
            return false;
          }
          if (this.location === 'Custom' && !this.customLocation.trim()) {
            alert('Please enter a custom location');
            return false;
          }
        }
        return true;
      
      default:
        return true;
    }
  }

  /**
   * Complete wizard
   */
  complete() {
    const finalLocation = this.location === 'Custom' ? this.customLocation : this.location;
    
    this.onComplete({
      mode: this.mode,
      storageId: this.selectedStorage?.id,
      itemIds: this.selectedItems,
      location: finalLocation,
      markAsPacked: this.markAsPacked
    });
  }
}

export default PackingWizard;