// Schedules table event handlers

import { appState } from '../state.js';
import { deleteSchedule } from '../scheduleApi.js';
import { navigateTo } from '../router.js';
import { Toast } from '../utils/toast.js';

export class SchedulesTableHandlers {
  /**
   * Attach filter event listeners
   */
  static attachFilterListeners(container, renderCallback) {
    const filtersContainer = container.querySelector('#filters-container');
    
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
      renderCallback();
    });
  }
  
  /**
   * Attach table event listeners (rows, expansion, sorting)
   */
  static attachTableListeners(container, context) {
    // Row click - toggle expansion
    const rows = container.querySelectorAll('.table-row');
    rows.forEach(row => {
      row.addEventListener('click', (e) => {
        // Don't toggle if clicking a button inside expansion drawer
        if (e.target.closest('.expansion-btn')) return;
        
        const scheduleId = row.getAttribute('data-schedule-id');
        
        // Toggle expansion
        if (context.expandedRow === scheduleId) {
          context.expandedRow = null;
        } else {
          context.expandedRow = scheduleId;
        }
        
        context.renderTable(document.querySelector('.schedules-view'));
      });
    });
    
    // Expansion button actions
    const expansionBtns = container.querySelectorAll('.expansion-btn');
    expansionBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = btn.getAttribute('data-action');
        const scheduleId = btn.getAttribute('data-id');
        
        switch(action) {
          case 'view':
            navigateTo(`/schedules/${scheduleId}`);
            break;
          case 'apply':
            navigateTo(`/schedules/${scheduleId}/apply`);
            break;
          case 'edit':
            navigateTo(`/schedules/${scheduleId}/edit`);
            break;
          case 'delete':
            this.handleDelete(scheduleId, context);
            break;
        }
      });
    });
    
    // Sorting
    const sortHeaders = container.querySelectorAll('th.sortable');
    sortHeaders.forEach(header => {
      header.addEventListener('click', () => {
        const column = header.getAttribute('data-column');
        
        if (context.sortColumn === column) {
          context.sortDirection = context.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
          context.sortColumn = column;
          context.sortDirection = 'asc';
        }
        
        context.renderTable(document.querySelector('.schedules-view'));
      });
    });
  }
  
  /**
   * Attach pagination event listeners
   */
  static attachPaginationListeners(container, context) {
    const paginationBtns = container.querySelectorAll('.pagination-btn');
    paginationBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const page = btn.getAttribute('data-page');
        
        if (page === 'prev') {
          context.currentPage = Math.max(0, context.currentPage - 1);
        } else if (page === 'next') {
          const schedules = appState.getFilteredSchedules();
          const totalPages = Math.ceil(schedules.length / context.pageSize);
          context.currentPage = Math.min(totalPages - 1, context.currentPage + 1);
        } else {
          context.currentPage = parseInt(page);
        }
        
        context.renderTable(document.querySelector('.schedules-view'));
      });
    });
  }
  
  /**
   * Handle template deletion
   */
  static async handleDelete(scheduleId, context) {
    const schedule = appState.getState().schedules.find(s => s.schedule_id === scheduleId);
    if (!schedule) return;
    
    const confirmed = confirm(
      `Delete Template: ${schedule.title}?\n\n` +
      `This action cannot be undone.`
    );
    
    if (!confirmed) return;
    
    try {
      await deleteSchedule(scheduleId);
      appState.removeSchedule(scheduleId);
      Toast.show('success', 'Template Deleted', 'Template deleted successfully');
      
      // Reset expansion and reload
      context.expandedRow = null;
      await context.loadSchedules();
      context.renderTable(document.querySelector('.schedules-view'));
    } catch (error) {
      console.error('Failed to delete template:', error);
      Toast.show('error', 'Error', 'Failed to delete template');
    }
  }
}
