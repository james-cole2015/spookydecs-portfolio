// Deployment Zones Dashboard
// Shows zone cards after deployment creation

import { navigate } from '../utils/router.js';
import { getDeployment } from '../utils/deployment-api.js';
import { DEPLOYMENT_CONFIG, getStatusLabel } from '../utils/deployment-config.js';
import { ZoneCards } from '../components/builder/ZoneCards.js';

export async function renderZonesDashboard(deploymentId) {
  const app = document.getElementById('app');
  
  // Show loading state
  app.innerHTML = `
    <div class="zones-page">
      <div class="loading-container">
        <div class="spinner"></div>
        <p>Loading deployment...</p>
      </div>
    </div>
  `;

  try {
    // Fetch deployment with zones
    const response = await getDeployment(deploymentId, ['zones']);
    
    if (!response.success) {
      throw new Error('Failed to load deployment');
    }

    const { metadata, zones } = response.data;

    // Render page
    app.innerHTML = `
      <div class="zones-page">
        <div class="zones-header">
          <button class="btn-back" id="backBtn">
            ← Back to Deployments
          </button>
          
          <div class="deployment-info">
            <h1>${metadata.season} ${metadata.year}</h1>
            <div class="deployment-meta">
              <span class="status-badge" style="background: ${getStatusColor(metadata.status)}">
                ${getStatusLabel(metadata.status)}
              </span>
              <span class="meta-item">
                ${metadata.statistics.total_items} items deployed
              </span>
            </div>
          </div>

          ${metadata.notes ? `<p class="deployment-notes">${metadata.notes}</p>` : ''}
        </div>

        <div class="zones-container" id="zonesContainer"></div>
      </div>
    `;

    // Attach back button
    document.getElementById('backBtn').addEventListener('click', () => {
      navigate('/deployments');
    });

    // Render zone cards
    const zonesContainer = document.getElementById('zonesContainer');
    const zoneCards = new ZoneCards(deploymentId, zones);
    zonesContainer.appendChild(zoneCards.render());

  } catch (error) {
    console.error('Error loading deployment:', error);
    app.innerHTML = `
      <div class="zones-page">
        <div class="error-container">
          <h2>Error Loading Deployment</h2>
          <p>${error.message}</p>
          <button class="btn btn-primary" onclick="window.history.back()">
            Go Back
          </button>
        </div>
      </div>
    `;
  }
}

function getStatusColor(status) {
  const colors = {
    'pre-deployment': '#9CA3AF',
    'active_setup': '#3B82F6',
    'completed': '#10B981',
    'active_teardown': '#F59E0B',
    'archived': '#6B7280'
  };
  
  return colors[status] || '#9CA3AF';
}