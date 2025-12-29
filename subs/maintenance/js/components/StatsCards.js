// Reusable stats card components

import { formatCurrency, formatDate } from '../utils/formatters.js';

export class StatsCards {
  static render(stats) {
    const cards = stats.map(stat => this.createCard(stat)).join('');
    
    return `
      <div class="stats-grid">
        ${cards}
      </div>
    `;
  }
  
  static createCard(stat) {
    const { label, value, icon, color, subtitle } = stat;
    
    return `
      <div class="stat-card stat-card-compact" style="border-left: 4px solid ${color || '#6B7280'}">
        <div class="stat-header-compact">
          <span class="stat-icon">${icon || '📊'}</span>
          <span class="stat-separator">-</span>
          <span class="stat-label">${label}</span>
        </div>
        <div class="stat-value-compact">${value}</div>
        ${subtitle ? `<div class="stat-subtitle">${subtitle}</div>` : ''}
      </div>
    `;
  }
  
  static renderRecordStats(record) {
    const stats = [
      {
        label: 'Status',
        value: record.status.replace('_', ' ').toUpperCase(),
        icon: '📋',
        color: this.getStatusColor(record.status)
      },
      {
        label: 'Type',
        value: record.record_type.charAt(0).toUpperCase() + record.record_type.slice(1),
        icon: '🔧',
        color: '#3B82F6'
      },
      {
        label: 'Criticality',
        value: (record.criticality || 'None').charAt(0).toUpperCase() + (record.criticality || 'None').slice(1),
        icon: '⚠️',
        color: this.getCriticalityColor(record.criticality)
      },
      {
        label: 'Total Cost',
        value: formatCurrency(record.total_cost || 0),
        icon: '💰',
        color: '#10B981'
      },
      {
        label: 'Created',
        value: formatDate(record.created_at),
        icon: '📅',
        color: '#6B7280',
        subtitle: `Updated ${formatDate(record.updated_at)}`
      }
    ];
    
    return this.render(stats);
  }
  
  static renderItemStats(records) {
    const totalRecords = records.length;
    const activeRepairs = records.filter(r => 
      r.record_type === 'repair' && r.status !== 'completed' && r.status !== 'cancelled'
    ).length;
    
    const totalCost = records.reduce((sum, r) => sum + (r.total_cost || 0), 0);
    
    const sortedRecords = [...records].sort((a, b) => 
      new Date(b.date_performed || b.created_at) - new Date(a.date_performed || a.created_at)
    );
    
    const lastMaintenance = sortedRecords.find(r => r.record_type === 'maintenance');
    
    const stats = [
      {
        label: 'Total Records',
        value: totalRecords,
        icon: '📊',
        color: '#3B82F6'
      },
      {
        label: 'Active Repairs',
        value: activeRepairs,
        icon: '🔧',
        color: activeRepairs > 0 ? '#EF4444' : '#10B981'
      },
      {
        label: 'Total Cost',
        value: formatCurrency(totalCost),
        icon: '💰',
        color: '#10B981'
      },
      {
        label: 'Last Maintenance',
        value: lastMaintenance ? formatDate(lastMaintenance.date_performed || lastMaintenance.created_at) : 'Never',
        icon: '📅',
        color: '#6B7280'
      }
    ];
    
    return this.render(stats);
  }
  
  static getStatusColor(status) {
    const colors = {
      'scheduled': '#3B82F6',
      'in_progress': '#F59E0B',
      'completed': '#10B981',
      'cancelled': '#EF4444'
    };
    return colors[status] || '#6B7280';
  }
  
  static getCriticalityColor(criticality) {
    const colors = {
      'high': '#EF4444',
      'medium': '#F59E0B',
      'low': '#10B981',
      'none': '#6B7280'
    };
    return colors[criticality?.toLowerCase()] || '#6B7280';
  }
}