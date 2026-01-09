// Schedule form component for create/edit templates

import { fetchSchedule, createSchedule, updateSchedule } from '../scheduleApi.js';
import { appState } from '../state.js';
import { navigateTo } from '../router.js';
import { Toast } from '../utils/toast.js';
import {
  getRecordTypeOptions,
  getCategoryOptions,
  getFrequencyOptions,
  getSeasonOptions,
  validateScheduleData,
  calculateNextDueDate
} from '../utils/scheduleHelpers.js';

// Class type options
const CLASS_TYPES = [
  { value: 'INFLATABLE', label: 'Inflatable' },
  { value: 'ANIMATRONIC', label: 'Animatronic' },
  { value: 'PROJECTION', label: 'Projection' },
  { value: 'STATIC_PROP', label: 'Static Prop' },
  { value: 'LIGHTING', label: 'Lighting' },
  { value: 'SOUND', label: 'Sound Equipment' },
  { value: 'CONTROLLER', label: 'Controller' },
  { value: 'OTHER', label: 'Other' }
];

export class ScheduleFormView {
  constructor(scheduleId = null) {
    this.scheduleId = scheduleId;
    this.schedule = null;
    this.isEditMode = !!scheduleId;
  }
  
  async render(container) {
    try {
      // If edit mode, fetch existing template
      if (this.isEditMode) {
        this.schedule = await fetchSchedule(this.scheduleId);
      }
      
      container.innerHTML = this.renderForm();
      this.attachEventListeners(container);
      
    } catch (error) {
      console.error('Failed to load form:', error);
      container.innerHTML = this.renderError();
    }
  }
  
  renderForm() {
    const schedule = this.schedule || {};
    
    return `
      <div class="form-view">
        <div class="form-header">
          <button class="btn-back" onclick="history.back()">← Back to Templates</button>
        </div>
        
        <div class="form-container">
          <h1>${this.isEditMode ? 'Edit' : 'Create'} Maintenance Template</h1>
          <p class="form-subtitle">Templates define recurring maintenance tasks for a class of items</p>
          
          <form id="schedule-form" class="record-form">
            ${this.renderTemplateInfo(schedule)}
            ${this.renderTaskDetails(schedule)}
            ${this.renderFrequencySection(schedule)}
            ${this.renderEstimates(schedule)}
            ${this.renderOptions(schedule)}
            ${this.renderPreview()}
            ${this.renderFormActions()}
          </form>
        </div>
      </div>
    `;
  }
  
  renderTemplateInfo(schedule) {
    return `
      <div class="form-section">
        <h3>Template Information</h3>
        
        <div class="form-row">
          <div class="form-group">
            <label for="class_type">Class Type <span class="required">*</span></label>
            <select id="class_type" name="class_type" class="form-input" required>
              <option value="">Select class type...</option>
              ${CLASS_TYPES.map(type => 
                `<option value="${type.value}" ${schedule.class_type === type.value ? 'selected' : ''}>
                  ${type.label}
                </option>`
              ).join('')}
            </select>
            <small class="form-help">Type of decoration this template applies to</small>
          </div>
          
          <div class="form-group">
            <label for="short_name">Short Name <span class="required">*</span></label>
            <input type="text" id="short_name" name="short_name" class="form-input" 
                   placeholder="e.g., VISUAL, MOTOR, SEAM" 
                   value="${schedule.short_name || ''}"
                   pattern="[A-Z0-9_]+" 
                   required>
            <small class="form-help">Uppercase letters, numbers, and underscores only</small>
          </div>
        </div>
        
        <div class="form-group">
          <label>
            <input type="checkbox" id="is_default" name="is_default" 
                   ${schedule.is_default ? 'checked' : ''}>
            <strong>Set as default</strong> (auto-apply to new items of this class)
          </label>
          <small class="form-help">Default templates are automatically assigned when creating new items</small>
        </div>
      </div>
    `;
  }
  
  renderTaskDetails(schedule) {
    // Determine current values - support both old and new structure
    const currentRecordType = schedule.record_type || schedule.task_type || '';
    const currentCategory = schedule.category || 'Uncategorized';
    
    return `
      <div class="form-section">
        <h3>Task Details</h3>
        
        <div class="form-row">
          <div class="form-group">
            <label for="record_type">Record Type <span class="required">*</span></label>
            <select id="record_type" name="record_type" class="form-input" required>
              <option value="">Select record type...</option>
              ${getRecordTypeOptions().map(opt => 
                `<option value="${opt.value}" ${currentRecordType === opt.value ? 'selected' : ''}>${opt.label}</option>`
              ).join('')}
            </select>
          </div>
          
          <div class="form-group" id="category-group" style="${currentRecordType ? '' : 'display: none;'}">
            <label for="category">Category <span class="required">*</span></label>
            <select id="category" name="category" class="form-input" ${currentRecordType ? 'required' : ''}>
              <option value="">Select category...</option>
              ${this.renderCategoryOptions(currentRecordType, currentCategory)}
            </select>
            ${currentCategory === 'Uncategorized' && this.isEditMode ? 
              '<small class="form-help" style="color: #d97706;">⚠️ Please select a valid category to update this template.</small>' : 
              ''}
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label for="enabled">Status <span class="required">*</span></label>
            <select id="enabled" name="enabled" class="form-input" required>
              <option value="true" ${schedule.enabled !== false ? 'selected' : ''}>Enabled</option>
              <option value="false" ${schedule.enabled === false ? 'selected' : ''}>Disabled</option>
            </select>
          </div>
        </div>
        
        <div class="form-group">
          <label for="title">Title <span class="required">*</span></label>
          <input type="text" id="title" name="title" class="form-input" 
                 placeholder="e.g., Annual Fabric Inspection" 
                 value="${schedule.title || ''}" required>
        </div>
        
        <div class="form-group">
          <label for="description">Description</label>
          <textarea id="description" name="description" class="form-input" rows="4"
                    placeholder="Detailed instructions for this maintenance task...">${schedule.description || ''}</textarea>
        </div>
      </div>
    `;
  }
  
