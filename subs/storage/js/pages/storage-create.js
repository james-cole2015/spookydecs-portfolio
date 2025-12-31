/**
 * Storage Create Page
 * Create wizard for new storage units with photo upload
 */

import { storageAPI } from '../utils/storage-api.js';
import { CreateWizard } from '../components/CreateWizard.js';
import { showSuccess, showError } from '../shared/toast.js';
import { navigate } from '../utils/router.js';
import { showLoading, hideLoading } from '../app.js';

// PhotoUploader will be loaded from assets CDN
// Import it dynamically when needed
let PhotoUploader = null;
let createWizard = null;
let photoUploader = null;

/**
 * Render storage create page
 */
export async function renderCreateWizard() {
  const app = document.getElementById('app');
  
  // Create page structure
  app.innerHTML = `
    <div class="storage-create-page">
      <div id="wizard-container"></div>
    </div>
  `;
  
  // Load PhotoUploader class
  await loadPhotoUploader();
  
  // Initialize wizard
  createWizard = new CreateWizard({
    onComplete: handleCreate,
    onCancel: handleCancel,
    onPhotoStepRender: initPhotoUploader
  });
  
  createWizard.render(document.getElementById('wizard-container'));
}

/**
 * Load PhotoUploader dynamically from assets CDN
 */
async function loadPhotoUploader() {
  if (PhotoUploader) return; // Already loaded
  
  try {
    const module = await import('https://assets.spookydecs.com/components/PhotoUploader.js');
    PhotoUploader = module.PhotoUploader;
    console.log('PhotoUploader loaded successfully');
  } catch (error) {
    console.error('Failed to load PhotoUploader:', error);
    // Continue without photo upload capability
  }
}

/**
 * Initialize PhotoUploader component
 * Called by CreateWizard when rendering photo step
 */
function initPhotoUploader(containerElement) {
  if (!PhotoUploader) {
    console.warn('PhotoUploader not available');
    const container = document.getElementById('photo-uploader-container');
    if (container) {
      container.innerHTML = `
        <div class="form-help text-muted">
          Photo upload unavailable. You can add a photo after creation.
        </div>
      `;
    }
    return;
  }
  
  try {
    // Initialize with maxPhotos = 1 for storage
    photoUploader = new PhotoUploader('photo-uploader-container', 1);
    photoUploader.render();
    console.log('PhotoUploader initialized');
  } catch (error) {
    console.error('Error initializing PhotoUploader:', error);
    const container = document.getElementById('photo-uploader-container');
    if (container) {
      container.innerHTML = `
        <div class="form-help text-muted">
          Photo upload initialization failed. You can add a photo after creation.
        </div>
      `;
    }
  }
}

/**
 * Handle wizard completion
 */
async function handleCreate(classType, formData) {
  try {
    showLoading();
    
    // Step 1: Create storage unit
    let newStorageUnit;
    
    if (classType === 'Tote') {
      newStorageUnit = await storageAPI.createTote(formData);
    } else {
      newStorageUnit = await storageAPI.createSelf(formData);
    }
    
    console.log('Storage unit created:', newStorageUnit.id);
    
    // Step 2: Upload photo if selected
    if (photoUploader && photoUploader.hasPhotos()) {
      try {
        const files = photoUploader.getSelectedFiles();
        const file = files[0]; // Only 1 photo for storage
        
        console.log('Uploading photo for storage unit:', newStorageUnit.id);
        
        // Use storageAPI upload method (not PhotoUploader's built-in upload)
        const photoData = await storageAPI.uploadStoragePhoto(
          file,
          newStorageUnit.id,
          formData.season
        );
        
        console.log('Photo uploaded successfully:', photoData.photo_id);
        
        // Step 3: Update storage unit with photo reference
        await storageAPI.update(newStorageUnit.id, {
          images: {
            photo_id: photoData.photo_id,
            photo_url: photoData.photo_url,
            thumb_cloudfront_url: photoData.thumb_cloudfront_url
          }
        });
        
        console.log('Storage unit updated with photo');
      } catch (photoError) {
        console.error('Photo upload failed:', photoError);
        // Don't fail the entire creation - just show warning
        showError('Storage created but photo upload failed. You can add a photo later.');
      }
    }
    
    hideLoading();
    
    // Show success message
    showSuccess(`Storage unit "${formData.short_name}" created successfully!`);
    
    // Navigate to detail page
    navigate(`/storage/${newStorageUnit.id}`);
    
  } catch (error) {
    console.error('Error creating storage unit:', error);
    hideLoading();
    
    // Show error
    showError(error.message || 'Failed to create storage unit');
  }
}

/**
 * Handle wizard cancel
 */
function handleCancel() {
  // Clean up photo uploader
  if (photoUploader) {
    photoUploader.clear();
    photoUploader = null;
  }
  
  navigate('/storage');
}