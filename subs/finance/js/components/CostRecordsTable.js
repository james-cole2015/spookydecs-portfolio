// Cost Records Table Component - Plain Vanilla JS (No TanStack Table)

import { formatCurrency, formatDate } from '../utils/finance-config.js';
import { stateManager } from '../utils/state.js';

export class CostRecordsTable {
  constructor(containerId, data = [], onRowClick) {
    this.container = document.getElementById(containerId);
    this.data = data;
    this.onRowClick = onRowClick;
    this.filteredData = [...data];
    this.pageSize = 20;
    this.currentPage = 0;
    
    this.filters = {
      search: '',
      cost_type: 'all',
      category: 'all',
      vendor: 'all'
    };

    this.sorting = {
      column: 'cost_date',
      direction: 'desc'
    };
    
    // Subscribe to state changes
    this.subscribeToState();
    
    this.render();
  }

  subscribeToState() {
    stateManager.subscribe((state) => {
      // If category filter is set from stats panel
      if (state.categoryFilter && state.categoryFilter !== this.filters.category) {
        this.filters.category = state.categoryFilter;
        this.currentPage = 0;
        this.applyFilters();
        this.render();
        
        // Clear the category filter from state after applying
        // so it doesn't persist on tab switches
        setTimeout(() => {
          stateManager.setState({ categoryFilter: null });
        }, 100);
      }
    });
  }

  updateData(data) {
    this.data = data;
    this.applyFilters();
    this.render();
  }

  applyFilters() {
    let filtered = [...this.data];

    if (this.filters.search) {
      const searchLower = this.filters.search.toLowerCase();
      filtered = filtered.filter(cost =>
        cost.item_name?.toLowerCase().includes(searchLower) ||
        cost.cost_id?.toLowerCase().includes(searchLower) ||
        cost.vendor?.toLowerCase().includes(searchLower)
      );
    }

    if (this.filters.cost_type !== 'all') {
      filtered = filtered.filter(cost => cost.cost_type === this.filters.cost_type);
    }

    if (this.filters.category !== 'all') {
      filtered = filtered.filter(cost => cost.category === this.filters.category);
    }

    if (this.filters.vendor !== 'all') {
      filtered = filtered.filter(cost => cost.vendor === this.filters.vendor);
    }

    this.filteredData = filtered;
    this.sortData();
  }

  sortData() {
    this.filteredData.sort((a, b) => {
      let aVal = a[this.sorting.column];
      let bVal = b[this.sorting.column];

      // Handle dates
      if (this.sorting.column === 'cost_date' || this.sorting.column === 'purchase_date') {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      }

      // Handle numbers
      if (this.sorting.column === 'total_cost') {
        aVal = parseFloat(aVal) || 0;
        bVal = parseFloat(bVal) || 0;
      }

      // Handle strings
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal?.toLowerCase() || '';
      }

      if (this.sorting.direction === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
    });
  }

