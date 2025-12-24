// Record form component for create/edit

import { fetchRecord, createRecord, updateRecord, searchItems, fetchItem, fetchMultiplePhotos } from '../api.js';
import { appState } from '../state.js';
import { navigateTo } from '../router.js';
import { debounce } from '../utils/helpers.js';
import { PhotoUpload } from './PhotoUpload.js';

export class RecordFormView {
  constructor(recordId = null, itemId = null) {
    this.recordId = recordId;
    this.prefilledItemId = itemId;
    this.record = null;
    this.item = null;
    this.materials = [];
    this.isEditMode = !!recordId;
    this.autocompleteResults = [];
    this.debouncedSearch = debounce(this.performItemSearch.bind(this), 300);
    this.photoUploader = null;
    this.existingPhotos = {
      before_photos: [],
      after_photos: [],
      documentation: []
    };
    this.initToastContainer();
  }

  initToastContainer() {
    // Create toast container if it doesn't exist
    if (!document.querySelector('.toast-container')) {
      const container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
  }

  showToast(type, title, message, duration = 5000) {
    const container = document.querySelector('.toast-container');
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    // Icon based on type
    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ'
    };
    
    toast.innerHTML = `
      <div class="toast-icon">${icons[type] || icons.info}</div>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        ${message ? `<div class="toast-message">${message}</div>` : ''}
      </div>
      <button class="toast-close" aria-label="Close">×</button>
    `;
    
    // Add to container
    container.appendChild(toast);
    
    // Close button handler
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => {
      this.removeToast(toast);
    });
    
