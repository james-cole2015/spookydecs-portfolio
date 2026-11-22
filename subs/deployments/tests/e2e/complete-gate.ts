import { expect, type Page } from '@playwright/test';

type Api = (method: string, path: string, body?: unknown) => Promise<{ status: number; body: any; data: any }>;

/**
 * Drives the Complete page's staged-decoration gate (#714). Navigates to the Complete page, and if any
 * staged decoration has no placement/decision:
 *   - asserts Complete is disabled and POST /complete answers 409 UNRESOLVED_STAGED_DECORATIONS,
 *   - resolves the first as "Needs repair" through the modal (a real maintenance record is created and
 *     its id pushed onto `repairIds` for cleanup), and every other as "Not deployed",
 *   - asserts the decided lists and that Complete is enabled.
 * Returns how many of each decision were made. Leaves the page on the Complete page, ready to confirm.
 */
export async function resolveStagedDecorations(page: Page, api: Api, deploymentId: string, repairIds: string[]) {
  await page.goto(`/builder/${deploymentId}/complete`);
  await expect(page.getByTestId('complete-trigger')).toBeVisible();

  const rows = page.locator('li[data-testid^="unresolved-"]');
  const unresolved = await rows.count();
  if (unresolved === 0) {
    await expect(page.getByTestId('complete-trigger')).toBeEnabled();
    return { notDeployed: 0, needsRepair: 0 };
  }

  await expect(page.getByTestId('complete-trigger')).toBeDisabled();
  const blocked = await api('POST', `/deployments/${deploymentId}/complete`);
  expect(blocked.status, JSON.stringify(blocked.body).slice(0, 300)).toBe(409);
  expect(blocked.body?.details?.code).toBe('UNRESOLVED_STAGED_DECORATIONS');
  expect(blocked.body?.details?.unresolved?.length).toBe(unresolved);
  expect((await api('GET', `/deployments/${deploymentId}`)).data?.metadata?.status).not.toBe('completed');

  // First row: "Needs repair" — the modal creates a repair record, then the decision is saved.
  await page.locator('[data-testid^="needs-repair-"]').first().click();
  await page.getByTestId('repair-title').fill('e2e #714 repair');
  const created = page.waitForResponse((r) => r.url().includes('/admin/maintenance-records') && r.request().method() === 'POST');
  await page.getByTestId('repair-save').click();
  const repair = (await (await created).json())?.data;
  expect(repair?.record_id, 'repair record created through the maintenance API').toBeTruthy();
  repairIds.push(repair.record_id);
  await expect(rows).toHaveCount(unresolved - 1);
  await expect(page.getByTestId('decided-needs_repair')).toBeVisible();

  // Everything else: "Not deployed".
  let left = unresolved - 1;
  while (left > 0) {
    await page.locator('[data-testid^="not-deployed-"]').first().click();
    await page.getByTestId('not-deployed-confirm').click();
    left -= 1;
    await expect(rows).toHaveCount(left);
  }
  if (unresolved > 1) await expect(page.getByTestId('decided-not_deployed')).toBeVisible();
  await expect(page.getByTestId('unresolved-panel')).toHaveCount(0);
  await expect(page.getByTestId('staging-counts')).toContainText('Needs repair');
  await expect(page.getByTestId('complete-trigger')).toBeEnabled();
  return { notDeployed: unresolved - 1, needsRepair: 1 };
}

/** Delete the repair records the Needs-repair modal created. Safe to call when empty. */
export async function cleanupRepairs(api: Api, repairIds: string[]) {
  while (repairIds.length) {
    const res = await api('DELETE', `/admin/maintenance-records/${repairIds.pop()}`);
    if (res.status >= 300) console.warn(`[e2e cleanup] repair record delete failed: HTTP ${res.status}`);
  }
}
