// Main Application Entry Point

import { initRouter } from './utils/router.js';
import { renderMainPage } from './pages/main.js';
import { renderBuilder } from './pages/deployment-builder.js';
import { renderZonesDashboard } from './pages/deployment-zones.js';
import { renderZoneDetail } from './pages/zone-detail.js';
import { renderDeploymentSession } from './pages/deployment-session.js';

// Define routes
// IMPORTANT: Routes are matched in order - more specific routes MUST come before generic ones
const routes = [
  { 
    path: '/deployments', 
    handler: () => renderMainPage()
  },
  { 
    path: '/deployments/builder', 
    handler: () => renderBuilder()
  },
  { 
    path: '/deployments/historical', 
    handler: () => renderHistoricalPlaceholder()
  },
  { 
    path: '/deployments/graphs', 
    handler: () => renderGraphsPlaceholder()
  },
  { 
    path: '/deployments/stats', 
    handler: () => renderStatsPlaceholder()
  },
  { 
    path: '/deployments/:id/zones/:zone/session', 
    handler: (match) => {
      // Navigo passes match object with params directly, not nested in 'data'
      const params = match?.data || match;
      console.log('[Router] Session route params:', params);
      renderDeploymentSession(match);
    }
  },
  { 
    path: '/deployments/:id/zones/:zone', 
    handler: (match) => {
      // Navigo passes match object with params directly, not nested in 'data'
      const params = match?.data || match;
      console.log('[Router] Zone detail route params:', params);
      renderZoneDetail(params.id, params.zone);
    }
  },
  { 
    path: '/deployments/:id/zones', 
    handler: (match) => {
      const params = match?.data || match;
      console.log('[Router] Zones dashboard route params:', params);
      renderZonesDashboard(params.id);
    }
  },
  { 
    path: '/deployments/:id', 
    handler: (match) => {
      const params = match?.data || match;
      console.log('[Router] Deployment detail route params:', params);
      renderDetailPlaceholder(params.id);
    }
  }
];

// Initialize router
document.addEventListener('DOMContentLoaded', () => {
  initRouter(routes);
});

// Placeholder render functions (to be replaced with actual implementations)

function renderHistoricalPlaceholder() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div style="padding: 2rem; text-align: center;">
      <h2>Historical Deployments</h2>
      <p>Coming soon...</p>
      <button onclick="window.history.back()">← Back</button>
    </div>
  `;
}

function renderGraphsPlaceholder() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div style="padding: 2rem; text-align: center;">
      <h2>Deployment Graphs</h2>
      <p>Coming soon...</p>
      <button onclick="window.history.back()">← Back</button>
    </div>
  `;
}

function renderStatsPlaceholder() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div style="padding: 2rem; text-align: center;">
      <h2>Deployment Stats</h2>
      <p>Coming soon...</p>
      <button onclick="window.history.back()">← Back</button>
    </div>
  `;
}

function renderDetailPlaceholder(id) {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div style="padding: 2rem; text-align: center;">
      <h2>Deployment Detail</h2>
      <p>Viewing: ${id}</p>
      <button onclick="window.history.back()">← Back</button>
    </div>
  `;
}