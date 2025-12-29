// Perform Inspection Form component (Refactored)

import { fetchRecord } from '../api.js';
import { appState } from '../state.js';
import { formatDate, formatRecordType } from '../utils/formatters.js';
import { InspectionTaskManager } from './inspection/InspectionTaskManager.js';
import { InspectionFormSubmit } from './inspection/InspectionFormSubmit.js';

export class PerformInspectionForm {
  constructor(recordId, itemId) {
    this.recordId = recordId;
    this.itemId = itemId;
    this.record = null;
    this.item = null;
    this.taskManager = new InspectionTaskManager();
    this.formSubmit = new InspectionFormSubmit(recordId, itemId);
  }
  
  async render(container) {
    try {
      // Fetch the inspection record
      this.record = await fetchRecord(this.recordId);
      this.item = appState.getItem(this.itemId);
      
      // Validate this is an inspection record
      if (this.record.record_type !== 'inspection') {
        container.innerHTML = this.renderError('This is not an inspection record.');
        return;
      }
      
      // Check if already completed
      if (this.record.status === 'completed' && this.record.inspection_result) {
        container.innerHTML = this.renderError('This inspection has already been completed.');
        return;
      }
      
      container.innerHTML = this.renderForm();
      this.attachEventListeners(container);
      
    } catch (error) {
      console.error('Failed to load inspection:', error);
      container.innerHTML = this.renderError('Failed to load inspection record.');
    }
  }
  
  renderForm() {
    const today = new Date().toISOString().split('T')[0];
    
    return `
      <div class="form-container">
        <div class="form-header">
          <button class="btn-back" onclick="history.back()">← Back</button>
          <h1>Perform Inspection</h1>
        </div>
        
        <!-- Read-only inspection details -->
        <div class="form-section">
          <h2>Inspection Details</h2>
          <div class="detail-grid readonly">
            <div class="detail-row">
              <span class="detail-label">Title</span>
              <span class="detail-value">${this.record.title}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Type</span>
              <span class="detail-value">${formatRecordType(this.record.record_type)}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Item</span>
              <span class="detail-value">${this.item?.name || this.itemId}</span>
            </div>
            ${this.record.description ? `
              <div class="detail-row full-width">
                <span class="detail-label">Description</span>
                <span class="detail-value">${this.record.description}</span>
              </div>
            ` : ''}
          </div>
        </div>
        
        <!-- Inspection Results Form -->
        <form id="inspection-form" class="form-section">
          <h2>Inspection Results</h2>
          
          <div class="form-group">
            <label for="inspector">Inspector *</label>
            <input 
              type="text" 
              id="inspector" 
              name="inspector" 
              value="SpookyDecs Ent"
              required
            >
          </div>
          
          <div class="form-group">
            <label for="inspection-date">Date Performed *</label>
            <input 
              type="date" 
              id="inspection-date" 
              name="inspection_date" 
              value="${today}"
              required
            >
          </div>
          
          <div class="form-group">
            <label>Overall Result *</label>
            <div class="radio-group">
              <label class="radio-label">
                <input type="radio" name="result" value="pass" required>
                <span>✓ Pass - No issues found</span>
              </label>
              <label class="radio-label">
                <input type="radio" name="result" value="maintenance_required" required>
                <span>⚠ Maintenance Required</span>
              </label>
              <label class="radio-label">
                <input type="radio" name="result" value="failed" required>
                <span>✗ Failed - Retire Item</span>
              </label>
            </div>
          </div>
          
          <div class="form-group">
            <label for="findings">Findings / Notes</label>
            <textarea 
              id="findings" 
              name="findings" 
              rows="4"
              placeholder="Document your inspection findings..."
            ></textarea>
          </div>
          
          <!-- Tasks section (shown when maintenance_required selected) -->
          <div id="tasks-section" class="form-section" style="display: none;">
            <h3>Required Maintenance Tasks</h3>
            <div id="tasks-container"></div>
            <button type="button" class="btn-secondary" id="add-task-btn">
              + Add Task
            </button>
          </div>
          
          <!-- Retirement section (shown when failed selected) -->
          <div id="retirement-section" class="form-section" style="display: none;">
            <h3>Item Retirement</h3>
            
            <div class="form-group">
              <label for="retirement-reason">Reason for Retirement *</label>
              <textarea 
                id="retirement-reason" 
                name="retirement_reason" 
                rows="3"
                placeholder="Explain why this item is being retired..."
              ></textarea>
            </div>
            
            <div class="form-group">
              <label for="disposal-method">Disposal Method</label>
              <select id="disposal-method" name="disposal_method">
                <option value="trash">Trash</option>
                <option value="donate">Donate</option>
                <option value="salvage">Salvage Parts</option>
              </select>
            </div>
          </div>
          
          <!-- Form actions -->
          <div class="form-actions">
            <button type="button" class="btn-secondary" onclick="history.back()">
              Cancel
            </button>
            <button type="submit" class="btn-primary" id="submit-btn">
              Complete Inspection
            </button>
          </div>
          
          <!-- Error display -->
          <div id="form-error" class="form-error" style="display: none;"></div>
        </form>
      </div>
    `;
  }
  
  renderError(message) {
    return `
      <div class="error-container">
        <h1>Unable to Perform Inspection</h1>
        <p>${message}</p>
        <button onclick="history.back()" class="btn-secondary">Go Back</button>
      </div>
    `;
  }
  
  attachEventListeners(container) {
    const form = container.querySelector('#inspection-form');
    const resultRadios = container.querySelectorAll('input[name="result"]');
    const tasksSection = container.querySelector('#tasks-section');
    const retirementSection = container.querySelector('#retirement-section');
    const addTaskBtn = container.querySelector('#add-task-btn');
    
    // Show/hide sections based on result selection
    resultRadios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        const result = e.target.value;
        
        if (result === 'maintenance_required') {
          tasksSection.style.display = 'block';
          retirementSection.style.display = 'none';
          
          // Add first task if none exist
          if (this.taskManager.getTasks().length === 0) {
            this.taskManager.addTask(container);
          }
        } else if (result === 'failed') {
          tasksSection.style.display = 'none';
          retirementSection.style.display = 'block';
        } else {
          tasksSection.style.display = 'none';
          retirementSection.style.display = 'none';
        }
      });
    });
    
    // Add task button
    if (addTaskBtn) {
      addTaskBtn.addEventListener('click', () => {
        this.taskManager.addTask(container);
      });
    }
    
    // Form submission
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleFormSubmit(container, form);
    });
  }
  
  async handleFormSubmit(container, form) {
    try {
      const result = await this.formSubmit.handleSubmit(form, this.taskManager);
      
      // Show success message
      container.innerHTML = this.formSubmit.renderSuccessView(result);
      
    } catch (error) {
      // Error is already handled in formSubmit.handleSubmit
      // Just log it here for debugging
      console.error('Form submission failed:', error);
    }
  }
}