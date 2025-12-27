// Schedule form component for create/edit

import { fetchSchedule, createSchedule, updateSchedule } from '../api.js';
import { appState } from '../state.js';
import { navigateTo } from '../router.js';
import { Toast } from '../utils/toast.js';
import { ItemSelector } from './form/ItemSelector.js';
import {
  getTaskTypeOptions,
  getFrequencyOptions,
  getSeasonOptions,
  validateScheduleData,
  calculateNextDueDate
} from '../utils/scheduleHelpers.js';

export class ScheduleFormView {
  constructor(scheduleId = null) {
    this.scheduleId = scheduleId;
    this.schedule = null;
    this.isEditMode = !!scheduleId;
    this.itemSelector = new ItemSelector(null, this.isEditMode);
  }
  
  async render(container) {
    try {
      // If edit mode, fetch existing schedule
      if (this.isEditMode) {
        this.schedule = await fetchSchedule(this.scheduleId);
        this.itemSelector.setItemId(this.schedule.item_id);
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
          <button class="btn-back" onclick="history.back()">← Back to Schedules</button>
        </div>
        
        <div class="form-container">
          <h1>${this.isEditMode ? 'Edit' : 'Create'} Maintenance Schedule</h1>
          
          <form id="schedule-form" class="record-form">
            ${this.renderBasicInfo(schedule)}
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
  
  renderBasicInfo(schedule) {
    return `
      <div class="form-section">
        <h3>Basic Information</h3>
        
        ${this.itemSelector.render(schedule.item_id)}
        
        <div class="form-row">
          <div class="form-group">
            <label for="task_type">Task Type <span class="required">*</span></label>
            <select id="task_type" name="task_type" class="form-input" required>
              <option value="">Select task type...</option>
              ${getTaskTypeOptions().map(opt => 
                `<option value="${opt.value}" ${schedule.task_type === opt.value ? 'selected' : ''}>${opt.label}</option>`
              ).join('')}
            </select>
          </div>
          
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
  
  renderFrequencySection(schedule) {
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
          
          <div class="form-group" id="season-group" style="${schedule.frequency === 'seasonal' || schedule.frequency === 'pre_season' ? '' : 'display: none;'}">
            <label for="season">Season <span class="required" id="season-required">*</span></label>
            <select id="season" name="season" class="form-input">
              <option value="">Select season...</option>
              ${getSeasonOptions().map(opt => 
                `<option value="${opt.value}" ${schedule.season === opt.value ? 'selected' : ''}>${opt.label}</option>`
              ).join('')}
            </select>
          </div>
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
          <small class="form-help">You'll be reminded this many days before the task is due</small>
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
          ${this.isEditMode ? 'Update Schedule' : 'Create Schedule'}
        </button>
        <button type="button" class="btn-secondary" onclick="history.back()">Cancel</button>
      </div>
    `;
  }
  
  renderError() {
    return `
      <div class="error-container">
        <h1>Error Loading Form</h1>
        <p>Unable to load the schedule form. Please try again.</p>
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
    
    // Item selector
    this.itemSelector.attachEventListeners(container, (item) => {
      if (item) {
        this.updatePreview(form);
      }
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
    const taskType = formData.get('task_type');
    const season = formData.get('season');
    
    if (!frequency || !taskType) return;
    
    try {
      const nextDue = calculateNextDueDate(
        frequency,
        new Date(),
        season,
        taskType
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
        <p><small>The system will automatically generate 2 future maintenance records when you create this schedule.</small></p>
      `;
    } catch (error) {
      console.error('Preview calculation failed:', error);
    }
  }
  
  async handleSubmit(form) {
    try {
      const formData = new FormData(form);
      
      const data = {
        item_id: formData.get('item_id'),
        task_type: formData.get('task_type'),
        title: formData.get('title'),
        description: formData.get('description') || '',
        frequency: formData.get('frequency'),
        season: formData.get('season') || null,
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
        appState.updateSchedule(this.scheduleId, result);
        Toast.show('success', 'Success', 'Schedule updated successfully');
      } else {
        result = await createSchedule(data);
        appState.addSchedule(result.schedule);
        Toast.show('success', 'Success', 'Schedule created successfully');
      }
      
      navigateTo(`/schedules/${result.schedule_id || this.scheduleId}`);
      
    } catch (error) {
      console.error('Failed to save schedule:', error);
      Toast.show('error', 'Error', error.message || 'Failed to save schedule');
    }
  }
}