  render() {
    const isMobile = window.innerWidth < 768;
    const totalPages = Math.ceil(this.filteredData.length / this.pageSize);
    const startIdx = this.currentPage * this.pageSize;
    const endIdx = startIdx + this.pageSize;
    const pageData = this.filteredData.slice(startIdx, endIdx);

    this.container.innerHTML = `
      <div class="table-header">
        <div class="table-header-title">
          <h2>Cost Records (${this.filteredData.length})</h2>
          <button class="btn-inline-add" id="btn-new-cost" title="Add New Cost Record">
            <span class="plus-icon">+</span>
          </button>
        </div>
        <div class="table-actions">
          <div class="table-filters">
            <input 
              type="text" 
              class="filter-input" 
              placeholder="Search..." 
              value="${this.filters.search}"
              id="search-input"
            />
            <select class="filter-select" id="type-filter">
              <option value="all">All Types</option>
              <option value="acquisition" ${this.filters.cost_type === 'acquisition' ? 'selected' : ''}>Acquisition</option>
              <option value="repair" ${this.filters.cost_type === 'repair' ? 'selected' : ''}>Repair</option>
              <option value="maintenance" ${this.filters.cost_type === 'maintenance' ? 'selected' : ''}>Maintenance</option>
              <option value="supply_purchase" ${this.filters.cost_type === 'supply_purchase' ? 'selected' : ''}>Supply Purchase</option>
              <option value="utility" ${this.filters.cost_type === 'utility' ? 'selected' : ''}>Utility</option>
              <option value="other" ${this.filters.cost_type === 'other' ? 'selected' : ''}>Other</option>
            </select>
            <select class="filter-select" id="category-filter">
              <option value="all">All Categories</option>
              <option value="materials" ${this.filters.category === 'materials' ? 'selected' : ''}>Materials</option>
              <option value="labor" ${this.filters.category === 'labor' ? 'selected' : ''}>Labor</option>
              <option value="parts" ${this.filters.category === 'parts' ? 'selected' : ''}>Parts</option>
              <option value="supplies" ${this.filters.category === 'supplies' ? 'selected' : ''}>Supplies</option>
              <option value="decoration" ${this.filters.category === 'decoration' ? 'selected' : ''}>Decoration</option>
              <option value="light" ${this.filters.category === 'light' ? 'selected' : ''}>Light</option>
              <option value="accessory" ${this.filters.category === 'accessory' ? 'selected' : ''}>Accessory</option>
            </select>
          </div>
        </div>
      </div>

      ${isMobile ? this.renderMobileCards(pageData) : this.renderTable(pageData)}
      
      ${this.renderPagination(totalPages)}
    `;

    this.attachEventListeners();
  }

  renderTable(pageData) {
    if (pageData.length === 0) {
      return '<div class="empty-state"><p>No cost records found</p></div>';
    }

    const getSortIcon = (column) => {
      if (this.sorting.column !== column) return '';
      return this.sorting.direction === 'asc' ? '↑' : '↓';
    };

    let tableHTML = '<table class="cost-table"><thead><tr>';
    
    const columns = [
      { key: 'cost_id', label: 'Cost ID', sortable: true },
      { key: 'item_name', label: 'Item Name', sortable: true },
      { key: 'cost_type', label: 'Type', sortable: true },
      { key: 'category', label: 'Category', sortable: true },
      { key: 'cost_date', label: 'Date', sortable: true },
      { key: 'vendor', label: 'Vendor', sortable: true },
      { key: 'total_cost', label: 'Amount', sortable: true }
    ];

    columns.forEach(col => {
      tableHTML += `
        <th class="${col.sortable ? 'sortable' : ''}" data-column="${col.key}">
          ${col.label}
          ${col.sortable ? `<span class="sort-icon">${getSortIcon(col.key)}</span>` : ''}
        </th>
      `;
    });

    tableHTML += '</tr></thead><tbody>';

    pageData.forEach(cost => {
      tableHTML += `
        <tr data-cost-id="${cost.cost_id}">
          <td><span class="cost-id">${cost.cost_id}</span></td>
          <td><strong>${cost.item_name || 'N/A'}</strong></td>
          <td><span class="cost-type-badge cost-type-${cost.cost_type}">${cost.cost_type.replace('_', ' ')}</span></td>
          <td><span class="category-badge">${cost.category}</span></td>
          <td><span class="cost-date">${formatDate(cost.cost_date)}</span></td>
          <td>${cost.vendor || 'N/A'}</td>
          <td><span class="cost-amount">${formatCurrency(cost.total_cost)}</span></td>
        </tr>
      `;
    });

    tableHTML += '</tbody></table>';
    return tableHTML;
  }

  renderMobileCards(pageData) {
    if (pageData.length === 0) {
      return '<div class="empty-state"><p>No cost records found</p></div>';
    }

    let cardsHTML = '<div class="cost-cards">';
    
    pageData.forEach(cost => {
      cardsHTML += `
        <div class="cost-card" data-cost-id="${cost.cost_id}">
          <div class="cost-card-header">
            <div>
              <div class="cost-card-title">${cost.item_name || 'N/A'}</div>
              <div class="cost-card-id">${cost.cost_id}</div>
            </div>
            <div class="cost-card-amount">${formatCurrency(cost.total_cost)}</div>
          </div>
          <div class="cost-card-details">
            <div class="cost-card-detail">
              <span class="cost-card-label">Type</span>
              <span class="cost-card-value">${cost.cost_type.replace('_', ' ')}</span>
            </div>
            <div class="cost-card-detail">
              <span class="cost-card-label">Category</span>
              <span class="cost-card-value">${cost.category}</span>
            </div>
            <div class="cost-card-detail">
              <span class="cost-card-label">Vendor</span>
              <span class="cost-card-value">${cost.vendor || 'N/A'}</span>
            </div>
            <div class="cost-card-detail">
              <span class="cost-card-label">Date</span>
              <span class="cost-card-value">${formatDate(cost.cost_date)}</span>
            </div>
          </div>
        </div>
      `;
    });

    cardsHTML += '</div>';
    return cardsHTML;
  }

