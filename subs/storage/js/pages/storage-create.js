/**
 * Storage Create Page
 * Create new storage units (Tote or Self-contained) with wizard interface
 * UPDATED: Handles photo uploads and links them to created storage unit
 */

import { storageAPI, photosAPI } from '../utils/storage-api.js';
import { CreateWizard } from '../components/CreateWizard.js';
import { showSuccess, showError } from '../shared/toast.js';
import { navigate } from '../utils/router.js';
import { showLoading, hideLoading } from '../app.js';
import { renderBreadcrumb } from '../shared/breadcrumb.js';

let wizard = null;

/**
 * Render storage create page
 */
export async function renderCreateWizard() {
  const app = document.getElementById('app');
  
  // Create page structure
  app.innerHTML = `
    <div class="storage-create-page">
      <div id="breadcrumb"></div>
      <div id="wizard-container"></div>
    </div>
  `;

  renderBreadcrumb(document.getElementById('breadcrumb'), [
    { label: 'Storage', route: '/' },
    { label: 'Totes', route: '/storage' },
    { label: 'Create Storage' }
  ]);

  // Initialize wizard
  wizard = new CreateWizard({
    onComplete: handleComplete,
    onCancel: handleCancel
  });
  
  wizard.render(document.getElementById('wizard-container'));
}

/**
 * Handle wizard completion
 */
async function handleComplete(classType, formData, uploadedPhotoIds) {
  try {
    showLoading();
    
    console.log('Creating storage unit:', { classType, formData, uploadedPhotoIds });
    
    // Step 1: Create storage unit
    let storageUnit;
    
    if (classType === 'Tote') {
      storageUnit = await storageAPI.createTote({
        season: formData.season,
        location: formData.location,
        short_name: formData.short_name,
        size: formData.size,
        general_notes: formData.general_notes || ''
      });
    } else {
      // Self-contained
      storageUnit = await storageAPI.createSelf({
        season: formData.season,
        location: formData.location,
        short_name: formData.short_name,
        item_id: formData.item_id,
        general_notes: formData.general_notes || ''
      });
    }
    
    console.log('Storage unit created:', storageUnit);
    
    // Step 2: If photo was uploaded, link it to the storage unit
    if (uploadedPhotoIds && uploadedPhotoIds.length > 0) {
      const photoId = uploadedPhotoIds[0]; // Only use first photo (max 1)
      
      try {
        // Fetch photo details
        const photoDetails = await photosAPI.getById(photoId);
        
        if (photoDetails) {
          // Update storage unit with photo
          await storageAPI.update(storageUnit.id, {
            images: {
              photo_id: photoId,
              photo_url: photoDetails.cloudfront_url,
              thumb_cloudfront_url: photoDetails.thumb_cloudfront_url
            }
          });
          
          console.log('Photo linked to storage unit');
        }
      } catch (photoError) {
        console.error('Failed to link photo to storage unit:', photoError);
        // Don't fail the entire operation if photo linking fails
        showError('Storage created but photo linking failed. You can upload a photo later.');
      }
    }
    
    hideLoading();
    
    // Show success message
    showSuccess(`${classType} created successfully!`);
    
    // Navigate to detail page
    navigate(`/storage/${storageUnit.id}`);
    
  } catch (error) {
    console.error('Error creating storage unit:', error);
    hideLoading();
    showError(error.message || 'Failed to create storage unit');
  }
}

/**
 * Handle wizard cancellation
 */
function handleCancel() {
  navigate('/storage');
}