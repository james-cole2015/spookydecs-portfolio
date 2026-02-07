// Router Configuration (Navigo)
// Note: Navigo is loaded as a global via CDN in index.html

let router = null;

export function initRouter(routes) {
  // Use global Navigo
  if (typeof Navigo === 'undefined') {
    throw new Error('Navigo library not loaded');
  }

  router = new Navigo('/', { hash: false, strategy: 'ONE' });

  // Register routes individually to ensure proper order
  // Navigo matches routes in registration order when using ONE strategy
  if (Array.isArray(routes)) {
    routes.forEach(({ path, handler }) => {
      router.on(path, (match) => {
        // Extract params from match object
        // Navigo with ONE strategy passes params directly in match.data or match.params
        const params = match?.data?.params || match?.params || match?.data || {};
        console.log(`[Router] Matched route: ${path}`, params);
        handler(params);
      });
    });
  } else {
    Object.entries(routes).forEach(([path, handler]) => {
      router.on(path, (match) => {
        const params = match?.data?.params || match?.params || match?.data || {};
        console.log(`[Router] Matched route: ${path}`, params);
        handler(params);
      });
    });
  }

  // Handle not found - updated to prevent flash during navigation
  router.notFound(() => {
    const currentPath = window.location.pathname;
    console.warn('Route not found:', currentPath);
    
    // Only redirect if we're truly on an unknown route
    // Don't redirect if already on a /deployments route (prevents flash during navigation)
    if (!currentPath.startsWith('/deployments')) {
      console.log('Redirecting to /deployments from:', currentPath);
      router.navigate('/deployments');
    } else {
      console.log('Route not matched but staying on deployments path:', currentPath);
      // Don't redirect - let the route settle
    }
  });

  // Resolve initial route
  router.resolve();

  return router;
}

export function getRouter() {
  return router;
}

export function navigate(path) {
  if (router) {
    router.navigate(path);
  }
}