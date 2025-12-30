// Cost Records Table Component using TanStack Table

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

    this.sorting = [{ id: 'cost_date', desc: true }];
    this.table = null;
    
    this.render();
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
  }

  render() {
    // Check if TanStack Table is loaded
    if (!window.TableCore) {
      console.error('TanStack Table (TableCore) not loaded');
      this.container.innerHTML = '<div class="empty-state"><p>Error: Table library not loaded.</p></div>';
      return;
    }

    const { 
      getCoreRowModel,
      getSortedRowModel,
      getPaginationRowModel
    } = window.TableCore;

    // Define columns with proper structure
    const columns = [
      {
        id: 'cost_id',
        accessorKey: 'cost_id',
        header: 'Cost ID',
        size: 130
      },
      {
        id: 'item_name',
        accessorKey: 'item_name',
        header: 'Item Name',
        size: 200
      },
      {
        id: 'cost_type',
        accessorKey: 'cost_type',
        header: 'Type',
        size: 140
      },
      {
        id: 'category',
        accessorKey: 'category',
        header: 'Category',
        size: 120
      },
      {
        id: 'cost_date',
        accessorKey: 'cost_date',
        header: 'Date',
        size: 110
      },
      {
        id: 'vendor',
        accessorKey: 'vendor',
        header: 'Vendor',
        size: 140
      },
      {
        id: 'total_cost',
        accessorKey: 'total_cost',
        header: 'Amount',
        size: 100
      }
    ];

    // Create table instance
    const tableOptions = {
      data: this.filteredData,
      columns: columns,
      getCoreRowModel: getCoreRowModel(),
      getSortedRowModel: getSortedRowModel(),
      getPaginationRowModel: getPaginationRowModel(),
      state: {
        sorting: this.sorting,
        pagination: {
          pageIndex: this.currentPage,
          pageSize: this.pageSize
        }
      },
      onSortingChange: updater => {
        this.sorting = typeof updater === 'function' ? updater(this.sorting) : updater;
        this.render();
      }
    };

    this.table = window.TableCore.createTable(tableOptions);

    this.renderHTML();
  }

  renderHTML() {
    const isMobile = window.innerWidth < 768;

    this.container.innerHTML = `
      <div class="table-header">
        <h2>Cost Records (${this.filteredData.length})</h2>
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
            <option value="acquisition">Acquisition</option>
            <option value="repair">Repair</option>
            <option value="maintenance">Maintenance</option>
            <option value="supply_purchase">Supply Purchase</option>
            <option value="utility">Utility</option>
            <option value="other">Other</option>
          </select>
          <select class="filter-select" id="category-filter">
            <option value="all">All Categories</option>
            <option value="materials">Materials</option>
            <option value="labor">Labor</option>
            <option value="parts">Parts</option>
            <option value="supplies">Supplies</option>
            <option value="decoration">Decoration</option>
            <option value="light">Light</option>
            <option value="accessory">Accessory</option>
          </select>
        </div>
      </div>

      ${isMobile ? this.renderMobileCards() : this.renderTable()}
      
      ${this.renderPagination()}
    `;

    this.attachEventListeners();
  }

  renderTable() {
    const headers = this.table.getHeaderGroups();
    const rows = this.table.getRowModel().rows;

    let tableHTML = '<table class="cost-table"><thead>';
    
    headers.forEach(headerGroup => {
      tableHTML += '<tr>';
      headerGroup.headers.forEach(header => {
        const canSort = header.column.getCanSort();
        const sortDir = header.column.getIsSorted();
        const sortIcon = sortDir === 'asc' ? '↑' : sortDir === 'desc' ? '↓' : '';
        
        tableHTML += `
          <th class="${canSort ? 'sortable' : ''}" data-column="${header.id}" style="width: ${header.getSize()}px">
            ${header.column.columnDef.header}
            ${canSort ? `<span class="sort-icon">${sortIcon}</span>` : ''}
          </th>
        `;
      });
      tableHTML += '</tr>';
    });
    
    tableHTML += '</thead><tbody>';

    if (rows.length === 0) {
      tableHTML += `
        <tr>
          <td colspan="7" style="text-align: center; padding: 40px; color: #64748b;">
            No cost records found
          </td>
        </tr>
      `;
    } else {
      rows.forEach(row => {
        const cost = row.original;
        tableHTML += `<tr data-cost-id="${cost.cost_id}">`;
        
        // Manually format each cell
        tableHTML += `<td><span class="cost-id">${cost.cost_id}</span></td>`;
        tableHTML += `<td><strong>${cost.item_name || 'N/A'}</strong></td>`;
        tableHTML += `<td><span class="cost-type-badge cost-type-${cost.cost_type}">${cost.cost_type.replace('_', ' ')}</span></td>`;
        tableHTML += `<td><span class="category-badge">${cost.category}</span></td>`;
        tableHTML += `<td><span class="cost-date">${formatDate(cost.cost_date)}</span></td>`;
        tableHTML += `<td>${cost.vendor || 'N/A'}</td>`;
        tableHTML += `<td><span class="cost-amount">${formatCurrency(cost.total_cost)}</span></td>`;
        
        tableHTML += '</tr>';
      });
    }

    tableHTML += '</tbody></table>';
    return tableHTML;
  }

  renderMobileCards() {
    const rows = this.table.getRowModel().rows;

    if (rows.length === 0) {
      return '<div class="empty-state"><p>No cost records found</p></div>';
    }

    let cardsHTML = '<div class="cost-cards">';
    
    rows.forEach(row => {
      const cost = row.original;
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

  renderPagination() {
    const pageCount = this.table.getPageCount();
    const currentPage = this.table.getState().pagination.pageIndex;

    return `
      <div class="table-pagination">
        <div class="pagination-info">
          Page ${currentPage + 1} of ${pageCount || 1}
        </div>
        <div class="pagination-controls">
          <button class="pagination-btn" id="first-page" ${!this.table.getCanPreviousPage() ? 'disabled' : ''}>
            ‹‹
          </button>
          <button class="pagination-btn" id="prev-page" ${!this.table.getCanPreviousPage() ? 'disabled' : ''}>
            ‹
          </button>
          <button class="pagination-btn" id="next-page" ${!this.table.getCanNextPage() ? 'disabled' : ''}>
            ›
          </button>
          <button class="pagination-btn" id="last-page" ${!this.table.getCanNextPage() ? 'disabled' : ''}>
            ››
          </button>
        </div>
      </div>
    `;
  }

  attachEventListeners() {
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
      typeFilter.value = this.filters.cost_type;
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
      categoryFilter.value = this.filters.category;
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
        const columnId = header.dataset.column;
        const column = this.table.getColumn(columnId);
        if (column) column.toggleSorting();
      });
    });

    // Pagination
    const firstBtn = this.container.querySelector('#first-page');
    const prevBtn = this.container.querySelector('#prev-page');
    const nextBtn = this.container.querySelector('#next-page');
    const lastBtn = this.container.querySelector('#last-page');

    if (firstBtn) firstBtn.addEventListener('click', () => {
      this.table.setPageIndex(0);
      this.render();
    });

    if (prevBtn) prevBtn.addEventListener('click', () => {
      this.table.previousPage();
      this.render();
    });

    if (nextBtn) nextBtn.addEventListener('click', () => {
      this.table.nextPage();
      this.render();
    });

    if (lastBtn) lastBtn.addEventListener('click', () => {
      this.table.setPageIndex(this.table.getPageCount() - 1);
      this.render();
    });
  }
}