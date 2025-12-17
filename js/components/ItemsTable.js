// ItemsTable Component
// Sortable table with click-to-navigate rows

import { TABLE_COLUMNS, getClassTypeIcon } from '../utils/item-config.js';
import { navigate } from '../router.js';

export class ItemsTable {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.items = [];
    this.currentTab = 'decorations';
    this.sortColumn = 'short_name';
    this.sortDirection = 'asc';
  }
  
  render(items, currentTab) {
    this.items = items;
    this.currentTab = currentTab;
    
    if (!this.container) {
      console.error('ItemsTable container not found');
      return;
    }
    
    this.container.innerHTML = '';
    
    // Show empty state if no items
    if (!items || items.length === 0) {
      this.renderEmptyState();
      return;
    }
    
    // Check if mobile view
    const isMobile = window.innerWidth < 768;
    
    if (isMobile) {
      this.renderMobileCards(items);
    } else {
      this.renderDesktopTable(items);
    }
  }
  
  renderDesktopTable(items) {
    // Sort items
    const sortedItems = this.sortItems([...items]);
    
    // Create table
    const table = document.createElement('table');
    table.className = 'items-table';
    
    // Header
    table.appendChild(this.renderHeader());
    
    // Body
    table.appendChild(this.renderBody(sortedItems));
    
    this.container.appendChild(table);
  }
  
  renderMobileCards(items) {
    const sortedItems = this.sortItems([...items]);
    
    const cardsContainer = document.createElement('div');
    cardsContainer.className = 'items-cards';
    
    sortedItems.forEach(item => {
      const card = document.createElement('div');
      card.className = 'item-card';
      card.dataset.itemId = item.id;
      
      card.addEventListener('click', () => {
        navigate(`/items/${item.id}`);
      });
      
      card.innerHTML = `
        <div class="card-header">
          <div class="card-name">${item.short_name || '-'}</div>
          <span class="status-badge status-${(item.status || 'active').toLowerCase()}">${item.status || 'Active'}</span>
        </div>
        <div class="card-body">
          <div class="card-field">
            <span class="card-label">Type:</span>
            <span class="card-value">${item.class_type || '-'}</span>
          </div>
          <div class="card-field">
            <span class="card-label">Season:</span>
            <span class="card-value">${item.season || '-'}</span>
          </div>
          ${item.repair_status?.needs_repair ? `
            <div class="card-field">
              <span class="card-label">Status:</span>
              <span class="card-value">⚠️ Needs Repair</span>
            </div>
          ` : ''}
        </div>
      `;
      
      cardsContainer.appendChild(card);
    });
    
    this.container.appendChild(cardsContainer);
  }
  
  renderHeader() {
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    const columns = TABLE_COLUMNS[this.currentTab] || TABLE_COLUMNS.decorations;
    
    columns.forEach(col => {
      const th = document.createElement('th');
      th.style.width = col.width;
      
      if (col.sortable) {
        th.className = 'sortable';
        th.innerHTML = `
          ${col.label}
          <span class="sort-indicator ${this.sortColumn === col.key ? 'active' : ''} ${this.sortDirection}">
            ${this.sortColumn === col.key ? (this.sortDirection === 'asc' ? '▲' : '▼') : '⇅'}
          </span>
        `;
        
        th.addEventListener('click', () => {
          this.handleSort(col.key);
        });
      } else {
        th.textContent = col.label;
      }
      
      headerRow.appendChild(th);
    });
    
    thead.appendChild(headerRow);
    return thead;
  }
  
  renderBody(items) {
    const tbody = document.createElement('tbody');
    
    items.forEach(item => {
      const row = document.createElement('tr');
      row.className = 'item-row';
      row.dataset.itemId = item.id;
      
      // Click to navigate
      row.addEventListener('click', () => {
        navigate(`/items/${item.id}`);
      });
      
      const columns = TABLE_COLUMNS[this.currentTab] || TABLE_COLUMNS.decorations;
      
      columns.forEach(col => {
        const td = document.createElement('td');
        
        switch (col.key) {
          case 'id':
            td.textContent = item.id || '-';
            td.className = 'item-id';
            break;
            
          case 'short_name':
            td.textContent = item.short_name || '-';
            td.className = 'item-name';
            break;
            
          case 'class_type':
            td.textContent = item.class_type || '-';
            break;
            
          case 'season':
            td.textContent = item.season || '-';
            td.className = `season-badge season-${(item.season || '').toLowerCase()}`;
            break;
            
          case 'status':
            td.textContent = item.status || 'Active';
            td.className = `status-badge status-${(item.status || 'active').toLowerCase()}`;
            break;
            
          case 'repair_status':
            td.innerHTML = this.renderRepairStatus(item);
            break;
            
          case 'storage':
            td.innerHTML = this.renderStorage(item);
            break;
            
          case 'color':
            td.textContent = item.color || '-';
            break;
            
          case 'length':
            td.textContent = item.length ? `${item.length} ft` : '-';
            break;
            
          default:
            td.textContent = item[col.key] || '-';
        }
        
        row.appendChild(td);
      });
      
      tbody.appendChild(row);
    });
    
    return tbody;
  }
  
  renderRepairStatus(item) {
    if (!item.repair_status) {
      return '<span class="repair-status operational">✓</span>';
    }
    
    if (item.repair_status.needs_repair) {
      const criticality = item.repair_status.criticality || 'Medium';
      return `<span class="repair-status needs-repair" title="${criticality} priority">⚠️</span>`;
    }
    
    return '<span class="repair-status operational">✓</span>';
  }
  
  renderStorage(item) {
    if (!item.packing_data || !item.packing_data.tote_location) {
      return '<span class="storage-none">-</span>';
    }
    
    const location = item.packing_data.tote_location;
    const toteId = item.packing_data.tote_id;
    
    return `<span class="storage-location" title="${toteId || 'Unknown tote'}">${location}</span>`;
  }
  
  renderEmptyState() {
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';
    emptyState.innerHTML = `
      <div class="empty-state-icon">🔍</div>
      <div class="empty-state-message">Oops. Try again.</div>
    `;
    this.container.appendChild(emptyState);
  }
  
  handleSort(columnKey) {
    if (this.sortColumn === columnKey) {
      // Toggle direction
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      // New column, default to ascending
      this.sortColumn = columnKey;
      this.sortDirection = 'asc';
    }
    
    // Re-render with new sort
    this.render(this.items, this.currentTab);
  }
  
  sortItems(items) {
    return items.sort((a, b) => {
      let aValue = a[this.sortColumn];
      let bValue = b[this.sortColumn];
      
      // Handle nested fields
      if (this.sortColumn === 'repair_status') {
        aValue = a.repair_status?.needs_repair ? 1 : 0;
        bValue = b.repair_status?.needs_repair ? 1 : 0;
      }
      
      // Handle null/undefined
      if (aValue == null) aValue = '';
      if (bValue == null) bValue = '';
      
      // Convert to lowercase for string comparison
      if (typeof aValue === 'string') aValue = aValue.toLowerCase();
      if (typeof bValue === 'string') bValue = bValue.toLowerCase();
      
      let comparison = 0;
      
      if (aValue < bValue) {
        comparison = -1;
      } else if (aValue > bValue) {
        comparison = 1;
      }
      
      return this.sortDirection === 'asc' ? comparison : -comparison;
    });
  }
  
  showLoading() {
    if (!this.container) return;
    
    this.container.innerHTML = `
      <div class="table-loading">
        <div class="spinner"></div>
        <div>Loading items...</div>
      </div>
    `;
  }
}