  renderCategoryOptions(recordType, currentCategory) {
    if (!recordType) return '';
    
    const options = getCategoryOptions(recordType);
    return options.map(opt => 
      `<option value="${opt.value}" ${currentCategory === opt.value ? 'selected' : ''}>${opt.label}</option>`
    ).join('');
  }
  
  renderFrequencySection(schedule) {
    const needsSeason = schedule.frequency === 'seasonal' || schedule.frequency === 'pre_season';
    
    return `
      <div class="form-section">
        <h3>Schedule Frequency</h3>
        
        <div class="form-row">
          <div class="form-group">
            <label for="frequency">Frequency <span class="required">*</span></label>
            <select id="frequency" name="frequency" class="form-input" required>
              <option value="">Select frequency...</option>
              ${getFrequencyOptions().map(opt => 
                `<option value="${opt.value}" ${schedule.frequency === opt.value ? 'selected' : ''}>${opt.label}</option>`
              ).join('')}
            </select>
          </div>
          
          <div class="form-group" id="season-group" style="${needsSeason ? '' : 'display: none;'}">
            <label for="season">Season <span class="required" id="season-required">*</span></label>
            <select id="season" name="season" class="form-input" ${needsSeason ? 'required' : ''}>
              <option value="">Select season...</option>
              ${getSeasonOptions().map(opt => 
                `<option value="${opt.value}" ${schedule.season === opt.value ? 'selected' : ''}>${opt.label}</option>`
              ).join('')}
            </select>
          </div>
        </div>
        
        <div class="form-group">
          <label for="start_date">Start Date (Optional)</label>
          <input type="date" id="start_date" name="start_date" class="form-input"
                 value="${schedule.start_date || ''}">
          <small class="form-help">When should this schedule start? Leave blank to start immediately when applied to items.</small>
        </div>
        
        <div class="form-note">
          <strong>Note:</strong> Repairs and maintenance tasks are automatically scheduled within the 
          April 1 - September 30 work window. Inspections can be scheduled during the deployment season.
        </div>
      </div>
    `;
  }
  
  renderEstimates(schedule) {
    return `
      <div class="form-section">
        <h3>Estimates (Optional)</h3>
        
        <div class="form-row">
          <div class="form-group">
            <label for="estimated_cost">Estimated Cost ($)</label>
            <input type="number" id="estimated_cost" name="estimated_cost" 
                   class="form-input" min="0" step="0.01"
                   placeholder="0.00" value="${schedule.estimated_cost || ''}">
          </div>
          
          <div class="form-group">
            <label for="estimated_duration_minutes">Estimated Duration (minutes)</label>
            <input type="number" id="estimated_duration_minutes" name="estimated_duration_minutes" 
                   class="form-input" min="0"
                   placeholder="60" value="${schedule.estimated_duration_minutes || ''}">
          </div>
        </div>
      </div>
    `;
  }
  
  renderOptions(schedule) {
    return `
      <div class="form-section">
        <h3>Reminder Options</h3>
        
        <div class="form-group">
          <label for="days_before_reminder">Days Before Reminder</label>
          <input type="number" id="days_before_reminder" name="days_before_reminder" 
                 class="form-input" min="1" max="90"
                 value="${schedule.days_before_reminder || 7}">
          <small class="form-help">Users will be reminded this many days before tasks are due</small>
        </div>
      </div>
    `;
  }
  
  renderPreview() {
    return `
      <div class="form-section" id="preview-section" style="display: none;">
        <h3>Preview</h3>
        <div id="preview-content" class="preview-box">
          <!-- Preview will be populated by JavaScript -->
        </div>
      </div>
    `;
  }
  
  renderFormActions() {
    return `
      <div class="form-actions">
        <button type="submit" class="btn-primary">
          ${this.isEditMode ? 'Update Template' : 'Create Template'}
        </button>
        <button type="button" class="btn-secondary" onclick="history.back()">Cancel</button>
      </div>
    `;
  }
  
