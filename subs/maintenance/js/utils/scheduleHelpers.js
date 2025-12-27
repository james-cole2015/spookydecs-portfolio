// Schedule helper utilities for maintenance schedules

/**
 * Calculate next due date based on frequency and work window constraints
 * @param {string} frequency - 'annual', 'seasonal', 'quarterly', 'monthly', 'pre_season', 'post_season'
 * @param {Date} fromDate - Date to calculate from
 * @param {string} season - 'Halloween', 'Christmas', 'Shared' (optional)
 * @param {string} taskType - Type of task (determines if inspection or not)
 * @returns {Date} Next due date
 */
export function calculateNextDueDate(frequency, fromDate, season = null, taskType = 'maintenance') {
  const date = new Date(fromDate);
  const isInspection = taskType === 'inspection' || taskType === 'fabric_check' || taskType === 'electrical_check';
  
  let nextDate;
  
  switch (frequency) {
    case 'annual':
      nextDate = new Date(date);
      nextDate.setFullYear(date.getFullYear() + 1);
      break;
      
    case 'seasonal':
      nextDate = getSeasonalDueDate(season, date.getFullYear(), isInspection);
      if (nextDate < new Date()) {
        nextDate = getSeasonalDueDate(season, date.getFullYear() + 1, isInspection);
      }
      break;
      
    case 'quarterly':
      nextDate = new Date(date);
      nextDate.setMonth(date.getMonth() + 3);
      break;
      
    case 'monthly':
      nextDate = new Date(date);
      nextDate.setMonth(date.getMonth() + 1);
      break;
      
    case 'pre_season':
      nextDate = getSeasonalDueDate(season, date.getFullYear(), false);
      if (nextDate < new Date()) {
        nextDate = getSeasonalDueDate(season, date.getFullYear() + 1, false);
      }
      break;
      
    case 'post_season':
      nextDate = new Date(date.getFullYear(), 3, 1); // April 1
      if (nextDate < new Date()) {
        nextDate = new Date(date.getFullYear() + 1, 3, 1);
      }
      break;
      
    default:
      nextDate = new Date(date);
      nextDate.setFullYear(date.getFullYear() + 1);
  }
  
  // Ensure non-inspection work falls within April 1 - Sept 30 window
  if (!isInspection && frequency !== 'seasonal') {
    nextDate = adjustToWorkWindow(nextDate);
  }
  
  return nextDate;
}

/**
 * Get seasonal due date based on season and task type
 * @param {string} season - 'Halloween', 'Christmas', 'Shared'
 * @param {number} year - Year
 * @param {boolean} isInspection - Whether this is an inspection task
 * @returns {Date} Seasonal due date
 */
export function getSeasonalDueDate(season, year, isInspection) {
  switch (season) {
    case 'Halloween':
      if (isInspection) {
        // Inspections can happen during season (Oct-Nov)
        return new Date(year, 9, 15); // Oct 15 (month is 0-indexed)
      } else {
        // Repairs/Maintenance must be done before Oct 1
        return new Date(year, 7, 1); // Aug 1 - 2 months buffer
      }
      
    case 'Christmas':
      if (isInspection) {
        // Inspections during season (Nov-Jan)
        return new Date(year, 11, 15); // Dec 15
      } else {
        // Repairs/Maintenance before deployment (~Nov 15)
        return new Date(year, 4, 1); // May 1 - start of work window
      }
      
    case 'Shared':
      // Shared items - target start of work window
      return new Date(year, 3, 1); // April 1
      
    default:
      return new Date(year, 3, 1); // Default to April 1
  }
}

/**
 * Adjust date to fall within April 1 - Sept 30 work window
 * @param {Date} date - Date to adjust
 * @returns {Date} Adjusted date
 */
export function adjustToWorkWindow(date) {
  const year = date.getFullYear();
  const workStart = new Date(year, 3, 1); // April 1
  const workEnd = new Date(year, 8, 30); // Sept 30
  
  // If before work window, move to start of window
  if (date < workStart) {
    return workStart;
  }
  
  // If after work window, move to next year's window
  if (date > workEnd) {
    return new Date(year + 1, 3, 1);
  }
  
  // Already in window
  return date;
}

/**
 * Check if a date is within the maintenance work window (April 1 - Sept 30)
 * @param {Date|string} date - Date to check
 * @returns {boolean} True if in work window
 */
export function isInMaintenanceWindow(date) {
  const checkDate = new Date(date);
  const month = checkDate.getMonth();
  const day = checkDate.getDate();
  
  // April (3) through September (8)
  if (month >= 3 && month <= 8) {
    // Check Sept 30 boundary
    if (month === 8 && day > 30) {
      return false;
    }
    return true;
  }
  
  return false;
}

/**
 * Calculate days until a due date
 * @param {Date|string} dueDate - Due date
 * @returns {number} Days until due (negative if overdue)
 */
