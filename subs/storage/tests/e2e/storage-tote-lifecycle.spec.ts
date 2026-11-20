import { test, expect, STAGE } from './fixtures';
import { STORAGE_STATE_PATH } from './global-setup';
import { createSentinelItem } from '../../../_e2e/shared/entities.mjs';
import {
  createSentinelDeployment,
  deleteSentinel,
  sentinelDeploymentId,
  archiveActiveDeployments,
  restoreDeploymentStatuses,
} from '../../../deployments/tests/shared/sentinel.mjs';

/**
 * #715 — a staged tote must give its items up as they advance to PreDeployment, stop being
 * Staged by teardown, and then show up in the Pack Wizard so it can be repacked.
 *
 * Setup/teardown drive the deployment lifecycle through the API (that part is covered by
 * subs/deployments' own suites); what this spec adds is the storage side: tote contents/status
 * at each step, and the browser flow that was blocked before #715 (Pack Wizard tote list +
 * Pack Items on the detail page).
 *
 * Christmas, not Halloween: dev's Halloween totes are tied up in the real DEP-HAL-2026 (copied
 * from prod), same reason subs/deployments' e2e uses Christmas (#645).
 */
test.use({ storageState: STORAGE_STATE_PATH });

const SEASON = 'Christmas';
const ZONE = 'FY';

test('#715 tote lifecycle: stage → place → complete → teardown → tote is repackable', async ({ page, storage }) => {
  const { api, marker } = storage;
  const deploymentId = sentinelDeploymentId(SEASON);
  const toteName = `${marker} Tote715 ${Date.now()}`;

  // The deployment sentinel is not part of the storage sweep, so clean it ourselves — even on failure.
  const archived = await (async () => {
    await deleteSentinel(api, deploymentId, STAGE);
    return archiveActiveDeployments(api, STAGE, deploymentId); // a real active deployment hides new ones (#645)
  })();

  try {
    let toteId = '';
    let a = '';
    let b = '';
    let c = '';

    const tote = async () => (await api('GET', `/storage/${toteId}`)).data?.storage_unit ?? (await api('GET', `/storage/${toteId}`)).body?.storage_unit;
    const item = async (id: string) => { const r = await api('GET', `/items/${encodeURIComponent(id)}`); return r.data ?? r.body; };

    await test.step('Setup — a Stored sentinel tote holding three sentinel items (A, B staged; C stays in the tote)', async () => {
      a = (await createSentinelItem(api, marker, 'A')).id;
      b = (await createSentinelItem(api, marker, 'B')).id;
      c = (await createSentinelItem(api, marker, 'C')).id;

      const created = await api('POST', '/storage/totes', { season: SEASON, location: 'Shed', name: toteName, size: 'Medium', is_supply_tote: false });
      expect(created.status).toBeLessThan(300);
      toteId = (created.data?.storage_unit ?? created.body?.storage_unit).id;

      expect((await api('POST', `/storage/${toteId}/contents`, { item_ids: [a, b, c], mark_packed: true })).status).toBeLessThan(300);
      expect((await api('PUT', `/storage/${toteId}`, { status: 'Stored' })).status).toBeLessThan(300);
      expect((await tote()).status).toBe('Stored');
    });

    await test.step('Stage A and B — tote is Staged; the unselected item stays in it', async () => {
      await createSentinelDeployment(api, SEASON, { notes: 'Playwright e2e #715 — safe to delete' });
      const res = await api('POST', `/deployments/${deploymentId}/stage`, { tote_id: toteId, item_ids: [a, b] });
      expect(res.status).toBe(200);
      const t = await tote();
      expect(t.status).toBe('Staged');
      expect(t.staged_deployment_id).toBe(deploymentId);
      expect([...t.contents].sort()).toEqual([a, b, c].sort());
    });

    await test.step('Place A — leaves the tote; tote stays Staged because B is still pending', async () => {
      const res = await api('POST', `/deployments/${deploymentId}/placements`, { zone_code: ZONE, item_id: a });
      expect(res.status).toBe(201);
      const t = await tote();
      expect(t.status).toBe('Staged');
      expect(t.contents).not.toContain(a);
      expect(t.contents).toContain(b);
      const ia = await item(a);
      expect(ia.status).toBe('PreDeployment');
      expect(ia.storage_data?.tote_id ?? null).toBeNull();
    });

    await test.step('Place B — last staged item leaves; tote goes Partial and is no longer tied to the deployment', async () => {
      const res = await api('POST', `/deployments/${deploymentId}/placements`, { zone_code: ZONE, item_id: b });
      expect(res.status).toBe(201);
      const t = await tote();
      expect(t.status).toBe('Partial');
      expect(t.staged_deployment_id ?? null).toBeNull();
      expect(t.contents).toEqual([c]);
      // The STAGING ledger keeps what was staged — #714 reads it, #715 never edits it.
      const staged = (await api('GET', `/deployments/${deploymentId}/stage`)).data?.staged_totes ?? [];
      const row = staged.find((s: any) => (s.id ?? s.tote_id) === toteId);
      expect((row?.contents_details ?? []).map((d: any) => d.id ?? d.item_id).sort()).toEqual([a, b].sort());
    });

    await test.step('Complete, then teardown — items go TearDown, tote is not Staged', async () => {
      expect((await api('POST', `/deployments/${deploymentId}/complete`)).status).toBe(200);
      expect((await api('POST', `/deployments/${deploymentId}/teardown/start`)).status).toBe(200);
      for (const id of [a, b]) {
        expect((await api('POST', `/deployments/${deploymentId}/teardown/item`, { item_id: id })).status).toBe(200);
      }
      const t = await tote();
      expect(t.status).not.toBe('Staged');
      expect(t.staged_deployment_id ?? null).toBeNull();
    });

    await test.step('Pack Wizard — the torn-down tote is offered for packing (was refused while stale-Staged)', async () => {
      await page.goto('/storage/pack');
      await expect(page.getByRole('button', { name: new RegExp(toteName) })).toBeVisible();
    });

    await test.step('Repack — the torn-down items go back into the tote through the UI', async () => {
      await page.goto(`/storage/pack/${toteId}`);
      await page.getByTestId(`item-picker-${a}`).click();
      await page.getByTestId(`item-picker-${b}`).click();
      await page.getByTestId('pack-tote-save').click();
      await page.waitForURL(`**/storage/${toteId}`);
      await expect(page.getByTestId(`content-item-${a}`)).toBeVisible();
      await expect(page.getByTestId(`content-item-${b}`)).toBeVisible();
      await expect(page.getByTestId(`content-item-${c}`)).toBeVisible();
      expect([...(await tote()).contents].sort()).toEqual([a, b, c].sort());
    });
  } finally {
    const failed = restoreDeploymentStatuses(archived, STAGE);
    if (failed.length) console.warn(`[e2e cleanup] deployment status restore FAILED for: ${failed.join(', ')}`);
    const deleted = await deleteSentinel(api, deploymentId, STAGE);
    console.log(`[e2e cleanup] sentinel ${deploymentId}: ${deleted ? 'deleted' : 'DELETE FAILED'}`);
    // sentinel tote + items are swept by the storage fixture's teardown (marker in name)
  }
});
