// Deployment Session Page
// Handles active connection building session

import { getDeployment, getSession } from '../utils/deployment-api.js';
import { ConnectionBuilder } from '../components/builder/ConnectionBuilder.js';

export async function renderDeploymentSession(params) {
  console.log('[renderDeploymentSession] Called with params:', params);
  
  const app = document.getElementById('app');
  
  // Extract parameters - Navigo may pass them in different formats
  let deploymentId, zoneCode;
  
  if (params.data) {
    deploymentId = params.data.id;
    zoneCode = params.data.zone;
  } else if (params.id) {
    deploymentId = params.id;
    zoneCode = params.zone;
  } else if (params.deploymentId) {
    deploymentId = params.deploymentId;
    zoneCode = params.zoneCode;
  } else {
    console.error('[renderDeploymentSession] Could not extract parameters from:', params);
  }
  
  console.log('[renderDeploymentSession] Extracted:', { deploymentId, zoneCode });
  
  if (!deploymentId || !zoneCode) {
    app.innerHTML = `
      <div class="error-container">
        <h2>Invalid Session</h2>
        <p>Missing deployment ID or zone code</p>
        <button class="btn btn-primary" onclick="window.history.back()">Go Back</button>
      </div>
    `;
    return;
  }
  
  app.innerHTML = `
    <div class="session-page">
      <div class="loading-container">
        <div class="spinner"></div>
        <p>Loading session...</p>
      </div>
    </div>
  `;

  try {
    const deploymentResponse = await getDeployment(deploymentId, ['zones']);
    
    if (!deploymentResponse.success) {
      throw new Error('Failed to load deployment');
    }

    const { metadata, zones } = deploymentResponse.data;
    const zone = zones.find(z => z.zone_code === zoneCode);

    if (!zone) {
      throw new Error(`Zone ${zoneCode} not found`);
    }

    const { getZoneSessions } = await import('../utils/deployment-api.js');
    const sessionsResponse = await getZoneSessions(deploymentId, zoneCode);
    
    if (!sessionsResponse.success) {
      throw new Error('Failed to load sessions');
    }
    
    const activeSession = sessionsResponse.data.find(s => s.end_time === null);
    
    if (!activeSession) {
      throw new Error('No active session found. Please start a session first.');
    }
    
    console.log('[renderDeploymentSession] Active session:', activeSession);

    // Pass all zones so ConnectionBuilder can filter already-deployed items cross-zone
    renderConnectionBuilder(metadata, zone, activeSession, zones);

  } catch (error) {
    console.error('[renderDeploymentSession] Error:', error);
    app.innerHTML = `
      <div class="error-container">
        <h2>Error Loading Session</h2>
        <p>${error.message}</p>
        <button class="btn btn-primary" onclick="window.history.back()">Go Back</button>
      </div>
    `;
  }
}

function renderConnectionBuilder(deployment, zone, session, zones) {
  const app = document.getElementById('app');
  app.innerHTML = '';
  
  const pageContainer = document.createElement('div');
  pageContainer.className = 'session-page';
  
  const breadcrumbs = document.createElement('div');
  breadcrumbs.className = 'breadcrumbs';
  breadcrumbs.innerHTML = `
    <a href="#" class="breadcrumb-link" data-path="/deployments">Deployments</a>
    <span class="breadcrumb-separator">›</span>
    <a href="#" class="breadcrumb-link" data-path="/deployments/builder/${deployment.deployment_id}/zones">${deployment.season} ${deployment.year}</a>
    <span class="breadcrumb-separator">›</span>
    <a href="#" class="breadcrumb-link" data-path="/deployments/builder/${deployment.deployment_id}/zones/${zone.zone_code}">${zone.zone_name}</a>
    <span class="breadcrumb-separator">›</span>
    <span class="breadcrumb-current">Active Session</span>
  `;
  
  breadcrumbs.querySelectorAll('.breadcrumb-link').forEach(link => {
    link.addEventListener('click', async (e) => {
      e.preventDefault();
      const path = link.dataset.path;
      const { navigate } = await import('../utils/router.js');
      navigate(path);
    });
  });
  
  pageContainer.appendChild(breadcrumbs);

  const builder = new ConnectionBuilder(deployment, zone, session, zones);
  const container = builder.render();
  
  container.addEventListener('end-session', async (event) => {
    const notes = event.detail.notes;
    
    try {
      console.log('[deployment-session] Handling end-session event');
      await handleEndSession(deployment.deployment_id, session.session_id, notes, zone.zone_code);
      document.querySelectorAll('.review-modal').forEach(modal => modal.remove());
      
    } catch (error) {
      console.error('[deployment-session] Error in end-session handler:', error);
      throw error;
    }
  });
  
  pageContainer.appendChild(container);
  app.appendChild(pageContainer);
}

async function handleEndSession(deploymentId, sessionId, notes, zoneCode) {
  const { endSession } = await import('../utils/deployment-api.js');
  const { navigate } = await import('../utils/router.js');
  
  console.log('[deployment-session] Calling endSession API');
  
  const response = await endSession(deploymentId, sessionId, { notes });
  
  if (response.success) {
    console.log('[deployment-session] Session ended successfully, navigating...');
    navigate(`/deployments/builder/${deploymentId}/zones/${zoneCode}`);
  } else {
    throw new Error('Failed to end session');
  }
}