// Router configuration using Navigo

import { appState } from './state.js';
import { MainTableView } from './components/MainTable.js';
import { RecordDetailView } from './components/RecordDetail.js';
import { ItemDetailView } from './components/ItemDetail.js';
import { RecordFormView } from './components/RecordForm.js';
import { SchedulesTableView } from './components/SchedulesTable.js';
import { ScheduleFormView } from './components/ScheduleForm.js';
import { ScheduleDetailView } from './components/ScheduleDetail.js';
import { TemplateApplicationView } from './components/TemplateApplication.js';
import { showLoading, hideLoading, parseQueryString } from './utils/helpers.js';

let router = null;
let mainTableView = null;

export function initRouter() {
  // Keep hash: false since your server is configured correctly
  router = new Navigo('/', { hash: false });
  
  console.log('🔧 Router initialized');
  console.log('📍 Current location:', window.location.href);
  console.log('📍 Current pathname:', window.location.pathname);
  
  // Initialize main table view (persistent)
  mainTableView = new MainTableView();
  console.log('✅ MainTableView instance created');
  
  // Define routes - Navigo matches in order, so put GENERIC routes first, SPECIFIC routes last
  router
    .on('/:itemId', async (match) => {
      console.log('✅ Route matched: /:itemId', match.data);
      
      // Safety guard - prevent literal routes from being caught
      if (match.data.itemId === 'create' || match.data.itemId === 'schedules') {
        console.error('❌ BUG: Literal route matched /:itemId pattern!');
        console.error('   This should never happen - check route order');
        return;
      }
      
      await handleItemDetailView(match);
    })
    .on('/:itemId/:recordId', async (match) => {
      console.log('✅ Route matched: /:itemId/:recordId', match.data);
      
      // Prevent /schedules/* from matching this pattern
      if (match.data.itemId === 'schedules') {
        console.log('   ⚠️  Skipping - this is a schedules route');
        return;
      }
      
      await handleRecordDetailView(match);
    })
    .on('/:itemId/:recordId/edit', async (match) => {
      console.log('✅ Route matched: /:itemId/:recordId/edit', match.data);
      
      // Prevent /schedules/* from matching this pattern
      if (match.data.itemId === 'schedules') {
        console.log('   ⚠️  Skipping - this is a schedules route');
        return;
      }
      
      await handleEditView(match);
    })
    .on('/create', async (match) => {
      console.log('✅ Route matched: /create');
      console.log('   Query params:', window.location.search);
      await handleCreateView(match);
    })
    .on('/schedules', async () => {
      console.log('✅ Route matched: /schedules');
      await handleSchedulesView();
    })
    .on('/schedules/:id', async (match) => {
      console.log('✅ Route matched: /schedules/:id', match.data);
      
      // Prevent /schedules/new and /schedules/apply from matching this - these are not IDs
      if (match.data.id === 'new' || match.data.id === 'apply') {
        console.log('   ⚠️  Skipping - this is a literal route');
        return;
      }
      
      await handleScheduleDetailView(match);
    })
    .on('/schedules/:id/edit', async (match) => {
      console.log('✅ Route matched: /schedules/:id/edit', match.data);
      
      // Prevent /schedules/new/edit from matching (shouldn't happen but safety)
      if (match.data.id === 'new') {
        console.log('   ⚠️  Skipping - invalid route');
        return;
      }
      
      await handleScheduleEditView(match);
    })
    .on('/schedules/apply', async () => {
      console.log('✅ Route matched: /schedules/apply');
      await handleTemplateApplicationView();
    })
    .on('/schedules/:id/apply', async (match) => {
      console.log('✅ Route matched: /schedules/:id/apply', match.data);
      await handleTemplateApplicationView(match.data.id);
    })
    .on('/schedules/new', async () => {
      console.log('✅ Route matched: /schedules/new');
      await handleScheduleCreateView();
    })
    .on('/', async () => {
      console.log('✅ Route matched: /');
      await handleMainView();
    })
    .notFound(() => {
      console.log('❌ Route NOT FOUND');
      console.log('   Current path:', window.location.pathname);
      console.log('   Current href:', window.location.href);
      renderNotFound();
    });
  
  // Resolve initial route
  console.log('🚀 Resolving initial route...');
  console.log('🚀 About to resolve path:', window.location.pathname);
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
// ROUTE HANDLERS - MAINTENANCE RECORDS
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
// ROUTE HANDLERS - SCHEDULES
// ============================================

async function handleSchedulesView() {
  console.log('📄 handleSchedulesView started');
  const container = document.getElementById('main-content');
  
  if (!container) {
    console.error('❌ main-content container not found!');
    return;
  }
  
  try {
    showLoading();
    console.log('🔄 Rendering SchedulesTableView...');
    const schedulesView = new SchedulesTableView();
    await schedulesView.render(container);
    console.log('✅ SchedulesTableView rendered successfully');
    hideLoading();
  } catch (error) {
    console.error('❌ Error rendering schedules view:', error);
    hideLoading();
    renderError(container, 'Failed to load maintenance schedules');
  }
}

async function handleScheduleCreateView() {
  console.log('📄 handleScheduleCreateView started');
  const container = document.getElementById('main-content');
  
  if (!container) {
    console.error('❌ main-content container not found!');
    return;
  }
  
  try {
    showLoading();
    console.log('🔄 Creating ScheduleFormView...');
    const formView = new ScheduleFormView();
    await formView.render(container);
    hideLoading();
  } catch (error) {
    console.error('❌ Error rendering schedule create view:', error);
    hideLoading();
    renderError(container, 'Failed to load schedule form');
  }
}

async function handleScheduleEditView(match) {
  console.log('📄 handleScheduleEditView started');
  const container = document.getElementById('main-content');
  
  if (!container) {
    console.error('❌ main-content container not found!');
    return;
  }
  
  try {
    showLoading();
    
    const { id } = match.data;
    console.log('🔄 Creating ScheduleFormView for edit:', { id });
    const formView = new ScheduleFormView(id);
    await formView.render(container);
    
    hideLoading();
  } catch (error) {
    console.error('❌ Error rendering schedule edit view:', error);
    hideLoading();
    renderError(container, 'Failed to load schedule form');
  }
}

async function handleScheduleDetailView(match) {
  console.log('📄 handleScheduleDetailView started');
  const container = document.getElementById('main-content');
  
  if (!container) {
    console.error('❌ main-content container not found!');
    return;
  }
  
  try {
    showLoading();
    
    const { id } = match.data;
    console.log('🔄 Creating ScheduleDetailView:', { id });
    const detailView = new ScheduleDetailView(id);
    await detailView.render(container);
    
    hideLoading();
  } catch (error) {
    console.error('❌ Error rendering schedule detail:', error);
    hideLoading();
    renderError(container, 'Failed to load schedule details');
  }
}

async function handleTemplateApplicationView(preSelectedTemplateId = null) {
  console.log('📄 handleTemplateApplicationView started', { preSelectedTemplateId });
  const container = document.getElementById('main-content');
  
  if (!container) {
    console.error('❌ main-content container not found!');
    return;
  }
  
  try {
    showLoading();
    console.log('🔄 Creating TemplateApplicationView...');
    const applicationView = new TemplateApplicationView(preSelectedTemplateId);
    await applicationView.render(container);
    hideLoading();
  } catch (error) {
    console.error('❌ Error rendering template application view:', error);
    hideLoading();
    renderError(container, 'Failed to load template application wizard');
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
