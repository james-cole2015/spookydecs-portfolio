// Pagination System - Handles paginated display of items

const PaginationSystem = {
  currentPage: 1,
  itemsPerPage: 20,
  totalItems: 0,
  filteredItems: [],
  
  // Initialize pagination
  init() {
    this.createPaginationControls();
  },
  
  // Create pagination UI controls
  createPaginationControls() {
    // Desktop pagination (in controls bar)
    const controlsDiv = document.querySelector('.controls');
    if (controlsDiv) {
      const paginationDiv = document.createElement('div');
      paginationDiv.id = 'desktopPagination';
      paginationDiv.className = 'pagination-controls';
      paginationDiv.style.cssText = 'display: flex; align-items: center; gap: 8px;';
      controlsDiv.appendChild(paginationDiv);
    }
    
    // Mobile pagination (above cards)
    const itemCards = document.getElementById('itemCards');
    if (itemCards) {
      const mobilePaginationDiv = document.createElement('div');
      mobilePaginationDiv.id = 'mobilePagination';
      mobilePaginationDiv.className = 'pagination-controls mobile-pagination';
      mobilePaginationDiv.style.cssText = 'display: none; margin-bottom: 16px;';
      itemCards.parentNode.insertBefore(mobilePaginationDiv, itemCards);
    }
  },
  
  // Set the items to paginate
  setItems(items) {
    this.filteredItems = items;
    this.totalItems = items.length;
    this.currentPage = 1; // Reset to first page when items change
    this.render();
  },
  
  // Get total number of pages
  getTotalPages() {
    return Math.ceil(this.totalItems / this.itemsPerPage);
  },
  
  // Get items for current page
  getCurrentPageItems() {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return this.filteredItems.slice(startIndex, endIndex);
  },
  
  // Go to specific page
  goToPage(pageNumber) {
    const totalPages = this.getTotalPages();
    if (pageNumber < 1) pageNumber = 1;
    if (pageNumber > totalPages) pageNumber = totalPages;
    
    this.currentPage = pageNumber;
    this.render();
  },
  
  // Go to next page
  nextPage() {
    if (this.currentPage < this.getTotalPages()) {
      this.currentPage++;
      this.render();
    }
  },
  
  // Go to previous page
  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.render();
    }
  },
  
  // Render pagination controls and items
  render() {
    const totalPages = this.getTotalPages();
    const currentPageItems = this.getCurrentPageItems();
    
    // Update both desktop and mobile pagination controls
    this.updatePaginationControls('desktopPagination', totalPages);
    this.updatePaginationControls('mobilePagination', totalPages);
    
    // Render the current page items
    if (typeof UIRenderer !== 'undefined') {
      UIRenderer.renderTableRows(currentPageItems);
      UIRenderer.renderMobileCards(currentPageItems);
    }
  },
  
  // Update pagination controls HTML
  updatePaginationControls(containerId, totalPages) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // Hide if no items or only one page
    if (totalPages <= 1) {
      container.style.display = 'none';
      return;
    }
    
    container.style.display = 'flex';
    
    const isMobile = containerId === 'mobilePagination';
    const buttonClass = isMobile ? 'pagination-btn-mobile' : 'pagination-btn';
    
    let html = '';
    
    // Previous button
    const prevDisabled = this.currentPage === 1;
    html += `<button class="${buttonClass}" onclick="PaginationSystem.prevPage()" ${prevDisabled ? 'disabled' : ''}>
      ${isMobile ? '←' : 'Previous'}
    </button>`;
    
    // Page numbers
    const pageNumbers = this.getPageNumbers(totalPages);
    pageNumbers.forEach(pageNum => {
      if (pageNum === '...') {
        html += `<span class="pagination-ellipsis">...</span>`;
      } else {
        const isActive = pageNum === this.currentPage;
        html += `<button class="${buttonClass} ${isActive ? 'active' : ''}" 
          onclick="PaginationSystem.goToPage(${pageNum})"
          ${isActive ? 'disabled' : ''}>
          ${pageNum}
        </button>`;
      }
    });
    
    // Next button
    const nextDisabled = this.currentPage === totalPages;
    html += `<button class="${buttonClass}" onclick="PaginationSystem.nextPage()" ${nextDisabled ? 'disabled' : ''}>
      ${isMobile ? '→' : 'Next'}
    </button>`;
    
    // Page info
    const startItem = (this.currentPage - 1) * this.itemsPerPage + 1;
    const endItem = Math.min(this.currentPage * this.itemsPerPage, this.totalItems);
    html += `<span class="pagination-info" style="margin-left: ${isMobile ? '4px' : '12px'}; color: #64748b; font-size: ${isMobile ? '12px' : '14px'}; white-space: nowrap; flex-shrink: 0;">
      ${startItem}-${endItem} of ${this.totalItems}
    </span>`;
    
    container.innerHTML = html;
  },
  
  // Get array of page numbers to display (with ellipsis for large page counts)
  getPageNumbers(totalPages) {
    const current = this.currentPage;
    const pages = [];
    
    // If 7 or fewer pages, show all
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
      return pages;
    }
    
    // Always show first page
    pages.push(1);
    
    // Show pages around current page
    if (current > 3) {
      pages.push('...');
    }
    
    for (let i = Math.max(2, current - 1); i <= Math.min(totalPages - 1, current + 1); i++) {
      pages.push(i);
    }
    
    if (current < totalPages - 2) {
      pages.push('...');
    }
    
    // Always show last page
    pages.push(totalPages);
    
    return pages;
  }
};

// Add CSS styles for pagination
const paginationStyles = document.createElement('style');
paginationStyles.textContent = `
  .pagination-controls {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }
  
  .pagination-controls.mobile-pagination {
    flex-wrap: nowrap;
  }
  
  .pagination-btn {
    padding: 6px 12px;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    color: #334155;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s;
    min-width: 36px;
  }
  
  .pagination-btn:hover:not(:disabled) {
    background: #f1f5f9;
    border-color: #cbd5e1;
  }
  
  .pagination-btn.active {
    background: #3b82f6;
    color: white;
    border-color: #3b82f6;
  }
  
  .pagination-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .pagination-ellipsis {
    padding: 6px 8px;
    color: #94a3b8;
    font-size: 14px;
  }
  
  .pagination-info {
    font-size: 14px;
    color: #64748b;
    white-space: nowrap;
    flex-shrink: 0;
  }
  
  /* Mobile styles */
  .mobile-pagination {
    justify-content: center;
    padding: 0 16px;
    flex-wrap: nowrap;
    overflow-x: auto;
    overflow-y: hidden;
    -webkit-overflow-scrolling: touch;
  }
  
  .pagination-btn-mobile {
    padding: 8px 12px;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    color: #334155;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s;
    min-width: 40px;
    font-weight: 500;
    flex-shrink: 0;
  }
  
  .pagination-btn-mobile:hover:not(:disabled) {
    background: #f1f5f9;
    border-color: #cbd5e1;
  }
  
  .pagination-btn-mobile.active {
    background: #3b82f6;
    color: white;
    border-color: #3b82f6;
  }
  
  .pagination-btn-mobile:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  @media (max-width: 768px) {
    .pagination-controls:not(.mobile-pagination) {
      display: none !important;
    }
    
    .mobile-pagination {
      display: flex !important;
    }
    
    .pagination-info {
      font-size: 13px;
    }
  }
  
  @media (min-width: 769px) {
    .mobile-pagination {
      display: none !important;
    }
  }
`;
document.head.appendChild(paginationStyles);

// Initialize on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => PaginationSystem.init());
} else {
  PaginationSystem.init();
}