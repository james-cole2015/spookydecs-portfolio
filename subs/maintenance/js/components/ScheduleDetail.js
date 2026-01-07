// Schedule detail view - shows template info and generated records

import { fetchSchedule, fetchScheduleRecords, deleteSchedule, generateScheduleRecords } from '../scheduleApi.js';
import { fetchAllItems } from '../api.js';
import { appState } from '../state.js';
import { navigateTo } from '../router.js';
import { Toast } from '../utils/toast.js';
import { formatDate, formatStatus, formatCurrency } from '../utils/formatters.js';
import {
  formatScheduleStatus,
  formatNextDueDate,
  formatTaskType,
  formatScheduleFrequency
} from '../utils/formatters.js';

export class ScheduleDetailView {
  constructor(scheduleId) {
    this.scheduleId = scheduleId;
    this.schedule = null;
    this.records = [];
    this.itemsWithTemplate = [];
    this.activeTab = 'overview'; // 'overview' or 'items'
  }
  
  async render(container) {
    try {
      // Load schedule and records
      this.schedule = await fetchSchedule(this.scheduleId);
      this.records = await fetchScheduleRecords(this.scheduleId);
      
      appState.setCurrentSchedule(this.schedule);
      appState.setScheduleRecords(this.records);
      
      container.innerHTML = this.renderDetail();
      this.attachEventListeners(container);
      
      // Load items using this template (async, don't block rendering)
      this.loadAndRenderItems(container);
      
    } catch (error) {
      console.error('Failed to load schedule:', error);
      container.innerHTML = this.renderError();
    }
  }
  
  async loadAndRenderItems(container) {
    const itemsTabContent = container.querySelector('#items-tab-content');
    
    if (!itemsTabContent) return;
    
    try {
      // Show loading state
      itemsTabContent.innerHTML = `
        <div class="loading-state">
          <div class="spinner"></div>
          <p>Loading items...</p>
        </div>
      `;
      
      // Fetch all items (we need to check all items since template can be for any class_type)
      const allItems = await fetchAllItems({});
      
      // Filter to items that have this template in their applied_templates array
      const itemsWithTemplate = allItems.filter(item => {
        // Check if item has maintenance object and applied_templates array
        if (!item.maintenance || !Array.isArray(item.maintenance.applied_templates)) {
          return false;
        }
        
        // Check if this template ID is in the applied_templates array
        return item.maintenance.applied_templates.includes(this.scheduleId);
      });
      
      console.log(`Found ${itemsWithTemplate.length} items using template ${this.scheduleId}`);
      
      this.itemsWithTemplate = itemsWithTemplate;
      
      // Update the tab content
      itemsTabContent.innerHTML = this.renderItemsTabContent();
      
      // Update the tab count badge
      const itemsTabButton = container.querySelector('.detail-tab-button[data-tab="items"]');
      if (itemsTabButton) {
        const countBadge = itemsTabButton.querySelector('.tab-count');
        if (countBadge) {
          countBadge.textContent = itemsWithTemplate.length;
        }
      }
      
      // Attach event listeners for item rows
      this.attachItemRowListeners(container);
      
    } catch (error) {
      console.error('Failed to load items:', error);
      itemsTabContent.innerHTML = `
        <div class="error-state">
          <p>Failed to load items using this template.</p>
          <button class="btn-secondary" id="retry-items-load">Retry</button>
        </div>
      `;
      
      // Add retry button listener
      const retryBtn = itemsTabContent.querySelector('#retry-items-load');
      if (retryBtn) {
        retryBtn.addEventListener('click', () => {
          this.loadAndRenderItems(container);
        });
      }
    }
  }
  
  renderDetail() {
    return `
      <div class="schedule-detail-view">
        <div class="detail-view">
          <div class="schedule-detail-header">
            <button class="btn-back" onclick="window.location.href='/schedules'">
              ← Back to Schedules
            </button>
            <div class="detail-actions">
              <button class="btn-icon btn-primary" id="btn-apply-to-items" title="Apply to Items">
                →
              </button>
              <button class="btn-icon btn-secondary" id="btn-generate" title="Generate More Records">
                ↻
              </button>
              <button class="btn-icon btn-secondary" id="btn-edit" title="Edit">
                ✎
              </button>
              <button class="btn-icon btn-danger-icon" id="btn-delete" title="Delete">
                ✕
              </button>
            </div>
          </div>
          
          <div class="detail-content">
            ${this.renderTabs()}
            ${this.renderTabContent()}
          </div>
        </div>
      </div>
    `;
  }
  