  renderPagination(totalPages) {
    if (totalPages <= 1) return '';

    return `
      <div class="table-pagination">
        <div class="pagination-info">
          Page ${this.currentPage + 1} of ${totalPages}
        </div>
        <div class="pagination-controls">
          <button class="pagination-btn" id="first-page" ${this.currentPage === 0 ? 'disabled' : ''}>
            ‹‹
          </button>
          <button class="pagination-btn" id="prev-page" ${this.currentPage === 0 ? 'disabled' : ''}>
            ‹
          </button>
          <button class="pagination-btn" id="next-page" ${this.currentPage >= totalPages - 1 ? 'disabled' : ''}>
            ›
          </button>
          <button class="pagination-btn" id="last-page" ${this.currentPage >= totalPages - 1 ? 'disabled' : ''}>
            ››
          </button>
        </div>
      </div>
    `;
  }

  attachEventListeners() {
    // New Cost Record button (inline +)
    const newCostBtn = this.container.querySelector('#btn-new-cost');
    if (newCostBtn) {
      newCostBtn.addEventListener('click', () => {
        window.location.href = '/new';
      });
    }

    // Search input
    const searchInput = this.container.querySelector('#search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.filters.search = e.target.value;
        this.currentPage = 0;
        this.applyFilters();
        this.render();
      });
    }

    // Type filter
    const typeFilter = this.container.querySelector('#type-filter');
    if (typeFilter) {
      typeFilter.addEventListener('change', (e) => {
        this.filters.cost_type = e.target.value;
        this.currentPage = 0;
        this.applyFilters();
        this.render();
      });
    }

    // Category filter
    const categoryFilter = this.container.querySelector('#category-filter');
    if (categoryFilter) {
      categoryFilter.addEventListener('change', (e) => {
        this.filters.category = e.target.value;
        this.currentPage = 0;
        this.applyFilters();
        this.render();
      });
    }

    // Row click
    const rows = this.container.querySelectorAll('tr[data-cost-id], .cost-card');
    rows.forEach(row => {
      row.addEventListener('click', () => {
        const costId = row.dataset.costId;
        if (this.onRowClick) this.onRowClick(costId);
      });
    });

    // Column sorting
    const headers = this.container.querySelectorAll('th.sortable');
    headers.forEach(header => {
      header.addEventListener('click', () => {
        const column = header.dataset.column;
        
        if (this.sorting.column === column) {
          // Toggle direction
          this.sorting.direction = this.sorting.direction === 'asc' ? 'desc' : 'asc';
        } else {
          // New column
          this.sorting.column = column;
          this.sorting.direction = 'desc';
        }
        
        this.applyFilters();
        this.render();
      });
    });

    // Pagination
    const totalPages = Math.ceil(this.filteredData.length / this.pageSize);
    
    const firstBtn = this.container.querySelector('#first-page');
    const prevBtn = this.container.querySelector('#prev-page');
    const nextBtn = this.container.querySelector('#next-page');
    const lastBtn = this.container.querySelector('#last-page');

    if (firstBtn) firstBtn.addEventListener('click', () => {
      this.currentPage = 0;
      this.render();
    });

    if (prevBtn) prevBtn.addEventListener('click', () => {
      this.currentPage = Math.max(0, this.currentPage - 1);
      this.render();
    });

    if (nextBtn) nextBtn.addEventListener('click', () => {
      this.currentPage = Math.min(totalPages - 1, this.currentPage + 1);
      this.render();
    });

    if (lastBtn) lastBtn.addEventListener('click', () => {
      this.currentPage = totalPages - 1;
      this.render();
    });
  }
}