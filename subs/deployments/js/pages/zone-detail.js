// Zone Detail Page Handler

import { getDeployment, getZoneSessions, createSession, endSession } from '../utils/deployment-api.js';
import { ZoneDetailView } from '../components/builder/ZoneDetailView.js';
import { navigate } from '../utils/router.js';
import { createSessionStartModal } from '../components/builder/SessionStartModal.js';

export async function renderZoneDetail(deploymentId, zoneCode) {
  const app = document.getElementById('app');
  
  // Show loading state
  app.innerHTML = `
    <div class="loading-container">
      <div class="spinner"></div>
      <p>Loading zone details...</p>
    </div>
  `;
  
  try {
    console.log('[ZoneDetail] Fetching data for:', { deploymentId, zoneCode });
    
    // Fetch deployment with zones and zone sessions in parallel
    const [deploymentResponse, sessionsResponse] = await Promise.all([
      getDeployment(deploymentId, ['zones']),
      getZoneSessions(deploymentId, zoneCode)
    ]);
    
    const deploymentData = deploymentResponse.data;
    const sessions = sessionsResponse.data || [];
    
    console.log('[ZoneDetail] Loaded data:', { deployment: deploymentData, sessions });
    
    // Extract metadata and zones from response
    const deployment = deploymentData.metadata || deploymentData;
    const zones = deploymentData.zones || [];
    
    // Find the zone
    const zone = zones.find(z => z.zone_code === zoneCode);
    
    if (!zone) {
      throw new Error(`Zone ${zoneCode} not found in deployment`);
    }
    
    // Find active session (has start_time but no end_time)
    const activeSession = sessions.find(s => s.start_time && !s.end_time);
    
    // Render zone detail view
    const zoneDetailView = new ZoneDetailView(deployment, zone, sessions, activeSession);
    const container = zoneDetailView.render();
    
    app.innerHTML = '';
    app.appendChild(container);
    
    // Attach event handlers
    attachEventHandlers(deployment, zone, sessions, activeSession);
    
  } catch (error) {
    console.error('[ZoneDetail] Error loading zone:', error);
    
    app.innerHTML = `
      <div class="error-container">
        <div class="error-icon">⚠️</div>
        <h2>Failed to Load Zone</h2>
        <p>${error.message}</p>
        <button class="btn btn-primary btn-back">← Back to Zones</button>
      </div>
    `;
    
    app.querySelector('.btn-back')?.addEventListener('click', () => {
      navigate(`/deployments/builder/${deploymentId}/zones`);
    });
  }
}

function attachEventHandlers(deployment, zone, sessions, activeSession) {
  const app = document.getElementById('app');
  
  // Back button
  document.querySelector('.btn-back')?.addEventListener('click', () => {
    navigate(`/deployments/builder/${deployment.deployment_id}/zones`);
  });
  
  // Start session button
  document.querySelector('.btn-start-session')?.addEventListener('click', async () => {
    const modal = createSessionStartModal(
      zone.zone_name,
      zone.zone_code,
      async (zoneCode) => {
        // onConfirm callback - create the session
        try {
          console.log('[ZoneDetail] Creating session for zone:', zoneCode);
          
          const response = await createSession(deployment.deployment_id, {
            zone_code: zoneCode
          });
          
          console.log('[ZoneDetail] Session created:', response);
          
          // Navigate directly to the active session builder
          window.location.href = `/deployments/builder/${deployment.deployment_id}/zones/${zone.zone_code}/session`;
          
        } catch (error) {
          console.error('[ZoneDetail] Error creating session:', error);
          throw error; // Re-throw so modal can handle it
        }
      },
      () => {
        // onCancel callback (optional)
        console.log('[ZoneDetail] Session creation cancelled');
      }
    );
    document.body.appendChild(modal);
  });
  
  // Resume session button
  document.querySelector('.btn-resume-session')?.addEventListener('click', () => {
    if (activeSession) {
      navigate(`/deployments/builder/${deployment.deployment_id}/zones/${zone.zone_code}/session`);
    }
  });
  
  // End session button
  document.querySelector('.btn-end-session')?.addEventListener('click', async () => {
    if (!activeSession) return;
    
    const confirmed = confirm('Are you sure you want to end this session?');
    if (!confirmed) return;
    
    try {
      console.log('[ZoneDetail] Ending session:', activeSession.session_id);
      
      // Call API to end the session
      await endSession(deployment.deployment_id, activeSession.session_id, {
        end_time: new Date().toISOString()
      });
      
      console.log('[ZoneDetail] Session ended successfully');
      
      // Force full page reload to refresh UI state
      window.location.href = `/deployments/builder/${deployment.deployment_id}/zones/${zone.zone_code}`;
      
    } catch (error) {
      console.error('[ZoneDetail] Error ending session:', error);
      alert('Failed to end session. Please try again.');
    }
  });
  
  // View items button
  document.querySelector('.btn-view-items')?.addEventListener('click', () => {
    // TODO: Navigate to items view for this zone
    console.log('[ZoneDetail] View items for zone:', zone.zone_code);
    alert('Items view coming soon');
  });
  
  // Session click handler - attach to app container since events bubble up
  app.addEventListener('session-click', (e) => {
    const session = e.detail.session;
    console.log('[ZoneDetail] Session clicked:', session.session_id);
    navigate(`/deployments/builder/${deployment.deployment_id}/zones/${zone.zone_code}/sessions/${session.session_id}`);
  });
}