export function getDaysUntilDue(dueDate) {
  const due = new Date(dueDate);
  const now = new Date();
  const diffTime = due - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Get status based on due date
 * @param {Date|string} dueDate - Due date
 * @param {number} reminderDays - Days before due to show as 'due'
 * @returns {string} 'upcoming', 'due', or 'overdue'
 */
export function getStatusFromDueDate(dueDate, reminderDays = 7) {
  const daysUntil = getDaysUntilDue(dueDate);
  
  if (daysUntil < 0) {
    return 'overdue';
  } else if (daysUntil <= reminderDays) {
    return 'due';
  } else {
    return 'upcoming';
  }
}

/**
 * Format frequency with season for display
 * @param {string} frequency - Frequency value
 * @param {string} season - Season (optional)
 * @returns {string} Formatted frequency text
 */
export function formatFrequency(frequency, season = null) {
  const frequencyMap = {
    'annual': 'Annual',
    'seasonal': season ? `Seasonal (${season})` : 'Seasonal',
    'quarterly': 'Quarterly',
    'monthly': 'Monthly',
    'pre_season': season ? `Pre-Season (${season})` : 'Pre-Season',
    'post_season': 'Post-Season'
  };
  
  return frequencyMap[frequency] || frequency;
}

/**
 * Get label for task type
 * @param {string} taskType - Task type value
 * @returns {string} Human-readable label
 */
export function getTaskTypeLabel(taskType) {
  const labelMap = {
    'inspection': 'Inspection',
    'cleaning': 'Cleaning',
    'repaint': 'Repaint',
    'lubrication': 'Lubrication',
    'battery_replacement': 'Battery Replacement',
    'fabric_check': 'Fabric Check',
    'electrical_check': 'Electrical Check',
    'custom': 'Custom'
  };
  
  return labelMap[taskType] || taskType;
}

/**
 * Get icon/emoji for task type
 * @param {string} taskType - Task type value
 * @returns {string} Icon/emoji
 */
export function getTaskTypeIcon(taskType) {
  const iconMap = {
    'inspection': '🔍',
    'cleaning': '🧹',
    'repaint': '🎨',
    'lubrication': '🛢️',
    'battery_replacement': '🔋',
    'fabric_check': '🧵',
    'electrical_check': '⚡',
    'custom': '🔧'
  };
  
  return iconMap[taskType] || '📋';
}

/**
 * Validate schedule data
 * @param {Object} data - Schedule data to validate
 * @returns {Object} { valid: boolean, errors: string[] }
 */
export function validateScheduleData(data) {
  const errors = [];
  
  // Required fields for templates
  if (!data.class_type) errors.push('Class type is required');
  if (!data.task_type) errors.push('Task type is required');
  if (!data.short_name) errors.push('Short name is required');
  if (!data.title) errors.push('Title is required');
  if (!data.frequency) errors.push('Frequency is required');
  
  // Conditional requirements
  if (data.frequency === 'seasonal' && !data.season) {
    errors.push('Season is required for seasonal frequency');
  }
  
  if (data.frequency === 'pre_season' && !data.season) {
    errors.push('Season is required for pre-season frequency');
  }
  
  // Numeric validations
  if (data.estimated_cost && data.estimated_cost < 0) {
    errors.push('Estimated cost cannot be negative');
  }
  
  if (data.estimated_duration_minutes && data.estimated_duration_minutes < 0) {
    errors.push('Estimated duration cannot be negative');
  }
  
  if (data.days_before_reminder && data.days_before_reminder < 0) {
    errors.push('Days before reminder cannot be negative');
  }
  
  // Short name validation
  if (data.short_name && !/^[A-Z0-9_]+$/.test(data.short_name)) {
    errors.push('Short name must contain only uppercase letters, numbers, and underscores');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Get task type options for dropdown
 * @returns {Array} Array of {value, label} objects
 */
export function getTaskTypeOptions() {
  return [
    { value: 'inspection', label: 'Inspection' },
    { value: 'cleaning', label: 'Cleaning' },
    { value: 'repaint', label: 'Repaint' },
    { value: 'lubrication', label: 'Lubrication' },
    { value: 'battery_replacement', label: 'Battery Replacement' },
    { value: 'fabric_check', label: 'Fabric Check' },
    { value: 'electrical_check', label: 'Electrical Check' },
    { value: 'custom', label: 'Custom' }
  ];
}

/**
 * Get frequency options for dropdown
 * @returns {Array} Array of {value, label} objects
 */
export function getFrequencyOptions() {
  return [
    { value: 'annual', label: 'Annual' },
    { value: 'seasonal', label: 'Seasonal' },
    { value: 'quarterly', label: 'Quarterly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'pre_season', label: 'Pre-Season' },
    { value: 'post_season', label: 'Post-Season' }
  ];
}

/**
 * Get season options for dropdown
 * @returns {Array} Array of {value, label} objects
 */
export function getSeasonOptions() {
  return [
    { value: 'Halloween', label: 'Halloween' },
    { value: 'Christmas', label: 'Christmas' },
    { value: 'Shared', label: 'Shared' }
  ];
}

/**
 * Format due date with status context
 * @param {Date|string} dueDate - Due date
 * @param {string} status - Status ('upcoming', 'due', 'overdue')
 * @returns {string} Formatted date string
 */
export function formatDueDate(dueDate, status) {
  const date = new Date(dueDate);
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  const formatted = date.toLocaleDateString('en-US', options);
  
  const daysUntil = getDaysUntilDue(dueDate);
  
  if (status === 'overdue') {
    return `${formatted} (${Math.abs(daysUntil)} days overdue)`;
  } else if (status === 'due') {
    return `${formatted} (${daysUntil} days)`;
  } else {
    return formatted;
  }
}

/**
 * Get schedule status badge class
 * @param {string} status - Status value
 * @returns {string} CSS class name
 */
export function getScheduleStatusClass(status) {
  const classMap = {
    'upcoming': 'status-upcoming',
    'due': 'status-due',
    'overdue': 'status-overdue',
    'completed_pending_next': 'status-completed'
  };
  
  return classMap[status] || 'status-default';
}