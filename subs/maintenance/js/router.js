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
  // Navigo 8.x expects null or '/' for root when using { hash: false }
  router = new Navigo('/', { hash: false });
  
  console.log('🔧 Router initialized');
  console.log('📍 Current location:', window.location.href);
  console.log('📍 Current pathname:', window.location.pathname);
  
  // Initialize main table view (persistent)
  mainTableView = new MainTableView();
  console.log('✅ MainTableView instance created');
  
  // Define routes
  router
    .on('/', async () => {
      console.log('✅ Route matched: /');
      await handleMainView();
    })
    .on('/create', async (match) => {
      console.log('✅ Route matched: /create');
      await handleCreateView(match);
    })
    .on('/:itemId/:recordId/edit', async (match) => {
      console.log('✅ Route matched: /:itemId/:recordId/edit', match.data);
      await handleEditView(match);
    })
    .on('/:itemId/:recordId', async (match) => {
      console.log('✅ Route matched: /:itemId/:recordId', match.data);
      await handleRecordDetailView(match);
    })
    .on('/:itemId', async (match) => {
      console.log('✅ Route matched: /:itemId', match.data);
      await handleItemDetailView(match);
    })
    .notFound(() => {
      console.log('❌ Route NOT FOUND');
      console.log('   Current path:', window.location.pathname);
      console.log('   Current href:', window.location.href);
      renderNotFound();
    });
  
  // Resolve initial route
  console.log('🚀 Resolving initial route...');
  router.resolve();
}

export function navigateTo(path) {
  if (router) {
    console.log('🔄 Navigating to:', path);
    router.navigate(path);
  } else {
    console.error('❌ Router not initialized');
  }
}

export function getRouter() {
  return router;
}

// ============================================
// ROUTE HANDLERS
// ============================================

async function handleMainView() {
  console.log('📄 handleMainView started');
  const container = document.getElementById('main-content');
  
  if (!container) {
    console.error('❌ main-content container not found!');
    return;
  }
  
  console.log('✅ Container found:', container);
  console.log('📊 Current state:', appState.getState());
  
  try {
    showLoading();
    console.log('🔄 Rendering MainTableView...');
    await mainTableView.render(container);
    console.log('✅ MainTableView rendered successfully');
    hideLoading();
  } catch (error) {
    console.error('❌ Error rendering main view:', error);
    hideLoading();
    renderError(container, 'Failed to load maintenance records');
  }
}

async function handleCreateView(match) {
  console.log('📄 handleCreateView started');
  const container = document.getElementById('main-content');
  if (!container) {
    console.error('❌ main-content container not found!');
    return;
  }
  
  try {
    showLoading();
    
    // Parse query parameters
    const queryParams = parseQueryString(window.location.search);
    const itemId = queryParams.item_id || null;
    
    console.log('🔄 Creating RecordFormView with itemId:', itemId);
    const formView = new RecordFormView(null, itemId);
    await formView.render(container);
    
    hideLoading();
  } catch (error) {
    console.error('❌ Error rendering create view:', error);
    hideLoading();
    renderError(container, 'Failed to load create form');
  }
}

async function handleEditView(match) {
  console.log('📄 handleEditView started');
  const container = document.getElementById('main-content');
  if (!container) {
    console.error('❌ main-content container not found!');
    return;
  }
  
  try {
    showLoading();
    
    const { itemId, recordId } = match.data;
    console.log('🔄 Creating RecordFormView for edit:', { itemId, recordId });
    const formView = new RecordFormView(recordId, itemId);
    await formView.render(container);
    
    hideLoading();
  } catch (error) {
    console.error('❌ Error rendering edit view:', error);
    hideLoading();
    renderError(container, 'Failed to load edit form');
  }
}

async function handleRecordDetailView(match) {
  console.log('📄 handleRecordDetailView started');
  const container = document.getElementById('main-content');
  if (!container) {
    console.error('❌ main-content container not found!');
    return;
  }
  
  try {
    showLoading();
    
    const { itemId, recordId } = match.data;
    console.log('🔄 Creating RecordDetailView:', { itemId, recordId });
    const detailView = new RecordDetailView(recordId, itemId);
    await detailView.render(container);
    
    hideLoading();
  } catch (error) {
    console.error('❌ Error rendering record detail:', error);
    hideLoading();
    renderError(container, 'Failed to load record details');
  }
}

async function handleItemDetailView(match) {
  console.log('📄 handleItemDetailView started');
  const container = document.getElementById('main-content');
  if (!container) {
    console.error('❌ main-content container not found!');
    return;
  }
  
  try {
    showLoading();
    
    const { itemId } = match.data;
    console.log('🔄 Creating ItemDetailView:', { itemId });
    const detailView = new ItemDetailView(itemId);
    await detailView.render(container);
    
    hideLoading();
  } catch (error) {
    console.error('❌ Error rendering item detail:', error);
    hideLoading();
    renderError(container, 'Failed to load item details');
  }
}

// ============================================
// ERROR VIEWS
// ============================================

function renderNotFound() {
  console.log('📄 Rendering 404 page');
  const container = document.getElementById('main-content');
  if (!container) {
    console.error('❌ main-content container not found!');
    return;
  }
  
  container.innerHTML = `
    <div class="error-container">
      <div class="error-content">
        <h1>404 - Page Not Found</h1>
        <p>The page you're looking for doesn't exist.</p>
        <p><small>Path: ${window.location.pathname}</small></p>
        <button onclick="window.location.href='/'">Go Home</button>
      </div>
    </div>
  `;
}

function renderError(container, message) {
  console.log('📄 Rendering error page:', message);
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