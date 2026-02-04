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
      router.on(path, handler);
    });
  } else {
    Object.entries(routes).forEach(([path, handler]) => {
      router.on(path, handler);
    });
  }

  // Handle not found
  router.notFound(() => {
    console.warn('Route not found, redirecting to /deployments');
    router.navigate('/deployments');
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