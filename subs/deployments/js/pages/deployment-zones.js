// Deployment Zones Dashboard Page Handler

import { getDeployment, getActiveSessions } from '../utils/deployment-api.js';
import { ZoneCards } from '../components/builder/ZoneCards.js';
import { navigate } from '../utils/router.js';

export async function renderZonesDashboard(deploymentId) {
  console.log('[ZonesDashboard] Render called with deploymentId:', deploymentId);
  
  const app = document.getElementById('app');
  
  // Show loading state
  app.innerHTML = `
    <div class="loading-container">
      <div class="spinner"></div>
      <p>Loading deployment zones...</p>
    </div>
  `;
  
  try {
    console.log('[ZonesDashboard] Fetching deployment:', deploymentId);
    
    // Fetch deployment with zones and active sessions in parallel
    const [deploymentResponse, activeSessionsResponse] = await Promise.all([
      getDeployment(deploymentId, ['zones']),
      getActiveSessions(deploymentId).catch(err => {
        console.warn('[ZonesDashboard] Could not fetch active sessions:', err);
        return { data: [] };
      })
    ]);

    const deploymentData = deploymentResponse.data;
    
    console.log('[ZonesDashboard] Loaded deployment:', deploymentData);
    console.log('[ZonesDashboard] Active sessions:', activeSessionsResponse.data);
    
    // Build zone_code → session map from active sessions
    const activeSessions = {};
    (activeSessionsResponse.data || []).forEach(session => {
      if (session.zone_code) {
        activeSessions[session.zone_code] = session;
      }
    });

    // Check structure and extract accordingly
    let deployment, zones;
    
    if (deploymentData.metadata && deploymentData.zones) {
      deployment = deploymentData.metadata;
      zones = deploymentData.zones;
    } else if (Array.isArray(deploymentData.zones)) {
      deployment = deploymentData;
      zones = deploymentData.zones;
    } else {
      throw new Error('Unexpected deployment data structure');
    }
    
    if (!zones || zones.length === 0) {
      throw new Error('No zones found for this deployment');
    }

    const status = deployment.status || 'unknown';
    const teardownEnabled = ['completed', 'active_teardown', 'archived'].includes(status);
    
    // Render zones dashboard
    const container = document.createElement('div');
    container.className = 'zones-dashboard-container';
    
    container.innerHTML = `
      <div class="zones-header">
        <button class="btn-back">← Back to Deployments</button>
        <div class="deployment-info">
          <h1>${deployment.deployment_id || deploymentId}</h1>
          <p class="deployment-meta">
            <span class="season-badge">${deployment.season || 'Unknown'}</span>
            <span class="year-badge">${deployment.year || 'N/A'}</span>
            <span class="status-badge status-${status}">${status.replace(/_/g, ' ')}</span>
          </p>
        </div>
      </div>
      
      <div class="zones-section-header">
        <h2>Builder Administration</h2>
      </div>
      
      <div class="staging-section">
        <div class="staging-card zone-card" data-nav="/deployments/builder/${deploymentId}/staging">
          <div class="card-header">
            <div class="card-icon">📦</div>
            <h2>Staging Area</h2>
          </div>
          <div class="card-content">
            <p class="card-description">Prepare totes and items for deployment</p>
          </div>
          <div class="card-footer">
            <span class="card-action">Stage Items →</span>
          </div>
        </div>

        <div class="staging-card zone-card" data-nav="/deployments/builder/${deploymentId}/zones/complete">
          <div class="card-header">
            <div class="card-icon">✅</div>
            <h2>Complete Deployment</h2>
          </div>
          <div class="card-content">
            <p class="card-description">Finalize all records, mark items as deployed, and lock the deployment.</p>
          </div>
          <div class="card-footer">
            <span class="card-action">Review &amp; Complete →</span>
          </div>
        </div>

        ${teardownEnabled
          ? `<div class="staging-card zone-card" data-nav="/deployments/builder/${deploymentId}/teardown">
              <div class="card-header">
                <div class="card-icon">🧹</div>
                <h2>Deployment Teardown</h2>
              </div>
              <div class="card-content">
                <p class="card-description">Begin removing items after the season ends and return them to storage.</p>
              </div>
              <div class="card-footer">
                <span class="card-action">Start Teardown →</span>
              </div>
            </div>`
          : `<div class="zone-card zone-card--placeholder">
              <div class="card-header">
                <div class="card-icon">🧹</div>
                <h2>Deployment Teardown</h2>
              </div>
              <div class="card-content">
                <p class="card-description">Begin removing items after the season ends and return them to storage.</p>
              </div>
              <div class="card-footer">
                <span class="card-action card-action--disabled">Available after completion 🔒</span>
              </div>
            </div>`
        }
      </div>
      
      <div class="zones-section-header">
        <h2>Deployment Zones</h2>
      </div>
    `;
    
    // Create and append zone cards, passing active sessions map
    const zoneCards = new ZoneCards(deployment.deployment_id || deploymentId, zones, activeSessions);
    const cardsContainer = zoneCards.render();
    container.appendChild(cardsContainer);
    
    app.innerHTML = '';
    app.appendChild(container);
    
    // Attach event handlers
    attachEventHandlers(deployment.deployment_id || deploymentId);
    
  } catch (error) {
    console.error('[ZonesDashboard] Error loading deployment:', error);
    
    app.innerHTML = `
      <div class="error-container">
        <div class="error-icon">⚠️</div>
        <h2>Failed to Load Deployment</h2>
        <p>${error.message}</p>
        <button class="btn btn-primary btn-back">← Back to Deployments</button>
      </div>
    `;
    
    app.querySelector('.btn-back')?.addEventListener('click', () => {
      navigate('/deployments');
    });
  }
}

function attachEventHandlers(deploymentId) {
  // Back button
  document.querySelector('.btn-back')?.addEventListener('click', () => {
    navigate('/deployments');
  });
  
  // Staging/action card clicks
  document.querySelectorAll('.staging-card').forEach(card => {
    card.addEventListener('click', (e) => {
      const navPath = e.currentTarget.dataset.nav;
      if (navPath) {
        navigate(navPath);
      }
    });
  });
  
  // Zone card clicks
  document.querySelectorAll('.zone-card:not(.staging-card)').forEach(card => {
    card.addEventListener('click', () => {
      const zoneCode = card.dataset.zoneCode;
      if (zoneCode) {
        navigate(`/deployments/builder/${deploymentId}/zones/${zoneCode}`);
      }
    });
  });
}