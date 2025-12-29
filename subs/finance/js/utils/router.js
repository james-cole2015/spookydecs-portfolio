// Router Configuration using Navigo

let router = null;

export function initRouter(routes) {
  router = new Navigo('/', { hash: false });
  
  // Register routes
  Object.entries(routes).forEach(([path, handler]) => {
    router.on(path, handler);
  });

  // Handle not found
  router.notFound(() => {
    console.warn('Route not found, redirecting to /finance');
    router.navigate('/finance');
  });

  // Resolve initial route
  router.resolve();
  
  return router;
}

export function navigate(path) {
  if (router) {
    router.navigate(path);
  } else {
    console.error('Router not initialized');
  }
}

export function getRouter() {
  return router;
}
