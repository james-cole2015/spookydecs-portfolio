/**
 * Image Upload Page
 * 
 * Upload new photos with metadata
 */

import { renderImageUploadForm, resetUploadForm } from '../components/ImageUploadForm.js';
import { uploadPhotos } from '../utils/images-api.js';
import { getContextForPhotoType } from '../utils/images-config.js';
import { navigate } from '../utils/router.js';
import { showSuccess, showError, showInfo } from '../shared/toast.js';

/**
 * Render the image upload page
 */
export async function renderImageUpload() {
  console.log('Rendering image upload page');
  
  const app = document.getElementById('app');
  
  app.innerHTML = `<div class="image-upload-page" id="upload-container"></div>`;
  
  const uploadContainer = document.getElementById('upload-container');
  
  renderImageUploadForm(
    uploadContainer,
    handleSubmit,
    handleCancel
  );
}

/**
 * Handle form submission
 * @param {Object} formData - Form data
 * @param {File[]} files - Selected files
 */
async function handleSubmit(formData, files) {
  console.log('Uploading photos:', formData, files);
  
  try {
    // Show progress toast
    showInfo(`Uploading ${files.length} photo(s)...`, 0);
    
    // Prepare upload data
    const uploadData = {
      context: getContextForPhotoType(formData.photo_type),
      photo_type: formData.photo_type,
      season: formData.season,
      year: formData.year,
      item_ids: formData.item_ids || [],
      storage_id: formData.storage_id,
      deployment_id: formData.deployment_id,
      idea_id: formData.idea_id,
      caption: formData.caption,
      tags: formData.tags,
      is_public: false,
      is_primary: false,
      is_visible: true
    };
    
    // Upload photos with progress callback
    const result = await uploadPhotos(uploadData, files, (progress) => {
      console.log('Upload progress:', progress);
    });
    
    console.log('Upload complete:', result);
    
    showSuccess(`Successfully uploaded ${result.photos_added} photo(s)`);
    
    // Navigate back to images list
    setTimeout(() => {
      navigate('/images');
    }, 1500);
    
  } catch (error) {
    console.error('Upload error:', error);
    showError(`Upload failed: ${error.message}`);
    throw error; // Re-throw to re-enable submit button
  }
}

/**
 * Handle form cancellation
 */
function handleCancel() {
  navigate('/images');
}

