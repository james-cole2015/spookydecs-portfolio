// Schedules table rendering methods

import { 
  formatTaskType,
  formatScheduleFrequency 
} from '../utils/formatters.js';
import { getTaskTypeOptions } from '../utils/scheduleHelpers.js';
import { isMobile } from '../utils/responsive.js';

// Class type options
const CLASS_TYPES = [
  { value: 'INFLATABLE', label: 'Inflatable' },
  { value: 'ANIMATRONIC', label: 'Animatronic' },
  { value: 'STATIC_PROP', label: 'Static Prop' },
  { value: 'STRING_LIGHT', label: 'String Light' },
  { value: 'SPOT_LIGHT', label: 'Spot Light' },
  { value: 'CORD', label: 'Cord' },
  { value: 'PLUG', label: 'Plug' }
];

export class SchedulesTableRenderers {
  static renderFiltersHTML(filters, hasActiveFilters) {
    const mobile = isMobile();
    
    if (mobile) {
      return `
        <div class="filters-bar">
          <div class="filters-bar-header">
            <h3>Template Filters</h3>
          </div>
          
          <button class="mobile-filter-button" id="mobile-filter-toggle">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
            </svg>
            Filters
            ${hasActiveFilters ? '<span class="filter-active-badge">•</span>' : ''}
          </button>
          
          <div class="mobile-filter-drawer" id="mobile-filter-drawer">
            <div class="mobile-filter-header">
              <h3>Filters</h3>
              <button class="mobile-filter-close" id="mobile-filter-close">✕</button>
            </div>
            
            <div class="mobile-filter-content">
              ${this.renderFilterControls(filters)}
            </div>
            
            <div class="mobile-filter-footer">
              <button class="btn-secondary" id="btn-clear-filters-mobile">Clear All</button>
              <button class="btn-primary" id="mobile-filter-apply">Apply</button>
            </div>
          </div>
          <div class="mobile-filter-overlay" id="mobile-filter-overlay"></div>
        </div>
      `;
    }
    
    // Desktop filters
    return `
      <div class="filters-bar">
        <div class="filters-bar-header">
          <h3>Template Filters</h3>
          ${hasActiveFilters ? '<button class="btn-clear-filters" id="btn-clear-filters">Clear All Filters</button>' : ''}
        </div>
        
        <div class="filters-grid">
          ${this.renderFilterControls(filters)}
        </div>
      </div>
    `;
  }
  
  static renderFilterControls(filters) {
    return `
      <div class="filter-group">
        <label>Enabled</label>
        <select id="filter-enabled" class="filter-select">
          <option value="all" ${filters.enabled === 'all' ? 'selected' : ''}>All</option>
          <option value="true" ${filters.enabled === 'true' ? 'selected' : ''}>True</option>
          <option value="false" ${filters.enabled === 'false' ? 'selected' : ''}>False</option>
        </select>
      </div>
      
      <div class="filter-group">
        <label>Default Templates</label>
        <select id="filter-default" class="filter-select">
          <option value="all" ${filters.status === 'all' ? 'selected' : ''}>All</option>
          <option value="true" ${filters.status === 'true' ? 'selected' : ''}>Yes</option>
          <option value="false" ${filters.status === 'false' ? 'selected' : ''}>No</option>
        </select>
      </div>
      
      <div class="filter-group">
        <label>Class Types</label>
        <select id="filter-class-type" class="filter-select">
          <option value="all" ${filters.item_id === 'all' ? 'selected' : ''}>All Classes</option>
          ${CLASS_TYPES.map(type => 
            `<option value="${type.value}" ${filters.item_id === type.value ? 'selected' : ''}>${type.label}</option>`
          ).join('')}
        </select>
      </div>
      
      <div class="filter-group">
        <label>Type</label>
        <select id="filter-task-type" class="filter-select">
          <option value="all" ${filters.task_type === 'all' ? 'selected' : ''}>All Types</option>
          ${getTaskTypeOptions().map(opt => 
            `<option value="${opt.value}" ${filters.task_type === opt.value ? 'selected' : ''}>${opt.label}</option>`
          ).join('')}
        </select>
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
    const mobile = isMobile();
    
    if (mobile) {
      return this.renderMobileCards(pageData, expandedRow);
    }
    
    // Desktop table
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
  
  static renderMobileCards(schedules, expandedRow) {
    return `
      <div class="mobile-schedules-cards">
        ${schedules.map(schedule => this.renderMobileCard(schedule, expandedRow)).join('')}
      </div>
    `;
  }
  
  static renderMobileCard(schedule, expandedRow) {
    const isExpanded = expandedRow === schedule.schedule_id;
    
    // Get task type icon
    const taskTypeIcons = {
      'inspection': '🔍',
      'maintenance': '🔨',
      'repair': '🔧'
    };
    const taskIcon = taskTypeIcons[schedule.task_type] || '📋';
    
    return `
      <div class="mobile-schedule-card ${isExpanded ? 'expanded' : ''}" data-schedule-id="${schedule.schedule_id}">
        <div class="mobile-schedule-card-header">
          <div class="mobile-schedule-card-title">${schedule.title}</div>
          <span class="mobile-schedule-expand">${isExpanded ? '▼' : '▶'}</span>
        </div>
        
        <div class="mobile-schedule-card-meta">
          <span class="schedule-task-type">${taskIcon} ${formatTaskType(schedule.task_type)}</span>
          <span class="schedule-frequency">📅 ${formatScheduleFrequency(schedule.frequency, schedule.season)}</span>
        </div>
        
        <div class="mobile-schedule-card-badges">
          <span class="class-type-badge">${schedule.class_type}</span>
          ${schedule.is_default 
            ? '<span class="badge-default">✓ Default</span>' 
            : '<span class="badge-custom">Custom</span>'}
          <span class="enabled-badge ${schedule.enabled ? 'enabled' : 'disabled'}">
            ${schedule.enabled ? '✓ Enabled' : '✗ Disabled'}
          </span>
        </div>
        
        ${isExpanded ? this.renderMobileExpansion(schedule) : ''}
      </div>
    `;
  }
  
  static renderMobileExpansion(schedule) {
    return `
      <div class="mobile-schedule-expansion">
        <div class="mobile-expansion-actions">
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