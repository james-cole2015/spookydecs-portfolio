// Schedules table event handlers

import { appState } from '../state.js';
import { deleteSchedule } from '../scheduleApi.js';
import { navigateTo } from '../router.js';
import { Toast } from '../utils/toast.js';
import { isMobile } from '../utils/responsive.js';

export class SchedulesTableHandlers {
  /**
   * Attach filter event listeners
   */
  static attachFilterListeners(container, renderCallback) {
    const mobile = isMobile();
    
    if (mobile) {
      this.attachMobileFilterListeners(container, renderCallback);
    } else {
      this.attachDesktopFilterListeners(container, renderCallback);
    }
  }
  
  static attachDesktopFilterListeners(container, renderCallback) {
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
  
  static attachMobileFilterListeners(container, renderCallback) {
    const toggleBtn = container.querySelector('#mobile-filter-toggle');
    const drawer = container.querySelector('#mobile-filter-drawer');
    const overlay = container.querySelector('#mobile-filter-overlay');
    const closeBtn = container.querySelector('#mobile-filter-close');
    const applyBtn = container.querySelector('#mobile-filter-apply');
    const clearBtn = container.querySelector('#btn-clear-filters-mobile');
    
    const openDrawer = () => {
      drawer.classList.add('open');
      overlay.classList.add('open');
      document.body.style.overflow = 'hidden';
    };
    
    const closeDrawer = () => {
      drawer.classList.remove('open');
      overlay.classList.remove('open');
      document.body.style.overflow = '';
    };
    
    toggleBtn?.addEventListener('click', openDrawer);
    closeBtn?.addEventListener('click', closeDrawer);
    overlay?.addEventListener('click', closeDrawer);
    
    applyBtn?.addEventListener('click', () => {
      // Get filter values
      const classType = drawer.querySelector('#filter-class-type')?.value || 'all';
      const taskType = drawer.querySelector('#filter-task-type')?.value || 'all';
      const defaultTemplates = drawer.querySelector('#filter-default')?.value || 'all';
      const enabled = drawer.querySelector('#filter-enabled')?.value || 'all';
      
      // Update filters
      appState.updateScheduleFilters({
        item_id: classType,
        task_type: taskType,
        status: defaultTemplates,
        enabled: enabled
      });
      
      closeDrawer();
      renderCallback();
    });
    
    clearBtn?.addEventListener('click', () => {
      // Reset filter select elements
      const classTypeFilter = drawer.querySelector('#filter-class-type');
      const taskTypeFilter = drawer.querySelector('#filter-task-type');
      const defaultFilter = drawer.querySelector('#filter-default');
      const enabledFilter = drawer.querySelector('#filter-enabled');
      
      if (classTypeFilter) classTypeFilter.value = 'all';
      if (taskTypeFilter) taskTypeFilter.value = 'all';
      if (defaultFilter) defaultFilter.value = 'all';
      if (enabledFilter) enabledFilter.value = 'all';
      
      // Update state
      appState.updateScheduleFilters({ 
        item_id: 'all',
        status: 'all', 
        task_type: 'all', 
        enabled: 'all' 
      });
      
      closeDrawer();
      renderCallback();
    });
  }
  
  /**
   * Attach table event listeners (rows, expansion, sorting)
   */
  static attachTableListeners(container, context) {
    const mobile = isMobile();
    
    if (mobile) {
      this.attachMobileCardListeners(container, context);
    } else {
      this.attachDesktopTableListeners(container, context);
    }
  }
  
  static attachDesktopTableListeners(container, context) {
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
  
  static attachMobileCardListeners(container, context) {
    // Card click - toggle expansion
    const cards = container.querySelectorAll('.mobile-schedule-card');
    cards.forEach(card => {
      card.addEventListener('click', (e) => {
        // Don't toggle if clicking an expansion button
        if (e.target.closest('.expansion-btn')) return;
        
        const scheduleId = card.getAttribute('data-schedule-id');
        
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