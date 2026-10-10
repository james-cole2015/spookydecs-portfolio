import { test, expect, SEASON, STAGE } from './fixtures';
import { STORAGE_STATE_PATH } from './global-setup';

// First Playwright spec in the fleet (#554). One sequential test, not independent
// tests per phase — each phase depends on state the browser itself created in the
// previous one (a fresh deployment, a staged tote, declared items), exactly like
// the API pre-season gate it complements (tests/preseason/lifecycle.e2e.mjs).
test.use({ storageState: STORAGE_STATE_PATH });

function idFromTestId(prefix: string, testId: string | null): string {
  if (!testId) throw new Error(`Expected a data-testid starting with "${prefix}"`);
  return testId.slice(prefix.length);
}

test('deployment lifecycle: builder → staging → declare + connect → complete → teardown', async ({
  page,
  deployment,
}) => {
  const { deploymentId, api, ledger } = deployment;
  // Set by the loose-item staging step below when a staged item also qualifies as a
  // static prop (no power ports) — lets the later "deploy a static prop" step assert a
  // real deploy instead of falling back to Cancel (#579).
  let staticPropCandidateId: string | undefined;

  await test.step('Builder — create the deployment through the UI', async () => {
    await page.goto('/builder');
    await page.getByRole('button', { name: /^Season/ }).click();
    await page.getByRole('option', { name: SEASON }).click();
    await page.getByLabel('Year').fill('2030');
    await page.getByTestId('builder-create-submit').click();
    await page.waitForURL(`**/builder/${deploymentId}`);
  });

  await test.step('Staging — stage a tote (asserts the #470 whole-tote behavior)', async () => {
    await page.getByTestId('admin-card-staging').click();
    await page.waitForURL(`**/builder/${deploymentId}/staging`);

    const stageRes = await api('GET', `/deployments/${deploymentId}/stage`);
    const totes: { id: string; contents?: string[] }[] = stageRes.data?.totes || [];
    test.skip(totes.length === 0, 'dev has no available totes to stage — fixture gap, not a #554 regression');
    const tote = totes[0];

    ledger.rememberTote(tote.id, STAGE);
    for (const itemId of tote.contents || []) await ledger.rememberItem(api, itemId);

    await page.getByTestId(`tote-card-${tote.id}`).getByRole('button', { name: 'Stage Tote' }).click();
    // Known limitation (#470): StagingPage always sends the tote's full contents as
    // item_ids, even though POST /stage supports subset selection. This asserts
    // today's whole-tote behavior; partial-selection is an API-only capability with
    // no UI entry point and is not exercised here. See #470 for the tracked fix.
    await page.getByTestId('staging-confirm-tote').click();
    await expect(page.getByTestId(`tote-card-${tote.id}`).getByText('✓ Staged')).toBeVisible();
  });

  await test.step('Staging — stage a loose non-packable item (#579: covers stage_loose_items / the StagingPage non-packable section)', async () => {
    const stageRes = await api('GET', `/deployments/${deploymentId}/stage`);
    const nonPackable: { id: string }[] = stageRes.data?.non_packable_items || [];
    test.skip(nonPackable.length === 0, 'dev has no non-packable items to stage — fixture gap, not a #579 regression');

    // Prefer a candidate that will also be eligible for static-prop deploy, mirroring
    // StaticPropModal's own filter (connection_building item, no power ports at all) —
    // this lets the "deploy a static prop" step below assert a real deploy rather than
    // treat "nothing eligible" and "modal is broken" as the same silent Cancel outcome.
    const eligibleRes = await api('GET', `/items?season=${SEASON}&connection_building=true`);
    const eligibleIds = new Set<string>(
      (eligibleRes.data?.items || [])
        .filter(
          (i: any) =>
            parseInt(i.male_ends || 0, 10) === 0 &&
            parseInt(i.female_ends || 0, 10) === 0 &&
            i.power_inlet !== true,
        )
        .map((i: any) => i.id),
    );
    const item = nonPackable.find((i) => eligibleIds.has(i.id)) || nonPackable[0];
    if (eligibleIds.has(item.id)) staticPropCandidateId = item.id;

    await ledger.rememberItem(api, item.id);
    await page.getByTestId(`item-card-${item.id}`).getByRole('button', { name: 'Stage Item' }).click();
    await page.getByTestId('staging-confirm-item').click();
    await expect(page.getByTestId(`item-card-${item.id}`).getByText('✓ Staged')).toBeVisible();
  });

  const ZONE = 'FY';

  /**
   * Adds an item to the zone through the graph's "Add to <zone>" picker — the UI path that
   * declares it (writes the PLACEMENT- record). Types the item's short name and picks the option.
   */
  async function addViaPicker(itemId: string) {
    const detail = await api('GET', `/items/${itemId}`);
    const name: string = (detail.data ?? detail.body)?.short_name || itemId;
    await ledger.rememberItem(api, itemId);
    const picker = page.getByTestId('graph-add-item').getByRole('combobox');
    await picker.click();
    await picker.fill(name);
    await page.getByRole('option', { name: new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) }).first().click();
    await expect
      .poll(async () => {
        const g = await api('GET', `/deployments/${deploymentId}/graph`);
        return (g.data?.placements || []).some((p: any) => p.item_id === itemId);
      }, { message: `${itemId} should be declared after picking it` })
      .toBe(true);
  }

  await test.step('Workspace — open the Front Yard graph', async () => {
    await page.goto(`/builder/${deploymentId}?zone=${ZONE}`);
    await expect(page.getByTestId(`graph-zone-${ZONE}`)).toBeVisible();
    await expect(page.getByTestId('graph-add-item')).toBeVisible();
  });

  let poweredItemId = '';
  await test.step('Declare — add a powered staged item to the zone from the picker', async () => {
    const stageRes = await api('GET', `/deployments/${deploymentId}/stage`);
    const staged: { id: string }[] = (stageRes.data?.staged_totes || []).flatMap((t: any) => t.contents_details || []);
    let found: string | undefined;
    for (const c of staged) {
      const d = await api('GET', `/items/${c.id}`);
      const item = d.data ?? d.body;
      if (item?.class !== 'Accessory' && (parseInt(item?.male_ends || 0, 10) > 0 || item?.power_inlet === true)) {
        found = c.id;
        break;
      }
    }
    test.skip(!found, 'no powered, non-accessory item in the staged tote — fixture gap');
    poweredItemId = found!;
    await addViaPicker(poweredItemId);
  });

  await test.step('Connect — drag the zone outlet onto the declared item', async () => {
    const graph = await api('GET', `/deployments/${deploymentId}/graph`);
    const outletId: string = graph.data?.zones?.[ZONE]?.receptacle_ids?.[0];
    expect(outletId, 'zone has a receptacle').toBeTruthy();

    // Handles carry data-nodeid / data-handleid (React Flow v12). The outlet's bottom handle is the
    // power source; the declared item's top handle is the power target.
    const source = page.locator(`[data-nodeid="${outletId}"][data-handleid="b-s"]`);
    const target = page.locator(`[data-nodeid="${poweredItemId}"][data-handleid="t-t"]`);
    await expect(source).toBeAttached();
    await expect(target).toBeAttached();
    const s = (await source.boundingBox())!;
    const t = (await target.boundingBox())!;
    await page.mouse.move(s.x + s.width / 2, s.y + s.height / 2);
    await page.mouse.down();
    await page.mouse.move(t.x + t.width / 2, t.y + t.height / 2, { steps: 12 });
    await page.mouse.up();
    await expect(page.getByText('Connection created')).toBeVisible();

    const after = await api('GET', `/deployments/${deploymentId}/graph`);
    expect((after.data?.connections || []).some((c: any) => c.to_item_id === poweredItemId && c.zone_code === ZONE)).toBe(true);
  });

  await test.step('Declare — add a static prop to the zone', async () => {
    if (staticPropCandidateId) {
      // We staged a known non-powered item above (#579); the picker must offer it. addViaPicker
      // fails loud if the staged list or the declare path regresses.
      await addViaPicker(staticPropCandidateId);
    }
    // else: no non-packable item in dev has zero power ports — a fixture gap (not a regression);
    // the loose-item staging step above still exercised stage_loose_items.
  });

  await test.step('Complete — finalize the deployment', async () => {
    await page.goto(`/builder/${deploymentId}`);
    await page.getByTestId('admin-card-complete').click();
    await page.waitForURL(`**/builder/${deploymentId}/complete`);
    await page.getByTestId('complete-trigger').click();
    await page.getByTestId('complete-confirm').click();
    await page.waitForURL(`**/builder/${deploymentId}`, { timeout: 10_000 });

    const dep = await api('GET', `/deployments/${deploymentId}`);
    expect(dep.data?.metadata?.status ?? dep.data?.status).toBe('completed');
  });

  await test.step('Teardown — tear down every deployed item, then complete', async () => {
    const dep = await api('GET', `/deployments/${deploymentId}?include=zones`);
    const zone = (dep.data?.zones || []).find((z: any) => z.zone_code === ZONE);
    const deployedIds: string[] = zone?.items_deployed || [];
    expect(deployedIds.length).toBeGreaterThan(0);

    await page.getByTestId('admin-card-teardown').click();
    await page.waitForURL(`**/builder/${deploymentId}/teardown`);
    await page.getByTestId('teardown-start').click();

    for (const itemId of deployedIds) {
      await page.getByTestId(`teardown-item-${itemId}`).click();
      await expect(page.getByTestId(`teardown-item-${itemId}`)).toHaveCount(0);
    }

    await page.getByTestId('teardown-complete-trigger').click();
    await page.getByTestId('teardown-complete-confirm').click();
    await page.waitForURL('**/');
  });
});