  renderTabs() {
    return `
      <div class="detail-tabs">
        <button class="detail-tab-button ${this.activeTab === 'overview' ? 'active' : ''}" data-tab="overview">
          <span class="tab-icon">📋</span>
          <span class="tab-label">Overview</span>
        </button>
        <button class="detail-tab-button ${this.activeTab === 'items' ? 'active' : ''}" data-tab="items">
          <span class="tab-icon">📦</span>
          <span class="tab-label">Items</span>
          <span class="tab-count">0</span>
        </button>
      </div>
    `;
  }
  
  renderTabContent() {
    return `
      <div class="detail-tab-panels">
        <div class="detail-tab-panel ${this.activeTab === 'overview' ? 'active' : ''}" data-panel="overview">
          ${this.renderScheduleInfo()}
          ${this.renderRecordsSection()}
        </div>
        <div class="detail-tab-panel ${this.activeTab === 'items' ? 'active' : ''}" data-panel="items">
          <div id="items-tab-content">
            <div class="loading-state">
              <div class="spinner"></div>
              <p>Loading items...</p>
            </div>
          </div>
        </div>
      </div>
    `;
  }
  
  renderItemsTabContent() {
    if (this.itemsWithTemplate.length === 0) {
      return `
        <div class="detail-card">
          <div class="empty-state">
            <div class="empty-state-icon">📦</div>
            <h3>No Items Using This Template</h3>
            <p>This template hasn't been applied to any items yet.</p>
            <button class="btn-primary" id="apply-template-from-items-tab">
              Apply Template to Items
            </button>
          </div>
        </div>
      `;
    }
    
    return `
      <div class="detail-card">
        <div class="card-header-with-actions">
          <h3>${this.itemsWithTemplate.length} Item${this.itemsWithTemplate.length !== 1 ? 's' : ''} Using This Template</h3>
          <button class="btn-secondary btn-small" id="apply-more-items">
            + Apply to More Items
          </button>
        </div>
        
        <div class="items-table-container">
          <table class="data-table items-using-template-table">
            <thead>
              <tr>
                <th>Item ID</th>
                <th>Name</th>
                <th>Class Type</th>
                <th>Season</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${this.itemsWithTemplate.map(item => this.renderItemRow(item)).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }
  
  renderItemRow(item) {
    const statusClass = item.enabled === false ? 'disabled' : 'enabled';
    const statusText = item.enabled === false ? 'Disabled' : 'Active';
    
    return `
      <tr class="item-row clickable" data-item-id="${item.id}">
        <td><code class="item-id-code">${item.id}</code></td>
        <td class="item-name">${item.name || 'Unnamed Item'}</td>
        <td><span class="class-type-badge">${item.class_type || 'Unknown'}</span></td>
        <td><span class="season-badge season-${(item.season || 'unknown').toLowerCase()}">${item.season || 'Unknown'}</span></td>
        <td><span class="status-badge status-${statusClass}">${statusText}</span></td>
        <td>
          <button class="btn-small btn-view-item" data-item-id="${item.id}" title="View Item Details">
            View
          </button>
        </td>
      </tr>
    `;
  }
  
  renderScheduleInfo() {
    const s = this.schedule;
    
    return `
      <div class="detail-card">
        <div class="card-header">
          <h2>${s.title}</h2>
          <div class="badges">
            ${s.is_default ? '<span class="badge-default">✓ Default Template</span>' : '<span class="badge-custom">Custom Template</span>'}
            ${s.enabled ? '' : '<span class="badge-disabled">Disabled</span>'}
          </div>
        </div>
        
        <div class="detail-grid">
          <div class="detail-row">
            <label>Template ID:</label>
            <div><code>${s.schedule_id}</code></div>
          </div>
          
          <div class="detail-row">
            <label>Class Type:</label>
            <div><span class="class-type-badge">${s.class_type}</span></div>
          </div>
          
          <div class="detail-row">
            <label>Task Type:</label>
            <div>${formatTaskType(s.task_type)}</div>
          </div>
          
          <div class="detail-row">
            <label>Short Name:</label>
            <div><code>${s.short_name}</code></div>
          </div>
          
          <div class="detail-row">
            <label>Frequency:</label>
            <div>${formatScheduleFrequency(s.frequency, s.season)}</div>
          </div>
          
          <div class="detail-row">
            <label>Auto-Apply to New Items:</label>
            <div>
              ${s.is_default 
                ? '<strong>Yes</strong> - Automatically assigned to new ' + s.class_type + ' items'
                : 'No - Must be manually assigned'}
            </div>
          </div>
          
          ${s.description ? `
            <div class="detail-row full-width">
              <label>Description:</label>
              <div class="description">${s.description}</div>
            </div>
          ` : ''}
          
          ${s.estimated_cost > 0 ? `
            <div class="detail-row">
              <label>Estimated Cost:</label>
              <div>${formatCurrency(s.estimated_cost)}</div>
            </div>
          ` : ''}
          
          ${s.estimated_duration_minutes ? `
            <div class="detail-row">
              <label>Estimated Duration:</label>
              <div>${s.estimated_duration_minutes} minutes</div>
            </div>
          ` : ''}
          
          <div class="detail-row">
            <label>Reminder:</label>
            <div>${s.days_before_reminder} days before due</div>
          </div>
          
          <div class="detail-row">
            <label>Status:</label>
            <div>
              <span class="enabled-badge ${s.enabled ? 'enabled' : 'disabled'}">
                ${s.enabled ? '✓ Enabled' : '✗ Disabled'}
              </span>
            </div>
          </div>
          
          <div class="detail-row">
            <label>Created:</label>
            <div>${formatDate(s.created_at)}</div>
          </div>
          
          <div class="detail-row">
            <label>Last Updated:</label>
            <div>${formatDate(s.updated_at)} by ${s.updated_by}</div>
          </div>
        </div>
      </div>
    `;
  }
  
  renderRecordsSection() {
    if (this.records.length === 0) {
      return `
        <div class="detail-card">
          <h3>Generated Maintenance Records</h3>
          <div class="empty-state">
            <p>No maintenance records have been generated from this schedule yet.</p>
          </div>
        </div>
      `;
    }
    
    // Separate completed and upcoming
    const completed = this.records.filter(r => r.status === 'completed');
    const upcoming = this.records.filter(r => r.status !== 'completed');
    
    return `
      <div class="detail-card">
        <h3>Generated Maintenance Records (${this.records.length})</h3>
        
        ${upcoming.length > 0 ? `
          <div class="records-section">
            <h4>Upcoming (${upcoming.length})</h4>
            <div class="records-table">
              ${this.renderRecordsTable(upcoming)}
            </div>
          </div>
        ` : ''}
        
        ${completed.length > 0 ? `
          <div class="records-section">
            <h4>Completed (${completed.length})</h4>
            <div class="records-table">
              ${this.renderRecordsTable(completed)}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }
  
  renderRecordsTable(records) {
    // Sort by date
    const sorted = [...records].sort((a, b) => 
      new Date(a.date_performed) - new Date(b.date_performed)
    );
    
    return `
      <table class="data-table compact">
        <thead>
          <tr>
            <th>Occurrence</th>
            <th>Item ID</th>
            <th>Due Date</th>
            <th>Status</th>
            <th>Performed By</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${sorted.map(record => this.renderRecordRow(record)).join('')}
        </tbody>
      </table>
    `;
  }
  
  renderRecordRow(record) {
    return `
      <tr class="table-row clickable" data-record-id="${record.record_id}">
        <td>#${record.occurrence_number || '-'}</td>
        <td><code>${record.item_id || 'N/A'}</code></td>
        <td>${formatDate(record.date_performed)}</td>
        <td>${formatStatus(record.status)}</td>
        <td>${record.performed_by || '-'}</td>
        <td>
          <button class="btn-small" data-record-id="${record.record_id}">
            View
          </button>
        </td>
      </tr>
    `;
  }
  
  renderError() {
    return `
      <div class="error-container">
        <h1>Error Loading Schedule</h1>
        <p>Unable to load schedule details. Please try again.</p>
        <button onclick="window.location.href='/schedules'">Back to Schedules</button>
      </div>
    `;
  }
  
  attachEventListeners(container) {
    // Tab switching - desktop
    const tabButtons = container.querySelectorAll('.detail-tab-button');
    tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        const tab = button.getAttribute('data-tab');
        this.switchTab(tab, container);
      });
    });
    
    // Edit button
    const editBtn = container.querySelector('#btn-edit');
    if (editBtn) {
      editBtn.addEventListener('click', () => {
        navigateTo(`/schedules/${this.scheduleId}/edit`);
      });
    }
    
    // Apply to Items button (header)
    const applyBtn = container.querySelector('#btn-apply-to-items');
    if (applyBtn) {
      applyBtn.addEventListener('click', () => {
        navigateTo(`/schedules/${this.scheduleId}/apply`);
      });
    }
    
    // Apply Template button (from items tab empty state)
    const applyFromItemsTab = container.querySelector('#apply-template-from-items-tab');
    if (applyFromItemsTab) {
      applyFromItemsTab.addEventListener('click', () => {
        navigateTo(`/schedules/${this.scheduleId}/apply`);
      });
    }
    
    // Apply to More Items button
    const applyMoreBtn = container.querySelector('#apply-more-items');
    if (applyMoreBtn) {
      applyMoreBtn.addEventListener('click', () => {
        navigateTo(`/schedules/${this.scheduleId}/apply`);
      });
    }
    
    // Delete button
    const deleteBtn = container.querySelector('#btn-delete');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => {
        this.handleDelete();
      });
    }
    
    // Generate more records button
    const generateBtn = container.querySelector('#btn-generate');
    if (generateBtn) {
      generateBtn.addEventListener('click', () => {
        this.handleGenerate();
      });
    }
    
    // Record row clicks
    const recordRows = container.querySelectorAll('.table-row.clickable');
    recordRows.forEach(row => {
      row.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-small')) return;
        
        const recordId = row.getAttribute('data-record-id');
        const record = this.records.find(r => r.record_id === recordId);
        if (record && record.item_id) {
          navigateTo(`/${record.item_id}/${recordId}`);
        }
      });
    });
    
    // View buttons
    const viewBtns = container.querySelectorAll('.btn-small[data-record-id]');
    viewBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const recordId = btn.getAttribute('data-record-id');
        const record = this.records.find(r => r.record_id === recordId);
        if (record && record.item_id) {
          navigateTo(`/${record.item_id}/${recordId}`);
        }
      });
    });
  }
  
  attachItemRowListeners(container) {
    // Item row clicks
    const itemRows = container.querySelectorAll('.item-row.clickable');
    itemRows.forEach(row => {
      row.addEventListener('click', (e) => {
        // Don't trigger if clicking a button
        if (e.target.classList.contains('btn-view-item') || e.target.closest('.btn-view-item')) {
          return;
        }
        
        const itemId = row.getAttribute('data-item-id');
        // Navigate to item detail page (adjust URL as needed)
        window.location.href = `/items/${itemId}`;
      });
    });
    
    // View item buttons
    const viewItemBtns = container.querySelectorAll('.btn-view-item');
    viewItemBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const itemId = btn.getAttribute('data-item-id');
        window.location.href = `/items/${itemId}`;
      });
    });
  }
  
  switchTab(tab, container) {
    this.activeTab = tab;
    
    // Update desktop tab buttons
    const tabButtons = container.querySelectorAll('.detail-tab-button');
    tabButtons.forEach(button => {
      if (button.getAttribute('data-tab') === tab) {
        button.classList.add('active');
      } else {
        button.classList.remove('active');
      }
    });
    
    // Update tab panels
    const tabPanels = container.querySelectorAll('.detail-tab-panel');
    tabPanels.forEach(panel => {
      if (panel.getAttribute('data-panel') === tab) {
        panel.classList.add('active');
      } else {
        panel.classList.remove('active');
      }
    });
  }
  
  async handleDelete() {
    const pendingRecords = this.records.filter(r => r.status === 'scheduled').length;
    
    const confirmed = confirm(
      `Delete Template: ${this.schedule.title}?\n\n` +
      `This template ${this.schedule.is_default ? 'IS a default template' : 'is a custom template'}.\n\n` +
      `This will:\n` +
      `• Remove this template from the system\n` +
      `• Cancel ${pendingRecords} pending maintenance record(s)\n` +
      `• Keep all completed historical records\n\n` +
      `This action cannot be undone.`
    );
    
    if (!confirmed) return;
    
    try {
      const result = await deleteSchedule(this.scheduleId);
      appState.removeSchedule(this.scheduleId);
      
      Toast.show(
        'success', 
        'Template Deleted', 
        `${result.template_name || 'Template'} deleted. ${result.cancelled_records} future record(s) cancelled.`
      );
      
      navigateTo('/schedules');
      
    } catch (error) {
      console.error('Failed to delete template:', error);
      Toast.show('error', 'Error', 'Failed to delete template');
    }
  }
  
  async handleGenerate() {
    const count = prompt('How many additional records would you like to generate?', '2');
    
    if (!count) return;
    
    const numCount = parseInt(count);
    if (isNaN(numCount) || numCount < 1 || numCount > 10) {
      Toast.show('error', 'Invalid Input', 'Please enter a number between 1 and 10');
      return;
    }
    
    try {
      const result = await generateScheduleRecords(this.scheduleId, numCount);
      
      Toast.show(
        'success', 
        'Records Generated', 
        `Created ${result.records.length} new maintenance record(s)`
      );
      
      // Reload the view
      const container = document.querySelector('.detail-view').parentElement;
      await this.render(container);
      
    } catch (error) {
      console.error('Failed to generate records:', error);
      Toast.show('error', 'Error', 'Failed to generate records');
    }
  }
}