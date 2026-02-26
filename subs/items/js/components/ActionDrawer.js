// ActionDrawer Component
// Slide-out drawer for item actions
// Replaces ActionCenter with modern drawer UI

import { cascadePreviewItem, cascadeDeleteItem, retireItem, getMaintenanceUrl, getFinanceUrl } from '../api/items.js';
import { toast } from '../shared/toast.js';
import { modal } from '../shared/modal.js';
import { navigate } from '../utils/router.js';

/**
 * Build the HTML body for the cascade delete confirmation modal.
 * Shows a breakdown of maintenance records, cost records, and photos
 * that will be deleted alongside the item.
 */
function buildCascadePreviewHTML(itemName, cascade, isDeployed, escapeHtml) {
  const deployedWarning = isDeployed
    ? `<br><br><span style="color: #ef4444; font-weight: 600;">⚠️ Item is currently DEPLOYED</span>`
    : '';

  if (!cascade) {
    return `
      <strong style="color: #ef4444;">⚠️ WARNING: Permanent Deletion</strong>
      <br><br>
      Deleting "<strong>${escapeHtml(itemName)}</strong>"${deployedWarning}
      <br><br>
      <span style="color: #ef4444; font-weight: 600;">This action cannot be undone.</span>
    `;
  }

  const { maintenance_records = [], cost_records = [], cost_total = 0, photo_count = 0 } = cascade;
  const hasAssociated = maintenance_records.length > 0 || cost_records.length > 0 || photo_count > 0;

  let html = `
    <strong style="color: #ef4444;">⚠️ WARNING: Permanent Deletion</strong>
    <br><br>
    Deleting "<strong>${escapeHtml(itemName)}</strong>" will permanently remove:
    ${deployedWarning}
  `;

  if (!hasAssociated) {
    html += `<br><br>No associated records found. Only the item record will be deleted.`;
  } else {
    if (maintenance_records.length > 0) {
      const shown = maintenance_records.slice(0, 5);
      html += `<br><br><strong>Maintenance Records (${maintenance_records.length})</strong>
        <ul style="margin: 4px 0; padding-left: 20px; line-height: 1.8;">
          ${shown.map(r => `<li>${escapeHtml(r.title)}</li>`).join('')}
          ${maintenance_records.length > 5 ? `<li style="color: #6b7280;">…and ${maintenance_records.length - 5} more</li>` : ''}
        </ul>`;
    }

    if (cost_records.length > 0) {
      const totalFormatted = cost_total.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
      const shown = cost_records.slice(0, 5);
      html += `<br><strong>Cost Records (${cost_records.length}) — ${totalFormatted} total</strong>
        <ul style="margin: 4px 0; padding-left: 20px; line-height: 1.8;">
          ${shown.map(r => {
            const amt = r.amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
            return `<li>${escapeHtml(r.description)} (${amt})</li>`;
          }).join('')}
          ${cost_records.length > 5 ? `<li style="color: #6b7280;">…and ${cost_records.length - 5} more</li>` : ''}
        </ul>`;
    }

    if (photo_count > 0) {
      html += `<br><strong>Photos (${photo_count} will be deleted)</strong>`;
    }
  }

  html += `<br><br><span style="color: #ef4444; font-weight: 600;">This action cannot be undone.</span>`;
  return html;
}

export class ActionDrawer {
  constructor() {
    this.isOpen = false;
    this.item = null;
    this.onUpdate = null;
    this.drawer = null;
  }
  
  /**
   * Initialize drawer (call once on page load)
   */
  init(item, onUpdate) {
    this.item = item;
    this.onUpdate = onUpdate;
    
    if (!this.drawer) {
      this.createDrawer();
    }
    
    this.updateDrawerContent();
  }
  
  /**
   * Update item reference (after save/refresh)
   */
  updateItem(item) {
    this.item = item;
    this.updateDrawerContent();
  }
  
