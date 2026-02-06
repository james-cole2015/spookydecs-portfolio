// Zone Detail Page
// Shows zone overview, session history, and quick actions

import { navigate } from '../utils/router.js';
import { getDeployment, getZoneSessions, createSession, endSession } from '../utils/deployment-api.js';
import { ZoneDetailView } from '../components/builder/ZoneDetailView.js';

export async function renderZoneDetail(deploymentId, zoneCode) {
  const app = document.getElementById('app');
  
  // Show loading state
  app.innerHTML = `
    <div class="zone-detail-page">
      <div class="loading-container">
        <div class="spinner"></div>
        <p>Loading zone details...</p>
      </div>
    </div>
  `;

  try {
    // Fetch deployment and zone data
    const deploymentResponse = await getDeployment(deploymentId, ['zones']);
    
    if (!deploymentResponse.success) {
      throw new Error('Failed to load deployment');
    }

    const { metadata, zones } = deploymentResponse.data;
    const zone = zones.find(z => z.zone_code === zoneCode);

    if (!zone) {
      throw new Error(`Zone ${zoneCode} not found`);
    }

    // Fetch sessions for this zone
    const sessionsResponse = await getZoneSessions(deploymentId, zoneCode);
    const sessions = sessionsResponse.success ? sessionsResponse.data : [];

    // Check for active session
    const activeSession = sessions.find(s => s.end_time === null);

    // Render page
    renderZoneDetailView(metadata, zone, sessions, activeSession);

  } catch (error) {
    console.error('Error loading zone details:', error);
    app.innerHTML = `
      <div class="zone-detail-page">
        <div class="error-container">
          <h2>Error Loading Zone</h2>
          <p>${error.message}</p>
          <button class="btn btn-primary" onclick="window.history.back()">
            Go Back
          </button>
        </div>
      </div>
    `;
  }
}

function renderZoneDetailView(deployment, zone, sessions, activeSession) {
  const app = document.getElementById('app');
  
  // Clear loading state
  app.innerHTML = '';
  
  // Create page container
  const pageContainer = document.createElement('div');
  pageContainer.className = 'zone-detail-page';
  
  // Add breadcrumbs
  const breadcrumbs = document.createElement('div');
  breadcrumbs.className = 'breadcrumbs';
  breadcrumbs.innerHTML = `
    <a href="#" class="breadcrumb-link" data-path="/deployments">Deployments</a>
    <span class="breadcrumb-separator">›</span>
    <a href="#" class="breadcrumb-link" data-path="/deployments/${deployment.deployment_id}/zones">${deployment.season} ${deployment.year}</a>
    <span class="breadcrumb-separator">›</span>
    <span class="breadcrumb-current">${zone.zone_name}</span>
  `;
  
  // Attach breadcrumb navigation
  breadcrumbs.querySelectorAll('.breadcrumb-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const path = link.dataset.path;
      navigate(path);
    });
  });
  
  pageContainer.appendChild(breadcrumbs);
  
  // Create view container
  const container = document.createElement('div');
  container.className = 'zone-detail-container';
  
  // Render zone detail view
  const detailView = new ZoneDetailView(deployment, zone, sessions, activeSession);
  container.appendChild(detailView.render());
  
  pageContainer.appendChild(container);
  
  // Attach event listeners
  attachEventHandlers(pageContainer, deployment, zone, activeSession);
  
  app.appendChild(pageContainer);
}

function attachEventHandlers(container, deployment, zone, activeSession) {
  const deploymentId = deployment.deployment_id;
  const zoneCode = zone.zone_code;
  
  // Back button
  const backBtn = container.querySelector('.btn-back');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      navigate(`/deployments/${deploymentId}/zones`);
    });
  }
  
  // Start new session button
  const startSessionBtn = container.querySelector('.btn-start-session');
  if (startSessionBtn) {
    startSessionBtn.addEventListener('click', async () => {
      await handleStartSession(deploymentId, zoneCode);
    });
  }
  
  // Resume session button
  const resumeSessionBtn = container.querySelector('.btn-resume-session');
  if (resumeSessionBtn) {
    resumeSessionBtn.addEventListener('click', () => {
      navigate(`/deployments/${deploymentId}/zones/${zoneCode}/session`);
    });
  }
  
  // End session button
  const endSessionBtn = container.querySelector('.btn-end-session');
  if (endSessionBtn && activeSession) {
    endSessionBtn.addEventListener('click', async () => {
      await handleEndSession(deploymentId, activeSession.session_id);
    });
  }
  
  // View items button
  const viewItemsBtn = container.querySelector('.btn-view-items');
  if (viewItemsBtn) {
    viewItemsBtn.addEventListener('click', () => {
      // TODO: Implement item list view for zone
      showToast('Item list view coming soon', 'info');
    });
  }
}

async function handleStartSession(deploymentId, zoneCode) {
  try {
    console.log('[handleStartSession] Creating session for:', { deploymentId, zoneCode });
    showToast('Starting session...', 'info');
    
    const response = await createSession(deploymentId, { zone_code: zoneCode });
    
    console.log('[handleStartSession] Session created:', response);
    
    if (response.success) {
      showToast('Session started', 'success');
      // Navigate to connection builder with correct route
      const sessionPath = `/deployments/${deploymentId}/zones/${zoneCode}/session`;
      console.log('[handleStartSession] Navigating to:', sessionPath);
      navigate(sessionPath);
    } else {
      throw new Error('Failed to start session');
    }
    
  } catch (error) {
    console.error('[handleStartSession] Error:', error);
    showToast(error.message || 'Failed to start session', 'error');
  }
}

async function handleEndSession(deploymentId, sessionId) {
  const notes = prompt('Add notes for this session (optional):');
  
  if (notes === null) return; // User cancelled
  
  try {
    showToast('Ending session...', 'info');
    
    const response = await endSession(deploymentId, sessionId, { notes });
    
    if (response.success) {
      showToast('Session ended', 'success');
      // Reload page to refresh data
      window.location.reload();
    } else {
      throw new Error('Failed to end session');
    }
    
  } catch (error) {
    console.error('Error ending session:', error);
    showToast(error.message || 'Failed to end session', 'error');
  }
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}