// Router Configuration using Navigo

let router = null;

export function initRouter(routes) {
  console.log('Initializing router with routes:', Object.keys(routes));
  router = new Navigo('/', { hash: false });
  
  // Register routes
  Object.entries(routes).forEach(([path, handler]) => {
    console.log('Registering route:', path);
    router.on(path, handler);
  });
  
  // Also register root path
  router.on('/', routes['/finance']);
  console.log('Registered root path to /finance handler');

  // Handle not found
  router.notFound(() => {
    console.warn('Route not found, redirecting to /finance');
    router.navigate('/finance');
  });

  // Resolve initial route
  console.log('Resolving initial route...');
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
