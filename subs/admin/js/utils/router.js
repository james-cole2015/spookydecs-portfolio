// Router configuration using Navigo
import { renderDashboard } from '../pages/dashboard.js';
import { renderAbout } from '../pages/about.js';
import { renderSearchText } from '../pages/search-text.js';

let router = null;

export function initRouter(config) {
    // Initialize Navigo router with /admin as root
    router = new Navigo('/admin');
    
    // Define routes
    router
        .on('/', async () => {
            console.log('📍 Navigating to: Dashboard');
            try {
                await renderDashboard(config);
            } catch (error) {
                console.error('Error rendering dashboard:', error);
            }
        })
        .on('/about', async () => {
            console.log('📍 Navigating to: About');
            try {
                await renderAbout(config);
            } catch (error) {
                console.error('Error rendering about page:', error);
            }
        })
        .on('/search-text', async () => {
            console.log('📍 Navigating to: Search Text Manager');
            try {
                await renderSearchText(config);
            } catch (error) {
                console.error('Error rendering search text page:', error);
            }
        })
        .notFound(() => {
            console.log('📍 Route not found, redirecting to dashboard');
            router.navigate('/');
        });
    
    // Resolve routes
    router.resolve();
    
    return router;
}

export function navigate(path) {
    if (router) {
        router.navigate(path);
    } else {
        console.warn('Router not initialized');
    }
}

export function getRouter() {
    return router;
}