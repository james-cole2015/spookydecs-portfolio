/**
 * ImageUploadForm Component
 * 
 * Main upload form with file picker, photo type selector, and entity pickers
 */

import { renderPhotoTypeSelector, getPhotoType, getEntityRequirements } from './PhotoTypeSelector.js';
import { renderItemPicker, renderStoragePicker, renderDeploymentPicker, getSelectedItems, getSelectedStorage, getSelectedDeployment } from './EntityPickers.js';
import { renderSeasonField, renderYearField, renderTagsField, renderCaptionField } from './EditFormFields.js';
import { isValidFileType, isValidFileSize, formatFileSize } from '../utils/images-config.js';

let selectedFiles = [];
let currentEntityRequirements = null;

/**
 * Render upload form
 * @param {HTMLElement} container - Container element
 * @param {Function} onSubmit - Submit callback
 * @param {Function} onCancel - Cancel callback
 */
export function renderImageUploadForm(container, onSubmit, onCancel) {
  container.innerHTML = `
    <div class="image-upload-form">
      <div class="form-header">
        <h2>Upload Photos</h2>
        <button class="close-btn" id="cancel-btn" type="button">✕</button>
      </div>
      
      <form id="upload-form" class="upload-form">
        <!-- File Upload Area -->
        <div class="file-upload-section">
          <div class="file-upload-area" id="upload-area">
            <div class="upload-icon">📤</div>
            <p class="upload-text">Drag & drop photos here or click to browse</p>
            <p class="upload-hint">Supports: JPG, PNG, GIF, WebP (max 10MB per file)</p>
          </div>
          <input 
            type="file" 
            id="file-input" 
            class="file-input-hidden" 
            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
            multiple
          />
          
          <!-- File Preview List -->
          <div id="file-preview-list" class="file-preview-list"></div>
        </div>
        
        <!-- Form Fields -->
        <div class="form-fields">
          <!-- Photo Type Selector -->
          <div id="photo-type-container"></div>
          
          <!-- Caption -->
          <div id="caption-container"></div>
          
          <!-- Season & Year -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div id="season-container"></div>
            <div id="year-container"></div>
          </div>
          
          <!-- Tags -->
          <div id="tags-container"></div>
          
          <!-- Entity Pickers (dynamic based on photo type) -->
          <div id="entity-pickers-container"></div>
        </div>
        
        <!-- Form Actions -->
        <div class="form-actions">
          <button type="button" class="btn-secondary" id="cancel-form-btn">
            Cancel
          </button>
          <button type="submit" class="btn-primary" id="submit-btn" disabled>
            📤 Upload Photos
          </button>
        </div>
      </form>
    </div>
  `;
  
  // Initialize form
  initializeForm(onSubmit, onCancel);
}

/**
 * Initialize form components and listeners
 */
function initializeForm(onSubmit, onCancel) {
  // Reset state
  selectedFiles = [];
  currentEntityRequirements = null;
  
  // Render form components
  const photoTypeContainer = document.getElementById('photo-type-container');
  const captionContainer = document.getElementById('caption-container');
  const seasonContainer = document.getElementById('season-container');
  const yearContainer = document.getElementById('year-container');
  const tagsContainer = document.getElementById('tags-container');
  
  renderPhotoTypeSelector(photoTypeContainer, 'gallery', handlePhotoTypeChange);
  captionContainer.innerHTML = renderCaptionField('');
  seasonContainer.innerHTML = renderSeasonField('halloween');
  yearContainer.innerHTML = renderYearField(new Date().getFullYear());
  tagsContainer.innerHTML = renderTagsField([]);
  
  // Attach file upload listeners
  attachFileUploadListeners();
  
  // Attach form submission
  const form = document.getElementById('upload-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await handleSubmit(onSubmit);
  });
  
  // Attach cancel buttons
  const cancelBtn = document.getElementById('cancel-btn');
  const cancelFormBtn = document.getElementById('cancel-form-btn');
  
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => onCancel && onCancel());
  }
  
  if (cancelFormBtn) {
    cancelFormBtn.addEventListener('click', () => onCancel && onCancel());
  }
}

/**
 * Handle photo type change
 */
async function handlePhotoTypeChange(photoType, context) {
  currentEntityRequirements = getEntityRequirements(photoType);
  
  console.log('Photo type changed:', photoType, currentEntityRequirements);
  
  // Update entity pickers
  const entityPickersContainer = document.getElementById('entity-pickers-container');
  entityPickersContainer.innerHTML = '<div class="entity-pickers-loading">Loading entity pickers...</div>';
  
  // Render appropriate pickers
  if (currentEntityRequirements.needsItems) {
    const multiSelect = photoType === 'gallery';
    await renderItemPicker(entityPickersContainer, [], multiSelect);
  } else if (currentEntityRequirements.needsStorage) {
    await renderStoragePicker(entityPickersContainer, null);
  } else if (currentEntityRequirements.needsDeployment) {
    await renderDeploymentPicker(entityPickersContainer, null);
  } else {
    entityPickersContainer.innerHTML = '';
  }
}

