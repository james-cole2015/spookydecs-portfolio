// Router configuration using Navigo
import { showLoading, hideLoading } from './helpers.js';

let router = null;

export function initRouter() {
  router = new Navigo('/', { hash: false });
  
  console.log('🔧 Finance router initialized');
  console.log('📍 Current location:', window.location.href);
  console.log('📍 Current pathname:', window.location.pathname);
  
  // Define routes - Specific routes first, generic routes last
  router
    .on('/new', async () => {
      console.log('✅ Route matched: /new');
      await handleNewCostView();
    })
    .on('/records', async () => {
      console.log('✅ Route matched: /records');
      await handleMainView('records');
    })
    .on('/statistics', async () => {
      console.log('✅ Route matched: /statistics');
      await handleMainView('statistics');
    })
    .on('/receipts', async () => {
      console.log('✅ Route matched: /receipts');
      await handleMainView('receipts');
    })
    .on('/:itemId/:costId', async (match) => {
      console.log('✅ Route matched: /:itemId/:costId', match.data);
      
      // Safety guard - prevent literal routes
      if (match.data.itemId === 'new' || match.data.itemId === 'records' || 
          match.data.itemId === 'statistics' || match.data.itemId === 'receipts') {
        console.log('   ⚠️  Skipping - this is a literal route');
        return;
      }
      
      await handleCostRecordDetailView(match);
    })
    .on('/:itemId', async (match) => {
      console.log('✅ Route matched: /:itemId', match.data);
      
      // Safety guard - prevent literal routes
      if (match.data.itemId === 'new' || match.data.itemId === 'records' || 
          match.data.itemId === 'statistics' || match.data.itemId === 'receipts') {
        console.error('❌ BUG: Literal route matched /:itemId pattern!');
        return;
      }
      
      await handleItemCostsView(match);
    })
    .on('/', async () => {
      console.log('✅ Route matched: /');
      await handleMainView('records');
    })
    .notFound(() => {
      console.log('❌ Route NOT FOUND');
      console.log('   Current path:', window.location.pathname);
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

async function handleMainView(tab = 'records') {
  console.log('📄 handleMainView started, tab:', tab);
  const container = document.getElementById('main-content');
  
  if (!container) {
    console.error('❌ main-content container not found!');
    return;
  }
  
  try {
    showLoading();
    
    // Dynamically import the main page
    const { renderFinanceMain } = await import('../pages/finance-main.js');
    await renderFinanceMain(container, tab);
    
    hideLoading();
  } catch (error) {
    console.error('❌ Error rendering main view:', error);
    hideLoading();
    renderError(container, 'Failed to load finance page');
  }
}

async function handleNewCostView() {
  console.log('📄 handleNewCostView started');
  const container = document.getElementById('main-content');
  
  if (!container) {
    console.error('❌ main-content container not found!');
    return;
  }
  
  try {
    showLoading();
    
    // Dynamically import the new cost page
    const { renderNewCostRecord } = await import('../pages/new-cost-record.js');
    await renderNewCostRecord(container);
    
    hideLoading();
  } catch (error) {
    console.error('❌ Error rendering new cost view:', error);
    hideLoading();
    renderError(container, 'Failed to load cost creation form');
  }
}

async function handleItemCostsView(match) {
  console.log('📄 handleItemCostsView started');
  const container = document.getElementById('main-content');
  
  if (!container) {
    console.error('❌ main-content container not found!');
    return;
  }
  
  try {
    showLoading();
    
    const { itemId } = match.data;
    console.log('🔄 Loading item costs for:', itemId);
    
    // Dynamically import the item costs page
    const { renderItemCosts } = await import('../pages/item-costs.js');
    await renderItemCosts(container, itemId);
    
    hideLoading();
  } catch (error) {
    console.error('❌ Error rendering item costs view:', error);
    hideLoading();
    renderError(container, 'Failed to load item costs');
  }
}

async function handleCostRecordDetailView(match) {
  console.log('📄 handleCostRecordDetailView started');
  const container = document.getElementById('main-content');
  
  if (!container) {
    console.error('❌ main-content container not found!');
    return;
  }
  
  try {
    showLoading();
    
    const { itemId, costId } = match.data;
    console.log('🔄 Loading cost record:', { itemId, costId });
    
    // Dynamically import the cost record detail page
    const { renderCostRecordDetail } = await import('../pages/cost-record-detail.js');
    await renderCostRecordDetail(container, itemId, costId);
    
    hideLoading();
  } catch (error) {
    console.error('❌ Error rendering cost record detail:', error);
    hideLoading();
    renderError(container, 'Failed to load cost record details');
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