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
    // Format: { data: { id: '...', zone: '...' } }
    deploymentId = params.data.id;
    zoneCode = params.data.zone;
  } else if (params.id) {
    // Format: { id: '...', zone: '...' }
    deploymentId = params.id;
    zoneCode = params.zone;
  } else if (params.deploymentId) {
    // Format: { deploymentId: '...', zoneCode: '...' }
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
  
  // Show loading
  app.innerHTML = `
    <div class="session-page">
      <div class="loading-container">
        <div class="spinner"></div>
        <p>Loading session...</p>
      </div>
    </div>
  `;

  try {
    // Fetch deployment
    const deploymentResponse = await getDeployment(deploymentId, ['zones']);
    
    if (!deploymentResponse.success) {
      throw new Error('Failed to load deployment');
    }

    const { metadata, zones } = deploymentResponse.data;
    const zone = zones.find(z => z.zone_code === zoneCode);

    if (!zone) {
      throw new Error(`Zone ${zoneCode} not found`);
    }

    // Fetch sessions for this zone to find active session
    const { getZoneSessions } = await import('../utils/deployment-api.js');
    const sessionsResponse = await getZoneSessions(deploymentId, zoneCode);
    
    if (!sessionsResponse.success) {
      throw new Error('Failed to load sessions');
    }
    
    // Find active session (end_time is null)
    const activeSession = sessionsResponse.data.find(s => s.end_time === null);
    
    if (!activeSession) {
      throw new Error('No active session found. Please start a session first.');
    }
    
    console.log('[renderDeploymentSession] Active session:', activeSession);

    // Render connection builder
    renderConnectionBuilder(metadata, zone, activeSession);

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

function renderConnectionBuilder(deployment, zone, session) {
  const app = document.getElementById('app');
  app.innerHTML = '';
  
  // Create page container with breadcrumbs
  const pageContainer = document.createElement('div');
  pageContainer.className = 'session-page';
  
  // Add breadcrumbs with /builder prefix
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
  
  // Attach breadcrumb navigation
  breadcrumbs.querySelectorAll('.breadcrumb-link').forEach(link => {
    link.addEventListener('click', async (e) => {
      e.preventDefault();
      const path = link.dataset.path;
      const { navigate } = await import('../utils/router.js');
      navigate(path);
    });
  });
  
  pageContainer.appendChild(breadcrumbs);

  const builder = new ConnectionBuilder(deployment, zone, session);
  const container = builder.render();
  
  // Listen for end session event
  container.addEventListener('end-session', async (event) => {
    const notes = event.detail.notes;
    
    try {
      console.log('[deployment-session] Handling end-session event');
      await handleEndSession(deployment.deployment_id, session.session_id, notes, zone.zone_code);
      
      // Close any open modals (EndSessionReview)
      document.querySelectorAll('.review-modal').forEach(modal => modal.remove());
      
    } catch (error) {
      console.error('[deployment-session] Error in end-session handler:', error);
      // Don't close modal - let ConnectionBuilder's error handler deal with it
      throw error;
    }
  });
  
  pageContainer.appendChild(container);
  app.appendChild(pageContainer);
}

async function handleEndSession(deploymentId, sessionId, notes, zoneCode) {
  // Import at time of use to avoid circular dependency
  const { endSession } = await import('../utils/deployment-api.js');
  const { navigate } = await import('../utils/router.js');
  
  console.log('[deployment-session] Calling endSession API');
  
  const response = await endSession(deploymentId, sessionId, { notes });
  
  if (response.success) {
    console.log('[deployment-session] Session ended successfully, navigating...');
    // Navigate back to zone detail with /builder prefix
    navigate(`/deployments/builder/${deploymentId}/zones/${zoneCode}`);
  } else {
    throw new Error('Failed to end session');
  }
}