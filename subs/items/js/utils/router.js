// Router configuration for Items subdomain
// Uses Navigo for client-side routing (loaded globally via script tag)

let router = null;

/**
 * Initialize the router
 * @param {Object} routes - Route handlers
 */
export function initRouter(routes) {
  router = new Navigo('/', { hash: false });
  
  // Register routes
  Object.keys(routes).forEach(path => {
    router.on(path, routes[path]);
  });
  
  // Not found handler
  router.notFound(() => {
    console.warn('Route not found, redirecting to /');
    router.navigate('/');
  });
  
  // Resolve the initial route
  router.resolve();
  
  return router;
}

/**
 * Navigate to a route
 * @param {string} path - Path to navigate to
 */
export function navigate(path) {
  if (router) {
    router.navigate(path);
  } else {
    console.error('Router not initialized');
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