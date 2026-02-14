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
      vendor: 'all',
      date_range: 'all',
      start_date: '',
      end_date: '',
      no_receipt: 'all'
    };

    this.sorting = {
      column: 'cost_date',
      direction: 'desc'
    };
    
    this.subscribeToState();
    this.render();
  }

  subscribeToState() {
    stateManager.subscribe((state) => {
      if (state.categoryFilter && state.categoryFilter !== this.filters.category) {
        this.filters.category = state.categoryFilter;
        this.currentPage = 0;
        this.applyFilters();
        this.render();
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

  getUniqueVendors() {
    const vendors = new Set();
    this.data.forEach(cost => {
      if (cost.vendor && cost.vendor !== 'N/A') {
        vendors.add(cost.vendor);
      }
    });
    return Array.from(vendors).sort();
  }

  calculateDateRange(preset) {
    const today = new Date();
    const startDate = new Date();
    let endDate = new Date();

    switch (preset) {
      case 'last_30':
        startDate.setDate(today.getDate() - 30);
        break;
      case 'last_90':
        startDate.setDate(today.getDate() - 90);
        break;
      case 'this_year':
        startDate.setMonth(0, 1);
        break;
      case 'last_year':
        startDate.setFullYear(today.getFullYear() - 1, 0, 1);
        endDate.setFullYear(today.getFullYear() - 1, 11, 31);
        break;
      case 'custom':
        return { start: '', end: '' };
      default:
        return { start: '', end: '' };
    }

    return {
      start: startDate.toISOString().split('T')[0],
      end: endDate.toISOString().split('T')[0]
    };
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

    // no_receipt filter — treat missing field as false
    if (this.filters.no_receipt !== 'all') {
      const wantNoReceipt = this.filters.no_receipt === 'true';
      filtered = filtered.filter(cost => (cost.no_receipt === true) === wantNoReceipt);
    }

    if (this.filters.date_range !== 'all' && this.filters.date_range !== 'custom') {
      const range = this.calculateDateRange(this.filters.date_range);
      this.filters.start_date = range.start;
      this.filters.end_date = range.end;
    }

    if (this.filters.start_date || this.filters.end_date) {
      filtered = filtered.filter(cost => {
        const costDate = new Date(cost.cost_date);
        if (this.filters.start_date && this.filters.end_date) {
          return costDate >= new Date(this.filters.start_date) && costDate <= new Date(this.filters.end_date);
        } else if (this.filters.start_date) {
          return costDate >= new Date(this.filters.start_date);
        } else if (this.filters.end_date) {
          return costDate <= new Date(this.filters.end_date);
        }
        return true;
      });
    }

    this.filteredData = filtered;
    this.sortData();
  }

  sortData() {
    this.filteredData.sort((a, b) => {
      let aVal = a[this.sorting.column];
      let bVal = b[this.sorting.column];

      if (this.sorting.column === 'cost_date' || this.sorting.column === 'purchase_date') {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      }

      if (this.sorting.column === 'total_cost') {
        aVal = parseFloat(aVal) || 0;
        bVal = parseFloat(bVal) || 0;
      }

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
    const vendors = this.getUniqueVendors();
    
    const hasActiveFilters = 
      this.filters.search !== '' ||
      this.filters.cost_type !== 'all' ||
      this.filters.category !== 'all' ||
      this.filters.vendor !== 'all' ||
      this.filters.date_range !== 'all' ||
      this.filters.no_receipt !== 'all';

    this.container.innerHTML = `
      <div class="table-header">
        <div class="table-header-title">
          <h2>Cost Records</h2>
          <button class="btn-new-cost" id="btn-new-cost">+ New Cost Record</button>
        </div>
      </div>

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
        <select class="filter-select" id="vendor-filter">
          <option value="all">All Vendors</option>
          ${vendors.map(vendor => `
            <option value="${vendor}" ${this.filters.vendor === vendor ? 'selected' : ''}>${vendor}</option>
          `).join('')}
        </select>
        <select class="filter-select" id="date-range-filter">
          <option value="all">All Time</option>
          <option value="last_30" ${this.filters.date_range === 'last_30' ? 'selected' : ''}>Last 30 Days</option>
          <option value="last_90" ${this.filters.date_range === 'last_90' ? 'selected' : ''}>Last 90 Days</option>
          <option value="this_year" ${this.filters.date_range === 'this_year' ? 'selected' : ''}>This Year</option>
          <option value="last_year" ${this.filters.date_range === 'last_year' ? 'selected' : ''}>Last Year</option>
          <option value="custom" ${this.filters.date_range === 'custom' ? 'selected' : ''}>Custom Range</option>
        </select>
        <select class="filter-select" id="no-receipt-filter">
          <option value="all">All Receipts</option>
          <option value="true" ${this.filters.no_receipt === 'true' ? 'selected' : ''}>No Receipt</option>
          <option value="false" ${this.filters.no_receipt === 'false' ? 'selected' : ''}>Has Receipt</option>
        </select>
        ${this.filters.date_range === 'custom' ? `
          <input 
            type="date" 
            class="filter-input" 
            placeholder="Start Date"
            value="${this.filters.start_date}"
            id="start-date-input"
          />
          <input 
            type="date" 
            class="filter-input" 
            placeholder="End Date"
            value="${this.filters.end_date}"
            id="end-date-input"
          />
        ` : ''}
        <button 
          class="btn-clear-filters" 
          id="btn-clear-filters"
          ${!hasActiveFilters ? 'disabled' : ''}
        >
          Clear Filters
        </button>
      </div>

      <div class="table-count">
        ${this.filteredData.length} record${this.filteredData.length !== 1 ? 's' : ''}
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
      { key: 'total_cost', label: 'Amount', sortable: true },
      { key: 'receipt', label: 'Receipt', sortable: false }
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
      // Treat missing no_receipt as false
      const noReceipt = cost.no_receipt === true;
      const hasReceipt = !!cost.receipt_data?.image_id;

      const receiptCell = noReceipt
        ? `<span class="badge badge-warning">No Receipt</span>`
        : hasReceipt
          ? `<span class="badge badge-success">✓</span>`
          : `<span class="badge badge-muted">—</span>`;

      tableHTML += `
        <tr data-cost-id="${cost.cost_id}">
          <td><span class="cost-id">${cost.cost_id}</span></td>
          <td><strong>${cost.item_name || 'N/A'}</strong></td>
          <td><span class="cost-type-badge cost-type-${cost.cost_type}">${cost.cost_type.replace('_', ' ')}</span></td>
          <td><span class="category-badge">${cost.category}</span></td>
          <td><span class="cost-date">${formatDate(cost.cost_date)}</span></td>
          <td>${cost.vendor || 'N/A'}</td>
          <td><span class="cost-amount">${formatCurrency(cost.total_cost)}</span></td>
          <td>${receiptCell}</td>
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
      const noReceipt = cost.no_receipt === true;
      const hasReceipt = !!cost.receipt_data?.image_id;

      const receiptBadge = noReceipt
        ? `<span class="badge badge-warning">No Receipt</span>`
        : hasReceipt
          ? `<span class="badge badge-success">Receipt</span>`
          : '';

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
            ${receiptBadge ? `
            <div class="cost-card-detail">
              <span class="cost-card-label">Receipt</span>
              <span class="cost-card-value">${receiptBadge}</span>
            </div>` : ''}
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
          <button class="pagination-btn" id="first-page" ${this.currentPage === 0 ? 'disabled' : ''}>‹‹</button>
          <button class="pagination-btn" id="prev-page" ${this.currentPage === 0 ? 'disabled' : ''}>‹</button>
          <button class="pagination-btn" id="next-page" ${this.currentPage >= totalPages - 1 ? 'disabled' : ''}>›</button>
          <button class="pagination-btn" id="last-page" ${this.currentPage >= totalPages - 1 ? 'disabled' : ''}>››</button>
        </div>
      </div>
    `;
  }

  attachEventListeners() {
    const newCostBtn = this.container.querySelector('#btn-new-cost');
    if (newCostBtn) {
      newCostBtn.addEventListener('click', () => {
        window.location.href = '/new';
      });
    }

    const clearFiltersBtn = this.container.querySelector('#btn-clear-filters');
    if (clearFiltersBtn) {
      clearFiltersBtn.addEventListener('click', () => {
        this.filters = {
          search: '',
          cost_type: 'all',
          category: 'all',
          vendor: 'all',
          date_range: 'all',
          start_date: '',
          end_date: '',
          no_receipt: 'all'
        };
        this.currentPage = 0;
        this.applyFilters();
        this.render();
      });
    }

    const searchInput = this.container.querySelector('#search-input');
    if (searchInput) {
      searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.filters.search = e.target.value;
          this.currentPage = 0;
          this.applyFilters();
          this.render();
        }
      });
      searchInput.addEventListener('blur', (e) => {
        this.filters.search = e.target.value;
        this.currentPage = 0;
        this.applyFilters();
        this.render();
      });
    }

    const typeFilter = this.container.querySelector('#type-filter');
    if (typeFilter) {
      typeFilter.addEventListener('change', (e) => {
        this.filters.cost_type = e.target.value;
        this.currentPage = 0;
        this.applyFilters();
        this.render();
      });
    }

    const categoryFilter = this.container.querySelector('#category-filter');
    if (categoryFilter) {
      categoryFilter.addEventListener('change', (e) => {
        this.filters.category = e.target.value;
        this.currentPage = 0;
        this.applyFilters();
        this.render();
      });
    }

    const vendorFilter = this.container.querySelector('#vendor-filter');
    if (vendorFilter) {
      vendorFilter.addEventListener('change', (e) => {
        this.filters.vendor = e.target.value;
        this.currentPage = 0;
        this.applyFilters();
        this.render();
      });
    }

    const dateRangeFilter = this.container.querySelector('#date-range-filter');
    if (dateRangeFilter) {
      dateRangeFilter.addEventListener('change', (e) => {
        this.filters.date_range = e.target.value;
        this.currentPage = 0;
        if (e.target.value === 'custom') {
          this.render();
        } else {
          this.applyFilters();
          this.render();
        }
      });
    }

    const noReceiptFilter = this.container.querySelector('#no-receipt-filter');
    if (noReceiptFilter) {
      noReceiptFilter.addEventListener('change', (e) => {
        this.filters.no_receipt = e.target.value;
        this.currentPage = 0;
        this.applyFilters();
        this.render();
      });
    }

    const startDateInput = this.container.querySelector('#start-date-input');
    const endDateInput = this.container.querySelector('#end-date-input');
    
    if (startDateInput) {
      startDateInput.addEventListener('change', (e) => {
        this.filters.start_date = e.target.value;
        this.currentPage = 0;
        this.applyFilters();
        this.render();
      });
    }

    if (endDateInput) {
      endDateInput.addEventListener('change', (e) => {
        this.filters.end_date = e.target.value;
        this.currentPage = 0;
        this.applyFilters();
        this.render();
      });
    }

    const rows = this.container.querySelectorAll('tr[data-cost-id], .cost-card');
    rows.forEach(row => {
      row.addEventListener('click', () => {
        const costId = row.dataset.costId;
        if (this.onRowClick) this.onRowClick(costId);
      });
    });

    const headers = this.container.querySelectorAll('th.sortable');
    headers.forEach(header => {
      header.addEventListener('click', () => {
        const column = header.dataset.column;
        if (this.sorting.column === column) {
          this.sorting.direction = this.sorting.direction === 'asc' ? 'desc' : 'asc';
        } else {
          this.sorting.column = column;
          this.sorting.direction = 'desc';
        }
        this.applyFilters();
        this.render();
      });
    });

    const totalPages = Math.ceil(this.filteredData.length / this.pageSize);
    
    const firstBtn = this.container.querySelector('#first-page');
    const prevBtn = this.container.querySelector('#prev-page');
    const nextBtn = this.container.querySelector('#next-page');
    const lastBtn = this.container.querySelector('#last-page');

    if (firstBtn) firstBtn.addEventListener('click', () => { this.currentPage = 0; this.render(); });
    if (prevBtn) prevBtn.addEventListener('click', () => { this.currentPage = Math.max(0, this.currentPage - 1); this.render(); });
    if (nextBtn) nextBtn.addEventListener('click', () => { this.currentPage = Math.min(totalPages - 1, this.currentPage + 1); this.render(); });
    if (lastBtn) lastBtn.addEventListener('click', () => { this.currentPage = totalPages - 1; this.render(); });
  }
}