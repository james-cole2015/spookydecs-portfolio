// deployment-complete.js
// Page orchestration for the deployment complete/review page
// Route: /deployments/builder/:id/zones/complete

import {
  getDeployment,
  getItem,
  getZoneSessions,
  completeDeployment,
  getItemsAdminUrl
} from '../utils/deployment-api.js';
import { DeploymentCompleteView } from '../components/builder/DeploymentCompleteView.js';

const ZONE_CODES = ['FY', 'BY', 'SY'];

export async function renderCompletePage(deploymentId) {
  const app = document.getElementById('app');

  app.innerHTML = `
    <div class="complete-page-loading">
      <div class="loading-spinner"></div>
      <p>Loading deployment review...</p>
    </div>
  `;

  try {
    const data = await loadCompletePageData(deploymentId);
    const view = new DeploymentCompleteView(app, data, {
      onConfirm: (setStatus) => handleConfirm(deploymentId, setStatus),
      onBack: () => navigateToZones(deploymentId)
    });
    view.render();
  } catch (error) {
    console.error('[renderCompletePage] Error:', error);
    app.innerHTML = `
      <div class="complete-page-error">
        <p>Failed to load deployment review.</p>
        <p class="error-detail">${error.message}</p>
        <button class="btn btn-secondary" onclick="window.history.back()">← Back</button>
      </div>
    `;
  }
}

async function loadCompletePageData(deploymentId) {
  // Fetch metadata + all zone records in parallel
  const [metaResponse, itemsAdminUrl, ...zoneResponses] = await Promise.all([
    getDeployment(deploymentId, ['zones']),
    getItemsAdminUrl(),
    ...ZONE_CODES.map(code =>
      getZoneSessions(deploymentId, code).catch(() => ({ data: [] }))
    )
  ]);

  const metadata = metaResponse.data?.metadata || metaResponse.data;
  const zones = metaResponse.data?.zones || [];

  // Map sessions by zone
  const sessionsByZone = {};
  ZONE_CODES.forEach((code, i) => {
    sessionsByZone[code] = zoneResponses[i]?.data || [];
  });

  // Collect all unique item IDs across zones
  const allItemIds = new Set();
  zones.forEach(zone => {
    (zone.items_deployed || []).forEach(id => allItemIds.add(id));
  });

  // Parallel fetch all item details
  const itemResults = await Promise.allSettled(
    [...allItemIds].map(id => getItem(id))
  );

  const itemMap = {};
  itemResults.forEach((result, i) => {
    const id = [...allItemIds][i];
    if (result.status === 'fulfilled' && result.value?.data) {
      itemMap[id] = result.value.data;
    }
  });

  // Build enriched zone data
  const enrichedZones = zones.map(zone => {
    const zoneCode = zone.zone_code;
    const itemIds = zone.items_deployed || [];
    const sessions = sessionsByZone[zoneCode] || [];

    // Collect photo_ids per item from connections across all sessions
    const itemPhotoMap = buildItemPhotoMap(sessions, itemIds);

    const items = itemIds.map(id => ({
      id,
      ...itemMap[id],
      photo_ids: itemPhotoMap[id] || []
    }));

    return {
      ...zone,
      items,
      sessions
    };
  });

  return {
    deploymentId,
    metadata,
    zones: enrichedZones,
    itemsAdminUrl
  };
}

function buildItemPhotoMap(sessions, itemIds) {
  // For each item, collect photo_ids from connections where to_item_id matches
  const map = {};
  itemIds.forEach(id => { map[id] = []; });

  sessions.forEach(session => {
    (session.connections || []).forEach(conn => {
      const toItem = conn.to_item_id;
      if (map[toItem] !== undefined && conn.photo_ids?.length) {
        conn.photo_ids.forEach(photoId => {
          if (!map[toItem].includes(photoId)) {
            map[toItem].push(photoId);
          }
        });
      }
    });
  });

  return map;
}

async function handleConfirm(deploymentId, setStatus) {
  try {
    const result = await completeDeployment(deploymentId);
    const data = result.data;

    let msg = `Deployment complete! ${data.items_updated} item(s) marked as Deployed.`;
    if (data.items_failed > 0) {
      msg += ` (${data.items_failed} item(s) failed to update — check logs.)`;
    }

    setStatus('success', msg);
    setTimeout(() => navigateToZones(deploymentId), 2000);
  } catch (error) {
    console.error('[handleConfirm] Error:', error);

    let msg = `Failed to complete deployment: ${error.message}`;
    if (error.message?.includes('active session')) {
      msg = 'Cannot complete: an active session is still open. End it first.';
    } else if (error.message?.includes('already completed')) {
      msg = 'This deployment is already completed.';
    }

    setStatus('error', msg);
  }
}

function navigateToZones(deploymentId) {
  window.location.href = `/deployments/builder/${deploymentId}/zones`;
}