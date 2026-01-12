/**
 * Storage Edit Page
 * Edit storage unit metadata with photo replacement
 */

import { storageAPI } from '../utils/storage-api.js';
import { formatStorageUnit, getPlaceholderImage } from '../utils/storage-config.js';
import { StorageFormFields } from '../components/StorageFormFields.js';
import { StoragePhotoUploader } from '../components/StoragePhotoUploader.js';
import { showSuccess, showError } from '../shared/toast.js';
import { navigate } from '../utils/router.js';
import { showLoading, hideLoading } from '../app.js';

let formFields = null;
let currentStorageUnit = null;
let photoUploader = null;

/**
 * Render storage edit page
 */
export async function renderEditForm(storageId) {
  const app = document.getElementById('app');
  
  // Create page structure
  app.innerHTML = `
    <div class="storage-edit-page">
      <div class="page-header">
        <button class="btn btn-secondary" id="btn-back">
          ← Back to Detail
        </button>
      </div>
      
      <div class="wizard-container">
        <div class="wizard-header">
          <h1 class="wizard-title">Edit Storage Unit</h1>
          <p class="wizard-subtitle" id="subtitle">Loading...</p>
        </div>
        
        <div class="wizard-body" id="form-container">
          <div class="loading">Loading storage unit...</div>
        </div>
        
        <div class="wizard-footer">
          <button class="btn btn-secondary" id="btn-cancel">Cancel</button>
          <div style="flex: 1"></div>
          <button class="btn btn-primary" id="btn-save">Save Changes</button>
        </div>
      </div>
    </div>
  `;
  
  // Back button
  document.getElementById('btn-back').addEventListener('click', () => {
    navigate(`/storage/${storageId}`);
  });
  
  // Cancel button
  document.getElementById('btn-cancel').addEventListener('click', () => {
    navigate(`/storage/${storageId}`);
  });
  
  // Save button
  document.getElementById('btn-save').addEventListener('click', () => {
    handleSave(storageId);
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
    
    // Fetch storage unit
    const data = await storageAPI.getById(storageId);
    currentStorageUnit = formatStorageUnit(data);
    
    // Update subtitle
    document.getElementById('subtitle').textContent = currentStorageUnit.short_name;
    
    // Render form
    await renderForm();
    
    hideLoading();
    
  } catch (error) {
    console.error('Error loading storage unit:', error);
    showError('Failed to load storage unit');
    hideLoading();
    
    // Redirect back to list
    setTimeout(() => {
      navigate('/storage');
    }, 2000);
  }
}

/**
 * Render edit form
 */
async function renderForm() {
  const formContainer = document.getElementById('form-container');
  
  formContainer.innerHTML = `
    <div class="form-sections">
      <div class="form-section">
        <h2 class="section-title">Storage Information</h2>
        <p class="form-help mb-md">
          Note: Season and Type cannot be changed after creation.
        </p>
        <div id="form-fields"></div>
      </div>
      
      <div class="form-section">
        <h2 class="section-title">Photo</h2>
        <div id="current-photo-container"></div>
        <div id="photo-uploader-container"></div>
      </div>
    </div>
  `;
  
  // Initialize form fields
  const classType = currentStorageUnit.class_type || 'Tote';
  
  formFields = new StorageFormFields({
    classType: classType,
    data: {
      season: currentStorageUnit.season,
      location: currentStorageUnit.location,
      short_name: currentStorageUnit.short_name,
      size: currentStorageUnit.size,
      general_notes: currentStorageUnit.general_notes
    },
    onChange: () => {} // No-op for edit form
  });
  
  await formFields.render(document.getElementById('form-fields'));
  
  // Disable season field (can't change after creation)
  const seasonField = formContainer.querySelector('[name="season"]');
  if (seasonField) {
    seasonField.disabled = true;
    seasonField.style.opacity = '0.6';
    seasonField.style.cursor = 'not-allowed';
  }
  
  // Hide item_id field if present (self-contained units)
  const itemField = formContainer.querySelector('[name="item_id"]');
  if (itemField) {
    itemField.closest('.form-field').style.display = 'none';
  }
  
  // Render current photo
  renderCurrentPhoto();
  
  // Initialize PhotoUploader
  initPhotoUploader();
}

/**
 * Render current photo display
 */
function renderCurrentPhoto() {
  const container = document.getElementById('current-photo-container');
  const photoUrl = currentStorageUnit.images?.photo_url || getPlaceholderImage();
  const hasPhoto = currentStorageUnit.images?.photo_url;
  
  container.innerHTML = `
    <div class="current-photo-section">
      <label class="form-label">Current Photo</label>
      <div class="current-photo-preview">
        <img src="${photoUrl}" alt="${currentStorageUnit.short_name}" class="current-photo-img" />
      </div>
      ${hasPhoto 
        ? '<p class="form-help">Upload a new photo below to replace the current one</p>' 
        : '<p class="form-help">No photo currently set. Upload one below.</p>'
      }
    </div>
  `;
}

/**
 * Initialize StoragePhotoUploader component
 */
function initPhotoUploader() {
  const uploaderContainer = document.getElementById('photo-uploader-container');
  
  if (!uploaderContainer) {
    console.warn('Photo uploader container not found');
    return;
  }
  
  try {
    // Create a container div with ID
    uploaderContainer.innerHTML = '<div id="storage-photo-uploader-edit"></div>';
    
    photoUploader = new StoragePhotoUploader('storage-photo-uploader-edit', {
      onChange: (file) => {
        console.log('New photo selected:', file ? file.name : 'none');
      }
    });
    
    photoUploader.render();
    console.log('StoragePhotoUploader initialized for edit');
  } catch (error) {
    console.error('Error initializing StoragePhotoUploader:', error);
    uploaderContainer.innerHTML = '<p class="form-help text-muted">Photo upload unavailable</p>';
  }
}

/**
 * Handle save
 */
async function handleSave(storageId) {
  try {
    // Validate form
    if (!formFields.validate()) {
      showError('Please fix the errors in the form');
      return;
    }
    
    showLoading();
    
    // Get form data
    const formData = formFields.getData();
    
    // Build update payload
    const updateData = {
      location: formData.location,
      short_name: formData.short_name,
      general_notes: formData.general_notes
    };
    
    // Only include size for totes
    if (currentStorageUnit.class_type === 'Tote') {
      updateData.size = formData.size;
    }
    
    // Handle photo upload if new photo selected
    if (photoUploader && photoUploader.hasPhoto()) {
      try {
        const file = photoUploader.getSelectedFile();
        
        console.log('Uploading new photo for storage unit:', storageId);
        
        // Upload photo using storageAPI
        const photoData = await storageAPI.uploadStoragePhoto(
          file,
          storageId,
          currentStorageUnit.season
        );
        
        console.log('Photo uploaded successfully:', photoData.photo_id);
        
        // Add photo data to update payload
        updateData.images = {
          photo_id: photoData.photo_id,
          photo_url: photoData.photo_url,
          thumb_cloudfront_url: photoData.thumb_cloudfront_url
        };
      } catch (photoError) {
        console.error('Photo upload failed:', photoError);
        hideLoading();
        showError('Photo upload failed. Please try again.');
        return; // Don't proceed with update if photo upload fails
      }
    }
    
    // Update storage unit
    await storageAPI.update(storageId, updateData);
    
    hideLoading();
    
    // Show success
    showSuccess('Storage unit updated successfully!');
    
    // Navigate back to detail page
    navigate(`/storage/${storageId}`);
    
  } catch (error) {
    console.error('Error updating storage unit:', error);
    hideLoading();
    showError(error.message || 'Failed to update storage unit');
  }
}