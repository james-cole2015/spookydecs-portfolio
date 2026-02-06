// Connection Detail Page Handler

import { getDeployment, getConnection, getItem } from '../utils/deployment-api.js';
import { ConnectionDetailView } from '../components/builder/ConnectionDetailView.js';
import { navigate } from '../utils/router.js';

// Load config for ITEMS_ADMIN URL
let ITEMS_ADMIN_URL = '';

async function loadConfig() {
  if (ITEMS_ADMIN_URL) return ITEMS_ADMIN_URL;
  
  try {
    const response = await fetch('/config.json');
    const config = await response.json();
    ITEMS_ADMIN_URL = config.ITEMS_ADMIN || '';
    return ITEMS_ADMIN_URL;
  } catch (error) {
    console.error('Failed to load config:', error);
    return '';
  }
}

export async function renderConnectionDetail(deploymentId, sessionId, connectionId) {
  const app = document.getElementById('app');
  
  // Show loading state
  app.innerHTML = `
    <div class="loading-container">
      <div class="spinner"></div>
      <p>Loading connection details...</p>
    </div>
  `;
  
  try {
    console.log('[ConnectionDetail] Fetching data:', { deploymentId, sessionId, connectionId });
    
    // Load config for items URL
    const itemsBaseUrl = await loadConfig();
    
    // Fetch connection data
    const connectionResponse = await getConnection(deploymentId, sessionId, connectionId);
    const connectionData = connectionResponse.data;
    
    console.log('[ConnectionDetail] Connection data:', connectionData);
    
    // Fetch deployment with zones to get zone info
    const deploymentResponse = await getDeployment(deploymentId, ['zones']);
    const deploymentData = deploymentResponse.data;
    const deployment = deploymentData.metadata || deploymentData;
    const zones = deploymentData.zones || [];
    
    // Find the zone this connection belongs to
    const zone = zones.find(z => z.zone_code === connectionData.zone_code);
    
    if (!zone) {
      throw new Error(`Zone ${connectionData.zone_code} not found in deployment`);
    }
    
    // Fetch item details for from_item and to_item
    const [fromItemResponse, toItemResponse] = await Promise.all([
      getItem(connectionData.from_item_id),
      getItem(connectionData.to_item_id)
    ]);
    
    const fromItem = fromItemResponse.data;
    const toItem = toItemResponse.data;
    
    // Fetch illuminated items if any
    let illuminatedItems = [];
    if (connectionData.illuminates && connectionData.illuminates.length > 0) {
      const illuminatedPromises = connectionData.illuminates.map(itemId => 
        getItem(itemId).catch(err => {
          console.warn(`Failed to fetch illuminated item ${itemId}:`, err);
          return null;
        })
      );
      const illuminatedResponses = await Promise.all(illuminatedPromises);
      illuminatedItems = illuminatedResponses
        .filter(resp => resp !== null)
        .map(resp => resp.data);
    }
    
    console.log('[ConnectionDetail] Loaded all data:', { 
      connection: connectionData, 
      deployment, 
      zone,
      fromItem, 
      toItem,
      illuminatedItems
    });
    
    // Render connection detail view
    const connectionDetailView = new ConnectionDetailView(
      deployment,
      zone,
      connectionData,
      fromItem,
      toItem,
      illuminatedItems,
      itemsBaseUrl
    );
    const container = connectionDetailView.render();
    
    app.innerHTML = '';
    app.appendChild(container);
    
    // Attach event handlers
    attachEventHandlers(deployment, zone, connectionData, itemsBaseUrl);
    
  } catch (error) {
    console.error('[ConnectionDetail] Error loading connection:', error);
    
    app.innerHTML = `
      <div class="error-container">
        <div class="error-icon">⚠️</div>
        <h2>Failed to Load Connection</h2>
        <p>${error.message}</p>
        <button class="btn btn-primary btn-back-to-zones">← Back to Zones</button>
      </div>
    `;
    
    app.querySelector('.btn-back-to-zones')?.addEventListener('click', () => {
      navigate(`/deployments/${deploymentId}/zones`);
    });
  }
}

function attachEventHandlers(deployment, zone, connection, itemsBaseUrl) {
  // Breadcrumb navigation
  document.querySelectorAll('.breadcrumb-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const route = link.dataset.route;
      if (route) {
        console.log('[ConnectionDetail] Breadcrumb clicked, navigating to:', route);
        navigate(route);
      }
    });
  });
  
  // Item detail links
  document.querySelectorAll('.item-detail-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const itemId = link.dataset.itemId;
      if (itemId && itemsBaseUrl) {
        // Navigate to items subdomain with item ID appended
        window.location.href = `${itemsBaseUrl}/${itemId}`;
      }
    });
  });
}