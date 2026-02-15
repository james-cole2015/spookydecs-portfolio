// Deployment Stats Detail Page Handler
// Intra-deployment drill-down — single deployment with zones, charts, efficiency

import { getDeployment } from '../utils/deployment-api.js';
import { StatsDetailView } from '../components/stats/StatsDetailView.js';
import { navigate } from '../utils/router.js';

let _activeView = null;

export async function renderStatsDetailPage(deploymentId) {
  const app = document.getElementById('app');

  // Destroy any existing chart instances to avoid canvas reuse errors
  if (_activeView) {
    _activeView.destroy();
    _activeView = null;
  }

  app.innerHTML = `
    <div class="loading-container">
      <div class="spinner"></div>
      <p>Loading deployment details...</p>
    </div>
  `;

  try {
    console.log('[StatsDetail] Fetching deployment:', deploymentId);

    const response = await getDeployment(deploymentId, ['zones']);
    const deploymentData = response.data;

    const deployment = deploymentData.metadata || deploymentData;
    const zones = deploymentData.zones || [];

    console.log('[StatsDetail] Loaded:', { deployment, zones });

    _activeView = new StatsDetailView(deployment, zones);
    const container = _activeView.render();

    app.innerHTML = '';
    app.appendChild(container);

    // Back button
    container.querySelector('.btn-back')?.addEventListener('click', () => {
      navigate('/deployments/stats');
    });

  } catch (error) {
    console.error('[StatsDetail] Error loading deployment stats:', error);

    app.innerHTML = `
      <div class="error-container" style="padding:2rem;text-align:center;">
        <div style="font-size:3rem;margin-bottom:1rem;">⚠️</div>
        <h2>Failed to Load Deployment</h2>
        <p style="color:#6B7280;margin:0.5rem 0 1.5rem;">${error.message}</p>
        <button class="btn btn-secondary btn-back-stats" style="margin-right:0.5rem;">← Back to Stats</button>
        <button class="btn btn-primary btn-retry">Try Again</button>
      </div>
    `;

    app.querySelector('.btn-back-stats')?.addEventListener('click', () => {
      navigate('/deployments/stats');
    });

    app.querySelector('.btn-retry')?.addEventListener('click', () => {
      renderStatsDetailPage(deploymentId);
    });
  }
}