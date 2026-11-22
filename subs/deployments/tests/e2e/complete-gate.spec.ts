import { test, expect, SEASON, STAGE } from './fixtures';
import { STORAGE_STATE_PATH } from './global-setup';
import { createSentinelDeployment } from '../shared/sentinel.mjs';
import { resolveStagedDecorations, cleanupRepairs } from './complete-gate';

// #714: the Complete gate for staged-but-unplaced decorations, end to end. Deliberately separate from
// the lifecycle spec: it stages a tote through the API (no non-packable item needed, which dev lacks for
// the sentinel's season), places nothing, then drives the Complete page.
test.use({ storageState: STORAGE_STATE_PATH });

const repairIds: string[] = [];
test.afterEach(async ({ deployment }) => cleanupRepairs(deployment.api, repairIds));

test('complete gate: staged but unplaced decorations block complete until resolved', async ({ page, deployment }) => {
  const { deploymentId, api, ledger } = deployment;
  let decorationCount = 0;

  await test.step('Setup — create the sentinel deployment and stage a tote that holds decorations', async () => {
    await createSentinelDeployment(api, SEASON);
    const stageRes = await api('GET', `/deployments/${deploymentId}/stage`);
    const totes: { id: string; contents?: string[] }[] = stageRes.data?.totes || [];
    let chosen: { id: string; items: string[] } | undefined;
    for (const t of totes) {
      const decos: string[] = [];
      for (const id of t.contents || []) {
        const d = await api('GET', `/items/${id}`);
        if ((d.data ?? d.body)?.class === 'Decoration') decos.push(id);
      }
      if (decos.length) { chosen = { id: t.id, items: t.contents || [] }; decorationCount = decos.length; break; }
    }
    test.skip(!chosen, 'dev has no available tote holding a Decoration to stage for this season — fixture gap');
    ledger.rememberTote(chosen!.id, STAGE);
    for (const id of chosen!.items) await ledger.rememberItem(api, id);
    const staged = await api('POST', `/deployments/${deploymentId}/stage`, { tote_id: chosen!.id, item_ids: chosen!.items });
    expect(staged.status, JSON.stringify(staged.body).slice(0, 300)).toBeLessThan(300);
  });

  await test.step('Stage GET reports the unresolved decorations', async () => {
    const res = await api('GET', `/deployments/${deploymentId}/stage`);
    const s = res.data?.staging_summary;
    expect(s?.unresolved).toBe(decorationCount);
    expect(s?.placed).toBe(0);
  });

  const counts = { notDeployed: 0, needsRepair: 0 };
  await test.step('Gate — blocked until every decoration is decided (UI + API)', async () => {
    Object.assign(counts, await resolveStagedDecorations(page, api, deploymentId, repairIds));
    expect(counts.notDeployed + counts.needsRepair).toBe(decorationCount);
  });

  await test.step('Complete — succeeds, and the decisions are recorded', async () => {
    await page.getByTestId('complete-trigger').click();
    await page.getByTestId('complete-confirm').click();
    await page.waitForURL(`**/builder/${deploymentId}`, { timeout: 10_000 });
    const dep = await api('GET', `/deployments/${deploymentId}`);
    const meta = dep.data?.metadata ?? dep.data;
    expect(meta?.status).toBe('completed');
    expect(meta?.statistics?.not_deployed_count).toBe(decorationCount);
    expect(meta?.statistics?.needs_repair_count).toBe(counts.needsRepair);
    expect(meta?.statistics?.total_items).toBe(0);
  });
});
