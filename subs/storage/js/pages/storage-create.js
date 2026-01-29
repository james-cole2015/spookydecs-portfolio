/**
 * Storage Create Page
 * Create wizard for new storage units with CDN photo upload modal
 * UPDATED: Uses photo-upload-modal web component from CDN
 */

import { storageAPI, photosAPI } from '../utils/storage-api.js';
import { CreateWizard } from '../components/CreateWizard.js';
import { showSuccess, showError } from '../shared/toast.js';
import { navigate } from '../utils/router.js';
import { showLoading, hideLoading } from '../app.js';

let createWizard = null;
let uploadedPhotoData = null;

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
  
  // Initialize wizard
  createWizard = new CreateWizard({
    onComplete: handleCreate,
    onCancel: handleCancel
  });
  
  createWizard.render(document.getElementById('wizard-container'));
  
  // Wait for wizard to render, then attach photo upload button listener
  setTimeout(() => {
    attachPhotoUploadListener();
  }, 100);
}

/**
 * Attach listener to photo upload button in step 3
 */
function attachPhotoUploadListener() {
  const uploadBtn = document.getElementById('btn-trigger-upload');
  
  if (uploadBtn) {
    uploadBtn.addEventListener('click', openPhotoUploadModal);
  }
}

/**
 * Open photo upload modal
 */
function openPhotoUploadModal() {
  // Get current form data from wizard
  const formData = createWizard.formData;
  
  if (!formData.season) {
    showError('Please complete the form before uploading photos');
    return;
  }
  
  // Create modal element
  const modal = document.createElement('photo-upload-modal');
  
  // Configure modal attributes
  modal.setAttribute('context', 'storage');
  modal.setAttribute('photo-type', 'storage');
  modal.setAttribute('season', formData.season.toLowerCase());
  modal.setAttribute('max-photos', '1');
  modal.setAttribute('year', new Date().getFullYear().toString());
  
  // Listen for upload complete
  modal.addEventListener('upload-complete', (e) => {
    handlePhotoUploadComplete(e.detail);
  });
  
  // Listen for cancel
  modal.addEventListener('upload-cancel', () => {
    console.log('Photo upload cancelled');
  });
  
  // Append to body
  document.body.appendChild(modal);
}

/**
 * Handle photo upload completion
 */
async function handlePhotoUploadComplete(detail) {
  // Store photo data
  if (detail.photo_ids && detail.photo_ids.length > 0) {
    const photo_id = detail.photo_ids[0];
    
    try {
      // Fetch photo details from images API
      const photoDetails = await photosAPI.getById(photo_id);
      
      if (photoDetails) {
        uploadedPhotoData = {
          photo_id: photo_id,
          photo_url: photoDetails.cloudfront_url,  // FIX: Use cloudfront_url from photo record
          thumb_cloudfront_url: photoDetails.thumb_cloudfront_url
        };
        
        // Show success message in wizard
        const successEl = document.getElementById('upload-success');
        if (successEl) {
          successEl.classList.remove('hidden');
        }
        
        // Hide upload button
        const uploadBtn = document.getElementById('btn-trigger-upload');
        if (uploadBtn) {
          uploadBtn.style.display = 'none';
        }
        
        showSuccess('Photo uploaded successfully!');
      } else {
        showError('Photo uploaded but failed to retrieve details');
      }
    } catch (error) {
      console.error('Failed to fetch photo details:', error);
      showError('Photo uploaded but failed to retrieve details');
    }
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
    
    // Step 2: Update with photo if uploaded
    if (uploadedPhotoData && uploadedPhotoData.photo_id) {
      try {
        console.log('Updating storage unit with photo:', uploadedPhotoData.photo_id);
        
        // Update storage unit with photo reference
        await storageAPI.update(newStorageUnit.id, {
          images: {
            photo_id: uploadedPhotoData.photo_id,
            photo_url: uploadedPhotoData.photo_url,
            thumb_cloudfront_url: uploadedPhotoData.thumb_cloudfront_url
          }
        });
        
        console.log('Storage unit updated with photo');
      } catch (photoError) {
        console.error('Failed to update storage with photo:', photoError);
        // Don't fail the entire creation - just show warning
        showError('Storage created but photo attachment failed');
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
  // Clean up
  uploadedPhotoData = null;
  
  navigate('/storage');
}