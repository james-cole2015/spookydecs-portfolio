// Perform Inspection Form component

import { fetchRecord } from '../api.js';
import { appState } from '../state.js';
import { navigateTo } from '../router.js';
import { formatDate, formatRecordType } from '../utils/formatters.js';

export class PerformInspectionForm {
  constructor(recordId, itemId) {
    this.recordId = recordId;
    this.itemId = itemId;
    this.record = null;
    this.item = null;
    this.tasks = []; // Array of task objects to create
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
  
  renderTaskForm(index) {
    return `
      <div class="task-form" data-task-index="${index}">
        <div class="task-form-header">
          <h4>Task ${index + 1}</h4>
          <button type="button" class="btn-remove-task" data-task-index="${index}">
            Remove
          </button>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label for="task-title-${index}">Title *</label>
            <input 
              type="text" 
              id="task-title-${index}"
              data-task-field="title"
              data-task-index="${index}"
              required
              placeholder="Brief description of task"
            >
          </div>
          
          <div class="form-group">
            <label for="task-type-${index}">Type *</label>
            <select 
              id="task-type-${index}"
              data-task-field="record_type"
              data-task-index="${index}"
              required
            >
              <option value="repair">Repair</option>
              <option value="maintenance">Preventive Maintenance</option>
            </select>
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label for="task-criticality-${index}">Criticality *</label>
            <select 
              id="task-criticality-${index}"
              data-task-field="priority"
              data-task-index="${index}"
              required
            >
              <option value="low">Low</option>
              <option value="medium" selected>Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>
        
        <div class="form-group">
          <label for="task-description-${index}">Description</label>
          <textarea 
            id="task-description-${index}"
            data-task-field="description"
            data-task-index="${index}"
            rows="2"
            placeholder="Detailed description of work needed..."
          ></textarea>
        </div>
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
          if (this.tasks.length === 0) {
            this.addTask(container);
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
        this.addTask(container);
      });
    }
    
    // Form submission
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSubmit(container);
    });
  }
  
  addTask(container) {
    const tasksContainer = container.querySelector('#tasks-container');
    const index = this.tasks.length;
    
    // Add empty task to array
    this.tasks.push({
      title: '',
      record_type: 'repair',
      priority: 'medium',
      description: ''
    });
    
    // Render task form
    const taskHTML = this.renderTaskForm(index);
    tasksContainer.insertAdjacentHTML('beforeend', taskHTML);
    
    // Attach event listeners to task fields
    const taskForm = tasksContainer.querySelector(`[data-task-index="${index}"]`);
    const taskInputs = taskForm.querySelectorAll('[data-task-field]');
    
    taskInputs.forEach(input => {
      input.addEventListener('input', (e) => {
        const taskIndex = parseInt(e.target.dataset.taskIndex);
        const field = e.target.dataset.taskField;
        this.tasks[taskIndex][field] = e.target.value;
      });
    });
    
    // Remove task button
    const removeBtn = taskForm.querySelector('.btn-remove-task');
    removeBtn.addEventListener('click', () => {
      this.removeTask(container, index);
    });
  }
  
  removeTask(container, index) {
    const tasksContainer = container.querySelector('#tasks-container');
    const taskForm = tasksContainer.querySelector(`[data-task-index="${index}"]`);
    
    if (taskForm) {
      taskForm.remove();
    }
    
    // Remove from tasks array
    this.tasks.splice(index, 1);
    
    // Re-render all tasks to update indices
    this.rerenderTasks(container);
  }
  
  rerenderTasks(container) {
    const tasksContainer = container.querySelector('#tasks-container');
    tasksContainer.innerHTML = '';
    
    const currentTasks = [...this.tasks];
    this.tasks = [];
    
    currentTasks.forEach((task) => {
      const index = this.tasks.length;
      this.tasks.push(task);
      
      const taskHTML = this.renderTaskForm(index);
      tasksContainer.insertAdjacentHTML('beforeend', taskHTML);
      
      // Re-populate values
      const taskForm = tasksContainer.querySelector(`[data-task-index="${index}"]`);
      const taskInputs = taskForm.querySelectorAll('[data-task-field]');
      
      taskInputs.forEach(input => {
        const field = input.dataset.taskField;
        input.value = task[field] || '';
        
        // Attach event listener
        input.addEventListener('input', (e) => {
          const taskIndex = parseInt(e.target.dataset.taskIndex);
          const fieldName = e.target.dataset.taskField;
          this.tasks[taskIndex][fieldName] = e.target.value;
        });
      });
      
      // Remove button
      const removeBtn = taskForm.querySelector('.btn-remove-task');
      removeBtn.addEventListener('click', () => {
        this.removeTask(container, index);
      });
    });
  }
  
  async handleSubmit(container) {
    const form = container.querySelector('#inspection-form');
    const formData = new FormData(form);
    const submitBtn = container.querySelector('#submit-btn');
    const errorDiv = container.querySelector('#form-error');
    
    // Disable submit button
    submitBtn.disabled = true;
    submitBtn.textContent = 'Processing...';
    errorDiv.style.display = 'none';
    
    try {
      // Build request payload
      const payload = {
        inspector: formData.get('inspector'),
        inspection_date: formData.get('inspection_date'),
        result: formData.get('result'),
        findings: formData.get('findings') || ''
      };
      
      // Validate based on result
      if (payload.result === 'maintenance_required') {
        // Validate tasks
        if (this.tasks.length === 0) {
          throw new Error('At least one maintenance task is required');
        }
        
        // Validate each task has required fields
        for (let i = 0; i < this.tasks.length; i++) {
          const task = this.tasks[i];
          if (!task.title || !task.record_type) {
            throw new Error(`Task ${i + 1} is missing required fields`);
          }
        }
        
        payload.tasks = this.tasks;
      } else if (payload.result === 'failed') {
        // Validate retirement details
        const retirementReason = formData.get('retirement_reason');
        if (!retirementReason) {
          throw new Error('Retirement reason is required');
        }
        
        payload.retirement_details = {
          reason: retirementReason,
          disposal_method: formData.get('disposal_method') || 'trash'
        };
      }
      
// Make API call
const apiUrl = appState.config?.API_ENDPOINT || '';
console.log('About to POST to:', `${apiUrl}/admin/maintenance-records/${this.recordId}/inspect`);
const response = await fetch(`${apiUrl}/admin/maintenance-records/${this.recordId}/inspect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to complete inspection');
      }
      
      const result = await response.json();
      
      // Show success message with links to created tasks
      this.showSuccessMessage(container, result);
      
    } catch (error) {
      console.error('Failed to complete inspection:', error);
      errorDiv.textContent = error.message;
      errorDiv.style.display = 'block';
      
      // Re-enable submit button
      submitBtn.disabled = false;
      submitBtn.textContent = 'Complete Inspection';
    }
  }
  
  showSuccessMessage(container, result) {
    const generatedTasks = result.generated_tasks || [];
    
    let tasksHTML = '';
    if (generatedTasks.length > 0) {
      tasksHTML = `
        <div class="success-tasks">
          <h3>Created Maintenance Tasks (${generatedTasks.length})</h3>
          <ul class="task-links">
            ${generatedTasks.map(task => `
              <li>
                <a href="/${this.itemId}/${task.record_id}">
                  ${task.title}
                </a>
                <span class="task-meta">${task.record_type} - ${task.criticality}</span>
              </li>
            `).join('')}
          </ul>
        </div>
      `;
    }
    
    container.innerHTML = `
      <div class="success-container">
        <div class="success-icon">✓</div>
        <h1>Inspection Completed Successfully</h1>
        <p>The inspection has been recorded and all maintenance tasks have been created.</p>
        
        ${tasksHTML}
        
        <div class="success-actions">
          <a href="/${this.itemId}/${this.recordId}" class="btn-primary">
            View Inspection Record
          </a>
          <a href="/${this.itemId}" class="btn-secondary">
            Back to Item
          </a>
        </div>
      </div>
    `;
  }
}
