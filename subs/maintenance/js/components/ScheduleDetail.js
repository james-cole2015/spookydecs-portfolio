// Schedule detail view - shows schedule info and generated records

import { fetchSchedule, fetchScheduleRecords, deleteSchedule, generateScheduleRecords } from '../api.js';
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
      
    } catch (error) {
      console.error('Failed to load schedule:', error);
      container.innerHTML = this.renderError();
    }
  }
  
  renderDetail() {
    return `
      <div class="detail-view">
        <div class="detail-header">
          <button class="btn-back" onclick="window.location.href='/schedules'">
            ← Back to Schedules
          </button>
          <div class="detail-actions">
            <button class="btn-secondary" id="btn-generate">
              ↻ Generate More Records
            </button>
            <button class="btn-secondary" id="btn-edit">
              ✎ Edit
            </button>
            <button class="btn-danger" id="btn-delete">
              🗑 Delete
            </button>
          </div>
        </div>
        
        <div class="detail-content">
          ${this.renderScheduleInfo()}
          ${this.renderRecordsSection()}
        </div>
      </div>
    `;
  }
  
  renderScheduleInfo() {
    const s = this.schedule;
    
    return `
      <div class="detail-card">
        <div class="card-header">
          <h2>${s.title}</h2>
          ${formatScheduleStatus(s.status)}
        </div>
        
        <div class="detail-grid">
          <div class="detail-row">
            <label>Item ID:</label>
            <div><code>${s.item_id}</code></div>
          </div>
          
          <div class="detail-row">
            <label>Task Type:</label>
            <div>${formatTaskType(s.task_type)}</div>
          </div>
          
          <div class="detail-row">
            <label>Frequency:</label>
            <div>${formatScheduleFrequency(s.frequency, s.season)}</div>
          </div>
          
          <div class="detail-row">
            <label>Next Due:</label>
            <div class="highlight">${formatNextDueDate(s.next_due_date, s.status)}</div>
          </div>
          
          <div class="detail-row">
            <label>Last Completed:</label>
            <div>${s.last_completed_date ? formatDate(s.last_completed_date) : 'Never'}</div>
          </div>
          
          <div class="detail-row">
            <label>Enabled:</label>
            <div>
              <span class="enabled-badge ${s.enabled ? 'enabled' : 'disabled'}">
                ${s.enabled ? '✓ Yes' : '✗ No'}
              </span>
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
    // Edit button
    const editBtn = container.querySelector('#btn-edit');
    if (editBtn) {
      editBtn.addEventListener('click', () => {
        navigateTo(`/schedules/${this.scheduleId}/edit`);
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
        const itemId = this.schedule.item_id;
        navigateTo(`/${itemId}/${recordId}`);
      });
    });
    
    // View buttons
    const viewBtns = container.querySelectorAll('.btn-small[data-record-id]');
    viewBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const recordId = btn.getAttribute('data-record-id');
        const itemId = this.schedule.item_id;
        navigateTo(`/${itemId}/${recordId}`);
      });
    });
  }
  
  async handleDelete() {
    const upcomingRecords = this.records.filter(r => r.status !== 'completed').length;
    
    const confirmed = confirm(
      `Are you sure you want to delete this schedule?\n\n` +
      `This will cancel ${upcomingRecords} upcoming maintenance record(s).\n\n` +
      `This action cannot be undone.`
    );
    
    if (!confirmed) return;
    
    try {
      const result = await deleteSchedule(this.scheduleId);
      appState.removeSchedule(this.scheduleId);
      
      Toast.show(
        'success', 
        'Schedule Deleted', 
        `Cancelled ${result.cancelled_records} future record(s)`
      );
      
      navigateTo('/schedules');
      
    } catch (error) {
      console.error('Failed to delete schedule:', error);
      Toast.show('error', 'Error', 'Failed to delete schedule');
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