    // Auto-remove after duration
    if (duration > 0) {
      setTimeout(() => {
        this.removeToast(toast);
      }, duration);
    }
  }

  removeToast(toast) {
    toast.classList.add('hiding');
    setTimeout(() => {
      toast.remove();
    }, 300); // Match animation duration
  }
  
  async render(container) {
    try {
      // If edit mode, fetch existing record
      if (this.isEditMode) {
        this.record = await fetchRecord(this.recordId);
        this.materials = this.record.materials_used || [];
        this.prefilledItemId = this.record.item_id;
        
        // Load existing photos
        await this.loadExistingPhotos();
      }
      
      // If item ID provided, fetch item details
      if (this.prefilledItemId) {
        try {
          this.item = await fetchItem(this.prefilledItemId);
        } catch (e) {
          console.warn('Could not fetch item details:', e);
        }
      }
      
      container.innerHTML = this.renderForm();
      this.attachEventListeners(container);
      
      // Initialize photo uploader in edit mode
      if (this.isEditMode) {
        this.initializePhotoUploader(container);
      }
      
    } catch (error) {
      console.error('Failed to load form:', error);
      container.innerHTML = this.renderError();
    }
  }
  
  async loadExistingPhotos() {
    if (!this.record || !this.record.attachments) return;
    
    const attachments = this.record.attachments;
    
    // Fetch photos for each category
    for (const category of ['before_photos', 'after_photos', 'documentation']) {
      const photoRefs = attachments[category] || [];
      const photoIds = photoRefs.map(ref => ref.photo_id);
      
      if (photoIds.length > 0) {
        try {
          const photos = await fetchMultiplePhotos(photoIds);
          this.existingPhotos[category] = photos.map((photo, index) => ({
            ...photo,
            ...photoRefs[index]
          }));
        } catch (error) {
          console.error(`Failed to load ${category}:`, error);
        }
      }
    }
  }
  
  renderForm() {
    const record = this.record || {};
    
    return `
      <div class="form-view">
        <div class="form-header">
          <button class="btn-back" onclick="history.back()">← Back to Records</button>
        </div>
        
        <div class="form-container">
          <h1>${this.isEditMode ? 'Edit' : 'Create'} Maintenance Record</h1>
          
          <form id="record-form" class="record-form">
            <!-- Item Details Section -->
            <div class="form-section">
              <h3>Item Details</h3>
              
              <div class="form-group">
                <label for="item_id">Item ID <span class="required">*</span></label>
                <div class="autocomplete-container">
                  <input 
                    type="text" 
                    id="item_id" 
                    name="item_id"
                    class="form-input autocomplete-input" 
                    placeholder="Search for item..."
                    value="${this.prefilledItemId || record.item_id || ''}"
                    ${this.isEditMode ? 'readonly' : ''}
                    required
                  >
                  <div class="autocomplete-results" id="item-autocomplete"></div>
                </div>
                ${this.item ? `
                  <div class="item-info">
                    <strong>${this.item.short_name || 'Unnamed Item'}</strong>
                    <span class="item-meta">${this.item.class || ''} • ${this.item.class_type || ''} • ${this.item.season || ''}</span>
                  </div>
                ` : ''}
              </div>
            </div>
            
            <!-- Record Information Section -->
            <div class="form-section">
              <h3>Record Information</h3>
              
              <div class="form-row">
                <div class="form-group">
                  <label for="record_type">Record Type <span class="required">*</span></label>
                  <select id="record_type" name="record_type" class="form-input" required>
                    <option value="">Select type...</option>
                    <option value="repair" ${record.record_type === 'repair' ? 'selected' : ''}>Repair</option>
                    <option value="maintenance" ${record.record_type === 'maintenance' ? 'selected' : ''}>Maintenance</option>
                    <option value="inspection" ${record.record_type === 'inspection' ? 'selected' : ''}>Inspection</option>
                  </select>
                </div>
                
                <div class="form-group">
                  <label for="status">Status <span class="required">*</span></label>
                  <select id="status" name="status" class="form-input" required>
                    <option value="">Select status...</option>
                    <option value="scheduled" ${record.status === 'scheduled' ? 'selected' : ''}>Scheduled</option>
                    <option value="in_progress" ${record.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
                    <option value="completed" ${record.status === 'completed' ? 'selected' : ''}>Completed</option>
                    <option value="cancelled" ${record.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                  </select>
                </div>
              </div>
              
              <div class="form-group">
                <label for="title">Title <span class="required">*</span></label>
                <input 
                  type="text" 
                  id="title" 
                  name="title"
                  class="form-input" 
                  placeholder="Brief description of the work"
                  value="${record.title || ''}"
                  required
                >
              </div>
              
              <div class="form-group">
                <label for="description">Description</label>
                <textarea 
                  id="description" 
                  name="description"
                  class="form-input" 
                  rows="4"
                  placeholder="Detailed description of the maintenance, repair, or inspection..."
                >${record.description || ''}</textarea>
              </div>
              
              <div class="form-group" id="criticality-group" style="${record.record_type === 'repair' || !this.isEditMode ? '' : 'display: none;'}">
                <label for="criticality">Criticality ${record.record_type === 'repair' ? '<span class="required">*</span>' : '(Optional)'}</label>
                <select id="criticality" name="criticality" class="form-input">
                  <option value="">Select criticality...</option>
                  <option value="low" ${record.criticality === 'low' ? 'selected' : ''}>Low</option>
                  <option value="medium" ${record.criticality === 'medium' ? 'selected' : ''}>Medium</option>
                  <option value="high" ${record.criticality === 'high' ? 'selected' : ''}>High</option>
                </select>
              </div>
            </div>
            
            <!-- Scheduling Section -->
            <div class="form-section">
              <h3>Scheduling</h3>
              
              <div class="form-row">
                <div class="form-group">
                  <label for="date_performed">Date Performed <span class="required">*</span></label>
                  <input 
                    type="date" 
                    id="date_performed" 
                    name="date_performed"
                    class="form-input" 
                    value="${record.date_performed ? record.date_performed.split('T')[0] : ''}"
                    required
                  >
                </div>
                
                <div class="form-group">
                  <label for="estimated_completion_date">Est. Completion Date</label>
                  <input 
                    type="date" 
                    id="estimated_completion_date" 
                    name="estimated_completion_date"
                    class="form-input" 
                    value="${record.estimated_completion_date ? record.estimated_completion_date.split('T')[0] : ''}"
                  >
                </div>
              </div>
              
              <div class="form-group">
                <label for="performed_by">Performed By <span class="required">*</span></label>
                <input 
                  type="text" 
                  id="performed_by" 
                  name="performed_by"
                  class="form-input" 
                  placeholder="Name of person performing work"
                  value="${record.performed_by || ''}"
                  required
                >
              </div>
            </div>
            
            <!-- Materials Section -->
            <div class="form-section">
              <h3>Materials Used</h3>
              <div id="materials-list">
                ${this.renderMaterialsList()}
              </div>
              <button type="button" class="btn-secondary" id="add-material-btn">+ Add Material</button>
            </div>
            
            ${this.isEditMode ? `
              <!-- Photo Management Section (Edit Mode Only) -->
              <div class="form-section">
                <h3>Photo Management</h3>
                
                <!-- Existing Photos -->
                ${this.renderExistingPhotos()}
                
                <!-- Upload New Photos -->
                <div id="photo-upload-container"></div>
              </div>
            ` : ''}
            
            <!-- Submit Buttons -->
            <div class="form-actions">
              <button type="submit" class="btn-primary">
                ${this.isEditMode ? 'Update Record' : 'Create Record'}
              </button>
              <button type="button" class="btn-secondary" onclick="history.back()">
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
  }
  
  renderMaterialsList() {
    if (this.materials.length === 0) {
      return '<p class="empty-message">No materials added yet</p>';
    }
    
    return this.materials.map((material, index) => `
      <div class="material-item" data-index="${index}">
        <input 
          type="text" 
          placeholder="Item name" 
          value="${material.item || ''}"
          data-field="item"
          class="form-input"
        >
        <input 
          type="text" 
          placeholder="Quantity" 
          value="${material.quantity || ''}"
          data-field="quantity"
          class="form-input"
        >
        <input 
          type="text" 
          placeholder="Unit" 
          value="${material.unit || ''}"
          data-field="unit"
          class="form-input"
        >
        <button type="button" class="btn-remove" data-index="${index}">Remove</button>
      </div>
    `).join('');
  }
  
  renderExistingPhotos() {
    const categories = [
      { key: 'before_photos', label: 'Before Photos' },
      { key: 'after_photos', label: 'After Photos' },
      { key: 'documentation', label: 'Documentation' }
    ];
    
    return categories.map(({ key, label }) => {
      const photos = this.existingPhotos[key] || [];
      
      if (photos.length === 0) return '';
      
      return `
        <div class="existing-photos-section">
          <h4>${label} (${photos.length})</h4>
          <div class="existing-photos-grid">
            ${photos.map(photo => `
              <div class="existing-photo-item" data-photo-id="${photo.photo_id}" data-category="${key}">
                <img src="${photo.thumb_cloudfront_url}" alt="Photo" class="existing-photo-thumb">
                <div class="existing-photo-info">
                  <div class="photo-filename">${photo.metadata?.original_filename || 'Photo'}</div>
                  <div class="photo-type">${photo.photo_type}</div>
                </div>
                <button type="button" class="btn-remove-existing-photo" data-photo-id="${photo.photo_id}" data-category="${key}">
                  × Remove
                </button>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }).join('');
  }
  
  initializePhotoUploader(container) {
    const uploadContainer = container.querySelector('#photo-upload-container');
    if (!uploadContainer) return;
    
    // Create photo uploader with record context
    this.photoUploader = new PhotoUpload({
      record_type: this.record.record_type,
      season: this.item?.season || 'shared',
      item_id: this.prefilledItemId
    });
    
    uploadContainer.innerHTML = this.photoUploader.render();
    this.photoUploader.attachEventListeners(uploadContainer);
  }
  
  removeExistingPhoto(photoId, category) {
    // Remove from local state
    this.existingPhotos[category] = this.existingPhotos[category].filter(
      photo => photo.photo_id !== photoId
    );
    
    // Re-render existing photos section
    const formSection = document.querySelector('.form-section:has(#photo-upload-container)');
    if (formSection) {
      const existingSections = formSection.querySelectorAll('.existing-photos-section');
      existingSections.forEach(section => section.remove());
      
      const uploadContainer = formSection.querySelector('#photo-upload-container');
      if (uploadContainer) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = this.renderExistingPhotos();
        
        while (tempDiv.firstChild) {
          uploadContainer.parentNode.insertBefore(tempDiv.firstChild, uploadContainer);
        }
      }
      
      // Re-attach event listeners for remove buttons
      this.attachPhotoRemoveListeners();
    }
  }
  
  attachPhotoRemoveListeners() {
    const removeButtons = document.querySelectorAll('.btn-remove-existing-photo');
    removeButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const photoId = e.target.dataset.photoId;
        const category = e.target.dataset.category;
        this.removeExistingPhoto(photoId, category);
      });
    });
  }
  
  renderError() {
    return `
      <div class="error-container">
        <h1>Error Loading Form</h1>
        <p>Unable to load the record form. Please try again.</p>
        <button onclick="history.back()">Go Back</button>
      </div>
    `;
  }
  
  attachEventListeners(container) {
    const form = container.querySelector('#record-form');
    if (!form) return;
    
    // Form submission
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSubmit(form);
    });
    
    // Record type change - show/hide criticality
    const recordTypeSelect = form.querySelector('#record_type');
    const criticalityGroup = form.querySelector('#criticality-group');
    
    if (recordTypeSelect && criticalityGroup) {
      recordTypeSelect.addEventListener('change', (e) => {
        if (e.target.value === 'repair') {
          criticalityGroup.style.display = '';
          form.querySelector('#criticality').setAttribute('required', 'required');
        } else {
          criticalityGroup.style.display = 'none';
          form.querySelector('#criticality').removeAttribute('required');
        }
      });
    }
    
    // Item autocomplete (only in create mode)
    if (!this.isEditMode) {
      const itemInput = form.querySelector('#item_id');
      if (itemInput) {
        itemInput.addEventListener('input', (e) => {
          const query = e.target.value;
          if (query.length >= 2) {
            this.debouncedSearch(query, container);
          } else {
            this.hideAutocomplete(container);
          }
        });
      }
    }
    
    // Materials management
    const addMaterialBtn = container.querySelector('#add-material-btn');
    if (addMaterialBtn) {
      addMaterialBtn.addEventListener('click', () => {
        this.materials.push({ item: '', quantity: '', unit: '' });
        this.updateMaterialsList(container);
      });
    }
    
    this.attachMaterialsListeners(container);
    
    // Photo remove listeners (edit mode)
    if (this.isEditMode) {
      this.attachPhotoRemoveListeners();
    }
  }
  
  attachMaterialsListeners(container) {
    // Remove material buttons
    const removeButtons = container.querySelectorAll('.material-item .btn-remove');
    removeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const index = parseInt(btn.getAttribute('data-index'));
        this.materials.splice(index, 1);
        this.updateMaterialsList(container);
      });
    });
    
    // Update materials on input change
    const materialInputs = container.querySelectorAll('.material-item input');
    materialInputs.forEach(input => {
      input.addEventListener('change', () => {
        const item = input.closest('.material-item');
        const index = parseInt(item.getAttribute('data-index'));
        const field = input.getAttribute('data-field');
        this.materials[index][field] = input.value;
      });
    });
  }
  
  updateMaterialsList(container) {
    const materialsListDiv = container.querySelector('#materials-list');
    if (materialsListDiv) {
      materialsListDiv.innerHTML = this.renderMaterialsList();
      this.attachMaterialsListeners(container);
    }
  }
  
  async performItemSearch(query, container) {
    try {
      const result = await searchItems(query);
      this.autocompleteResults = result.items || [];
      this.showAutocomplete(container);
    } catch (error) {
      console.error('Search failed:', error);
      this.hideAutocomplete(container);
    }
  }
  
  showAutocomplete(container) {
    const resultsDiv = container.querySelector('#item-autocomplete');
    if (!resultsDiv) return;
    
    if (this.autocompleteResults.length === 0) {
      resultsDiv.innerHTML = '<div class="autocomplete-empty">No items found</div>';
      resultsDiv.classList.add('show');
      return;
    }
    
    const resultsHtml = this.autocompleteResults.map(item => `
      <div class="autocomplete-result" data-item-id="${item.id}" data-item-name="${item.short_name || ''}">
        <strong>${item.id}</strong> - ${item.short_name || 'Unnamed Item'}
        <span class="item-meta">${item.class || ''} • ${item.season || ''}</span>
      </div>
    `).join('');
    
    resultsDiv.innerHTML = resultsHtml;
    resultsDiv.classList.add('show');
    
    // Attach click handlers
    const resultItems = resultsDiv.querySelectorAll('.autocomplete-result');
    resultItems.forEach(resultItem => {
      resultItem.addEventListener('click', () => {
        const itemId = resultItem.getAttribute('data-item-id');
        const input = container.querySelector('#item_id');
        if (input) {
          input.value = itemId;
          this.prefilledItemId = itemId;
          
          // Fetch and display item details
          fetchItem(itemId).then(item => {
            this.item = item;
            const formContainer = container.querySelector('.form-container');
            if (formContainer) {
              // Re-render to show item info
              container.innerHTML = this.renderForm();
              this.attachEventListeners(container);
            }
          }).catch(err => console.error('Failed to fetch item:', err));
        }
        this.hideAutocomplete(container);
      });
    });
  }
  
  hideAutocomplete(container) {
    const resultsDiv = container.querySelector('#item-autocomplete');
    if (resultsDiv) {
      resultsDiv.classList.remove('show');
      resultsDiv.innerHTML = '';
    }
  }
  
  async handleSubmit(form) {
    try {
      const formData = new FormData(form);
      
      // Build attachments object
      const attachments = {
        before_photos: [],
        after_photos: [],
        documentation: []
      };
      
      // Add existing photos (that weren't removed)
      for (const category of ['before_photos', 'after_photos', 'documentation']) {
        attachments[category] = this.existingPhotos[category].map(photo => ({
          photo_id: photo.photo_id,
          photo_type: photo.photo_type
        }));
      }
      
      // Handle new photo uploads if any
      if (this.photoUploader && this.photoUploader.hasPhotos()) {
        this.showToast('info', 'Uploading Photos', 'Please wait while photos are being uploaded...');
        
        try {
          const uploadedPhotos = await this.photoUploader.uploadPhotos();
          
          // Add new photos to appropriate category
          const selectedCategory = this.photoUploader.getCategory();
          attachments[selectedCategory].push(...uploadedPhotos);
        } catch (uploadError) {
          console.error('Photo upload failed:', uploadError);
          this.showToast('error', 'Photo Upload Failed', uploadError.message || 'Failed to upload photos');
          return;
        }
      }
      
      const data = {
        item_id: formData.get('item_id'),
        record_type: formData.get('record_type'),
        status: formData.get('status'),
        title: formData.get('title'),
        description: formData.get('description') || '',
        date_performed: formData.get('date_performed') ? new Date(formData.get('date_performed')).toISOString() : new Date().toISOString(),
        performed_by: formData.get('performed_by'),
        criticality: formData.get('criticality') || null,
        estimated_completion_date: formData.get('estimated_completion_date') ? new Date(formData.get('estimated_completion_date')).toISOString() : null,
        materials_used: this.materials.filter(m => m.item),
        cost_record_ids: this.record?.cost_record_ids || [],
        total_cost: this.record?.total_cost || 0,
        attachments: attachments
      };
      
      // Validate
      if (!data.item_id || !data.record_type || !data.status || !data.title || !data.performed_by) {
        throw new Error('Please fill in all required fields');
      }
      
      // For repairs, criticality is required
      if (data.record_type === 'repair' && !data.criticality) {
        throw new Error('Criticality is required for repairs');
      }
      
      let savedRecord;
      if (this.isEditMode) {
        // Update existing record
        data.updated_by = data.performed_by;
        savedRecord = await updateRecord(this.recordId, data);
        appState.updateRecord(this.recordId, savedRecord);
        
        this.showToast('success', 'Success', 'Record updated successfully');
      } else {
        // Create new record
        savedRecord = await createRecord(data);
        appState.addRecord(savedRecord);
        
        this.showToast('success', 'Success', 'Record created successfully');
      }
      
      // Navigate to record detail
      navigateTo(`/${savedRecord.item_id}/${savedRecord.record_id}`);
      
    } catch (error) {
      console.error('Failed to save record:', error);
      this.showToast('error', 'Error', error.message || 'Failed to save record');
    }
  }
}