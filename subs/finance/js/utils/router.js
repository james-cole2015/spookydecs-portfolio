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
    .on('/finance/new', async (match) => {
      console.log('✅ Route matched: /finance/new', match.data);
      await handleNewCostView(match);
    })
    .on('/finance/costs/:costId', async (match) => {
      console.log('✅ Route matched: /finance/costs/:costId', match.data);
      await handleCostDetailView(match);
    })
    .on('/finance/:itemId', async (match) => {
      console.log('✅ Route matched: /finance/:itemId', match.data);
      await handleItemCostsView(match);
    })
    .on('/finance', async () => {
      console.log('✅ Route matched: /finance (main page)');
      await handleFinanceMain();
    })
    .notFound(() => {
      console.log('❌ Route NOT FOUND');
      console.log('   Current path:', window.location.pathname);
      renderNotFound();
    });
  
  // Resolve initial route
  console.log('🚀 Resolving initial route...');
  router.resolve();
  
  return router;
}

export function navigateTo(path) {
  if (router) {
    // Ensure path starts with /finance
    const fullPath = path.startsWith('/finance') ? path : `/finance${path}`;
    console.log('🔄 Navigating to:', fullPath);
    router.navigate(fullPath);
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

async function handleFinanceMain() {
  console.log('📄 handleFinanceMain started');
  const container = document.getElementById('main-content');
  
  if (!container) {
    console.error('❌ main-content container not found!');
    return;
  }
  
  try {
    showLoading();
    
    // Dynamically import the main finance page
    const { FinanceMainPage } = await import('../pages/finance-main.js');
    new FinanceMainPage();
    
    hideLoading();
  } catch (error) {
    console.error('❌ Error rendering finance main:', error);
    hideLoading();
    renderError(container, 'Failed to load finance page');
  }
}

async function handleNewCostView(match) {
  console.log('📄 handleNewCostView started');
  const container = document.getElementById('main-content');
  
  if (!container) {
    console.error('❌ main-content container not found!');
    return;
  }
  
  try {
    showLoading();
    
    console.log('📄 Loading new cost form');
    
    // Dynamically import the new cost page
    const { renderNewCostForm } = await import('../pages/new-cost-record.js');
    await renderNewCostForm(container);
    
    hideLoading();
  } catch (error) {
    console.error('❌ Error rendering new cost form:', error);
    hideLoading();
    renderError(container, 'Failed to load new cost form');
  }
}

async function handleCostDetailView(match) {
  console.log('📄 handleCostDetailView started');
  const container = document.getElementById('main-content');
  
  if (!container) {
    console.error('❌ main-content container not found!');
    return;
  }
  
  try {
    showLoading();
    
    const { costId } = match.data;
    console.log('📄 Loading cost record:', costId);
    
    // Dynamically import the cost detail page
    const { renderCostDetail } = await import('../pages/cost-detail.js');
    await renderCostDetail(container, costId);
    
    hideLoading();
  } catch (error) {
    console.error('❌ Error rendering cost detail:', error);
    hideLoading();
    renderError(container, 'Failed to load cost record');
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
    console.log('📄 Loading item/idea/record costs for:', itemId);
    
    // Dynamically import the item costs page
    const { renderItemCosts } = await import('../pages/item-costs.js');
    await renderItemCosts(container, itemId);
    
    hideLoading();
  } catch (error) {
    console.error('❌ Error rendering item costs view:', error);
    hideLoading();
    renderError(container, 'Failed to load costs');
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
        <button onclick="window.location.href='/finance'" class="btn-primary">Go Home</button>
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
        <button onclick="window.location.reload()" class="btn-secondary">Reload Page</button>
      </div>
    </div>
  `;
}