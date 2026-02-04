// Main Application Entry Point

import { initRouter } from './utils/router.js';
import { renderMainPage } from './pages/main.js';
import { renderBuilder } from './pages/deployment-builder.js';
import { renderZonesDashboard } from './pages/deployment-zones.js';

// Define routes
const routes = [
  { path: '/deployments', handler: () => renderMainPage() },
  { path: '/deployments/builder', handler: () => renderBuilder() },
  { path: '/deployments/:id/zones', handler: (params) => renderZonesDashboard(params.data.id) },
  { path: '/deployments/historical', handler: () => renderHistoricalPlaceholder() },
  { path: '/deployments/graphs', handler: () => renderGraphsPlaceholder() },
  { path: '/deployments/stats', handler: () => renderStatsPlaceholder() },
  { path: '/deployments/:id', handler: (params) => renderDetailPlaceholder(params.data.id) }
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
