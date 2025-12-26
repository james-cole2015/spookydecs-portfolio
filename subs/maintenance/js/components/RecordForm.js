// Record form component for create/edit

import { fetchRecord, createRecord, updateRecord, fetchItem, fetchMultiplePhotos } from '../api.js';
import { appState } from '../state.js';
import { navigateTo } from '../router.js';
import { PhotoUpload } from './PhotoUpload.js';
import { ItemSelector } from './form/ItemSelector.js';
import { MaterialsList } from './form/MaterialsList.js';
import { ExistingPhotos } from './form/ExistingPhotos.js';
import { Toast } from '../utils/toast.js';

export class RecordFormView {
  constructor(recordId = null, itemId = null) {
    this.recordId = recordId;
    this.prefilledItemId = itemId;
    this.record = null;
    this.item = null;
    this.materials = [];
    this.isEditMode = !!recordId;
    this.photoUploader = null;
    this.existingPhotos = {
      before_photos: [],
      after_photos: [],
      documentation: []
    };
    
    // Sub-components
    this.itemSelector = new ItemSelector(itemId, this.isEditMode);
    this.materialsList = new MaterialsList();
    this.existingPhotosView = new ExistingPhotos();
  }
  
  async render(container) {
    try {
      // If edit mode, fetch existing record
      if (this.isEditMode) {
        this.record = await fetchRecord(this.recordId);
        this.materials = this.record.materials_used || [];
        this.prefilledItemId = this.record.item_id;
        await this.loadExistingPhotos();
      }
      
      // If item ID provided, fetch item details
      if (this.prefilledItemId) {
        try {
          this.item = await fetchItem(this.prefilledItemId);
          this.itemSelector.setItem(this.item);
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
            ${this.itemSelector.render(this.prefilledItemId || record.item_id)}
            ${this.renderRecordInfo(record)}
            ${this.renderScheduling(record)}
            ${this.materialsList.render(this.materials)}
            ${this.isEditMode ? this.renderPhotoSection() : ''}
            ${this.renderFormActions()}
          </form>
        </div>
      </div>
    `;
  }
  
  renderRecordInfo(record) {
    return `
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
          <input type="text" id="title" name="title" class="form-input" 
                 placeholder="Brief description of the work" value="${record.title || ''}" required>
        </div>
        
        <div class="form-group">
          <label for="description">Description</label>
          <textarea id="description" name="description" class="form-input" rows="4"
                    placeholder="Detailed description...">${record.description || ''}</textarea>
        </div>
        
        <div class="form-group" id="criticality-group" 
             style="${record.record_type === 'repair' || !this.isEditMode ? '' : 'display: none;'}">
          <label for="criticality">Criticality ${record.record_type === 'repair' ? '<span class="required">*</span>' : '(Optional)'}</label>
          <select id="criticality" name="criticality" class="form-input">
            <option value="">Select criticality...</option>
            <option value="low" ${record.criticality === 'low' ? 'selected' : ''}>Low</option>
            <option value="medium" ${record.criticality === 'medium' ? 'selected' : ''}>Medium</option>
            <option value="high" ${record.criticality === 'high' ? 'selected' : ''}>High</option>
          </select>
        </div>
      </div>
    `;
  }
  
  renderScheduling(record) {
    return `
      <div class="form-section">
        <h3>Scheduling</h3>
        <div class="form-row">
          <div class="form-group">
            <label for="date_performed">Date Performed <span class="required">*</span></label>
            <input type="date" id="date_performed" name="date_performed" class="form-input" 
                   value="${record.date_performed ? record.date_performed.split('T')[0] : ''}" required>
          </div>
          <div class="form-group">
            <label for="estimated_completion_date">Est. Completion Date</label>
            <input type="date" id="estimated_completion_date" name="estimated_completion_date" class="form-input" 
                   value="${record.estimated_completion_date ? record.estimated_completion_date.split('T')[0] : ''}">
          </div>
        </div>
        <div class="form-group">
          <label for="performed_by">Performed By <span class="required">*</span></label>
          <input type="text" id="performed_by" name="performed_by" class="form-input" 
                 placeholder="Name of person performing work" value="${record.performed_by || ''}" required>
        </div>
      </div>
    `;
  }
  
  renderPhotoSection() {
    return `
      <div class="form-section">
        <h3>Photo Management</h3>
        ${this.existingPhotosView.render(this.existingPhotos)}
        <div id="photo-upload-container"></div>
      </div>
    `;
  }
  
  renderFormActions() {
    return `
      <div class="form-actions">
        <button type="submit" class="btn-primary">
          ${this.isEditMode ? 'Update Record' : 'Create Record'}
        </button>
        <button type="button" class="btn-secondary" onclick="history.back()">Cancel</button>
      </div>
    `;
  }
  
  initializePhotoUploader(container) {
    const uploadContainer = container.querySelector('#photo-upload-container');
    if (!uploadContainer) return;
    
    this.photoUploader = new PhotoUpload({
      record_type: this.record.record_type,
      season: this.item?.season || 'shared',
      item_id: this.prefilledItemId
    });
    
    uploadContainer.innerHTML = this.photoUploader.render();
    this.photoUploader.attachEventListeners(uploadContainer);
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
    
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSubmit(form);
    });
    
    // Criticality visibility
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
    
    // Item selector listeners
    this.itemSelector.attachEventListeners(container, (item) => {
      this.item = item;
      this.prefilledItemId = item.id;
      container.innerHTML = this.renderForm();
      this.attachEventListeners(container);
    });
    
    // Materials listeners
    this.materialsList.attachEventListeners(container, this.materials);
    
    // Photo remove listeners
    if (this.isEditMode) {
      this.existingPhotosView.attachEventListeners(container, (photoId, category) => {
        this.existingPhotos[category] = this.existingPhotos[category].filter(
          photo => photo.photo_id !== photoId
        );
        this.existingPhotosView.rerender(container, this.existingPhotos);
      });
    }
  }
  
  async handleSubmit(form) {
    try {
      const formData = new FormData(form);
      const attachments = { before_photos: [], after_photos: [], documentation: [] };
      
      // Add existing photos
      for (const category of ['before_photos', 'after_photos', 'documentation']) {
        attachments[category] = this.existingPhotos[category].map(photo => ({
          photo_id: photo.photo_id,
          photo_type: photo.photo_type
        }));
      }
      
      // Handle new uploads
      if (this.photoUploader && this.photoUploader.hasPhotos()) {
        Toast.show('info', 'Uploading Photos', 'Please wait...');
        try {
          const uploadedPhotos = await this.photoUploader.uploadPhotos();
          const selectedCategory = this.photoUploader.getCategory();
          attachments[selectedCategory].push(...uploadedPhotos);
        } catch (uploadError) {
          Toast.show('error', 'Photo Upload Failed', uploadError.message);
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
      
      if (!data.item_id || !data.record_type || !data.status || !data.title || !data.performed_by) {
        throw new Error('Please fill in all required fields');
      }
      
      if (data.record_type === 'repair' && !data.criticality) {
        throw new Error('Criticality is required for repairs');
      }
      
      let savedRecord;
      if (this.isEditMode) {
        data.updated_by = data.performed_by;
        savedRecord = await updateRecord(this.recordId, data);
        appState.updateRecord(this.recordId, savedRecord);
        Toast.show('success', 'Success', 'Record updated successfully');
      } else {
        savedRecord = await createRecord(data);
        appState.addRecord(savedRecord);
        Toast.show('success', 'Success', 'Record created successfully');
      }
      
      navigateTo(`/${savedRecord.item_id}/${savedRecord.record_id}`);
      
    } catch (error) {
      console.error('Failed to save record:', error);
      Toast.show('error', 'Error', error.message || 'Failed to save record');
    }
  }
}