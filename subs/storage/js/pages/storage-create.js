/**
 * Storage Create Page
 * Create wizard for new storage units with photo upload
 */

import { storageAPI } from '../utils/storage-api.js';
import { CreateWizard } from '../components/CreateWizard.js';
import { StoragePhotoUploader } from '../components/StoragePhotoUploader.js';
import { showSuccess, showError } from '../shared/toast.js';
import { navigate } from '../utils/router.js';
import { showLoading, hideLoading } from '../app.js';

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
  
  // Initialize wizard with photo step callback
  createWizard = new CreateWizard({
    onComplete: handleCreate,
    onCancel: handleCancel,
    onPhotoStepRender: initPhotoUploader
  });
  
  createWizard.render(document.getElementById('wizard-container'));
}

/**
 * Initialize StoragePhotoUploader component
 * Called by CreateWizard when rendering photo step (step 3)
 */
function initPhotoUploader() {
  const uploaderContainer = document.getElementById('photo-uploader');
  
  if (!uploaderContainer) {
    console.warn('Photo uploader container not found');
    return;
  }
  
  try {
    // Create a container div with ID for StoragePhotoUploader
    uploaderContainer.innerHTML = '<div id="storage-photo-uploader-container"></div>';
    
    // Initialize StoragePhotoUploader
    photoUploader = new StoragePhotoUploader('storage-photo-uploader-container', {
      onChange: (file) => {
        console.log('Photo selected:', file ? file.name : 'none');
      }
    });
    
    photoUploader.render();
    console.log('StoragePhotoUploader initialized');
  } catch (error) {
    console.error('Error initializing StoragePhotoUploader:', error);
    uploaderContainer.innerHTML = `
      <div class="form-help text-muted">
        Photo upload unavailable. You can add a photo after creation.
      </div>
    `;
  }
}

/**
 * Handle wizard completion
 */
async function handleCreate(classType, formData) {
  try {
    showLoading();
    
    console.log('Creating storage unit:', { classType, formData });
    
    // Step 1: Create storage unit
    let newStorageUnit;
    
    if (classType === 'Tote') {
      newStorageUnit = await storageAPI.createTote(formData);
    } else {
      newStorageUnit = await storageAPI.createSelf(formData);
    }
    
    console.log('Storage unit created:', newStorageUnit.id);
    
    // Step 2: Upload photo if selected
    if (photoUploader && photoUploader.hasPhoto()) {
      try {
        const file = photoUploader.getSelectedFile();
        
        console.log('Uploading photo for storage unit:', newStorageUnit.id);
        
        // Upload photo using storageAPI
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