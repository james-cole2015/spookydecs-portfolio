// Item Detail Page
// Displays single item with all details, photos, and actions

import { fetchItemById, deleteItem, retireItem, itemsAPI } from '../api/items.js';
import { getPhotosForItem } from '../api/photos.js';
import { ItemDetailView } from '../components/ItemDetailView.js';
import { StoreItemModal } from '../components/StoreItemModal.js';
import { confirmationModal } from '../shared/modal.js';
import { toast } from '../shared/toast.js';
import { navigate } from '../router.js';

let currentItem = null;
let detailView = null;

export async function init(params) {
  console.log('Initializing item detail page...', params);
  
  if (!params.itemId) {
    toast.error('Error', 'No item ID provided');
    navigate('/items');
    return;
  }
  
  // Show loading state
  showLoading();
  
  try {
    // Fetch item data
    currentItem = await fetchItemById(params.itemId);
    
    // Fetch photos
    const photos = await getPhotosForItem(currentItem);
    
    // Initialize detail view
    detailView = new ItemDetailView('detail-container');
    detailView.render(currentItem, photos);
    
  } catch (error) {
    console.error('Failed to load item:', error);
    showError('Failed to load item. Please try again.');
  }
}

function showLoading() {
  const container = document.getElementById('detail-container');
  if (container) {
    container.innerHTML = `
      <div class="detail-loading">
        <div class="spinner"></div>
        <div>Loading item details...</div>
      </div>
    `;
  }
}

function showError(message) {
  const container = document.getElementById('detail-container');
  if (container) {
    container.innerHTML = `
      <div class="error-state">
        <div class="error-icon">⚠️</div>
        <div class="error-message">${message}</div>
        <button class="btn-primary" onclick="itemDetailPage.handleBackToList()">
          Back to Items
        </button>
      </div>
    `;
  }
}

// Action Handlers

export function handleEdit() {
  if (!currentItem) return;
  navigate(`/items/${currentItem.id}/edit`);
}

export function handleStoreItem() {
  if (!currentItem) return;
  
  const modal = new StoreItemModal({
    item: currentItem,
    onConfirm: async (location) => {
      try {
        // Call bulk store API with single item
        await itemsAPI.bulkStore([currentItem.id], location);
        
        toast.success('Item Stored', `${currentItem.short_name} stored in ${location}`);
        
        // Reload item detail to show updated state
        const updatedItem = await fetchItemById(currentItem.id);
        const photos = await getPhotosForItem(updatedItem);
        currentItem = updatedItem;
        detailView.render(currentItem, photos);
        
      } catch (error) {
        console.error('Failed to store item:', error);
        toast.error('Store Failed', error.message || 'Failed to store item. Please try again.');
      }
    },
    onCancel: () => {
      // Modal closed, do nothing
    }
  });
  
  modal.show();
}

export function handlePackItem() {
  if (!currentItem) return;
  
  // Redirect to packing wizard with pre-selected item
  navigate(`/storage/pack?mode=single&items=${currentItem.id}`);
}

export function handleRetire() {
  if (!currentItem) return;
  
  confirmationModal.show({
    title: 'Retire Item',
    message: `Are you sure you want to retire "${currentItem.short_name}"?`,
    details: [
      'Item status will be changed to "Retired"',
      'Item will still be visible in the system',
      'Item can be reactivated later if needed',
      'This action can be undone'
    ],
    confirmText: 'Retire Item',
    cancelText: 'Cancel',
    isDangerous: false,
    onConfirm: async () => {
      try {
        await retireItem(currentItem.id);
        toast.success('Item Retired', `${currentItem.short_name} has been retired`);
        
        // Update local item and re-render
        currentItem.status = 'Retired';
        const photos = await getPhotosForItem(currentItem);
        detailView.render(currentItem, photos);
        
      } catch (error) {
        console.error('Failed to retire item:', error);
        toast.error('Retire Failed', 'Failed to retire item. Please try again.');
      }
    }
  });
}

export function handleDelete() {
  if (!currentItem) return;
  
  const consequences = [
    'This item will be permanently deleted',
    'All item data will be lost',
    'Photos will be unlinked from this item',
    'Deployment history will lose this item reference',
    'This action CANNOT be undone'
  ];
  
  // Add additional consequences based on item state
  if (currentItem.deployment_data?.deployed) {
    consequences.splice(1, 0, '⚠️ Item is currently deployed!');
  }
  
  if (currentItem.repair_status?.needs_repair) {
    consequences.splice(1, 0, '⚠️ Item has pending repairs!');
  }
  
  confirmationModal.show({
    title: 'Delete Item',
    message: `Are you sure you want to permanently delete "${currentItem.short_name}"?`,
    details: consequences,
    confirmText: 'Delete Permanently',
    cancelText: 'Cancel',
    isDangerous: true,
    onConfirm: async () => {
      try {
        await deleteItem(currentItem.id);
        toast.success('Item Deleted', `${currentItem.short_name} has been deleted`);
        
        // Navigate back to items list
        setTimeout(() => {
          navigate('/items');
        }, 1000);
        
      } catch (error) {
        console.error('Failed to delete item:', error);
        toast.error('Delete Failed', 'Failed to delete item. Please try again.');
      }
    }
  });
}

export function handleBackToList() {
  navigate('/items');
}

// Photo Carousel Actions
export function previousPhoto() {
  if (detailView) {
    detailView.previousPhoto();
  }
}

export function nextPhoto() {
  if (detailView) {
    detailView.nextPhoto();
  }
}

export function goToPhoto(index) {
  if (detailView) {
    detailView.goToPhoto(index);
  }
}

// Repair Actions
export function handleMarkRepaired() {
  toast.info('Coming Soon', 'Mark as repaired functionality will be available in the Repairs subdomain');
}

export function handleFlagForRepair() {
  toast.info('Coming Soon', 'Flag for repair functionality will be available in the Repairs subdomain');
}

export function viewRepairHistory() {
  toast.info('Coming Soon', 'Repair history will be available in the Repairs subdomain');
}

// Maintenance Actions
export function showMaintenancePlaceholder() {
  toast.info('Infrastructure Needed', 'Please build maintenance records infrastructure');
}

// Storage Actions
export function viewStorage() {
  toast.info('Coming Soon', 'Storage details will be available when the Storage subdomain is built');
}

export function handleChangeStorage() {
  toast.info('Coming Soon', 'Change storage location will be available when the Storage subdomain is built');
}

export function cleanup() {
  currentItem = null;
  detailView = null;
}