/**
 * Inspector Dashboard Page
 * Main dashboard with tabs for By Rule, By Item, and Orphaned Resources
 */

let statsBar = null;
let tabBar = null;
let currentView = null;

/**
 * Render Inspector Dashboard
 */
async function renderInspectorDashboard() {
    const container = document.getElementById('app-container');
    
    container.innerHTML = `
        <div class="inspector-container">
            <div class="inspector-header">
                <h1>🔍 System Inspector</h1>
                <button class="btn btn-primary" id="run-scan-btn" disabled title="Coming soon">
                    Run Scan
                </button>
            </div>

            <div id="stats-container"></div>
            <div id="tabs-container"></div>
            
            <div id="content-container">
                <!-- Dynamic content based on active tab -->
            </div>
        </div>
    `;

    // Initialize stats bar
    const statsContainer = document.getElementById('stats-container');
    statsBar = new StatsBar(statsContainer);
    await statsBar.loadStats();

    // Initialize tab bar
    const tabsContainer = document.getElementById('tabs-container');
    tabBar = new TabBar(tabsContainer, handleTabChange);
    tabBar.render();

    // Load initial tab content
    const currentTab = getCurrentTab();
    await loadTabContent(currentTab);
}

/**
 * Handle tab change
 */
async function handleTabChange(tab) {
    await loadTabContent(tab);
}

/**
 * Load content for active tab
 */
async function loadTabContent(tab) {
    const contentContainer = document.getElementById('content-container');
    
    // Cleanup previous view
    if (currentView && typeof currentView.destroy === 'function') {
        currentView.destroy();
    }

    switch (tab) {
        case 'by-rule':
            await renderByRuleTab(contentContainer);
            break;
        case 'by-item':
            await renderByItemTab(contentContainer);
            break;
        case 'orphaned':
            renderOrphanedTab(contentContainer);
            break;
        default:
            await renderByRuleTab(contentContainer);
    }
}

/**
 * Render By Rule tab
 */
async function renderByRuleTab(container) {
    container.innerHTML = '<div id="rules-list-container"></div>';
    
    const rulesContainer = document.getElementById('rules-list-container');
    const rulesList = new RulesList(rulesContainer);
    await rulesList.load();
    
    currentView = rulesList;
}

/**
 * Render By Item tab
 */
async function renderByItemTab(container) {
    container.innerHTML = '<div id="item-violations-container"></div>';
    
    const itemContainer = document.getElementById('item-violations-container');
    const itemView = new ItemViolationsView(itemContainer);
    await itemView.load();
    
    currentView = itemView;
}

/**
 * Render Orphaned Resources tab (placeholder)
 */
function renderOrphanedTab(container) {
    container.innerHTML = `
        <div class="coming-soon">
            <h2>Orphaned Resources</h2>
            <p>This feature is coming soon!</p>
            <p>Will display orphaned photos, empty storage containers, and stale deployment records.</p>
        </div>
    `;
    
    currentView = null;
}
