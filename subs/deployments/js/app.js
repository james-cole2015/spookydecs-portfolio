// Main Application Entry Point

import { initRouter } from './utils/router.js';
import { renderMainPage } from './pages/main.js';
import { renderBuilder } from './pages/deployment-builder.js';
import { renderZonesDashboard } from './pages/deployment-zones.js';
import { renderZoneDetail } from './pages/zone-detail.js';
import { renderDeploymentSession } from './pages/deployment-session.js';
import { renderSessionDetail } from './pages/session-detail.js';
import { renderConnectionDetail } from './pages/connection-detail.js';
import { renderStagingPage } from './pages/deployment-staging.js';
import { renderCompletePage } from './pages/deployment-complete.js';


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

  // STAGING - must come BEFORE all :id/zones* routes
  { 
    path: '/deployments/builder/:id/staging', 
    handler: (params) => {
      console.log('[Router] Staging route params:', params);
      renderStagingPage(params.id);
    }
  },

  // COMPLETE - must come BEFORE :id/zones/:zone and :id/zones to avoid wildcard collision
  {
    path: '/deployments/builder/:id/zones/complete',
    handler: (params) => {
      console.log('[Router] Complete route params:', params);
      renderCompletePage(params.id);
    }
  },

  // SESSION DETAIL ROUTE - Most specific zone route, must come first
  { 
    path: '/deployments/builder/:id/zones/:zone/sessions/:sessionId', 
    handler: (params) => {
      console.log('[Router] Session detail route params:', params);
      renderSessionDetail(params.id, params.zone, params.sessionId);
    }
  },
  // ACTIVE SESSION ROUTE - Must come before zone detail route
  { 
    path: '/deployments/builder/:id/zones/:zone/session', 
    handler: (params) => {
      console.log('[Router] Active session route params:', params);
      renderDeploymentSession(params);
    }
  },
  // ZONE DETAIL ROUTE
  { 
    path: '/deployments/builder/:id/zones/:zone', 
    handler: (params) => {
      console.log('[Router] Zone detail route params:', params);
      renderZoneDetail(params.id, params.zone);
    }
  },
  // ZONES DASHBOARD
  { 
    path: '/deployments/builder/:id/zones', 
    handler: (params) => {
      console.log('[Router] Zones dashboard route params:', params);
      renderZonesDashboard(params.id);
    }
  },
  // CONNECTION DETAIL ROUTE - Must come AFTER all zone routes (least specific)
  { 
    path: '/deployments/builder/:deploymentId/:sessionId/:connectionId', 
    handler: (params) => {
      console.log('[Router] Connection detail route params:', params);
      renderConnectionDetail(params.deploymentId, params.sessionId, params.connectionId);
    }
  },
  { 
    path: '/deployments/:id', 
    handler: (params) => {
      console.log('[Router] Deployment detail route params:', params);
      renderDetailPlaceholder(params.id);
    }
  }
];

// Initialize router
document.addEventListener('DOMContentLoaded', () => {
  initRouter(routes);
});

// Placeholder render functions

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