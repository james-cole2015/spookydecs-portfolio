// Inspection Task Manager - handles task creation and management

export class InspectionTaskManager {
  constructor() {
    this.tasks = [];
  }
  
  getTasks() {
    return this.tasks;
  }
  
  addTask(container) {
    const tasksContainer = container.querySelector('#tasks-container');
    if (!tasksContainer) return;
    
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
    if (!tasksContainer) return;
    
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
  
  validateTasks() {
    if (this.tasks.length === 0) {
      throw new Error('At least one maintenance task is required');
    }
    
    for (let i = 0; i < this.tasks.length; i++) {
      const task = this.tasks[i];
      if (!task.title || !task.record_type) {
        throw new Error(`Task ${i + 1} is missing required fields`);
      }
    }
    
    return true;
  }
  
  reset() {
    this.tasks = [];
  }
}