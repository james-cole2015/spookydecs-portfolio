// Deployment Zones Dashboard Page Handler

import { getDeployment } from '../utils/deployment-api.js';
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
    
    // Fetch deployment with zones
    const response = await getDeployment(deploymentId, ['zones']);
    const deploymentData = response.data;
    
    console.log('[ZonesDashboard] Loaded deployment:', deploymentData);
    console.log('[ZonesDashboard] Deployment structure:', {
      hasMetadata: 'metadata' in deploymentData,
      hasZones: 'zones' in deploymentData,
      keys: Object.keys(deploymentData)
    });
    
    // Check structure and extract accordingly
    let deployment, zones;
    
    if (deploymentData.metadata && deploymentData.zones) {
      // API returns {metadata: {...}, zones: [...]}
      deployment = deploymentData.metadata;
      zones = deploymentData.zones;
    } else if (Array.isArray(deploymentData.zones)) {
      // API returns deployment object with zones array
      deployment = deploymentData;
      zones = deploymentData.zones;
    } else {
      throw new Error('Unexpected deployment data structure');
    }
    
    if (!zones || zones.length === 0) {
      throw new Error('No zones found for this deployment');
    }
    
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
            <span class="status-badge status-${deployment.status || 'unknown'}">${(deployment.status || 'unknown').replace(/_/g, ' ')}</span>
          </p>
        </div>
      </div>
      
      <div class="zones-section-header">
        <h2>Setup</h2>
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
      </div>
      
      <div class="zones-section-header">
        <h2>Deployment Zones</h2>
      </div>
    `;
    
    // Create and append zone cards
    const zoneCards = new ZoneCards(deployment.deployment_id || deploymentId, zones);
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
  
  // Staging card click
  document.querySelector('.staging-card')?.addEventListener('click', (e) => {
    const navPath = e.currentTarget.dataset.nav;
    if (navPath) {
      navigate(navPath);
    }
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