// Deployment Teardown Page Handler

import { getDeployment, searchItems, apiTeardownStart, apiTeardownItem, apiTeardownComplete } from '../utils/deployment-api.js';
import { navigate } from '../utils/router.js';
import { TeardownView } from '../components/builder/TeardownView.js';

/**
 * Hydrate zone records by replacing item ID strings with full item objects.
 * Fetches all Deployed items once, then maps them into each zone's items_deployed list.
 * Items not found in the fetch (e.g. already TearDown) are fetched individually as fallback.
 */
async function hydrateZones(zones) {
  // Fetch all currently Deployed items
  const [deployedRes, teardownRes] = await Promise.all([
    searchItems({ status: 'Deployed' }),
    searchItems({ status: 'TearDown' })
  ]);

  // Build a lookup map by item id
  const itemMap = {};
  const allItems = [
    ...(deployedRes.data?.items || []),
    ...(teardownRes.data?.items || [])
  ];
  allItems.forEach(item => {
    itemMap[item.id] = item;
  });

  // Replace string IDs in each zone with item objects
  return zones.map(zone => {
    const rawIds = zone.items_deployed || [];
    const hydratedItems = rawIds.map(idOrObj => {
      // Already an object (shouldn't happen, but defensive)
      if (typeof idOrObj === 'object' && idOrObj !== null) return idOrObj;
      // Look up in map
      return itemMap[idOrObj] || { id: idOrObj, short_name: idOrObj, status: 'Unknown', class: 'Unknown' };
    });

    return { ...zone, items_deployed: hydratedItems };
  });
}

export async function renderTeardownPage(deploymentId) {
  console.log('[TeardownPage] Render called with deploymentId:', deploymentId);

  const app = document.getElementById('app');

  app.innerHTML = `
    <div class="loading-container">
      <div class="spinner"></div>
      <p>Loading teardown...</p>
    </div>
  `;

  try {
    const deploymentResponse = await getDeployment(deploymentId, ['zones']);
    const deploymentData = deploymentResponse.data;

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

    // Hydrate zones with full item objects
    const hydratedZones = await hydrateZones(zones);

    const view = new TeardownView({
      deployment,
      zones: hydratedZones,
      deploymentId,
      onStart: () => apiTeardownStart(deploymentId),
      onTeardownItem: (itemId) => apiTeardownItem(deploymentId, itemId),
      onComplete: () => apiTeardownComplete(deploymentId),
      onBack: () => navigate(`/deployments/builder/${deploymentId}/zones`),
      onDone: () => navigate('/deployments')
    });

    app.innerHTML = '';
    app.appendChild(view.render());

  } catch (error) {
    console.error('[TeardownPage] Error:', error);

    app.innerHTML = `
      <div class="error-container">
        <div class="error-icon">⚠️</div>
        <h2>Failed to Load Teardown</h2>
        <p>${error.message}</p>
        <button class="btn btn-primary btn-back">← Back</button>
      </div>
    `;

    app.querySelector('.btn-back')?.addEventListener('click', () => {
      navigate(`/deployments/builder/${deploymentId}/zones`);
    });
  }
}