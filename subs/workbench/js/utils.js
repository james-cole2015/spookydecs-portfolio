// Workbench Utility Functions

// ============ DATE UTILITIES ============

export function getDaysUntilHalloween() {
  const today = new Date();
  const currentYear = today.getFullYear();
  const halloween = new Date(currentYear, 9, 1); // October 1st (month is 0-indexed)
  
  // If we're past October 1st this year, calculate for next year
  if (today > halloween) {
    halloween.setFullYear(currentYear + 1);
  }
  
  const diffTime = halloween - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
}

export function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
}

export function formatDateTime(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

export function getCurrentSeason() {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth(); // 0-indexed
  
  // Off-season is April (3) through September (8)
  if (month >= 3 && month <= 8) {
    return `off-season_${year}`;
  }
  
  // If we're in Jan-Mar, we're in last year's off-season planning
  if (month < 3) {
    return `off-season_${year}`;
  }
  
  // If we're in Oct-Dec, next year's off-season
  return `off-season_${year + 1}`;
}

// ============ FORMATTING UTILITIES ============

export function formatCurrency(amount) {
  if (amount === null || amount === undefined) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
}

export function getPriorityColor(priority) {
  const colors = {
    high: '#ef4444',
    medium: '#f59e0b',
    low: '#10b981'
  };
  return colors[priority] || '#6b7280';
}

export function getPriorityLabel(priority) {
  const labels = {
    high: 'High',
    medium: 'Medium',
    low: 'Low'
  };
  return labels[priority] || priority;
}

export function getStatusColor(status) {
  const colors = {
    todo: '#6b7280',
    in_progress: '#3b82f6',
    completed: '#10b981'
  };
  return colors[status] || '#6b7280';
}

export function getStatusLabel(status) {
  const labels = {
    todo: 'To Do',
    in_progress: 'In Progress',
    completed: 'Completed'
  };
  return labels[status] || status;
}

export function getRecordTypeLabel(recordType) {
  const labels = {
    repair: 'Repair',
    maintenance: 'Maintenance',
    idea_build: 'Build'
  };
  return labels[recordType] || recordType;
}

export function getSourceTypeLabel(sourceType) {
  const labels = {
    maintenance: 'Maintenance',
    idea: 'Idea'
  };
  return labels[sourceType] || sourceType;
}

// ============ VALIDATION UTILITIES ============

export function validateSeasonData(data) {
  const errors = [];
  
  if (!data.season_name || data.season_name.trim() === '') {
    errors.push('Season name is required');
  }
  
  if (!data.start_date) {
    errors.push('Start date is required');
  }
  
  if (!data.end_date) {
    errors.push('End date is required');
  }
  
  if (data.start_date && data.end_date) {
    const start = new Date(data.start_date);
    const end = new Date(data.end_date);
    if (end <= start) {
      errors.push('End date must be after start date');
    }
  }
  
  return errors;
}

// ============ DOM UTILITIES ============

export function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export function createElement(tag, className, innerHTML = '') {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (innerHTML) element.innerHTML = innerHTML;
  return element;
}

// ============ ARRAY UTILITIES ============

export function groupBy(array, key) {
  return array.reduce((result, item) => {
    const group = item[key];
    if (!result[group]) {
      result[group] = [];
    }
    result[group].push(item);
    return result;
  }, {});
}

export function sortByPriority(items) {
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  return [...items].sort((a, b) => {
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}
