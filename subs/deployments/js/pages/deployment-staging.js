// deployment-staging.js
// Page orchestration for /deployments/builder/:id/staging

import { getDeployment, getStagingTotes, stageTote } from '../utils/deployment-api.js';
import { StagingView } from '../components/builder/StagingView.js';

export async function renderStagingPage(deploymentId) {
  console.log('[deployment-staging] deploymentId received:', deploymentId); // ADD THIS

  const app = document.getElementById('app');

    if (!deploymentId) {
    app.innerHTML = `<div>Error: No deployment ID provided</div>`;
    return;
  }

  app.innerHTML = `
    <div class="staging-page">
      <div class="staging-loading">
        <div class="spinner"></div>
        <p>Loading staging area...</p>
      </div>
    </div>
  `;

  try {
    // Fetch deployment and totes in parallel
    const [deploymentRes, totesRes] = await Promise.all([
      getDeployment(deploymentId),
      getStagingTotes(deploymentId)
    ]);

    const deployment = deploymentRes.data;
    const totes = totesRes.data.totes || [];

        console.log('[deployment-staging] Final totes count:', totes.length); // ADD THIS


    const view = new StagingView({
      deployment,
      totes,
      deploymentId,
      onStage: async (toteId, itemIds) => {
        await handleStageTote(deploymentId, toteId, itemIds, view);
      }
    });

    app.innerHTML = '';
    app.appendChild(view.render());

  } catch (error) {
    console.error('[deployment-staging] Failed to load staging page:', error);
    app.innerHTML = `
      <div class="staging-page">
        <div class="staging-error">
          <p>Failed to load staging area: ${error.message}</p>
          <button onclick="window.history.back()" class="btn-back">Go Back</button>
        </div>
      </div>
    `;
  }
}

async function handleStageTote(deploymentId, toteId, itemIds, view) {
  try {
    const result = await stageTote(deploymentId, { tote_id: toteId, item_ids: itemIds });
    console.log('[deployment-staging] Stage result:', result);
    view.markToteAsStaged(toteId, itemIds);
  } catch (error) {
    console.error('[deployment-staging] Stage failed:', error);
    view.showError(error.message || 'Failed to stage tote. Please try again.');
  }
}
