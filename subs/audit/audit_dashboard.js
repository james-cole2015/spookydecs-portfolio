import { loadConfig } from './config.json';
import { renderRecords, renderError } from './audit_renderer.js';
import { openRecordDetail, closeModal, toggleDetails } from './audit_modal.js';

let API_BASE = '';
let activeTab = 'recent';
let currentPage = 1;
let totalPages = 0;
let filters = {
  dateRange: 30,
  crudType: 'ALL',
  search: '',
  environment: 'dev',
  classType: 'ALL',
  season: 'ALL',
  type: 'ALL'
};

// Initialize
async function init() {
  API_BASE = await loadConfig();
  console.log('=== Audit Dashboard Initialized ===');
  console.log('API Endpoint:', API_BASE);
  console.log('===================================');
  
  setupEventListeners();
  await fetchRecords();
}

// Setup event listeners
function setupEventListeners() {
  // Tab switching
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  document.getElementById('mobile-tab-select').addEventListener('change', (e) => {
    switchTab(e.target.value);
  });

  // Filters
  ['dateRange', 'crudType', 'classType', 'environment', 'search'].forEach(filterName => {
    const desktopEl = document.getElementById(`filter-${filterName}`);
    const mobileEl = document.getElementById(`mobile-filter-${filterName}`);
    
    if (desktopEl) {
      desktopEl.addEventListener('change', () => updateFilter(filterName, desktopEl.value));
      if (filterName === 'search') {
        desktopEl.addEventListener('input', () => updateFilter(filterName, desktopEl.value));
      }
    }
    if (mobileEl) {
      mobileEl.addEventListener('change', () => updateFilter(filterName, mobileEl.value));
      if (filterName === 'search') {
        mobileEl.addEventListener('input', () => updateFilter(filterName, mobileEl.value));
      }
    }
  });

  // Mobile filter drawer
  document.getElementById('mobile-filter-btn').addEventListener('click', openMobileFilters);
  document.getElementById('close-mobile-filters').addEventListener('click', closeMobileFilters);
  document.getElementById('mobile-filter-overlay').addEventListener('click', closeMobileFilters);

  // Pagination
  document.getElementById('prev-page').addEventListener('click', () => changePage(currentPage - 1));
  document.getElementById('next-page').addEventListener('click', () => changePage(currentPage + 1));

  // Modal
  document.getElementById('close-modal').addEventListener('click', closeModal);
  document.getElementById('modal-close-btn').addEventListener('click', closeModal);
  document.getElementById('toggle-details').addEventListener('click', toggleDetails);
}

function switchTab(tab) {
  activeTab = tab;
  currentPage = 1;

  // Update desktop tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    if (btn.dataset.tab === tab) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Update mobile select
  document.getElementById('mobile-tab-select').value = tab;

  // Show/hide class type filter for inventory
  const showClassFilter = tab === 'inventory';
  document.getElementById('class-type-filter').style.display = showClassFilter ? 'block' : 'none';
  document.getElementById('mobile-class-type-filter').style.display = showClassFilter ? 'block' : 'none';
  document.getElementById('class-header').style.display = showClassFilter ? 'table-cell' : 'none';

  fetchRecords();
}

function updateFilter(name, value) {
  filters[name] = name === 'dateRange' ? parseInt(value) : value;
  currentPage = 1;
  
  // Sync desktop and mobile filters
  const desktopEl = document.getElementById(`filter-${name}`);
  const mobileEl = document.getElementById(`mobile-filter-${name}`);
  if (desktopEl) desktopEl.value = value;
  if (mobileEl) mobileEl.value = value;
  
  fetchRecords();
}

function changePage(page) {
  if (page < 1 || page > totalPages) return;
  currentPage = page;
  fetchRecords();
}

function openMobileFilters() {
  document.getElementById('mobile-filter-drawer').classList.add('open');
  document.getElementById('mobile-filter-overlay').classList.add('visible');
}

function closeMobileFilters() {
  document.getElementById('mobile-filter-drawer').classList.remove('open');
  document.getElementById('mobile-filter-overlay').classList.remove('visible');
}

async function fetchRecords() {
  console.log(`Fetching audit records - Tab: ${activeTab}, Page: ${currentPage}, Filters:`, filters);
  
  const endpoint = activeTab === 'recent' ? '/audit/recent' : `/audit/${activeTab}`;
  const params = new URLSearchParams({
    limit: '20',
    page: currentPage.toString(),
    dateRange: filters.dateRange.toString(),
    crudType: filters.crudType,
    search: filters.search,
    environment: filters.environment,
    classType: filters.classType,
    season: filters.season,
    type: filters.type
  });

  const url = `${API_BASE}${endpoint}?${params}`;
  console.log('API Request:', url);

  try {
    const response = await fetch(url);
    const data = await response.json();
    
    console.log(`Received ${data.records?.length || 0} records`);
    renderRecords(data.records || [], activeTab);
    updatePagination(data.pagination || {});
  } catch (error) {
    console.error('Error fetching audit records:', error);
    renderError();
  }
}

function updatePagination(pagination) {
  totalPages = pagination.totalPages || 0;
  const paginationEl = document.getElementById('pagination');
  
  if (totalPages > 1) {
    paginationEl.classList.add('visible');
    document.getElementById('pagination-info').textContent = `Page ${currentPage} of ${totalPages}`;
    
    document.getElementById('prev-page').disabled = currentPage === 1;
    document.getElementById('next-page').disabled = currentPage === totalPages;
  } else {
    paginationEl.classList.remove('visible');
  }
}

// Make functions globally available
window.openRecordDetail = openRecordDetail;
window.activeTab = () => activeTab;

// Initialize on page load
init();