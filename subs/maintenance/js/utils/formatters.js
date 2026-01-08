// Formatting utilities for display

export function formatDate(isoString) {
  if (!isoString) return 'N/A';
  
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  } catch (e) {
    return 'Invalid Date';
  }
}

export function formatSeverity(criticality) {
  if (!criticality || criticality === 'null') {
    return `<span class="pill-badge" style="background-color: #6B728020; color: #6B7280; border: 1px solid #6B728040;">None</span>`;
  }
  
  const colors = {
    'low': '#10B981',
    'medium': '#F59E0B',
    'high': '#EF4444',
    'critical': '#DC2626'
  };
  
  const labels = {
    'low': 'Low',
    'medium': 'Medium',
    'high': 'High',
    'critical': 'Critical'
  };
  
  const color = colors[criticality] || '#6B7280';
  const label = labels[criticality] || criticality;
  
  return `<span class="pill-badge" style="background-color: ${color}20; color: ${color}; border: 1px solid ${color}40;">${label}</span>`;
}

export function formatDateTime(isoString) {
  if (!isoString) return 'N/A';
  
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    return 'Invalid Date';
  }
}

export function formatCurrency(amount) {
  if (amount === null || amount === undefined) return '$0.00';
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
}

export function formatStatus(status) {
  const colors = {
    'scheduled': '#3B82F6',
    'in_progress': '#F59E0B',
    'completed': '#10B981',
    'cancelled': '#EF4444'
  };
  
  const labels = {
    'scheduled': 'Scheduled',
    'in_progress': 'In Progress',
    'completed': 'Completed',
    'cancelled': 'Cancelled'
  };
  
  const color = colors[status] || '#6B7280';
  const label = labels[status] || status;
  
  return `<span class="pill-badge" style="background-color: ${color}20; color: ${color}; border: 1px solid ${color}40;">${label}</span>`;
}

export function formatCriticality(criticality) {
  if (!criticality || criticality === 'null') {
    return `<span class="pill-badge" style="background-color: #6B728020; color: #6B7280; border: 1px solid #6B728040;">None</span>`;
  }
  
  const colors = {
    'low': '#10B981',
    'medium': '#F59E0B',
    'high': '#EF4444'
  };
  
  const labels = {
    'low': 'Low',
    'medium': 'Medium',
    'high': 'High'
  };
  
  const color = colors[criticality] || '#6B7280';
  const label = labels[criticality] || criticality;
  
  return `<span class="pill-badge" style="background-color: ${color}20; color: ${color}; border: 1px solid ${color}40;">${label}</span>`;
}

export function formatRecordType(type) {
  const labels = {
    'repair': 'Repair',
    'maintenance': 'Maintenance',
    'inspection': 'Inspection'
  };
  
  return labels[type] || type;
}

export function formatRecordTypePill(type) {
  const colors = {
    'repair': '#EF4444',
    'maintenance': '#3B82F6',
    'inspection': '#8B5CF6'
  };
  
  const color = colors[type] || '#6B7280';
  const label = formatRecordType(type);
  
  return `<span class="pill-badge" style="background-color: ${color}20; color: ${color}; border: 1px solid ${color}40;">${label}</span>`;
}

export function getStatusColor(status) {
  const colors = {
    'scheduled': '#3B82F6',
    'in_progress': '#F59E0B',
    'completed': '#10B981',
    'cancelled': '#EF4444'
  };
  return colors[status] || '#6B7280';
}

export function getCriticalityColor(criticality) {
  const colors = {
    'low': '#10B981',
    'medium': '#F59E0B',
    'high': '#EF4444'
  };
  return colors[criticality] || '#6B7280';
}

export function formatRelativeTime(isoString) {
  if (!isoString) return 'N/A';
  
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  } catch (e) {
    return 'N/A';
  }
}

// Additional formatters for schedules - ADD THESE to your existing formatters.js

import { 
  formatFrequency, 
  getTaskTypeLabel, 
  getTaskTypeIcon,
  formatDueDate,
  getScheduleStatusClass 
} from './scheduleHelpers.js';

/**
 * Format schedule status badge
 * @param {string} status - Status value
 * @returns {string} HTML for status badge
 */
export function formatScheduleStatus(status) {
  const statusMap = {
    'upcoming': { label: 'Upcoming', class: 'status-badge status-upcoming' },
    'due': { label: 'Due Soon', class: 'status-badge status-due' },
    'overdue': { label: 'Overdue', class: 'status-badge status-overdue' },
    'completed_pending_next': { label: 'Completed', class: 'status-badge status-completed' }
  };
  
  const statusInfo = statusMap[status] || { label: status, class: 'status-badge' };
  return `<span class="${statusInfo.class}">${statusInfo.label}</span>`;
}

/**
 * Format next due date with context
 * @param {string} dateString - ISO date string
 * @param {string} status - Schedule status
 * @returns {string} Formatted date with context
 */
export function formatNextDueDate(dateString, status) {
  if (!dateString) return 'Not scheduled';
  return formatDueDate(dateString, status);
}

/**
 * Format task type with icon
 * @param {string} taskType - Task type value
 * @returns {string} HTML with icon and label
 */
export function formatTaskType(taskType) {
  const icon = getTaskTypeIcon(taskType);
  const label = getTaskTypeLabel(taskType);
  return `<span class="task-type">${icon} ${label}</span>`;
}

/**
 * Format frequency for display
 * @param {string} frequency - Frequency value
 * @param {string} season - Season (optional)
 * @returns {string} Formatted frequency
 */
export function formatScheduleFrequency(frequency, season = null) {
  return formatFrequency(frequency, season);
}

/**
 * Format schedule badge for maintenance records
 * Shows that a record is from a schedule
 * @param {string} scheduleId - Schedule ID
 * @param {string} scheduleTitle - Schedule title
 * @returns {string} HTML for schedule badge
 */
export function formatScheduleBadge(scheduleId, scheduleTitle) {
  if (!scheduleId) return '';
  
  return `<span class="schedule-badge" data-schedule-id="${scheduleId}" title="${scheduleTitle}">
    📅 Scheduled
  </span>`;
}

/**
 * Format occurrence number
 * @param {number} occurrenceNumber - Occurrence number
 * @returns {string} Formatted occurrence
 */
export function formatOccurrence(occurrenceNumber) {
  if (!occurrenceNumber) return '';
  return `#${occurrenceNumber}`;
}