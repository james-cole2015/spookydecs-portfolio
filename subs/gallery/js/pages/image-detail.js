/**
 * Image Detail Page
 * 
 * Display detailed information about a single photo
 */

import { renderImageDetailView } from '../components/ImageDetailView.js';
import { renderRelatedEntities } from '../components/RelatedEntities.js';
import { fetchImageById, deletePhoto } from '../utils/images-api.js';
import { navigate } from '../utils/router.js';
import { showConfirmModal } from '../shared/modal.js';
import { showSuccess, showError } from '../shared/toast.js';

/**
 * Render the image detail page
 * @param {string} photoId - Photo ID
 */
export async function renderImageDetail(photoId) {
  console.log('Rendering image detail page:', photoId);
  
  const app = document.getElementById('app');
  
  // Show loading state
  app.innerHTML = `
    <div class="image-detail-page">
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
    
    // Render detail view
    app.innerHTML = `<div class="image-detail-page" id="detail-container"></div>`;
    
    const detailContainer = document.getElementById('detail-container');
    
    renderImageDetailView(
      detailContainer,
      photo,
      {},
      handleDelete,
      handleEdit
    );
    
    // Render related entities
    const relatedEntitiesContainer = detailContainer.querySelector('#related-entities-container');
    if (relatedEntitiesContainer) {
      await renderRelatedEntities(relatedEntitiesContainer, photo);
    }
    
  } catch (error) {
    console.error('Error loading photo:', error);
    
    app.innerHTML = `
      <div class="image-detail-page">
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
 * Handle photo deletion
 * @param {string} photoId - Photo ID
 */
async function handleDelete(photoId) {
  const confirmed = await showConfirmModal({
    title: 'Delete Photo',
    message: 'Are you sure you want to delete this photo? This action cannot be undone and will remove the photo from S3 storage.',
    confirmText: 'Delete',
    cancelText: 'Cancel',
    confirmClass: 'btn-danger'
  });
  
  if (!confirmed) {
    return;
  }
  
  try {
    await deletePhoto(photoId);
    showSuccess('Photo deleted successfully');
    
    // Navigate back to images list
    setTimeout(() => {
      navigate('/images');
    }, 1000);
    
  } catch (error) {
    console.error('Error deleting photo:', error);
    showError(`Failed to delete photo: ${error.message}`);
  }
}

/**
 * Handle edit navigation
 * @param {string} photoId - Photo ID
 */
function handleEdit(photoId) {
  navigate(`/images/${photoId}/edit`);
}
