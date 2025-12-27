// Schedules table view - lists all maintenance templates

import { appState } from '../state.js';
import { fetchSchedules } from '../api.js';
import { navigateTo } from '../router.js';
import { Toast } from '../utils/toast.js';
import { 
  formatScheduleStatus, 
  formatNextDueDate, 
  formatTaskType,
  formatScheduleFrequency 
} from '../utils/formatters.js';
import { 
  getTaskTypeOptions, 
  getStatusFromDueDate 
} from '../utils/scheduleHelpers.js';

// Class type options (matching ScheduleForm)
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

export class SchedulesTableView {
  constructor() {
    this.currentPage = 0;
    this.pageSize = 50;
  }
  
  async render(container) {
    container.innerHTML = `
      <div class="schedules-view">
        <div class="view-header">
          <div class="header-left">
            <button class="btn-back" onclick="window.location.href='/'">
              ← Back to Records
            </button>
            <h1>Maintenance Templates</h1>
          </div>
          <button class="btn-primary" id="btn-create-schedule">
            + Create Template
          </button>
        </div>
        
        <div id="filters-container"></div>
        <div id="stats-container"></div>
        <div id="table-container">
          <div class="loading">Loading templates...</div>
        </div>
      </div>
    `;
    
    // Attach event listeners
    const createBtn = container.querySelector('#btn-create-schedule');
    if (createBtn) {
      createBtn.addEventListener('click', () => {
        navigateTo('/schedules/new');
      });
    }
    
    // Render filters
    this.renderFilters(container);
    
    // Load and render schedules
    await this.loadSchedules();
    this.renderStats(container);
    this.renderTable(container);
    
    // Subscribe to state changes
    appState.subscribe(() => {
      this.renderStats(container);
      this.renderTable(container);
    });
  }
  
  async loadSchedules() {
    try {
      const schedules = await fetchSchedules();
      
      // Templates don't have status - they're just templates
      // We'll add status based on enabled flag
      schedules.forEach(schedule => {
        schedule.status = schedule.enabled ? 'active' : 'disabled';
      });
      
      appState.setSchedules(schedules);
    } catch (error) {
      console.error('Failed to load templates:', error);
      Toast.show('error', 'Error', 'Failed to load templates');
    }
  }
  
  renderFilters(container) {
    const filtersContainer = container.querySelector('#filters-container');
    const state = appState.getState();
    const filters = state.scheduleFilters;
    
    filtersContainer.innerHTML = `
      <div class="filters-bar">
        <div class="filter-group">
          <label>Class Type:</label>
          <select id="filter-class-type" class="filter-select">
            <option value="all" ${filters.item_id === 'all' ? 'selected' : ''}>All Classes</option>
            ${CLASS_TYPES.map(type => 
              `<option value="${type.value}" ${filters.item_id === type.value ? 'selected' : ''}>${type.label}</option>`
            ).join('')}
          </select>
        </div>
        
        <div class="filter-group">
          <label>Task Type:</label>
          <select id="filter-task-type" class="filter-select">
            <option value="all" ${filters.task_type === 'all' ? 'selected' : ''}>All Tasks</option>
            ${getTaskTypeOptions().map(opt => 
              `<option value="${opt.value}" ${filters.task_type === opt.value ? 'selected' : ''}>${opt.label}</option>`
            ).join('')}
          </select>
        </div>
        
        <div class="filter-group">
          <label>Default:</label>
          <select id="filter-default" class="filter-select">
            <option value="all">All</option>
            <option value="true">Default Only</option>
            <option value="false">Non-Default Only</option>
          </select>
        </div>
        
        <div class="filter-group">
          <label>Enabled:</label>
          <select id="filter-enabled" class="filter-select">
            <option value="all" ${filters.enabled === 'all' ? 'selected' : ''}>All</option>
            <option value="true" ${filters.enabled === 'true' ? 'selected' : ''}>Enabled</option>
            <option value="false" ${filters.enabled === 'false' ? 'selected' : ''}>Disabled</option>
          </select>
        </div>
        
        <button class="btn-secondary" id="btn-clear-filters">Clear Filters</button>
      </div>
    `;
    
    // Attach filter event listeners
    const classTypeFilter = filtersContainer.querySelector('#filter-class-type');
    const taskTypeFilter = filtersContainer.querySelector('#filter-task-type');
    const defaultFilter = filtersContainer.querySelector('#filter-default');
    const enabledFilter = filtersContainer.querySelector('#filter-enabled');
    const clearBtn = filtersContainer.querySelector('#btn-clear-filters');
    
    classTypeFilter?.addEventListener('change', (e) => {
      appState.updateScheduleFilters({ item_id: e.target.value });
    });
    
    taskTypeFilter?.addEventListener('change', (e) => {
      appState.updateScheduleFilters({ task_type: e.target.value });
    });
    
    defaultFilter?.addEventListener('change', (e) => {
      // Store default filter in status field for now
      appState.updateScheduleFilters({ status: e.target.value });
    });
    
    enabledFilter?.addEventListener('change', (e) => {
      appState.updateScheduleFilters({ enabled: e.target.value });
    });
    
    clearBtn?.addEventListener('click', () => {
      appState.updateScheduleFilters({ 
        item_id: 'all',
        status: 'all', 
        task_type: 'all', 
        enabled: 'all' 
      });
      this.renderFilters(container);
    });
  }
  
