import { test, expect, SEASON, STAGE } from './fixtures';
import { STORAGE_STATE_PATH } from './global-setup';

// First Playwright spec in the fleet (#554). One sequential test, not independent
// tests per phase — each phase depends on state the browser itself created in the
// previous one (a fresh deployment, a staged tote, an open session), exactly like
// the API pre-season gate it complements (tests/preseason/lifecycle.e2e.mjs).
test.use({ storageState: STORAGE_STATE_PATH });

function idFromTestId(prefix: string, testId: string | null): string {
  if (!testId) throw new Error(`Expected a data-testid starting with "${prefix}"`);
  return testId.slice(prefix.length);
}

test('deployment lifecycle: builder → staging → session → complete → teardown', async ({
  page,
  deployment,
}) => {
  const { deploymentId, api, ledger } = deployment;

  await test.step('Builder — create the deployment through the UI', async () => {
    await page.goto('/builder');
    await page.getByRole('button', { name: /^Season/ }).click();
    await page.getByRole('option', { name: SEASON }).click();
    await page.getByLabel('Year').fill('2030');
    await page.getByTestId('builder-create-submit').click();
    await page.waitForURL(`**/builder/${deploymentId}/zones`);
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

  const ZONE = 'FY';
  await test.step('Session — start a session in a zone', async () => {
    await page.getByRole('link', { name: 'Deployments' }).first().click().catch(() => {});
    await page.goto(`/builder/${deploymentId}/zones/${ZONE}`);
    await page.getByTestId('start-session-card').click();
    await page.getByTestId('start-session-confirm').click();
    await page.waitForURL(`**/builder/${deploymentId}/zones/${ZONE}/session`);
  });

  await test.step('Session — connect a destination item to the zone receptacle', async () => {
    const sourceButtons = page.locator('[data-testid^="source-item-"]');
    await expect(sourceButtons.first()).toBeVisible();
    await sourceButtons.first().click();

    const destinationButtons = page.locator('[data-testid^="destination-item-"]');
    await expect(destinationButtons.first()).toBeVisible();
    const destTestId = await destinationButtons.first().getAttribute('data-testid');
    const destItemId = idFromTestId('destination-item-', destTestId);
    await ledger.rememberItem(api, destItemId);

    await destinationButtons.first().click();
    await page.getByTestId('connection-modal-connect').click();
    // If the destination is a Light, an "Illuminate" step appears first — finalize
    // with no extra decorations selected (they're optional).
    const illuminateHeading = page.getByRole('heading', { name: /^What does/ });
    if (await illuminateHeading.isVisible({ timeout: 3000 }).catch(() => false)) {
      await page.getByTestId('connection-modal-connect').click();
    }
    await expect(page.getByText('Connection created')).toBeVisible();
  });

  await test.step('Session — deploy a static prop', async () => {
    await page.getByRole('button', { name: 'Deploy Static Prop' }).click();
    const propButtons = page.locator('[data-testid^="static-prop-item-"]');
    if (await propButtons.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      const propTestId = await propButtons.first().getAttribute('data-testid');
      const propItemId = idFromTestId('static-prop-item-', propTestId);
      await ledger.rememberItem(api, propItemId);
      await propButtons.first().click();
      await page.getByTestId('static-prop-modal-deploy').click();
      await expect(page.getByText('Static prop deployed')).toBeVisible();
    } else {
      // No eligible non-powered props staged in this run — not a #554 regression,
      // the connection above already covers the connect+place AC's "connect" half.
      await page.getByRole('button', { name: 'Cancel' }).click();
    }
  });

  await test.step('Session — end the session (skip photos, keep the flow deterministic)', async () => {
    await page.getByRole('button', { name: 'End Session' }).click();
    await page.getByTestId('end-session-skip-photos').click();
    await page.waitForURL(`**/builder/${deploymentId}/zones/${ZONE}`);
  });

  await test.step('Complete — finalize the deployment', async () => {
    await page.goto(`/builder/${deploymentId}/zones`);
    await page.getByTestId('admin-card-complete').click();
    await page.waitForURL(`**/builder/${deploymentId}/zones/complete`);
    await page.getByTestId('complete-trigger').click();
    await page.getByTestId('complete-confirm').click();
    await page.waitForURL(`**/builder/${deploymentId}/zones`, { timeout: 10_000 });

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
