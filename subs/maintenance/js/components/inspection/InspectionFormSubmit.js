// Inspection Form Submit Handler

import { performInspection } from '../../api.js';

export class InspectionFormSubmit {
  constructor(recordId, itemId) {
    this.recordId = recordId;
    this.itemId = itemId;
  }
  
  async handleSubmit(form, taskManager) {
    const formData = new FormData(form);
    const submitBtn = form.querySelector('#submit-btn');
    const errorDiv = form.querySelector('#form-error');
    
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
        taskManager.validateTasks();
        payload.tasks = taskManager.getTasks();
        
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
      
      // Make API call using api.js function
      const result = await performInspection(this.recordId, payload);
      
      return result;
      
    } catch (error) {
      console.error('Failed to complete inspection:', error);
      errorDiv.textContent = error.message;
      errorDiv.style.display = 'block';
      
      // Re-enable submit button
      submitBtn.disabled = false;
      submitBtn.textContent = 'Complete Inspection';
      
      throw error;
    }
  }
  
  renderSuccessView(result) {
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
    
    return `
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