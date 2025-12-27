/**
 * ImageEditForm Component
 * 
 * Form for editing photo metadata
 */

import {
  renderCaptionField,
  renderPhotoTypeField,
  renderSeasonField,
  renderYearField,
  renderTagsField,
  renderVisibilityFields,
  getFormData,
  validateFormData
} from './EditFormFields.js';
import { navigate } from '../utils/router.js';

/**
 * Render the edit form
 * @param {HTMLElement} container - Container element
 * @param {Object} photo - Photo object
 * @param {Function} onSubmit - Submit callback
 * @param {Function} onCancel - Cancel callback
 */
export function renderImageEditForm(container, photo, onSubmit, onCancel) {
  container.innerHTML = `
    <div class="image-edit-form">
      <div class="form-header">
        <h2>Edit Photo Details</h2>
        <button class="close-btn" id="cancel-btn">✕</button>
      </div>
      
      <form id="edit-form" class="edit-form">
        <!-- Preview -->
        <div class="form-preview">
          <img 
            src="${photo.thumb_cloudfront_url || photo.cloudfront_url}" 
            alt="${photo.caption || photo.photo_id}"
            class="preview-thumb"
          />
          <div class="preview-info">
            <div class="photo-id">${photo.photo_id}</div>
            <div class="photo-date">Uploaded: ${new Date(photo.upload_date).toLocaleDateString()}</div>
          </div>
        </div>
        
        <!-- Form Fields -->
        <div class="form-fields">
          ${renderCaptionField(photo.caption)}
          ${renderPhotoTypeField(photo.photo_type)}
          ${renderSeasonField(photo.season)}
          ${renderYearField(photo.year)}
          ${renderTagsField(photo.tags)}
          ${renderVisibilityFields(photo.is_public, photo.is_visible)}
          
          <!-- Entity Pickers Container -->
          <div id="entity-pickers-container"></div>
        </div>
        
        <!-- Form Actions -->
        <div class="form-actions">
          <button type="button" class="btn-secondary" id="cancel-form-btn">
            Cancel
          </button>
          <button type="submit" class="btn-primary" id="submit-btn">
            💾 Save Changes
          </button>
        </div>
      </form>
    </div>
  `;
  
  // Attach event listeners
  attachFormListeners(container, photo, onSubmit, onCancel);
}

/**
 * Attach event listeners to form
 * @param {HTMLElement} container - Container element
 * @param {Object} photo - Photo object
 * @param {Function} onSubmit - Submit callback
 * @param {Function} onCancel - Cancel callback
 */
function attachFormListeners(container, photo, onSubmit, onCancel) {
  const form = container.querySelector('#edit-form');
  const cancelBtn = container.querySelector('#cancel-btn');
  const cancelFormBtn = container.querySelector('#cancel-form-btn');
  const submitBtn = container.querySelector('#submit-btn');
  
  // Cancel buttons
  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      navigate(`/images/${photo.photo_id}`);
    }
  };
  
  if (cancelBtn) {
    cancelBtn.addEventListener('click', handleCancel);
  }
  
  if (cancelFormBtn) {
    cancelFormBtn.addEventListener('click', handleCancel);
  }
  
  // Form submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Get form data
    const formData = getFormData(form);
    
    // Validate
    const validation = validateFormData(formData);
    
    if (!validation.isValid) {
      alert(`Please fix the following errors:\n\n${validation.errors.join('\n')}`);
      return;
    }
    
    // Disable submit button
    submitBtn.disabled = true;
    submitBtn.textContent = '💾 Saving...';
    
    try {
      // Call submit callback
      if (onSubmit) {
        await onSubmit(formData);
      }
    } catch (error) {
      console.error('Form submission error:', error);
      submitBtn.disabled = false;
      submitBtn.textContent = '💾 Save Changes';
    }
  });
  
  // Photo type change handler (for entity pickers)
  const photoTypeSelect = form.querySelector('#photo_type');
  if (photoTypeSelect) {
    photoTypeSelect.addEventListener('change', () => {
      // Update entity pickers based on photo type
      updateEntityPickers(container, photoTypeSelect.value, photo);
    });
    
    // Initialize entity pickers
    updateEntityPickers(container, photo.photo_type, photo);
  }
}

/**
 * Update entity pickers based on photo type
 * @param {HTMLElement} container - Container element
 * @param {string} photoType - Photo type
 * @param {Object} photo - Photo object
 */
function updateEntityPickers(container, photoType, photo) {
  const pickersContainer = container.querySelector('#entity-pickers-container');
  
  if (!pickersContainer) return;
  
  // For now, just show a placeholder
  // EntityPickers component will be implemented in Phase 4
  pickersContainer.innerHTML = `
    <div class="form-group">
      <label>Linked Entities</label>
      <div class="entity-picker-placeholder">
        <p>Entity pickers will be available in Phase 4</p>
        <p>Photo Type: ${photoType}</p>
        ${photo.item_ids && photo.item_ids.length > 0 ? `
          <p>Currently linked items: ${photo.item_ids.join(', ')}</p>
        ` : ''}
      </div>
    </div>
  `;
}
