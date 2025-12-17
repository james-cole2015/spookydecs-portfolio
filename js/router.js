// Router Setup using Navigo
// Handles SPA navigation for items subdomain

let router;
let currentPage = null;

export function initRouter() {
  // Initialize Navigo router
  router = new Navigo('/', { hash: false });
  
  // Define routes
  router
    .on('/items', () => {
      loadPage('items-list');
    })
    .on('/items/create', () => {
      loadPage('item-form', { mode: 'create' });
    })
    .on('/items/:id/edit', ({ data }) => {
      loadPage('item-form', { mode: 'edit', itemId: data.id });
    })
    .on('/items/:id', ({ data }) => {
      loadPage('item-detail', { itemId: data.id });
    })
    .notFound(() => {
      // Redirect to items list if route not found
      router.navigate('/items');
    });
  
  // Handle link clicks to prevent page reload
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href^="/items"]');
    if (link) {
      e.preventDefault();
      router.navigate(link.getAttribute('href'));
    }
  });
  
  // Resolve initial route
  router.resolve();
}

export function navigate(path) {
  if (router) {
    router.navigate(path);
  } else {
    console.error('Router not initialized');
  }
}

async function loadPage(pageName, params = {}) {
  const appRoot = document.getElementById('app-root');
  
  if (!appRoot) {
    console.error('App root container not found');
    return;
  }
  
  // Show loading state
  appRoot.innerHTML = '<div class="page-loading"><div class="spinner"></div><div>Loading...</div></div>';
  
  try {
    // Cleanup previous page
    if (currentPage) {
      const prevModule = await import(`./pages/${currentPage}.js`);
      if (prevModule.cleanup) {
        prevModule.cleanup();
      }
    }
    
    // Render page HTML structure
    appRoot.innerHTML = getPageHTML(pageName);
    
    // Scroll to top
    window.scrollTo(0, 0);
    
    // Dynamic import of page module
    const pageModule = await import(`./pages/${pageName}.js`);
    
    // Make page module globally available for onclick handlers
    window[getPageModuleName(pageName)] = pageModule;
    
    // Initialize new page
    if (pageModule.init) {
      await pageModule.init(params);
      currentPage = pageName;
    } else {
      console.error(`Page ${pageName} missing init() function`);
    }
  } catch (error) {
    console.error(`Failed to load page ${pageName}:`, error);
    appRoot.innerHTML = `
      <div class="error-state">
        <div class="error-icon">⚠️</div>
        <div class="error-message">Failed to load page</div>
        <button class="btn-primary" onclick="window.location.reload()">Reload</button>
      </div>
    `;
  }
}

function getPageHTML(pageName) {
  switch(pageName) {
    case 'items-list':
      return `
        <div class="app-container">
          <header class="page-header">
            <div class="header-content">
              <h1>Items Administration</h1>
              <div class="header-actions">
                <button class="btn-primary btn-icon-mobile" onclick="itemsListPage.handleCreateItem()" title="Create Item">
                  <span class="btn-icon-only">+</span>
                  <span class="btn-text">Create Item</span>
                </button>
              </div>
            </div>
          </header>
          <main class="main-content">
            <div id="tab-container"></div>
            <div class="controls-row">
              <div id="filter-container"></div>
              <div class="item-count-container">
                <span id="item-count">0 items</span>
              </div>
            </div>
            <div id="table-container"></div>
          </main>
        </div>
      `;
    
    case 'item-detail':
      return `
        <div class="app-container">
          <div class="back-nav">
            <a href="/items" class="back-link">← Back to Items</a>
          </div>
          <div id="detail-container"></div>
        </div>
      `;
    
    case 'item-form':
      return `
        <div class="app-container">
          <header class="form-header">
            <h1 id="form-title">Create New Item</h1>
          </header>
          <div id="wizard-container" class="wizard-container">
            <div id="step-indicator" class="step-indicator"></div>
            <div id="step-content" class="step-content"></div>
            <div id="step-actions" class="step-actions"></div>
          </div>
        </div>
      `;
    
    default:
      return '<div class="error-state">Page not found</div>';
  }
}

function getPageModuleName(pageName) {
  // Convert page name to camelCase module name
  // items-list -> itemsListPage
  // item-detail -> itemDetailPage
  // item-form -> itemFormPage
  const parts = pageName.split('-');
  const camelCase = parts.map((part, index) => 
    index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)
  ).join('');
  return camelCase + 'Page';
}

export function getCurrentRoute() {
  return router ? router.getCurrentLocation() : null;
}
