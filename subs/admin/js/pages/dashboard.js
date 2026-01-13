// Dashboard Page - Main admin landing page
import { ActionCenter } from '../components/ActionCenter.js';
import { SystemMap } from '../components/SystemMap.js';
import { IrisPanel } from '../components/IrisPanel.js';

export async function renderDashboard(config) {
    const container = document.getElementById('app-container');
    
    // Show loading state
    container.innerHTML = '<div style="text-align: center; padding: 3rem;">Loading dashboard...</div>';
    
    try {
        // Initialize components
        const actionCenter = new ActionCenter();
        const systemMap = new SystemMap();
        const irisPanel = new IrisPanel();
        
        // Load data
        await Promise.all([
            actionCenter.init(),
            systemMap.init()
        ]);
        
        // Build dashboard layout
        container.innerHTML = '';
        
        // Add page title
        const title = document.createElement('h1');
        title.className = 'page-title';
        title.textContent = 'SpookyDecs Admin';
        container.appendChild(title);
        
        // Create dashboard grid
        const dashboardGrid = document.createElement('div');
        dashboardGrid.className = 'dashboard-container';
        
        // Left side: Action Center
        const mainContent = document.createElement('div');
        mainContent.className = 'main-content';
        mainContent.appendChild(actionCenter.render());
        
        // Right side: Iris Panel
        const irisContainer = irisPanel.render();
        
        dashboardGrid.appendChild(mainContent);
        dashboardGrid.appendChild(irisContainer);
        
        container.appendChild(dashboardGrid);
        
        // Add System Map below (full width)
        container.appendChild(systemMap.render());
        
    } catch (error) {
        console.error('Error rendering dashboard:', error);
        container.innerHTML = `
            <div style="text-align: center; padding: 3rem; color: var(--error);">
                <h2>Error Loading Dashboard</h2>
                <p>Please try refreshing the page.</p>
            </div>
        `;
    }
}
