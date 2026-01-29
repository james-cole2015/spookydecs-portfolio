// Router configuration for Items subdomain
// Uses Navigo for client-side routing (loaded globally via script tag)

let router = null;

/**
 * Initialize the router
 * @param {Object} routes - Route handlers
 */
export function initRouter(routes) {
  // Initialize router with root path
  router = new Navigo('/', { hash: false });
  
  console.log('🔧 Items router initialized');
  
  // Register routes in specific order
  router
    .on('/', () => {
      console.log('✅ Route matched: /');
      routes['/']();
    })
    .on('/create', () => {
      console.log('✅ Route matched: /create');
      routes['/create']();
    })
    .on('/:id/edit', ({ data }) => {
      console.log('✅ Route matched: /:id/edit', data);
      routes['/:id/edit']({ data });
    })
    .on('/:id', ({ data }) => {
      // Guard against reserved routes
      if (data.id === 'create') {
        console.log('   ⚠️ Skipping reserved route:', data.id);
        return false; // Don't handle, let /create route match instead
      }
      console.log('✅ Route matched: /:id', data);
      routes['/:id']({ data });
    })
    .notFound(() => {
      console.warn('❌ Route not found, redirecting to /');
      router.navigate('/');
    });
  
  // Resolve the initial route
  console.log('🚀 Resolving initial route...');
  router.resolve();
  
  return router;
}

/**
 * Navigate to a route
 * @param {string} path - Path to navigate to
 */
export function navigate(path) {
  console.log('🔄 Navigating to:', path);
  if (router) {
    router.navigate(path);
  } else {
    console.error('❌ Router not initialized');
  }
}

/**
 * Get current router instance
 */
export function getRouter() {
  return router;
}

/**
 * Generate URL with query params
 */
export function generateUrl(path, params = {}) {
  const query = new URLSearchParams(params).toString();
  return query ? `${path}?${query}` : path;
}