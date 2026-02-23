/**
 * Storage Detail Page
 * Display storage unit details and contents
 * FIXED: Now loads storage unit photos from photos API
 */

import { storageAPI, photosAPI } from '../utils/storage-api.js';
import { formatStorageUnit } from '../utils/storage-config.js';
import { StorageDetailView } from '../components/StorageDetailView.js';
import { StoragePhotoGallery } from '../components/StoragePhotoGallery.js';
import { ContentsPanel } from '../components/ContentsPanel.js';
import { showDeleteConfirm } from '../shared/modal.js';
import { showSuccess, showError } from '../shared/toast.js';
import { navigate } from '../utils/router.js';
import { showLoading, hideLoading } from '../app.js';

let detailView = null;
let contentsPanel = null;
let currentStorageUnit = null;

/**
 * Render storage detail page
 */
export async function renderStorageDetail(storageId) {
  const app = document.getElementById('app');
  
  // Create page structure
  app.innerHTML = `
    <div class="storage-detail-page">
      <div class="page-header">
        <button class="btn btn-secondary" id="btn-back">
          ← Back to List
        </button>
      </div>
      
      <div id="detail-container"></div>
      <div id="photo-gallery-container" class="storage-photo-gallery-section"></div>
      <div id="contents-container"></div>
    </div>
  `;
  
  // Back button
  document.getElementById('btn-back').addEventListener('click', () => {
    navigate('/storage');
  });
  
  // Load storage unit
  await loadStorageUnit(storageId);
}

/**
 * Load storage unit from API
 */
async function loadStorageUnit(storageId) {
  try {
    showLoading();
    
    // Fetch storage unit with contents details
    const data = await storageAPI.getById(storageId);
    
    // Normalize data
    currentStorageUnit = formatStorageUnit(data);
    
    // Enrich storage unit with primary photo URL.
    // Support new schema (primary_photo_id) and legacy schema (photo_id).
    const headerPhotoId = currentStorageUnit.images?.primary_photo_id
      || currentStorageUnit.images?.photo_id;
    if (headerPhotoId) {
      try {
        const photoData = await photosAPI.getById(headerPhotoId);
        if (photoData) {
          currentStorageUnit.images.photo_url = photoData.cloudfront_url;
          currentStorageUnit.images.thumb_cloudfront_url = photoData.thumb_cloudfront_url;
        }
      } catch (photoError) {
        console.warn('Failed to load storage unit photo:', photoError);
      }
    }
    
    // Enrich contents with photo URLs
    const enrichedContents = await enrichContentsWithPhotos(currentStorageUnit.contents_details || []);
    
    // Initialize detail view
    detailView = new StorageDetailView({
      storageUnit: currentStorageUnit,
      onEdit: handleEdit,
      onDelete: handleDelete
    });
    detailView.render(document.getElementById('detail-container'));

    // Mount photo gallery
    const galleryContainer = document.getElementById('photo-gallery-container');
    if (galleryContainer) {
      const gallery = new StoragePhotoGallery({
        storageId: currentStorageUnit.id,
        season: currentStorageUnit.season || currentStorageUnit.category || 'shared'
      });
      await gallery.render(galleryContainer);
    }

    // Initialize contents panel with enriched data
    contentsPanel = new ContentsPanel({
      contents: enrichedContents,
      storageUnit: currentStorageUnit,
      showManageButton: true
    });
    contentsPanel.render(document.getElementById('contents-container'));
    
    hideLoading();
  } catch (error) {
    console.error('Error loading storage unit:', error);
    showError('Failed to load storage unit');
    hideLoading();
    
    // Redirect to list after error
    setTimeout(() => {
      navigate('/storage');
    }, 2000);
  }
}

/**
 * Enrich contents with photo URLs from photos API
 */
async function enrichContentsWithPhotos(contents) {
  if (!contents || contents.length === 0) {
    return contents;
  }
  
  try {
    // Extract all primary photo IDs
    const photoIds = contents
      .map(item => item.images?.primary_photo_id)
      .filter(id => id);
    
    // If no photos, return contents as-is
    if (photoIds.length === 0) {
      return contents;
    }
    
    // Batch fetch all photos
    const photoMap = await photosAPI.getByIds(photoIds);
    
    // Enrich each item with photo_url
    return contents.map(item => {
      const photoId = item.images?.primary_photo_id;
      const photoData = photoId ? photoMap[photoId] : null;
      
      return {
        ...item,
        images: {
          ...item.images,
          photo_url: photoData?.cloudfront_url || null
        }
      };
    });
  } catch (error) {
    console.error('Error enriching contents with photos:', error);
    // Return contents without photos on error
    return contents;
  }
}

/**
 * Handle edit button click
 */
function handleEdit(unit) {
  navigate(`/storage/${unit.id}/edit`);
}

/**
 * Handle delete button click
 */
async function handleDelete(unit) {
  // Check if unit has contents
  const contentsCount = unit.contents_count || 0;
  
  if (contentsCount > 0) {
    showDeleteConfirm({
      itemName: unit.short_name,
      additionalMessage: `❌ This storage unit contains <strong>${contentsCount} items</strong>.<br>Please remove all items before deleting.`,
      onConfirm: async () => {
        showError('Cannot delete storage unit with contents');
        return false; // Prevent modal from closing
      }
    });
    return;
  }
  
  // Confirm deletion
  showDeleteConfirm({
    itemName: unit.short_name,
    onConfirm: async () => {
      try {
        showLoading();
        await storageAPI.delete(unit.id);
        showSuccess(`Storage unit "${unit.short_name}" deleted successfully`);
        hideLoading();
        
        // Redirect to list
        navigate('/storage');
      } catch (error) {
        console.error('Error deleting storage unit:', error);
        showError(error.message || 'Failed to delete storage unit');
        hideLoading();
      }
    }
  });
}