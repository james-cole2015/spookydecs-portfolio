// Router configuration using Navigo
import { showLoading, hideLoading } from './helpers.js';

let router = null;

export function initRouter() {
  router = new Navigo('/', { hash: false });
  
  console.log('🔧 Finance router initialized');
  console.log('📍 Root:', '/');
  console.log('📍 Current location:', window.location.href);
  console.log('📍 Current pathname:', window.location.pathname);
  
  // Define routes - Specific routes first, generic routes last
  router
    .on('/', async () => {
      console.log('✅ Route matched: / (main finance page)');
      await handleFinanceMain();
    })
    .on('/create', async (match) => {
      console.log('✅ Route matched: /create', match.data);
      await handleNewCostView(match);
    })
    .on('/costs/:costId', async (match) => {
      console.log('✅ Route matched: /costs/:costId', match.data);
      await handleCostDetailView(match);
    })
    .on('/:itemId', async ({ data }) => {
      // Only match if itemId doesn't look like a reserved route
      if (data.itemId === 'create' || data.itemId === 'costs') {
        console.log('   ⚠️ Skipping reserved route:', data.itemId);
        return false; // Don't handle, let other routes match
      }
      console.log('✅ Route matched: /:itemId', data);
      await handleItemCostsView({ data });
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

async function handleFinanceMain() {
  console.log('📄 handleFinanceMain started');
  
  // Make sure app-container is visible
  const appContainer = document.getElementById('app-container');
  const mainContent = document.getElementById('main-content');
  
  if (appContainer) appContainer.style.display = 'block';
  if (mainContent) mainContent.style.display = 'none';
  
  try {
    showLoading();
    
    // Dynamically import the main finance page
    const { FinanceMainPage } = await import('../pages/finance-main.js');
    new FinanceMainPage();
    
    hideLoading();
  } catch (error) {
    console.error('❌ Error rendering finance main:', error);
    hideLoading();
    if (appContainer) {
      renderError(appContainer, 'Failed to load finance page');
    }
  }
}

async function handleNewCostView(match) {
  console.log('📄 handleNewCostView started');
  
  // Make sure main-content is visible
  const appContainer = document.getElementById('app-container');
  const mainContent = document.getElementById('main-content');
  
  if (appContainer) appContainer.style.display = 'none';
  if (mainContent) mainContent.style.display = 'block';
  
  if (!mainContent) {
    console.error('❌ main-content container not found!');
    return;
  }
  
  try {
    showLoading();
    
    console.log('📄 Loading new cost form');
    
    // Dynamically import the new cost page class
    const { NewCostRecordPage } = await import('../pages/new-cost-record.js');
    
    // Clear container and instantiate the page
    mainContent.innerHTML = '<div id="app-container"></div>';
    new NewCostRecordPage();
    
    hideLoading();
  } catch (error) {
    console.error('❌ Error rendering new cost form:', error);
    hideLoading();
    renderError(mainContent, 'Failed to load new cost form');
  }
}

async function handleCostDetailView(match) {
  console.log('📄 handleCostDetailView started');
  
  // Make sure main-content is visible
  const appContainer = document.getElementById('app-container');
  const mainContent = document.getElementById('main-content');
  
  if (appContainer) appContainer.style.display = 'none';
  if (mainContent) mainContent.style.display = 'block';
  
  if (!mainContent) {
    console.error('❌ main-content container not found!');
    return;
  }
  
  try {
    showLoading();
    
    const { costId } = match.data;
    console.log('📄 Loading cost record:', costId);
    
    // Dynamically import the cost detail page
    const { renderCostDetail } = await import('../pages/cost-detail.js');
    await renderCostDetail(mainContent, costId);
    
    hideLoading();
  } catch (error) {
    console.error('❌ Error rendering cost detail:', error);
    hideLoading();
    renderError(mainContent, 'Failed to load cost record');
  }
}

async function handleItemCostsView(match) {
  console.log('📄 handleItemCostsView started');
  
  // Make sure main-content is visible
  const appContainer = document.getElementById('app-container');
  const mainContent = document.getElementById('main-content');
  
  if (appContainer) appContainer.style.display = 'none';
  if (mainContent) mainContent.style.display = 'block';
  
  if (!mainContent) {
    console.error('❌ main-content container not found!');
    return;
  }
  
  try {
    showLoading();
    
    const { itemId } = match.data;
    console.log('📄 Loading item/idea/record costs for:', itemId);
    
    // Dynamically import the item costs page
    const { renderItemCosts } = await import('../pages/item-costs.js');
    await renderItemCosts(mainContent, itemId);
    
    hideLoading();
  } catch (error) {
    console.error('❌ Error rendering item costs view:', error);
    hideLoading();
    renderError(mainContent, 'Failed to load costs');
  }
}

// ============================================
// ERROR VIEWS
// ============================================

function renderNotFound() {
  console.log('📄 Rendering 404 page');
  const mainContent = document.getElementById('main-content');
  const appContainer = document.getElementById('app-container');
  
  if (appContainer) appContainer.style.display = 'none';
  if (mainContent) mainContent.style.display = 'block';
  
  if (!mainContent) {
    console.error('❌ main-content container not found!');
    return;
  }
  
  mainContent.innerHTML = `
    <div class="error-container">
      <div class="error-content">
        <h1>404 - Page Not Found</h1>
        <p>The page you're looking for doesn't exist.</p>
        <p><small>Path: ${window.location.pathname}</small></p>
        <button onclick="window.location.href='/'" class="btn-primary">Go Home</button>
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