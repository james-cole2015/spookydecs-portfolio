// photo-manager.js - Photo grid UI and management

let currentPhotos = [];
let currentItemId = null;

/**
 * Initialize photo manager (called from populatePhotosTab)
 */
async function initPhotoManager(item) {
  const container = document.getElementById('viewPhotosContent');
  currentItemId = item.id;
  
  // Show loading state
  container.innerHTML = `
    <div style="text-align: center; padding: 40px; color: #6b7280;">
      <div style="font-size: 24px; margin-bottom: 8px;">⏳</div>
      <div>Loading photos...</div>
    </div>
  `;
  
  try {
    // Fetch photos for this item
    const photos = await getPhotosForItem(item.id);
    currentPhotos = photos;
    
    // Render photo grid
    renderPhotoGrid(photos, item);
  } catch (error) {
    console.error('Error loading photos:', error);
    container.innerHTML = `
      <div style="text-align: center; padding: 40px; color: #ef4444;">
        <div style="font-size: 24px; margin-bottom: 8px;">⚠️</div>
        <div>Failed to load photos</div>
        <div style="font-size: 13px; margin-top: 8px;">${error.message}</div>
      </div>
    `;
  }
}

/**
 * Render photo grid UI
 */
function renderPhotoGrid(photos, item) {
  const container = document.getElementById('viewPhotosContent');
  
  if (!photos || photos.length === 0) {
    container.innerHTML = renderEmptyState(item);
    return;
  }
  
  // Sort photos - primary first
  const sortedPhotos = [...photos].sort((a, b) => {
    if (a.is_primary && !b.is_primary) return -1;
    if (!a.is_primary && b.is_primary) return 1;
    return 0;
  });
  
  let html = `
    <div style="margin-bottom: 16px;">
      <button class="btn-primary" onclick="handleUploadClick('${item.id}', '${item.season}')">
        📤 Upload Photo
      </button>
    </div>
    
    <div class="photo-grid-container">
      <div class="photo-grid">
  `;
  
  sortedPhotos.forEach((photo, index) => {
    html += renderPhotoCard(photo, index);
  });
  
  html += `
      </div>
    </div>
  `;
  
  container.innerHTML = html;
}

/**
 * Render individual photo card
 */
function renderPhotoCard(photo, index) {
  const thumbnailUrl = photo.thumb_cloudfront_url || photo.cloudfront_url;
  const isPrimary = photo.is_primary === true;
  
  return `
    <div class="photo-card" data-photo-id="${photo.photo_id}">
      ${isPrimary ? '<div class="photo-primary-badge">⭐ Primary</div>' : ''}
      
      <div class="photo-thumbnail-wrapper" onclick="handleViewPhoto(${index})">
        <img src="${thumbnailUrl}" alt="Photo ${index + 1}" class="photo-thumbnail">
      </div>
      
      <div class="photo-actions">
        <button 
          class="btn-photo-action btn-view" 
          onclick="handleViewPhoto(${index})"
          title="View full size">
          👁️
        </button>
        
        ${!isPrimary ? `
          <button 
            class="btn-photo-action btn-primary-set" 
            onclick="handleSetPrimary('${photo.photo_id}', '${currentItemId}')"
            title="Set as primary">
            ⭐
          </button>
        ` : ''}
        
        <button 
          class="btn-photo-action btn-delete" 
          onclick="handleDeletePhoto('${photo.photo_id}', '${currentItemId}', ${isPrimary})"
          title="Delete photo">
          🗑️
        </button>
      </div>
    </div>
  `;
}

/**
 * Render empty state
 */
function renderEmptyState(item) {
  return `
    <div style="text-align: center; padding: 40px;">
      <div style="font-size: 48px; margin-bottom: 16px;">📷</div>
      <div style="font-size: 16px; color: #374151; margin-bottom: 8px;">No photos yet</div>
      <div style="font-size: 14px; color: #6b7280; margin-bottom: 20px;">
        Upload photos to showcase this item
      </div>
      <button class="btn-primary" onclick="handleUploadClick('${item.id}', '${item.season}')">
        📤 Upload First Photo
      </button>
    </div>
  `;
}

/**
 * Handle upload button click
 */
function handleUploadClick(itemId, season) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/jpeg,image/jpg,image/png,image/heic,image/heif';
  
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      // Validate file
      validateFile(file);
      
      // Show uploading toast
      showToast('info', 'Uploading', 'Uploading photo...');
      
      // Upload photo
      const result = await uploadPhotoWithThumbnail(file, itemId, season);
      
      // Show success message
      if (result.thumbnailFailed) {
        showToast('success', 'Photo uploaded', 'Photo uploaded (thumbnail generation had issues)');
      } else {
        showToast('success', 'Photo uploaded', 'Photo uploaded successfully');
      }
      
      // Refresh photo grid and main table
      await refreshPhotoGrid(itemId);
      await refreshMainTable();
      
    } catch (error) {
      console.error('Upload error:', error);
      showToast('error', 'Upload failed', error.message || 'Failed to upload photo');
    }
  };
  
  input.click();
}

/**
 * Handle set primary button click
 */
async function handleSetPrimary(photoId, itemId) {
  try {
    // Show loading toast
    showToast('info', 'Updating', 'Setting as primary photo...');
    
    // Update photo
    await updatePhoto(photoId, { is_primary: true });
    
    // Show success message
    showToast('success', 'Primary photo updated', 'Photo set as primary');
    
    // Refresh photo grid and main table
    await refreshPhotoGrid(itemId);
    await refreshMainTable();
    
  } catch (error) {
    console.error('Set primary error:', error);
    showToast('error', 'Update failed', error.message || 'Failed to set primary photo');
  }
}

/**
 * Handle delete button click
 */
async function handleDeletePhoto(photoId, itemId, isPrimary) {
  // Check if this is primary and there are other photos
  if (isPrimary && currentPhotos.length > 1) {
    showToast('error', 'Cannot delete', 'Set another photo as primary first');
    return;
  }
  
  // Confirm deletion
  const confirmed = confirm('Delete this photo? This cannot be undone.');
  if (!confirmed) return;
  
  try {
    // Show loading toast
    showToast('info', 'Deleting', 'Deleting photo...');
    
    // Delete photo
    await deletePhoto(photoId);
    
    // Show success message
    showToast('success', 'Photo deleted', 'Photo deleted successfully');
    
    // Refresh photo grid and main table
    await refreshPhotoGrid(itemId);
    await refreshMainTable();
    
  } catch (error) {
    console.error('Delete error:', error);
    showToast('error', 'Delete failed', error.message || 'Failed to delete photo');
  }
}

/**
 * Handle view photo button click
 */
function handleViewPhoto(index) {
  if (!currentPhotos || currentPhotos.length === 0) return;
  openPhotoViewer(currentPhotos, index);
}

/**
 * Refresh photo grid after changes
 */
async function refreshPhotoGrid(itemId) {
  try {
    const photos = await getPhotosForItem(itemId);
    currentPhotos = photos;
    
    const item = allItems.find(i => i.id === itemId);
    if (item) {
      renderPhotoGrid(photos, item);
    }
  } catch (error) {
    console.error('Error refreshing photo grid:', error);
  }
}

/**
 * Refresh main table to update primary photo thumbnail
 */
async function refreshMainTable() {
  try {
    await loadItems();
  } catch (error) {
    console.error('Error refreshing main table:', error);
  }
}