  /**
   * Create drawer DOM structure
   */
  createDrawer() {
    // Create FAB trigger button
const fab = document.createElement('button');
fab.className = 'action-drawer-fab';
fab.innerHTML = `
  <span class="action-drawer-fab-icon">⚡</span>
  <span class="action-drawer-fab-text">Action Menu</span>
`;
fab.addEventListener('click', () => this.toggle());
    
    // Create drawer
    const drawer = document.createElement('div');
    drawer.className = 'action-drawer';
    drawer.innerHTML = `
      <div class="action-drawer-overlay"></div>
      <div class="action-drawer-panel">
        <div class="action-drawer-header">
          <h3 class="action-drawer-title">Actions</h3>
          <button class="action-drawer-close">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
        <div class="action-drawer-body">
          <!-- Content injected by updateDrawerContent() -->
        </div>
      </div>
    `;
    
    // Append to body
    document.body.appendChild(fab);
    document.body.appendChild(drawer);
    
    this.drawer = drawer;
    this.fab = fab;
    
    // Event listeners
    drawer.querySelector('.action-drawer-overlay').addEventListener('click', () => this.close());
    drawer.querySelector('.action-drawer-close').addEventListener('click', () => this.close());
  }

  
  
  /**
   * Update drawer content with current item actions
   */
  updateDrawerContent() {
    if (!this.drawer || !this.item) return;
    
    const body = this.drawer.querySelector('.action-drawer-body');
    
    body.innerHTML = `
      <div class="action-drawer-section">
        <h4 class="action-drawer-section-title">Quick Actions</h4>
        
        <button class="action-drawer-btn action-drawer-btn-primary" data-action="upload-photo">
          <span class="action-drawer-btn-icon">📸</span>
          <div class="action-drawer-btn-content">
            <span class="action-drawer-btn-label">Upload Photo</span>
            <span class="action-drawer-btn-sublabel">Add or update item photo</span>
          </div>
        </button>
        
        <button class="action-drawer-btn action-drawer-btn-primary" data-action="flag-repair">
          <span class="action-drawer-btn-icon">🔧</span>
          <div class="action-drawer-btn-content">
            <span class="action-drawer-btn-label">Flag for Repair</span>
            <span class="action-drawer-btn-sublabel">Create maintenance record</span>
          </div>
        </button>
        
        <button class="action-drawer-btn action-drawer-btn-primary" data-action="add-cost">
          <span class="action-drawer-btn-icon">💰</span>
          <div class="action-drawer-btn-content">
            <span class="action-drawer-btn-label">Add Cost Record</span>
            <span class="action-drawer-btn-sublabel">Track expenses</span>
          </div>
        </button>
      </div>
      
      <div class="action-drawer-divider"></div>
      
      <div class="action-drawer-section">
        <h4 class="action-drawer-section-title">Danger Zone</h4>
        
        <button class="action-drawer-btn action-drawer-btn-warning" data-action="retire">
          <span class="action-drawer-btn-icon">⚠️</span>
          <div class="action-drawer-btn-content">
            <span class="action-drawer-btn-label">Retire Item</span>
            <span class="action-drawer-btn-sublabel">Mark as retired (reversible)</span>
          </div>
        </button>
        
        <button class="action-drawer-btn action-drawer-btn-danger" data-action="delete">
          <span class="action-drawer-btn-icon">🗑️</span>
          <div class="action-drawer-btn-content">
            <span class="action-drawer-btn-label">Delete Item</span>
            <span class="action-drawer-btn-sublabel">Permanently remove (irreversible)</span>
          </div>
        </button>
      </div>
    `;
    
    // Attach action handlers
    body.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = e.currentTarget.dataset.action;
        this.handleAction(action);
      });
    });
  }

  
  
  /**
   * Handle action button clicks
   */
  async handleAction(action) {
    switch (action) {
      case 'upload-photo':
        await this.handleUploadPhoto();
        break;
      case 'flag-repair':
        await this.handleFlagRepair();
        break;
      case 'add-cost':
        await this.handleAddCost();
        break;
      case 'retire':
        await this.handleRetire();
        break;
      case 'delete':
        await this.handleDelete();
        break;
    }
  }
  
  /**
   * Upload Photo Action
   */
  async handleUploadPhoto() {
    try {
      // Load photo upload components
      await this.loadPhotoUploadComponents();
      
      // Create and show upload modal
      const uploadModal = document.createElement('photo-upload-modal');
      uploadModal.setAttribute('context', 'item');
      uploadModal.setAttribute('photo-type', 'catalog');
      uploadModal.setAttribute('category', 'item_catalog');
      uploadModal.setAttribute('season', this.item.season || 'shared');
      uploadModal.setAttribute('item-id', this.item.id);
      uploadModal.setAttribute('max-photos', '5');
      
      // Handle upload complete
      uploadModal.addEventListener('upload-complete', (e) => {
        const { photo_ids } = e.detail;
        
        if (photo_ids && photo_ids.length > 0) {
          toast.success('Photo Uploaded', 'Item photo has been updated');
          
          // Callback to refresh item data
          if (this.onUpdate) {
            this.onUpdate();
          }
        }
      });
      
      document.body.appendChild(uploadModal);
      this.close(); // Close drawer after opening modal
      
    } catch (error) {
      console.error('Failed to load photo upload:', error);
      toast.error('Upload Failed', 'Could not load photo upload component');
    }
  }
  
  /**
   * Flag for Repair Action
   */
  async handleFlagRepair() {
    try {
      const maintenanceUrl = await getMaintenanceUrl();
      const repairUrl = `${maintenanceUrl}/create?item_id=${this.item.id}`;
      
      window.open(repairUrl, '_blank');
      toast.info('Opening Maintenance', 'Redirecting to maintenance record creation');
      
      this.close();
      
    } catch (error) {
      console.error('Failed to open maintenance:', error);
      toast.error('Navigation Failed', 'Could not open maintenance subdomain');
    }
  }
  
  /**
   * Add Cost Action
   */
  async handleAddCost() {
    try {
      const financeUrl = await getFinanceUrl();
      const costUrl = `${financeUrl}?item_id=${this.item.id}`;
      
      window.open(costUrl, '_blank');
      toast.info('Opening Finance', 'Redirecting to cost record creation');
      
      this.close();
      
    } catch (error) {
      console.error('Failed to open finance:', error);
      toast.error('Navigation Failed', 'Could not open finance subdomain');
    }
  }
  
  /**
   * Retire Item Action
   */
  async handleRetire() {
    const itemName = this.item.short_name || this.item.id;
    
    const message = `
      Are you sure you want to retire "${this.escapeHtml(itemName)}"?
      <br><br>
      <ul style="text-align: left; margin: 0; padding-left: 20px; line-height: 1.8;">
        <li>Item status will be changed to "Retired"</li>
        <li>Item will still be visible in the system</li>
        <li>Item can be reactivated later if needed</li>
        <li>This action can be undone</li>
      </ul>
    `;
    
    const confirmed = await modal.confirm(
      'Retire Item',
      message,
      'Retire Item',
      'Cancel'
    );
    
    if (confirmed) {
      const loadingOverlay = document.getElementById('loading-overlay');
      
      try {
        loadingOverlay?.classList.remove('hidden');
        
        await retireItem(this.item.id);
        
        toast.success('Item Retired', `${itemName} has been retired`);
        
        // Update item and refresh
        if (this.onUpdate) {
          this.onUpdate();
        }
        
        loadingOverlay?.classList.add('hidden');
        this.close();
        
      } catch (error) {
        console.error('Failed to retire item:', error);
        loadingOverlay?.classList.add('hidden');
        toast.error('Retire Failed', error.message || 'Could not retire item');
      }
    }
  }
  
  /**
   * Delete Item Action
   *
   * Opens a modal immediately with a loading state, fires a cascade preview
   * request to show the user exactly what will be deleted, then executes the
   * full cascade delete on confirmation.
   */
  async handleDelete() {
    const itemId = this.item.id;
    const itemName = this.item.short_name || this.item.id;
    const isDeployed = this.item.deployment_data?.deployed === true;

    // Wrap modal.show() in a Promise so we can await the user's choice
    let resolveConfirm;
    const confirmPromise = new Promise(resolve => { resolveConfirm = resolve; });

    const deployedWarning = isDeployed
      ? `<br><br><span style="color: #ef4444; font-weight: 600;">⚠️ Item is currently DEPLOYED</span>`
      : '';

    modal.show({
      title: 'Delete Item',
      message: `
        <strong style="color: #ef4444;">⚠️ WARNING: Permanent Deletion</strong>
        <br><br>
        Deleting "<strong>${this.escapeHtml(itemName)}</strong>"${deployedWarning}
        <br><br>
        <span style="color: #6b7280; font-style: italic;">Loading associated records...</span>
      `,
      buttons: [
        { text: 'Cancel', class: 'btn-secondary', value: false },
        { text: 'Loading...', class: 'btn-danger', value: true, id: 'cascade-confirm-btn', disabled: true }
      ],
      onButton: resolveConfirm
    });

    // Fetch the cascade preview concurrently while the modal is open
    try {
      const previewData = await cascadePreviewItem(itemId);
      const cascade = previewData?.data?.cascade || previewData?.cascade;
      modal.updateBody(buildCascadePreviewHTML(itemName, cascade, isDeployed, this.escapeHtml.bind(this)));
    } catch (err) {
      console.error('Failed to load cascade preview:', err);
      modal.updateBody(`
        <strong style="color: #ef4444;">⚠️ WARNING: Permanent Deletion</strong>
        <br><br>
        Deleting "<strong>${this.escapeHtml(itemName)}</strong>"${deployedWarning}
        <br><br>
        Could not load associated records. All linked data will still be cascade deleted.
      `);
    }

    // Enable the confirm button now that we have data (or the error fallback)
    const confirmBtn = document.getElementById('cascade-confirm-btn');
    if (confirmBtn) {
      confirmBtn.disabled = false;
      confirmBtn.textContent = 'Delete Permanently';
    }

    const confirmed = await confirmPromise;
    if (!confirmed) return;

    const loadingOverlay = document.getElementById('loading-overlay');
    try {
      loadingOverlay?.classList.remove('hidden');
      await cascadeDeleteItem(itemId);
      toast.success('Item Deleted', `${itemName} has been permanently deleted`);
      setTimeout(() => navigate('/'), 1000);
    } catch (error) {
      console.error('Failed to delete item:', error);
      loadingOverlay?.classList.add('hidden');
      toast.error('Delete Failed', error.message || 'Could not delete item');
    }
  }
  
  /**
   * Load photo upload web components
   */
  async loadPhotoUploadComponents() {
    if (customElements.get('photo-upload-modal') && 
        customElements.get('photo-upload-service')) {
      return;
    }
    
    if (!customElements.get('photo-upload-service')) {
      await this.loadScript('https://assets.spookydecs.com/components/photo-upload-service.js');
    }
    
    if (!customElements.get('photo-upload-modal')) {
      await this.loadScript('https://assets.spookydecs.com/components/photo-upload-modal.js');
    }
  }
  
  loadScript(src) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) {
        resolve();
        return;
      }
      
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
  
  /**
   * Toggle drawer open/closed
   */
  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }
  
  /**
   * Open drawer
   */
  open() {
    if (!this.drawer) return;
    
    this.isOpen = true;
    this.drawer.classList.add('open');
    this.fab.classList.add('hidden');
    document.body.style.overflow = 'hidden';
  }
  
  /**
   * Close drawer
   */
  close() {
    if (!this.drawer) return;
    
    this.isOpen = false;
    this.drawer.classList.remove('open');
    this.fab.classList.remove('hidden');
    document.body.style.overflow = '';
  }
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Export singleton instance
export const actionDrawer = new ActionDrawer();