/**
 * Storage Edit Page
 * Edit storage unit metadata with CDN photo upload modal for photo replacement
 * UPDATED: Uses photo-upload-modal web component from CDN
 */

import { storageAPI, photosAPI } from '../utils/storage-api.js';
import { formatStorageUnit, getPlaceholderImage } from '../utils/storage-config.js';
import { StorageFormFields } from '../components/StorageFormFields.js';
import { showSuccess, showError } from '../shared/toast.js';
import { navigate } from '../utils/router.js';
import { showLoading, hideLoading } from '../app.js';

let formFields = null;
let currentStorageUnit = null;

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
        <div id="photo-section"></div>
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
  
  // Render photo section
  renderPhotoSection();
}

/**
 * Render photo section with current photo and upload button
 */
function renderPhotoSection() {
  const container = document.getElementById('photo-section');
  const photoUrl = currentStorageUnit.images?.photo_url || getPlaceholderImage();
  const hasPhoto = currentStorageUnit.images?.photo_url;
  
  container.innerHTML = `
    <div class="current-photo-section">
      <label class="form-label">Current Photo</label>
      <div class="current-photo-preview">
        <img src="${photoUrl}" alt="${currentStorageUnit.short_name}" class="current-photo-img" id="current-photo-img" />
      </div>
      <button type="button" class="btn-replace-storage-photo" id="btn-replace-photo">
        📷 ${hasPhoto ? 'Replace Photo' : 'Upload Photo'}
      </button>
      <p class="form-help" style="margin-top: 8px;">
        ${hasPhoto 
          ? 'Click to upload a new photo and replace the current one' 
          : 'Upload a photo to help identify this storage unit'
        }
      </p>
    </div>
  `;
  
  // Attach click listener
  document.getElementById('btn-replace-photo').addEventListener('click', openPhotoUploadModal);
}

/**
 * Open photo upload modal
 */
function openPhotoUploadModal() {
  // Create modal element
  const modal = document.createElement('photo-upload-modal');
  
  // Configure modal attributes
  modal.setAttribute('context', 'storage');
  modal.setAttribute('photo-type', 'storage');
  modal.setAttribute('season', currentStorageUnit.season.toLowerCase());
  modal.setAttribute('storage-id', currentStorageUnit.id);
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
  try {
    // Store new photo data
    if (detail.photo_ids && detail.photo_ids.length > 0) {
      const photo_id = detail.photo_ids[0];
      
      // Fetch photo details from images API
      const photoDetails = await photosAPI.getById(photo_id);
      
      if (!photoDetails) {
        showError('Photo uploaded but failed to retrieve details');
        return;
      }
      
      const photo_url = photoDetails.cloudfront_url;
      const thumb_cloudfront_url = photoDetails.thumb_cloudfront_url;
      
      // Update storage unit immediately with new photo
      showLoading();
      
      await storageAPI.update(currentStorageUnit.id, {
        images: {
          photo_id: photo_id,
          photo_url: photo_url,
          thumb_cloudfront_url: thumb_cloudfront_url
        }
      });
      
      hideLoading();
      
      // Update UI to show new photo
      const photoImg = document.getElementById('current-photo-img');
      if (photoImg) {
        photoImg.src = photo_url;
      }
      
      // Update current storage unit data
      currentStorageUnit.images = {
        photo_id: photo_id,
        photo_url: photo_url,
        thumb_cloudfront_url: thumb_cloudfront_url
      };
      
      showSuccess('Photo uploaded and saved successfully!');
    }
  } catch (error) {
    console.error('Failed to update storage with photo:', error);
    hideLoading();
    showError('Photo upload failed. Please try again.');
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