// Router configuration using Navigo

import { appState } from './state.js';
import { MainTableView } from './components/MainTable.js';
import { RecordDetailView } from './components/RecordDetail.js';
import { ItemDetailView } from './components/ItemDetail.js';
import { RecordFormView } from './components/RecordForm.js';
import { showLoading, hideLoading, parseQueryString } from './utils/helpers.js';

let router = null;
let mainTableView = null;

export function initRouter() {
  const root = window.location.origin;
  router = new Navigo(root, { hash: false });
  
  // Initialize main table view (persistent)
  mainTableView = new MainTableView();
  
  // Define routes
  router
    .on('/', async () => {
      await handleMainView();
    })
    .on('/create', async (match) => {
      await handleCreateView(match);
    })
    .on('/:itemId/:recordId/edit', async (match) => {
      await handleEditView(match);
    })
    .on('/:itemId/:recordId', async (match) => {
      await handleRecordDetailView(match);
    })
    .on('/:itemId', async (match) => {
      await handleItemDetailView(match);
    })
    .notFound(() => {
      renderNotFound();
    });
  
  // Resolve initial route
  router.resolve();
}

export function navigateTo(path) {
  if (router) {
    router.navigate(path);
  }
}

export function getRouter() {
  return router;
}

// ============================================
// ROUTE HANDLERS
// ============================================

async function handleMainView() {
  const container = document.getElementById('main-content');
  if (!container) return;
  
  try {
    showLoading();
    await mainTableView.render(container);
    hideLoading();
  } catch (error) {
    console.error('Error rendering main view:', error);
    hideLoading();
    renderError(container, 'Failed to load maintenance records');
  }
}

async function handleCreateView(match) {
  const container = document.getElementById('main-content');
  if (!container) return;
  
  try {
    showLoading();
    
    // Parse query parameters
    const queryParams = parseQueryString(window.location.search);
    const itemId = queryParams.item_id || null;
    
    const formView = new RecordFormView(null, itemId);
    await formView.render(container);
    
    hideLoading();
  } catch (error) {
    console.error('Error rendering create view:', error);
    hideLoading();
    renderError(container, 'Failed to load create form');
  }
}

async function handleEditView(match) {
  const container = document.getElementById('main-content');
  if (!container) return;
  
  try {
    showLoading();
    
    const { itemId, recordId } = match.data;
    const formView = new RecordFormView(recordId, itemId);
    await formView.render(container);
    
    hideLoading();
  } catch (error) {
    console.error('Error rendering edit view:', error);
    hideLoading();
    renderError(container, 'Failed to load edit form');
  }
}

async function handleRecordDetailView(match) {
  const container = document.getElementById('main-content');
  if (!container) return;
  
  try {
    showLoading();
    
    const { itemId, recordId } = match.data;
    const detailView = new RecordDetailView(recordId, itemId);
    await detailView.render(container);
    
    hideLoading();
  } catch (error) {
    console.error('Error rendering record detail:', error);
    hideLoading();
    renderError(container, 'Failed to load record details');
  }
}

async function handleItemDetailView(match) {
  const container = document.getElementById('main-content');
  if (!container) return;
  
  try {
    showLoading();
    
    const { itemId } = match.data;
    const detailView = new ItemDetailView(itemId);
    await detailView.render(container);
    
    hideLoading();
  } catch (error) {
    console.error('Error rendering item detail:', error);
    hideLoading();
    renderError(container, 'Failed to load item details');
  }
}

// ============================================
// ERROR VIEWS
// ============================================

function renderNotFound() {
  const container = document.getElementById('main-content');
  if (!container) return;
  
  container.innerHTML = `
    <div class="error-container">
      <div class="error-content">
        <h1>404 - Page Not Found</h1>
        <p>The page you're looking for doesn't exist.</p>
        <button onclick="window.location.href='/'">Go Home</button>
      </div>
    </div>
  `;
}

function renderError(container, message) {
  container.innerHTML = `
    <div class="error-container">
      <div class="error-content">
        <h1>Error</h1>
        <p>${message}</p>
        <button onclick="window.location.reload()">Reload Page</button>
      </div>
    </div>
  `;
}