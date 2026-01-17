// Router configuration using Navigo
import { renderDashboard } from '../pages/dashboard.js';
import { renderAbout } from '../pages/about.js';

let router = null;

export function initRouter(config) {
    // Initialize Navigo router
    router = new Navigo('/admin', { hash: false });
    
    // Define routes
    router
        .on('/', () => {
            renderDashboard(config);
        })
        .on('/about', () => {
            renderAbout(config);
        })
        .notFound(() => {
            // Redirect to dashboard on 404
            router.navigate('/');
        })
        .resolve();
    
    return router;
}

export function navigate(path) {
    if (router) {
        router.navigate(path);
    }
}

export function getRouter() {
    return router;
}