  renderStats(container) {
    const statsContainer = container.querySelector('#stats-container');
    const schedules = appState.getState().schedules;
    
    const total = schedules.length;
    const enabled = schedules.filter(s => s.enabled).length;
    const defaults = schedules.filter(s => s.is_default).length;
    const byClass = {};
    
    schedules.forEach(s => {
      const cls = s.class_type || 'Unknown';
      byClass[cls] = (byClass[cls] || 0) + 1;
    });
    
    statsContainer.innerHTML = `
      <div class="stats-cards">
        <div class="stat-card">
          <div class="stat-value">${total}</div>
          <div class="stat-label">Total Templates</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${enabled}</div>
          <div class="stat-label">Enabled</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${defaults}</div>
          <div class="stat-label">Default Templates</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${Object.keys(byClass).length}</div>
          <div class="stat-label">Class Types</div>
        </div>
      </div>
    `;
  }
  
  renderTable(container) {
    const tableContainer = container.querySelector('#table-container');
    let schedules = appState.getFilteredSchedules();
    
    // Apply default filter (stored in status field)
    const defaultFilter = appState.getState().scheduleFilters.status;
    if (defaultFilter === 'true') {
      schedules = schedules.filter(s => s.is_default === true);
    } else if (defaultFilter === 'false') {
      schedules = schedules.filter(s => !s.is_default);
    }
    
    if (schedules.length === 0) {
      tableContainer.innerHTML = this.renderEmptyState();
      return;
    }
    
    // Sort by class_type, then task_type
    const sorted = [...schedules].sort((a, b) => {
      const classCompare = (a.class_type || '').localeCompare(b.class_type || '');
      if (classCompare !== 0) return classCompare;
      return (a.task_type || '').localeCompare(b.task_type || '');
    });
    
    // Pagination
    const totalPages = Math.ceil(sorted.length / this.pageSize);
    const startIdx = this.currentPage * this.pageSize;
    const endIdx = startIdx + this.pageSize;
    const pageData = sorted.slice(startIdx, endIdx);
    
    const tableHtml = `
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Template ID</th>
              <th>Class Type</th>
              <th>Task Type</th>
              <th>Title</th>
              <th>Frequency</th>
              <th>Default</th>
              <th>Enabled</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${pageData.map(schedule => this.renderScheduleRow(schedule)).join('')}
          </tbody>
        </table>
      </div>
      ${totalPages > 1 ? this.renderPagination(totalPages) : ''}
    `;
    
    tableContainer.innerHTML = tableHtml;
    this.attachTableEventListeners(tableContainer);
  }
  
  renderScheduleRow(schedule) {
    const templateId = schedule.schedule_id.substring(0, 20) + '...';
    
    return `
      <tr class="table-row" data-schedule-id="${schedule.schedule_id}">
        <td><code class="template-id" title="${schedule.schedule_id}">${templateId}</code></td>
        <td><span class="class-type-badge">${schedule.class_type}</span></td>
        <td>${formatTaskType(schedule.task_type)}</td>
        <td class="table-title">${schedule.title}</td>
        <td>${formatScheduleFrequency(schedule.frequency, schedule.season)}</td>
        <td>
          ${schedule.is_default 
            ? '<span class="badge-default">✓ Default</span>' 
            : '<span class="badge-custom">Custom</span>'}
        </td>
        <td>
          <span class="enabled-badge ${schedule.enabled ? 'enabled' : 'disabled'}">
            ${schedule.enabled ? '✓ Yes' : '✗ No'}
          </span>
        </td>
        <td>
          <button class="btn-small btn-edit" data-schedule-id="${schedule.schedule_id}">
            Edit
          </button>
        </td>
      </tr>
    `;
  }
  
  renderPagination(totalPages) {
    const pages = [];
    for (let i = 0; i < totalPages; i++) {
      pages.push(`
        <button 
          class="pagination-btn ${i === this.currentPage ? 'active' : ''}" 
          data-page="${i}"
        >
          ${i + 1}
        </button>
      `);
    }
    
    return `
      <div class="pagination">
        <button 
          class="pagination-btn" 
          data-page="prev"
          ${this.currentPage === 0 ? 'disabled' : ''}
        >
          Previous
        </button>
        ${pages.join('')}
        <button 
          class="pagination-btn" 
          data-page="next"
          ${this.currentPage === totalPages - 1 ? 'disabled' : ''}
        >
          Next
        </button>
      </div>
    `;
  }
  
  renderEmptyState() {
    return `
      <div class="empty-state">
        <div class="empty-icon">📋</div>
        <h3>No templates found</h3>
        <p>Create your first maintenance template to automate recurring tasks</p>
        <button class="btn-primary" onclick="window.location.href='/schedules/new'">
          + Create Template
        </button>
      </div>
    `;
  }
  
  attachTableEventListeners(container) {
    // Row click - navigate to detail
    const rows = container.querySelectorAll('.table-row');
    rows.forEach(row => {
      row.addEventListener('click', (e) => {
        // Don't navigate if clicking a button
        if (e.target.classList.contains('btn-edit')) return;
        
        const scheduleId = row.getAttribute('data-schedule-id');
        navigateTo(`/schedules/${scheduleId}`);
      });
    });
    
    // Edit buttons
    const editBtns = container.querySelectorAll('.btn-edit');
    editBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const scheduleId = btn.getAttribute('data-schedule-id');
        navigateTo(`/schedules/${scheduleId}/edit`);
      });
    });
    
    // Pagination
    this.attachPaginationListeners(container);
  }
  
  attachPaginationListeners(container) {
    const paginationBtns = container.querySelectorAll('.pagination-btn');
    paginationBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const page = btn.getAttribute('data-page');
        
        if (page === 'prev') {
          this.currentPage = Math.max(0, this.currentPage - 1);
        } else if (page === 'next') {
          const schedules = appState.getFilteredSchedules();
          const totalPages = Math.ceil(schedules.length / this.pageSize);
          this.currentPage = Math.min(totalPages - 1, this.currentPage + 1);
        } else {
          this.currentPage = parseInt(page);
        }
        
        this.renderTable(document.querySelector('.schedules-view'));
      });
    });
  }
}
