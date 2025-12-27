// Schedules table view - lists all maintenance schedules

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
            <h1>Maintenance Schedules</h1>
          </div>
          <button class="btn-primary" id="btn-create-schedule">
            + Create Schedule
          </button>
        </div>
        
        <div id="filters-container"></div>
        <div id="stats-container"></div>
        <div id="table-container">
          <div class="loading">Loading schedules...</div>
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
      
      // Update status based on due dates
      schedules.forEach(schedule => {
        if (schedule.enabled) {
          schedule.status = getStatusFromDueDate(
            schedule.next_due_date, 
            schedule.days_before_reminder
          );
        }
      });
      
      appState.setSchedules(schedules);
    } catch (error) {
      console.error('Failed to load schedules:', error);
      Toast.show('error', 'Error', 'Failed to load schedules');
    }
  }
  
  renderFilters(container) {
    const filtersContainer = container.querySelector('#filters-container');
    const state = appState.getState();
    const filters = state.scheduleFilters;
    
    filtersContainer.innerHTML = `
      <div class="filters-bar">
        <div class="filter-group">
          <label>Status:</label>
          <select id="filter-status" class="filter-select">
            <option value="all" ${filters.status === 'all' ? 'selected' : ''}>All</option>
            <option value="upcoming" ${filters.status === 'upcoming' ? 'selected' : ''}>Upcoming</option>
            <option value="due" ${filters.status === 'due' ? 'selected' : ''}>Due Soon</option>
            <option value="overdue" ${filters.status === 'overdue' ? 'selected' : ''}>Overdue</option>
          </select>
        </div>
        
        <div class="filter-group">
          <label>Task Type:</label>
          <select id="filter-task-type" class="filter-select">
            <option value="all" ${filters.task_type === 'all' ? 'selected' : ''}>All</option>
            ${getTaskTypeOptions().map(opt => 
              `<option value="${opt.value}" ${filters.task_type === opt.value ? 'selected' : ''}>${opt.label}</option>`
            ).join('')}
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
    const statusFilter = filtersContainer.querySelector('#filter-status');
    const taskTypeFilter = filtersContainer.querySelector('#filter-task-type');
    const enabledFilter = filtersContainer.querySelector('#filter-enabled');
    const clearBtn = filtersContainer.querySelector('#btn-clear-filters');
    
    statusFilter?.addEventListener('change', (e) => {
      appState.updateScheduleFilters({ status: e.target.value });
    });
    
    taskTypeFilter?.addEventListener('change', (e) => {
      appState.updateScheduleFilters({ task_type: e.target.value });
    });
    
    enabledFilter?.addEventListener('change', (e) => {
      appState.updateScheduleFilters({ enabled: e.target.value });
    });
    
    clearBtn?.addEventListener('click', () => {
      appState.updateScheduleFilters({ 
        status: 'all', 
        task_type: 'all', 
        enabled: 'all' 
      });
      this.renderFilters(container);
    });
  }
  
  renderStats(container) {
    const statsContainer = container.querySelector('#stats-container');
    const stats = appState.getScheduleStats();
    
    statsContainer.innerHTML = `
      <div class="stats-cards">
        <div class="stat-card">
          <div class="stat-value">${stats.total}</div>
          <div class="stat-label">Total Schedules</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${stats.enabled}</div>
          <div class="stat-label">Enabled</div>
        </div>
        <div class="stat-card stat-warning">
          <div class="stat-value">${stats.upcoming}</div>
          <div class="stat-label">Due This Week</div>
        </div>
        <div class="stat-card stat-danger">
          <div class="stat-value">${stats.overdue}</div>
          <div class="stat-label">Overdue</div>
        </div>
      </div>
    `;
  }
  
  renderTable(container) {
    const tableContainer = container.querySelector('#table-container');
    const schedules = appState.getFilteredSchedules();
    
    if (schedules.length === 0) {
      tableContainer.innerHTML = this.renderEmptyState();
      return;
    }
    
    // Sort by next_due_date
    const sorted = [...schedules].sort((a, b) => 
      new Date(a.next_due_date) - new Date(b.next_due_date)
    );
    
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
              <th>Item ID</th>
              <th>Task Type</th>
              <th>Title</th>
              <th>Frequency</th>
              <th>Next Due</th>
              <th>Status</th>
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
    return `
      <tr class="table-row" data-schedule-id="${schedule.schedule_id}">
        <td><code>${schedule.item_id}</code></td>
        <td>${formatTaskType(schedule.task_type)}</td>
        <td class="table-title">${schedule.title}</td>
        <td>${formatScheduleFrequency(schedule.frequency, schedule.season)}</td>
        <td>${formatNextDueDate(schedule.next_due_date, schedule.status)}</td>
        <td>${formatScheduleStatus(schedule.status)}</td>
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
        <div class="empty-icon">📅</div>
        <h3>No schedules found</h3>
        <p>Create your first maintenance schedule to automate recurring tasks</p>
        <button class="btn-primary" onclick="window.location.href='/schedules/new'">
          + Create Schedule
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