/**
 * Attach file upload listeners
 */
function attachFileUploadListeners() {
  const uploadArea = document.getElementById('upload-area');
  const fileInput = document.getElementById('file-input');
  
  // Click to browse
  uploadArea.addEventListener('click', () => {
    fileInput.click();
  });
  
  // File selection
  fileInput.addEventListener('change', (e) => {
    handleFileSelection(e.target.files);
  });
  
  // Drag and drop
  uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragging');
  });
  
  uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragging');
  });
  
  uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragging');
    handleFileSelection(e.dataTransfer.files);
  });
}

/**
 * Handle file selection
 */
function handleFileSelection(files) {
  const validFiles = Array.from(files).filter(file => {
    if (!isValidFileType(file.type)) {
      console.error(`Invalid file type: ${file.name}`);
      return false;
    }
    if (!isValidFileSize(file.size)) {
      console.error(`File too large: ${file.name}`);
      return false;
    }
    return true;
  });
  
  selectedFiles = [...selectedFiles, ...validFiles];
  renderFilePreview();
  updateSubmitButton();
}

/**
 * Render file preview
 */
function renderFilePreview() {
  const container = document.getElementById('file-preview-list');
  
  if (selectedFiles.length === 0) {
    container.innerHTML = '';
    return;
  }
  
  container.innerHTML = selectedFiles.map((file, index) => `
    <div class="file-preview-item">
      <img 
        src="${URL.createObjectURL(file)}" 
        alt="${file.name}"
        class="file-preview-img"
      />
      <div class="file-preview-info">
        <div class="file-preview-name" title="${file.name}">${file.name}</div>
        <div class="file-preview-size">${formatFileSize(file.size)}</div>
      </div>
      <button 
        type="button" 
        class="file-remove-btn" 
        data-index="${index}"
        aria-label="Remove file"
      >
        ✕
      </button>
    </div>
  `).join('');
  
  // Attach remove buttons
  container.querySelectorAll('.file-remove-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const index = parseInt(btn.dataset.index);
      selectedFiles.splice(index, 1);
      renderFilePreview();
      updateSubmitButton();
    });
  });
}

/**
 * Update submit button state
 */
function updateSubmitButton() {
  const submitBtn = document.getElementById('submit-btn');
  if (submitBtn) {
    submitBtn.disabled = selectedFiles.length === 0;
  }
}

/**
 * Handle form submission
 */
async function handleSubmit(onSubmit) {
  const submitBtn = document.getElementById('submit-btn');
  
  try {
    // Get form data
    const form = document.getElementById('upload-form');
    const formData = new FormData(form);
    
    // Get photo type
    const photoTypeContainer = document.getElementById('photo-type-container');
    const photoType = getPhotoType(photoTypeContainer);
    
    // Get entity selections
    const entityPickersContainer = document.getElementById('entity-pickers-container');
    let item_ids = [];
    let storage_id = null;
    let deployment_id = null;
    
    if (currentEntityRequirements) {
      if (currentEntityRequirements.needsItems) {
        item_ids = getSelectedItems(entityPickersContainer);
      } else if (currentEntityRequirements.needsStorage) {
        storage_id = getSelectedStorage(entityPickersContainer);
      } else if (currentEntityRequirements.needsDeployment) {
        deployment_id = getSelectedDeployment(entityPickersContainer);
      }
    }
    
    // Parse tags
    const tagsString = formData.get('tags') || '';
    const tags = tagsString
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);
    
    // Build form data object
    const uploadFormData = {
      photo_type: photoType,
      season: formData.get('season'),
      year: parseInt(formData.get('year')),
      caption: formData.get('caption') || '',
      tags: tags,
      item_ids: item_ids,
      storage_id: storage_id,
      deployment_id: deployment_id,
      idea_id: null // TODO: Add idea picker
    };
    
    // Disable submit button
    submitBtn.disabled = true;
    submitBtn.textContent = '📤 Uploading...';
    
    // Call submit callback
    if (onSubmit) {
      await onSubmit(uploadFormData, selectedFiles);
    }
    
  } catch (error) {
    console.error('Form submission error:', error);
    submitBtn.disabled = false;
    submitBtn.textContent = '📤 Upload Photos';
    throw error;
  }
}

/**
 * Reset upload form
 */
export function resetUploadForm() {
  selectedFiles = [];
  currentEntityRequirements = null;
  
  const filePreviewList = document.getElementById('file-preview-list');
  if (filePreviewList) {
    filePreviewList.innerHTML = '';
  }
  
  const form = document.getElementById('upload-form');
  if (form) {
    form.reset();
  }
  
  updateSubmitButton();
}
