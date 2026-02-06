// ActionCenter Component
// Action buttons for item management
// Handles: Upload Photo, Flag for Repair, Retire Item, Delete Item

import { deleteItem, retireItem, getMaintenanceUrl, getFinanceUrl } from '../api/items.js';
import { toast } from '../shared/toast.js';
import { modal } from '../shared/modal.js';
import { navigate } from '../utils/router.js';

export class ActionCenter {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.item = null;
    this.onPhotoUploaded = null;
  }
  
  render(item, onPhotoUploaded) {
    // Refresh container reference (in case it was created after constructor)
    this.container = document.getElementById('action-center-container');
    
    if (!this.container) {
      console.error('ActionCenter container not found');
      return;
    }
    
    this.item = item;
    this.onPhotoUploaded = onPhotoUploaded;
    
    this.container.innerHTML = `
      <div class="action-center">
        <h2 class="section-title">Action Center</h2>
        
        <div class="action-grid">
          <button class="action-btn action-btn-primary" onclick="actionCenter.handleUploadPhoto()">
            <span class="action-icon">📸</span>
            <span class="action-label">Upload Photo</span>
          </button>
          
          <button class="action-btn action-btn-primary" onclick="actionCenter.handleFlagRepair()">
            <span class="action-icon">🔧</span>
            <span class="action-label">Flag for Repair</span>
          </button>
          
          <button class="action-btn action-btn-primary" onclick="actionCenter.handleAddCost()">
            <span class="action-icon">💰</span>
            <span class="action-label">Add Cost Record</span>
          </button>
          
          <button class="action-btn action-btn-warning" onclick="actionCenter.handleRetire()">
            <span class="action-icon">⚠️</span>
            <span class="action-label">Retire Item</span>
          </button>
          
          <button class="action-btn action-btn-danger" onclick="actionCenter.handleDelete()">
            <span class="action-icon">🗑️</span>
            <span class="action-label">Delete Item</span>
          </button>
        </div>
      </div>
    `;
  }
  
  async handleUploadPhoto() {
    try {
      // Load photo upload components from CDN
      await this.loadPhotoUploadComponents();
      
      // Create and show upload modal
      const uploadModal = document.createElement('photo-upload-modal');
      uploadModal.setAttribute('context', 'item');
      uploadModal.setAttribute('photo-type', 'catalog');
      uploadModal.setAttribute('season', this.item.season || 'shared');
      uploadModal.setAttribute('item-id', this.item.id);
      uploadModal.setAttribute('max-photos', '5');
      uploadModal.setAttribute('is-primary', 'true');
      
      // Handle upload complete
      // Note: photo-upload-service already links photos to item during confirm step
      uploadModal.addEventListener('upload-complete', (e) => {
        const { photo_ids } = e.detail;

        if (photo_ids && photo_ids.length > 0) {
          toast.success('Photo Uploaded', 'Item photo has been updated');

          // Callback to refresh item data
          if (this.onPhotoUploaded) {
            this.onPhotoUploaded();
          }
        }
      });
      
      // Handle cancel
      uploadModal.addEventListener('upload-cancel', () => {
        console.log('Upload cancelled');
      });
      
      document.body.appendChild(uploadModal);
      
    } catch (error) {
      console.error('Failed to load photo upload:', error);
      toast.error('Upload Failed', 'Could not load photo upload component');
    }
  }
  
  async handleFlagRepair() {
    try {
      const maintenanceUrl = await getMaintenanceUrl();
      const repairUrl = `${maintenanceUrl}/create?item_id=${this.item.id}`;
      
      // Open in new tab
      window.open(repairUrl, '_blank');
      
      toast.info('Opening Maintenance', 'Redirecting to maintenance record creation');
      
    } catch (error) {
      console.error('Failed to open maintenance:', error);
      toast.error('Navigation Failed', 'Could not open maintenance subdomain');
    }
  }
  
  async handleAddCost() {
    try {
      const financeUrl = await getFinanceUrl();
      const costUrl = `${financeUrl}?item_id=${this.item.id}`;
      
      // Open in new tab
      window.open(costUrl, '_blank');
      
      toast.info('Opening Finance', 'Redirecting to cost record creation');
      
    } catch (error) {
      console.error('Failed to open finance:', error);
      toast.error('Navigation Failed', 'Could not open finance subdomain');
    }
  }
  
  async handleRetire() {
    const itemName = this.item.short_name || this.item.id;
    
    // Build confirmation message
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
        
        // Refresh the page to show updated status
        if (this.onPhotoUploaded) {
          const updatedItem = { ...this.item, status: 'Retired' };
          this.onPhotoUploaded(updatedItem);
        }
        
        loadingOverlay?.classList.add('hidden');
        
      } catch (error) {
        console.error('Failed to retire item:', error);
        loadingOverlay?.classList.add('hidden');
        toast.error('Retire Failed', error.message || 'Could not retire item');
      }
    }
  }
  
  async handleDelete() {
    const itemName = this.item.short_name || this.item.id;
    const isDeployed = this.item.deployment_data?.deployed === true;
    
    // Build warning message
    let message = `
      <strong style="color: #ef4444;">⚠️ WARNING: Permanent Deletion</strong>
      <br><br>
      Are you sure you want to delete "${this.escapeHtml(itemName)}"?
      <br><br>
      <ul style="text-align: left; margin: 0; padding-left: 20px; line-height: 1.8;">
        <li>This action CANNOT be undone</li>
        <li>All item data will be permanently removed</li>
    `;
    
    if (isDeployed) {
      message += `<li style="color: #ef4444; font-weight: 600;">⚠️ Item is currently DEPLOYED</li>`;
    }
    
    message += `</ul>`;
    
    const confirmed = await modal.confirm(
      'Delete Item',
      message,
      'Delete Permanently',
      'Cancel'
    );
    
    if (confirmed) {
      const loadingOverlay = document.getElementById('loading-overlay');
      
      try {
        loadingOverlay?.classList.remove('hidden');
        
        await deleteItem(this.item.id);
        
        toast.success('Item Deleted', `${itemName} has been permanently deleted`);
        
        // Navigate back to items list
        setTimeout(() => {
          navigate('/');
        }, 1000);
        
      } catch (error) {
        console.error('Failed to delete item:', error);
        loadingOverlay?.classList.add('hidden');
        toast.error('Delete Failed', error.message || 'Could not delete item');
      }
    }
  }
  
  async loadPhotoUploadComponents() {
    // Check if components already loaded
    if (customElements.get('photo-upload-modal') && 
        customElements.get('photo-upload-service')) {
      return;
    }
    
    // Load service
    if (!customElements.get('photo-upload-service')) {
      await this.loadScript('https://assets.spookydecs.com/components/photo-upload-service.js');
    }
    
    // Load modal
    if (!customElements.get('photo-upload-modal')) {
      await this.loadScript('https://assets.spookydecs.com/components/photo-upload-modal.js');
    }
  }
  
  loadScript(src) {
    return new Promise((resolve, reject) => {
      // Check if script already exists
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
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Global instance
const actionCenter = new ActionCenter('action-center-container');

// Make available globally for onclick handlers
if (typeof window !== 'undefined') {
  window.actionCenter = actionCenter;
}

export { actionCenter };