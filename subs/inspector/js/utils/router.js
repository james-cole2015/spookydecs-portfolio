/**
 * Router Configuration
 * Sets up Navigo routes for inspector subdomain
 */

let router = null;

/**
 * Initialize router
 */
function initRouter() {
    router = new Navigo('/', { hash: false });

    // Define routes
    router
        .on('/inspector', () => {
            initializeState();
            renderInspectorDashboard();
        })
        .on('/inspector/rules/:ruleId', (params) => {
            renderRuleDetail(params.data.ruleId);
        })
        .on('/inspector/violations/:violationId', (params) => {
            renderViolationDetail(params.data.violationId);
        })
        .notFound(() => {
            // Redirect to dashboard if route not found
            router.navigate('/inspector');
        })
        .resolve();

    console.log('Router initialized');
}

/**
 * Navigate to route
 */
function navigateTo(path) {
    if (router) {
        router.navigate(path);
    }
}

/**
 * Get current route
 */
function getCurrentRoute() {
    return window.location.pathname;
}