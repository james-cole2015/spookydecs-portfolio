/**
 * Modal Handler
 * Integrates spookydecs-view-modal component with the photo gallery
 */

import { updatePhoto, deletePhoto } from './api.js';
import { refreshPhotos } from './photos.js';
import { showToast } from './ui.js';
import { getState } from './state.js';

let modalElement = null;

/**
 * Initialize modal integration
 */
export function initModal() {
  console.log('[Modal] Initializing modal handler...');
  
  // Get or create modal element
  modalElement = document.querySelector('spookydecs-view-modal');
  
  if (!modalElement) {
    console.error('[Modal] spookydecs-view-modal element not found in DOM');
    return;
  }
  
  // Configure modal with API endpoint
  const apiEndpoint = window.config?.API_ENDPOINT || 'https://miinu7boec.execute-api.us-east-2.amazonaws.com/dev';
  modalElement.setAttribute('api-endpoint', apiEndpoint);
  
  console.log('[Modal] Modal configured with endpoint:', apiEndpoint);
  
  // Set up event listeners for modal events
  setupModalEventListeners();
  
  // Set up click handlers for photo cards
  setupPhotoClickHandlers();
  
  console.log('[Modal] Modal handler initialized');
}

/**
 * Set up modal event listeners
 */
function setupModalEventListeners() {
  if (!modalElement) return;
  
  // Listen for photo-edited event
  modalElement.addEventListener('photo-edited', handlePhotoEdited);
  
  // Listen for photo-deleted event
  modalElement.addEventListener('photo-deleted', handlePhotoDeleted);
  
  console.log('[Modal] Event listeners attached');
}

/**
 * Set up click handlers on photo cards
 * Re-attach on every photo grid render
 */
function setupPhotoClickHandlers() {
  // Use event delegation on the photo grid
  const photoGrid = document.getElementById('photo-grid');
  
  if (!photoGrid) {
    console.warn('[Modal] Photo grid not found');
    return;
  }
  
  // Remove existing listener if any
  photoGrid.removeEventListener('click', handlePhotoCardClick);
  
  // Add new listener with event delegation
  photoGrid.addEventListener('click', handlePhotoCardClick);
  
  console.log('[Modal] Photo click handlers attached');
}

/**
 * Handle clicks on photo cards
 * @param {Event} event - Click event
 */
function handlePhotoCardClick(event) {
  // Find if click was on a photo card or inside one
  const photoCard = event.target.closest('.photo-card');
  
  if (!photoCard) return;
  
  // Don't open modal if clicking action buttons
  if (event.target.closest('.photo-actions')) return;
  
  // Get photo ID
  const photoId = photoCard.dataset.photoId;
  
  if (!photoId) {
    console.warn('[Modal] Photo card missing data-photo-id');
    return;
  }
  
  // Open modal
  openModal(photoId);
}

/**
 * Open modal for a specific photo
 * @param {string} photoId - Photo ID to display
 */
export function openModal(photoId) {
  if (!modalElement) {
    console.error('[Modal] Modal element not available');
    showToast('Modal not available', 'error');
    return;
  }
  
  console.log('[Modal] Opening modal for photo:', photoId);
  
  // Set photo-id attribute to trigger modal load
  modalElement.setAttribute('photo-id', photoId);
  
  // Open the modal
  modalElement.setAttribute('open', '');
}

/**
 * Handle photo-edited event from modal
 * @param {CustomEvent} event - Custom event with edited photo data
 */
async function handlePhotoEdited(event) {
  console.log('[Modal] Photo edited event received:', event.detail);
  
  const { photoId, updates } = event.detail;
  
  if (!photoId) {
    console.error('[Modal] Photo edited event missing photoId');
    return;
  }
  
  try {
    // Show loading toast
    showToast('Saving changes...', 'info');
    
    // Update photo via API
    await updatePhoto(photoId, updates);
    
    console.log('[Modal] Photo updated successfully:', photoId);
    
    // Refresh photo grid to show changes
    await refreshPhotos();
    
    // Show success message
    showToast('Photo updated successfully', 'success');
    
  } catch (error) {
    console.error('[Modal] Error updating photo:', error);
    showToast(`Failed to update photo: ${error.message}`, 'error');
  }
}

/**
 * Handle photo-deleted event from modal
 * @param {CustomEvent} event - Custom event with deleted photo ID
 */
async function handlePhotoDeleted(event) {
  console.log('[Modal] Photo deleted event received:', event.detail);
  
  const { photoId } = event.detail;
  
  if (!photoId) {
    console.error('[Modal] Photo deleted event missing photoId');
    return;
  }
  
  try {
    // Optimistically remove from DOM for instant feedback
    removePhotoFromDOM(photoId);
    
    // Show loading toast
    showToast('Deleting photo...', 'info');
    
    // Delete photo via API
    await deletePhoto(photoId);
    
    console.log('[Modal] Photo deleted successfully:', photoId);
    
    // Refresh photo grid to update counts and pagination
    await refreshPhotos();
    
    // Show success message
    showToast('Photo deleted successfully', 'success');
    
  } catch (error) {
    console.error('[Modal] Error deleting photo:', error);
    
    // Refresh to restore the photo card since delete failed
    await refreshPhotos();
    
    showToast(`Failed to delete photo: ${error.message}`, 'error');
  }
}

/**
 * Remove photo card from DOM (optimistic update)
 * @param {string} photoId - Photo ID to remove
 */
function removePhotoFromDOM(photoId) {
  const photoCard = document.querySelector(`[data-photo-id="${photoId}"]`);
  
  if (photoCard) {
    // Add fade-out animation
    photoCard.style.opacity = '0';
    photoCard.style.transform = 'scale(0.95)';
    photoCard.style.transition = 'opacity 0.3s, transform 0.3s';
    
    // Remove after animation
    setTimeout(() => {
      photoCard.remove();
      console.log('[Modal] Removed photo card from DOM:', photoId);
    }, 300);
  }
}

/**
 * Re-initialize click handlers (call this after photo grid updates)
 */
export function reinitClickHandlers() {
  setupPhotoClickHandlers();
}
