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