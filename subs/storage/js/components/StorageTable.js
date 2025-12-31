/**
 * StorageTable Component
 * Desktop table view for storage units
 */

import STORAGE_CONFIG, { getPackedLabel, getPlaceholderImage } from '../utils/storage-config.js';
import { navigate } from '../utils/router.js';

export class StorageTable {
  constructor(options = {}) {
    this.data = options.data || [];
    this.onDelete = options.onDelete || (() => {});
    this.sortBy = options.sortBy || 'short_name';
    this.sortOrder = options.sortOrder || 'asc';
    this.container = null;
  }

  /**
   * Render the table
   */
  render(containerElement) {
    this.container = containerElement;
    
    if (this.data.length === 0) {
      this.renderEmpty();
      return;
    }
    
    const tableWrapper = document.createElement('div');
    tableWrapper.className = 'table-wrapper';
    
    const table = document.createElement('table');
    table.className = 'storage-table';
    
    // Table header
    table.appendChild(this.createHeader());
    
    // Table body
    const tbody = document.createElement('tbody');
    this.data.forEach(unit => {
      tbody.appendChild(this.createRow(unit));
    });
    table.appendChild(tbody);
    
    tableWrapper.appendChild(table);
    
    this.container.innerHTML = '';
    this.container.appendChild(tableWrapper);
  }

  /**
   * Create table header
   */
  createHeader() {
    const thead = document.createElement('thead');
    const tr = document.createElement('tr');
    
    // Filter out the Actions column
    const columns = STORAGE_CONFIG.TABLE_COLUMNS.filter(col => col.key !== 'actions');
    
    columns.forEach(column => {
      const th = document.createElement('th');
      th.textContent = column.label;
      th.style.width = column.width;
      
      if (column.sortable) {
        th.classList.add('sortable');
        th.addEventListener('click', () => this.handleSort(column.key));
        
        if (this.sortBy === column.key) {
          th.classList.add('sorted');
          const arrow = this.sortOrder === 'asc' ? '▲' : '▼';
          th.innerHTML = `${column.label} <span class="sort-arrow">${arrow}</span>`;
        }
      }
      
      tr.appendChild(th);
    });
    
    // Add delete column header (narrow)
    const thDelete = document.createElement('th');
    thDelete.style.width = '50px';
    tr.appendChild(thDelete);
    
    thead.appendChild(tr);
    return thead;
  }

  /**
   * Create table row
   */
  createRow(unit) {
    const tr = document.createElement('tr');
    tr.className = 'storage-row';
    tr.dataset.id = unit.id;
    
    // ID column
    const tdId = document.createElement('td');
    tdId.className = 'storage-id';
    tdId.innerHTML = `<code>${unit.id}</code>`;
    tr.appendChild(tdId);
    
    // Photo column
    const tdPhoto = document.createElement('td');
    tdPhoto.className = 'storage-photo';
    const photoUrl = unit.images?.photo_url || getPlaceholderImage();
    tdPhoto.innerHTML = `<img src="${photoUrl}" alt="${unit.short_name}" class="storage-thumb">`;
    tr.appendChild(tdPhoto);
    
    // Short name column
    const tdName = document.createElement('td');
    tdName.className = 'storage-name';
    tdName.innerHTML = `<strong>${unit.short_name}</strong>`;
    tr.appendChild(tdName);
    
    // Type column
    const tdType = document.createElement('td');
    tdType.className = 'storage-type';
    tdType.textContent = unit.class_type || 'Tote';
    tr.appendChild(tdType);
    
    // Season column
    const tdSeason = document.createElement('td');
    tdSeason.className = 'storage-season';
    const season = unit.season || unit.category || 'Unknown';
    tdSeason.innerHTML = `<span class="badge badge-${season.toLowerCase()}">${season}</span>`;
    tr.appendChild(tdSeason);
    
    // Location column
    const tdLocation = document.createElement('td');
    tdLocation.className = 'storage-location';
    tdLocation.textContent = unit.location || '-';
    tr.appendChild(tdLocation);
    
    // Size column
    const tdSize = document.createElement('td');
    tdSize.className = 'storage-size';
    tdSize.textContent = unit.size || '-';
    tr.appendChild(tdSize);
    
    // Contents count column
    const tdContents = document.createElement('td');
    tdContents.className = 'storage-contents';
    tdContents.textContent = unit.contents_count || 0;
    tr.appendChild(tdContents);
    
    // Packed status column (increased width for single line)
    const tdPacked = document.createElement('td');
    tdPacked.className = 'storage-packed';
    tdPacked.style.width = '120px';
    tdPacked.innerHTML = `<span class="packed-badge ${unit.packed ? 'packed' : 'unpacked'}">${getPackedLabel(unit.packed)}</span>`;
    tr.appendChild(tdPacked);
    
    // Delete icon column
    const tdDelete = document.createElement('td');
    tdDelete.className = 'storage-delete';
    tdDelete.innerHTML = `<button class="btn-delete-icon" title="Delete">🗑️</button>`;
    tr.appendChild(tdDelete);
    
    // Attach event listeners
    this.attachRowListeners(tr, unit);
    
    return tr;
  }

  /**
   * Attach event listeners to row
   */
  attachRowListeners(row, unit) {
    // Make entire row clickable to view details
    row.addEventListener('click', (e) => {
      // Don't navigate if clicking delete button
      if (e.target.closest('.btn-delete-icon')) {
        return;
      }
      navigate(`/storage/${unit.id}`);
    });
    
    // Delete button
    const deleteBtn = row.querySelector('.btn-delete-icon');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.onDelete(unit);
      });
    }
  }

  /**
   * Handle column sort
   */
  handleSort(columnKey) {
    if (this.sortBy === columnKey) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = columnKey;
      this.sortOrder = 'asc';
    }
    
    this.sortData();
    this.render(this.container);
  }

  /**
   * Sort data
   */
  sortData() {
    this.data.sort((a, b) => {
      let aVal = a[this.sortBy];
      let bVal = b[this.sortBy];
      
      // Handle null/undefined
      if (aVal == null) aVal = '';
      if (bVal == null) bVal = '';
      
      // Convert to string for comparison
      aVal = String(aVal).toLowerCase();
      bVal = String(bVal).toLowerCase();
      
      if (aVal < bVal) return this.sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return this.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }

  /**
   * Render empty state
   */
  renderEmpty() {
    this.container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📦</div>
        <h3>No Storage Units Found</h3>
        <p>No storage units match your filters.</p>
        <button class="btn btn-primary" onclick="window.location.href='/storage/create'">
          Create Storage Unit
        </button>
      </div>
    `;
  }

  /**
   * Update data and re-render
   */
  updateData(data) {
    this.data = data;
    this.sortData();
    this.render(this.container);
  }
}

export default StorageTable;