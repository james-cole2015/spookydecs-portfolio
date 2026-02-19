// Router configuration using Navigo
import { showLoading, hideLoading } from './helpers.js';

let router = null;

// Reserved route segments that should not be matched as itemIds
const RESERVED_ROUTES = new Set(['new', 'costs', 'records', 'receipts', 'statistics', 'items']);

export function initRouter() {
  router = new Navigo('/', { hash: false });

  console.log('🔧 Finance router initialized');
  console.log('📍 Current location:', window.location.href);

  // Define routes — specific routes first, generic last
  router
    .on('/', async () => {
      console.log('✅ Route matched: /');
      await handleFinanceLanding();
    })
    .on('/records', async () => {
      console.log('✅ Route matched: /records');
      await handleRecordsPage();
    })
    .on('/receipts', async () => {
      console.log('✅ Route matched: /receipts');
      await handleReceiptsPage();
    })
    .on('/statistics', async () => {
      console.log('✅ Route matched: /statistics');
      await handleStatisticsPage();
    })
    .on('/items', async () => {
      console.log('✅ Route matched: /items');
      await handleItemsPage();
    })
    .on('/new', async () => {
      console.log('✅ Route matched: /new');
      await handleNewCostView();
    })
    .on('/costs/:costId', async (match) => {
      console.log('✅ Route matched: /costs/:costId', match.data);
      await handleCostDetailView(match);
    })
    .on('/:itemId', async ({ data }) => {
      if (RESERVED_ROUTES.has(data.itemId)) {
        console.log('   ⚠️ Skipping reserved route:', data.itemId);
        return false;
      }
      console.log('✅ Route matched: /:itemId', data);
      await handleItemCostsView({ data });
    })
    .notFound(() => {
      console.log('❌ Route NOT FOUND:', window.location.pathname);
      renderNotFound();
    });

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
// SHARED HELPERS
// ============================================

function getMainContent() {
  return document.getElementById('main-content');
}

// ============================================
// ROUTE HANDLERS
// ============================================

async function handleFinanceLanding() {
  const mainContent = getMainContent();
  if (!mainContent) return;

  try {
    showLoading();
    const { renderFinanceLanding } = await import('../pages/finance-landing.js');
    mainContent.innerHTML = '';
    renderFinanceLanding(mainContent);
    hideLoading();
  } catch (error) {
    console.error('❌ Error rendering finance landing:', error);
    hideLoading();
    renderError(mainContent, 'Failed to load finance page');
  }
}

async function handleRecordsPage() {
  const mainContent = getMainContent();
  if (!mainContent) return;

  try {
    showLoading();
    const { renderRecordsPage } = await import('../pages/records-page.js');
    mainContent.innerHTML = '';
    await renderRecordsPage(mainContent);
    hideLoading();
  } catch (error) {
    console.error('❌ Error rendering records page:', error);
    hideLoading();
    renderError(mainContent, 'Failed to load cost records');
  }
}

async function handleReceiptsPage() {
  const mainContent = getMainContent();
  if (!mainContent) return;

  try {
    showLoading();
    const { renderReceiptsPage } = await import('../pages/receipts-page.js');
    mainContent.innerHTML = '';
    renderReceiptsPage(mainContent);
    hideLoading();
  } catch (error) {
    console.error('❌ Error rendering receipts page:', error);
    hideLoading();
    renderError(mainContent, 'Failed to load receipts');
  }
}

async function handleStatisticsPage() {
  const mainContent = getMainContent();
  if (!mainContent) return;

  try {
    showLoading();
    const { renderStatisticsPage } = await import('../pages/statistics-page.js');
    mainContent.innerHTML = '';
    await renderStatisticsPage(mainContent);
    hideLoading();
  } catch (error) {
    console.error('❌ Error rendering statistics page:', error);
    hideLoading();
    renderError(mainContent, 'Failed to load statistics');
  }
}

async function handleItemsPage() {
  const mainContent = getMainContent();
  if (!mainContent) return;

  try {
    showLoading();
    const { renderItemsPage } = await import('../pages/items-page.js');
    mainContent.innerHTML = '';
    await renderItemsPage(mainContent);
    hideLoading();
  } catch (error) {
    console.error('❌ Error rendering items page:', error);
    hideLoading();
    renderError(mainContent, 'Failed to load items');
  }
}

async function handleNewCostView() {
  const mainContent = getMainContent();
  if (!mainContent) return;

  try {
    showLoading();
    const { renderNewCostRecord } = await import('../pages/new-cost-record.js');
    mainContent.innerHTML = '';
    await renderNewCostRecord(mainContent);
    hideLoading();
  } catch (error) {
    console.error('❌ Error rendering new cost form:', error);
    hideLoading();
    renderError(mainContent, 'Failed to load new cost form');
  }
}

async function handleCostDetailView(match) {
  const mainContent = getMainContent();
  if (!mainContent) return;

  try {
    showLoading();
    const { costId } = match.data;
    const { renderCostDetail } = await import('../pages/cost-detail.js');
    mainContent.innerHTML = '';
    await renderCostDetail(mainContent, costId);
    hideLoading();
  } catch (error) {
    console.error('❌ Error rendering cost detail:', error);
    hideLoading();
    renderError(mainContent, 'Failed to load cost record');
  }
}

async function handleItemCostsView(match) {
  const mainContent = getMainContent();
  if (!mainContent) return;

  try {
    showLoading();
    const { itemId } = match.data;
    const { renderItemCosts } = await import('../pages/item-costs.js');
    mainContent.innerHTML = '';
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
  const mainContent = getMainContent();
  if (!mainContent) return;

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
  console.log('📄 Rendering error:', message);
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
