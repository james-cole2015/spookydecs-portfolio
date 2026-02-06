// Session Detail Page Handler

import { getDeployment, getSession } from '../utils/deployment-api.js';
import { SessionDetailView } from '../components/builder/SessionDetailView.js';
import { navigate } from '../utils/router.js';

export async function renderSessionDetail(deploymentId, zoneCode, sessionId) {
  const app = document.getElementById('app');
  
  // Show loading state
  app.innerHTML = `
    <div class="loading-container">
      <div class="spinner"></div>
      <p>Loading session details...</p>
    </div>
  `;
  
  try {
    console.log('[SessionDetail] Fetching data:', { deploymentId, zoneCode, sessionId });
    
    // Fetch deployment and session data in parallel
    const [deploymentResponse, sessionResponse] = await Promise.all([
      getDeployment(deploymentId, ['zones']),
      getSession(deploymentId, sessionId)
    ]);
    
    const deploymentData = deploymentResponse.data;
    const sessionData = sessionResponse.data;
    
    console.log('[SessionDetail] Loaded data:', { deployment: deploymentData, session: sessionData });
    
    // Extract metadata and zones from deployment response
    const deployment = deploymentData.metadata || deploymentData;
    const zones = deploymentData.zones || [];
    
    // Find the zone
    const zone = zones.find(z => z.zone_code === zoneCode);
    
    if (!zone) {
      throw new Error(`Zone ${zoneCode} not found in deployment`);
    }
    
    // Render session detail view
    const sessionDetailView = new SessionDetailView(deployment, zone, sessionData);
    const container = sessionDetailView.render();
    
    app.innerHTML = '';
    app.appendChild(container);
    
    // Attach event handlers
    attachEventHandlers(deployment, zone, sessionData);
    
  } catch (error) {
    console.error('[SessionDetail] Error loading session:', error);
    
    app.innerHTML = `
      <div class="error-container">
        <div class="error-icon">⚠️</div>
        <h2>Failed to Load Session</h2>
        <p>${error.message}</p>
        <button class="btn btn-primary btn-back-to-zone">← Back to Zone</button>
      </div>
    `;
    
    app.querySelector('.btn-back-to-zone')?.addEventListener('click', () => {
      navigate(`/deployments/${deploymentId}/zones/${zoneCode}`);
    });
  }
}

function attachEventHandlers(deployment, zone, session) {
  // Breadcrumb navigation
  document.querySelectorAll('.breadcrumb-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const route = link.dataset.route;
      if (route) {
        console.log('[SessionDetail] Breadcrumb clicked, navigating to:', route);
        navigate(route);
      }
    });
  });
  
  // Item links
  document.querySelectorAll('.item-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const itemId = link.dataset.itemId;
      if (itemId) {
        // TODO: Navigate to item detail page when implemented
        console.log('[SessionDetail] Navigate to item:', itemId);
        alert(`Item detail page for ${itemId} coming soon`);
      }
    });
  });
}