  renderError() {
    return `
      <div class="error-container">
        <h1>Error Loading Form</h1>
        <p>Unable to load the template form. Please try again.</p>
        <button onclick="history.back()">Go Back</button>
      </div>
    `;
  }
  
  attachEventListeners(container) {
    const form = container.querySelector('#schedule-form');
    if (!form) return;
    
    // Form submission
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSubmit(form);
    });
    
    // Auto-uppercase short_name
    const shortNameInput = form.querySelector('#short_name');
    shortNameInput?.addEventListener('input', (e) => {
      e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '');
    });
    
    // Record type change - update category dropdown
    const recordTypeSelect = form.querySelector('#record_type');
    const categoryGroup = form.querySelector('#category-group');
    const categorySelect = form.querySelector('#category');
    
    recordTypeSelect?.addEventListener('change', (e) => {
      const recordType = e.target.value;
      
      if (recordType) {
        // Show category dropdown
        categoryGroup.style.display = '';
        categorySelect.setAttribute('required', 'required');
        
        // Populate category options
        const options = getCategoryOptions(recordType);
        categorySelect.innerHTML = '<option value="">Select category...</option>' + 
          options.map(opt => `<option value="${opt.value}">${opt.label}</option>`).join('');
        
      } else {
        // Hide category dropdown
        categoryGroup.style.display = 'none';
        categorySelect.removeAttribute('required');
        categorySelect.value = '';
      }
      
      this.updatePreview(form);
    });
    
    // Frequency change - show/hide season
    const frequencySelect = form.querySelector('#frequency');
    const seasonGroup = form.querySelector('#season-group');
    const seasonSelect = form.querySelector('#season');
    const seasonRequired = form.querySelector('#season-required');
    
    frequencySelect?.addEventListener('change', (e) => {
      const needsSeason = e.target.value === 'seasonal' || e.target.value === 'pre_season';
      
      if (needsSeason) {
        seasonGroup.style.display = '';
        seasonSelect.setAttribute('required', 'required');
        seasonRequired.style.display = '';
      } else {
        seasonGroup.style.display = 'none';
        seasonSelect.removeAttribute('required');
        seasonRequired.style.display = 'none';
        seasonSelect.value = '';
      }
      
      this.updatePreview(form);
    });
    
    // Update preview on any field change
    const formInputs = form.querySelectorAll('input, select, textarea');
    formInputs.forEach(input => {
      input.addEventListener('change', () => this.updatePreview(form));
    });
  }
  
  updatePreview(form) {
    const formData = new FormData(form);
    const frequency = formData.get('frequency');
    const recordType = formData.get('record_type');
    const season = formData.get('season');
    const classType = formData.get('class_type');
    
    if (!frequency || !recordType || !classType) return;
    
    try {
      const nextDue = calculateNextDueDate(
        frequency,
        new Date(),
        season,
        recordType
      );
      
      const previewSection = form.querySelector('#preview-section');
      const previewContent = form.querySelector('#preview-content');
      
      previewSection.style.display = '';
      previewContent.innerHTML = `
        <p><strong>Next scheduled task:</strong> ${nextDue.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })}</p>
        <p><small>When applied to items, maintenance records will be generated based on this schedule.</small></p>
      `;
    } catch (error) {
      console.error('Preview calculation failed:', error);
    }
  }
  
  async handleSubmit(form) {
    try {
      const formData = new FormData(form);
      
      const data = {
        class_type: formData.get('class_type'),
        record_type: formData.get('record_type'),
        category: formData.get('category'),
        short_name: formData.get('short_name'),
        title: formData.get('title'),
        description: formData.get('description') || '',
        frequency: formData.get('frequency'),
        season: formData.get('season') || null,
        start_date: formData.get('start_date') || null,
        is_default: formData.get('is_default') === 'on',
        enabled: formData.get('enabled') === 'true',
        estimated_cost: parseFloat(formData.get('estimated_cost')) || 0,
        estimated_duration_minutes: parseInt(formData.get('estimated_duration_minutes')) || null,
        days_before_reminder: parseInt(formData.get('days_before_reminder')) || 7,
        updated_by: 'Brooks' // TODO: Get from user context
      };
      
      // Validate
      const validation = validateScheduleData(data);
      if (!validation.valid) {
        Toast.show('error', 'Validation Error', validation.errors.join(', '));
        return;
      }
      
      let result;
      if (this.isEditMode) {
        result = await updateSchedule(this.scheduleId, data);
        appState.updateSchedule(this.scheduleId, result.schedule);
        
        const message = result.updated_records > 0 
          ? `Template updated. ${result.updated_records} pending records updated.`
          : 'Template updated successfully';
        
        Toast.show('success', 'Success', message);
      } else {
        result = await createSchedule(data);
        appState.addSchedule(result.schedule);
        Toast.show('success', 'Success', 'Template created successfully');
      }
      
      navigateTo(`/schedules/${result.schedule.schedule_id || this.scheduleId}`);
      
    } catch (error) {
      console.error('Failed to save template:', error);
      Toast.show('error', 'Error', error.message || 'Failed to save template');
    }
  }
}