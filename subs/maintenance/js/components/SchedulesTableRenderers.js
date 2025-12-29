// Schedules table rendering methods

import { 
  formatTaskType,
  formatScheduleFrequency 
} from '../utils/formatters.js';
import { getTaskTypeOptions } from '../utils/scheduleHelpers.js';

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

export class SchedulesTableRenderers {
  static renderFiltersHTML(filters, hasActiveFilters) {
    return `
      <div class="filters-bar">
        <div class="filters-bar-header">
          <h3>Template Filters</h3>
          ${hasActiveFilters ? '<button class="btn-clear-filters" id="btn-clear-filters">Clear All Filters</button>' : ''}
        </div>
        
        <div class="filters-grid">
          <div class="filter-group">
            <label>Class Type</label>
            <select id="filter-class-type" class="filter-select">
              <option value="all" ${filters.item_id === 'all' ? 'selected' : ''}>All Classes</option>
              ${CLASS_TYPES.map(type => 
                `<option value="${type.value}" ${filters.item_id === type.value ? 'selected' : ''}>${type.label}</option>`
              ).join('')}
            </select>
          </div>
          
          <div class="filter-group">
            <label>Task Type</label>
            <select id="filter-task-type" class="filter-select">
              <option value="all" ${filters.task_type === 'all' ? 'selected' : ''}>All Tasks</option>
              ${getTaskTypeOptions().map(opt => 
                `<option value="${opt.value}" ${filters.task_type === opt.value ? 'selected' : ''}>${opt.label}</option>`
              ).join('')}
            </select>
          </div>
          
          <div class="filter-group">
            <label>Default</label>
            <select id="filter-default" class="filter-select">
              <option value="all">All</option>
              <option value="true">Default Only</option>
              <option value="false">Non-Default Only</option>
            </select>
          </div>
          
          <div class="filter-group">
            <label>Enabled</label>
            <select id="filter-enabled" class="filter-select">
              <option value="all" ${filters.enabled === 'all' ? 'selected' : ''}>All</option>
              <option value="true" ${filters.enabled === 'true' ? 'selected' : ''}>Enabled</option>
              <option value="false" ${filters.enabled === 'false' ? 'selected' : ''}>Disabled</option>
            </select>
          </div>
        </div>
      </div>
    `;
  }
  
  static renderStatsHTML(schedules) {
    const total = schedules.length;
    const enabled = schedules.filter(s => s.enabled).length;
    const defaults = schedules.filter(s => s.is_default).length;
    const byClass = {};
    
    schedules.forEach(s => {
      const cls = s.class_type || 'Unknown';
      byClass[cls] = (byClass[cls] || 0) + 1;
    });
    
    return `
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
  
  static renderTableHTML(pageData, sortColumn, sortDirection, expandedRow) {
    const rowsHTML = pageData.map(schedule => 
      this.renderScheduleRowHTML(schedule, sortColumn, sortDirection, expandedRow)
    ).join('');
    
    return `
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th class="sortable ${sortColumn === 'schedule_id' ? 'sort-' + sortDirection : ''}" 
                  data-column="schedule_id">Template ID</th>
              <th class="sortable ${sortColumn === 'class_type' ? 'sort-' + sortDirection : ''}" 
                  data-column="class_type">Class Type</th>
              <th class="sortable ${sortColumn === 'task_type' ? 'sort-' + sortDirection : ''}" 
                  data-column="task_type">Task Type</th>
              <th class="sortable ${sortColumn === 'title' ? 'sort-' + sortDirection : ''}" 
                  data-column="title">Title</th>
              <th class="sortable ${sortColumn === 'frequency' ? 'sort-' + sortDirection : ''}" 
                  data-column="frequency">Frequency</th>
              <th>Default</th>
              <th class="sortable ${sortColumn === 'enabled' ? 'sort-' + sortDirection : ''}" 
                  data-column="enabled">Enabled</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHTML}
          </tbody>
        </table>
      </div>
    `;
  }
  
  static renderScheduleRowHTML(schedule, sortColumn, sortDirection, expandedRow) {
    const templateId = schedule.schedule_id.substring(0, 20) + '...';
    const isExpanded = expandedRow === schedule.schedule_id;
    
    return `
      <tr class="table-row ${isExpanded ? 'expanded' : ''}" 
          data-schedule-id="${schedule.schedule_id}">
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
          <span class="expand-indicator">${isExpanded ? '▼' : '▶'}</span>
        </td>
      </tr>
      ${isExpanded ? this.renderExpansionDrawerHTML(schedule) : ''}
    `;
  }
  
  static renderExpansionDrawerHTML(schedule) {
    return `
      <tr class="expansion-drawer">
        <td colspan="8">
          <div class="expansion-content">
            <button class="expansion-btn view" data-action="view" data-id="${schedule.schedule_id}">
              <span class="expansion-btn-icon">👁️</span>
              <span class="expansion-btn-label">View</span>
            </button>
            <button class="expansion-btn apply" data-action="apply" data-id="${schedule.schedule_id}">
              <span class="expansion-btn-icon">→</span>
              <span class="expansion-btn-label">Apply</span>
            </button>
            <button class="expansion-btn edit" data-action="edit" data-id="${schedule.schedule_id}">
              <span class="expansion-btn-icon">✎</span>
              <span class="expansion-btn-label">Edit</span>
            </button>
            <button class="expansion-btn delete" data-action="delete" data-id="${schedule.schedule_id}">
              <span class="expansion-btn-icon">✕</span>
              <span class="expansion-btn-label">Delete</span>
            </button>
          </div>
        </td>
      </tr>
    `;
  }
  
  static renderPaginationHTML(currentPage, totalPages) {
    const pages = [];
    for (let i = 0; i < totalPages; i++) {
      pages.push(`
        <button 
          class="pagination-btn ${i === currentPage ? 'active' : ''}" 
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
          ${currentPage === 0 ? 'disabled' : ''}
        >
          Previous
        </button>
        ${pages.join('')}
        <button 
          class="pagination-btn" 
          data-page="next"
          ${currentPage === totalPages - 1 ? 'disabled' : ''}
        >
          Next
        </button>
      </div>
    `;
  }
  
  static renderEmptyStateHTML() {
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
}
