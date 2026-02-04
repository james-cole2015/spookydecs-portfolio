// deployment-session.js
// Page orchestrator for active deployment session

import { getDeployment, createSession, endSession, getSession } from '../utils/deployment-api.js';
import { createSessionStartModal } from '../components/builder/SessionStartModal.js';
import { ConnectionBuilder } from '../components/builder/ConnectionBuilder.js';
import { navigate } from '../utils/router.js';

let currentDeployment = null;
let currentZone = null;
let currentSession = null;
let connectionBuilder = null;

export async function renderDeploymentSession({ data }) {
  const { deploymentId, zoneCode } = data;
  const appContainer = document.getElementById('app');
  
  try {
    // Load deployment with zones
    const response = await getDeployment(deploymentId, ['zones']);
    currentDeployment = response.data.metadata;
    const zones = response.data.zones || [];
    
    // Find the requested zone
    currentZone = zones.find(z => z.zone_code === zoneCode);
    
    if (!currentZone) {
      throw new Error(`Zone ${zoneCode} not found`);
    }
    
    // Check if there's an active session for this zone
    const hasActiveSession = await checkActiveSession(deploymentId, zoneCode);
    
    if (hasActiveSession) {
      // Resume existing session
      await loadSession(deploymentId, zoneCode);
      renderConnectionBuilder(appContainer);
    } else {
      // Show start session modal
      showStartSessionModal(appContainer);
    }
    
  } catch (error) {
    console.error('Error loading session:', error);
    appContainer.innerHTML = `
      <div class="error-container">
        <h2>Error Loading Session</h2>
        <p>${error.message}</p>
        <button class="btn btn-primary" onclick="window.history.back()">Go Back</button>
      </div>
    `;
  }
}

async function checkActiveSession(deploymentId, zoneCode) {
  // Check if zone status is in_progress
  return currentZone.status === 'in_progress';
}

async function loadSession(deploymentId, zoneCode) {
  // Find the most recent session for this zone
  // This is simplified - you may need to query sessions differently
  // For now, we'll check the zone for an active session reference
  
  // Placeholder: In production, you'd query for active sessions
  // For now, we'll create a mock session object
  currentSession = {
    deployment_item_id: `SESSION-${zoneCode}-ACTIVE`,
    zone_code: zoneCode,
    started_at: new Date().toISOString(),
    ended_at: null
  };
}

function showStartSessionModal(container) {
  const modal = createSessionStartModal(
    currentZone.zone_name,
    currentZone.zone_code,
    async (zoneCode) => {
      await startSession(zoneCode);
      renderConnectionBuilder(container);
    },
    () => {
      // User cancelled, go back to zones
      if (currentDeployment) {
        navigate(`/deployments/${currentDeployment.deployment_id}/zones`);
      } else {
        navigate('/deployments');
      }
    }
  );
  
  document.body.appendChild(modal);
}

async function startSession(zoneCode) {
  try {
    if (!currentDeployment) {
      throw new Error('Deployment not loaded');
    }
    
    const response = await createSession(currentDeployment.deployment_id, {
      zone_code: zoneCode
    });
    
    currentSession = response.data;
    
  } catch (error) {
    console.error('Error starting session:', error);
    throw error;
  }
}

function renderConnectionBuilder(container) {
  container.innerHTML = `
    <div class="page-container">
      <div id="connection-builder-mount"></div>
    </div>
  `;
  
  const mountPoint = container.querySelector('#connection-builder-mount');
  
  connectionBuilder = new ConnectionBuilder(
    currentDeployment,
    currentZone,
    currentSession
  );
  
  const builderElement = connectionBuilder.render();
  mountPoint.appendChild(builderElement);
  
  // Listen for end session event
  builderElement.addEventListener('end-session', async (e) => {
    const { notes } = e.detail;
    await handleEndSession(notes);
  });
}

async function handleEndSession(notes) {
  const confirmed = confirm(
    'Are you sure you want to end this work session? This will calculate your work time and update deployment statistics.'
  );
  
  if (!confirmed) return;
  
  try {
    await endSession(
      currentDeployment.deployment_id,
      currentSession.deployment_item_id,
      { notes }
    );
    
    // Show success message
    alert('Session ended successfully!');
    
    // Navigate back to zones dashboard
    navigate(`/deployments/${currentDeployment.deployment_id}/zones`);
    
  } catch (error) {
    console.error('Error ending session:', error);
    alert('Failed to end session: ' + error.message);
  }
}