// Deployment Stats Page Handler
// Inter-deployment overview — lists all deployments with aggregate stats

import { listDeployments } from '../utils/deployment-api.js';
import { StatsView } from '../components/stats/StatsView.js';
import { navigate } from '../utils/router.js';

export async function renderStatsPage() {
  const app = document.getElementById('app');

  app.innerHTML = `
    <div class="loading-container">
      <div class="spinner"></div>
      <p>Loading deployment stats...</p>
    </div>
  `;

  try {
    console.log('[Stats] Fetching all deployments');

    const response = await listDeployments();
    const deployments = response.data || [];

    console.log('[Stats] Loaded deployments:', deployments.length);

    const view = new StatsView(deployments);
    const container = view.render();

    app.innerHTML = '';
    app.appendChild(container);

    // Back button
    container.querySelector('.btn-back')?.addEventListener('click', () => {
      navigate('/deployments');
    });

    // Navigate to detail when row clicked
    container.addEventListener('stats-detail-navigate', (e) => {
      navigate(`/deployments/stats/${e.detail.deploymentId}`);
    });

  } catch (error) {
    console.error('[Stats] Error loading stats:', error);

    app.innerHTML = `
      <div class="error-container" style="padding:2rem;text-align:center;">
        <div style="font-size:3rem;margin-bottom:1rem;">⚠️</div>
        <h2>Failed to Load Stats</h2>
        <p style="color:#6B7280;margin:0.5rem 0 1.5rem;">${error.message}</p>
        <button class="btn btn-primary btn-retry">Try Again</button>
      </div>
    `;

    app.querySelector('.btn-retry')?.addEventListener('click', () => {
      renderStatsPage();
    });
  }
}