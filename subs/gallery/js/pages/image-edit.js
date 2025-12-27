/**
 * Image Edit Page
 * 
 * Edit photo metadata and relationships
 */

import { renderImageEditForm } from '../components/ImageEditForm.js';
import { fetchImageById, updatePhoto } from '../utils/images-api.js';
import { navigate } from '../utils/router.js';
import { showSuccess, showError } from '../shared/toast.js';

/**
 * Render the image edit page
 * @param {string} photoId - Photo ID
 */
export async function renderImageEdit(photoId) {
  console.log('Rendering image edit page:', photoId);
  
  const app = document.getElementById('app');
  
  // Show loading state
  app.innerHTML = `
    <div class="image-edit-page">
      <div class="loading-container">
        <div class="spinner"></div>
        <p>Loading photo details...</p>
      </div>
    </div>
  `;
  
  try {
    // Fetch photo data
    const photo = await fetchImageById(photoId);
    
    console.log('Photo loaded:', photo);
    
    // Render edit form
    app.innerHTML = `<div class="image-edit-page" id="edit-container"></div>`;
    
    const editContainer = document.getElementById('edit-container');
    
    renderImageEditForm(
      editContainer,
      photo,
      (formData) => handleSubmit(photoId, formData),
      () => handleCancel(photoId)
    );
    
  } catch (error) {
    console.error('Error loading photo:', error);
    
    app.innerHTML = `
      <div class="image-edit-page">
        <div class="error-container">
          <div class="error-icon">⚠️</div>
          <h2>Failed to Load Photo</h2>
          <p>${error.message}</p>
          <button class="btn-primary" onclick="history.back()">
            ← Back to Images
          </button>
        </div>
      </div>
    `;
  }
}

/**
 * Handle form submission
 * @param {string} photoId - Photo ID
 * @param {Object} formData - Form data
 */
async function handleSubmit(photoId, formData) {
  try {
    console.log('Updating photo:', photoId, formData);
    
    // Update photo
    const result = await updatePhoto(photoId, formData);
    
    console.log('Photo updated:', result);
    
    showSuccess('Photo updated successfully');
    
    // Navigate back to detail page
    setTimeout(() => {
      navigate(`/images/${photoId}`);
    }, 1000);
    
  } catch (error) {
    console.error('Error updating photo:', error);
    showError(`Failed to update photo: ${error.message}`);
    throw error; // Re-throw to re-enable submit button
  }
}

/**
 * Handle form cancellation
 * @param {string} photoId - Photo ID
 */
function handleCancel(photoId) {
  navigate(`/images/${photoId}`);
}
