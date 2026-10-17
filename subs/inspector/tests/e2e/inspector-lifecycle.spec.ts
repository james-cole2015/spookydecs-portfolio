import { test, expect, RULE_ID, findViolationsFor, SENTINEL_MARKER } from './fixtures';
import { STORAGE_STATE_PATH } from './global-setup';
import { createSentinelItem } from '../../../_e2e/shared/entities.mjs';

test.use({ storageState: STORAGE_STATE_PATH });

const violationOf = (r: any) => r.data?.violation ?? r.body?.data?.violation ?? r.data ?? r.body?.data;

// The rule pipeline is the real thing: a sentinel Decoration with no primary photo violates MISSING_PRIMARY_PHOTO,
// running the rule from the UI publishes Violation.Detected, and the consumer writes the violation record.
test('inspector: run a rule → violation appears → views → notes → dismiss; rule description edit round-trips', async ({ page, inspector }) => {
  test.setTimeout(240_000);
  const { api } = inspector;
  const item = await createSentinelItem(api, SENTINEL_MARKER, 'no photo');
  let violationId = '';
  const mine = async () => (await findViolationsFor(api, [item.id]))[0];

  await test.step('Rule detail renders with its metadata and violation list', async () => {
    await page.goto(`/rules/${RULE_ID}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Violations \(\d+\)/ })).toBeVisible();
    await expect(page.getByText('Violation Statistics')).toBeVisible();
    expect(await mine(), 'no violation before the rule runs').toBeUndefined();
  });

  await test.step('Run Rule from the UI → Violation.Detected → violation record for the sentinel', async () => {
    const ran = page.waitForResponse((r) => r.request().method() === 'POST' && /\/admin\/inspector\/rules\//.test(r.url()), { timeout: 120_000 });
    await page.getByRole('button', { name: /Run Rule/ }).click();
    const res = await ran;
    expect(res.status(), `run rule → ${(await res.text()).slice(0, 300)}`).toBeLessThan(300);
    await expect.poll(async () => !!(await mine()), { timeout: 120_000, intervals: [3_000] }).toBe(true);
    const v = await mine();
    violationId = v.violation_id;
    expect(v).toMatchObject({ rule_id: RULE_ID, entity_id: item.id, status: 'open' });
  });

  await test.step('Dashboard — By Rule tab lists the rule; By Item tab lists the item; stats strip renders', async () => {
    await page.goto('/');
    await expect(page.getByText('System Inspector')).toBeVisible();
    await expect(page.getByRole('tab', { name: 'By Rule' })).toBeVisible();
    const ruleName = (await api('GET', `/admin/inspector/rules/${RULE_ID}`)).data.rule.rule_name as string;
    await expect(page.getByText(ruleName).first()).toBeVisible();
    await page.getByRole('tab', { name: 'By Item' }).click();
    await expect(page).toHaveURL(/tab=by-item/);
    await expect(page.getByText(/Something went wrong|Unable to load|Failed to load/i)).toHaveCount(0);
  });

  await test.step('Item view lists the violation; the rule page lists it too', async () => {
    await page.goto(`/items/${encodeURIComponent(item.id)}`);
    await expect(page.getByText(item.short_name).or(page.getByText(item.id)).first()).toBeVisible();
    await page.goto(`/rules/${RULE_ID}`);
    await expect(page.getByText(item.short_name).or(page.getByText(item.id)).first()).toBeVisible();
  });

  await test.step('Violation detail — renders; Save Notes (API Gateway has no PUT on this resource yet)', async () => {
    await page.goto(`/violations/${violationId}`);
    await expect(page.getByText(item.short_name).or(page.getByText(item.id)).first()).toBeVisible();
    await page.getByPlaceholder('Add notes about this violation...').fill('e2e note');
    const put = page.waitForResponse((r) => r.request().method() === 'PUT' && r.url().includes(`/violations/${violationId}`));
    await page.getByRole('button', { name: 'Save Notes' }).click();
    const status = (await put).status();
    if (status < 300) {
      await expect.poll(async () => violationOf(await api('GET', `/admin/inspector/violations/${violationId}`))?.violation_details?.notes, { timeout: 15_000 }).toBe('e2e note');
    } else {
      // Known defect: PUT/DELETE /admin/inspector/violations/{id} are not wired in API Gateway (only GET/OPTIONS), so the
      // gateway answers 403. Recorded, not asserted, unless E2E_INSPECTOR_STRICT=1 (flip it once the routes exist).
      test.info().annotations.push({ type: 'known-defect', description: `Save Notes PUT → ${status}: route not wired in API Gateway` });
      expect(process.env.E2E_INSPECTOR_STRICT, `Save Notes PUT returned ${status}`).toBeFalsy();
    }
  });

  await test.step('Dismiss — a reason under the minimum is rejected by the form; a real reason dismisses', async () => {
    const dismissible = violationOf(await api('GET', `/admin/inspector/violations/${violationId}`))?.dismissible;
    test.skip(dismissible === false, `${RULE_ID} is not dismissible in this environment`);
    await page.getByRole('button', { name: /Dismiss/ }).first().click();
    const dialog = page.getByRole('dialog');
    await dialog.getByPlaceholder('Enter reason for dismissal...').fill('x');
    await expect(dialog.locator('footer').getByRole('button', { name: 'Dismiss', exact: true })).toBeDisabled();
    await dialog.getByPlaceholder('Enter reason for dismissal...').fill('Dismissed by the #623 e2e suite: this is a throwaway sentinel item.');
    await dialog.locator('footer').getByRole('button', { name: 'Dismiss', exact: true }).click();
    await expect.poll(async () => violationOf(await api('GET', `/admin/inspector/violations/${violationId}`))?.status, { timeout: 15_000 }).toBe('dismissed');
    expect(violationOf(await api('GET', `/admin/inspector/violations/${violationId}`)).dismissal_notes).toContain('#623 e2e');
    // The detail page should show the stored reason once dismissed. Known defect: ViolationDetail reads
    // violation_details.dismissal_notes but the Lambda stores dismissal_notes at the top level, so the reason never renders.
    await page.reload();
    await expect(page.getByText('Dismissed:', { exact: false }).first()).toBeVisible();
    const shown = await page.getByText(/Dismissed by the #623 e2e suite/).count();
    if (!shown) {
      test.info().annotations.push({ type: 'known-defect', description: 'dismissal reason is stored but not rendered on ViolationDetail' });
      expect(process.env.E2E_INSPECTOR_STRICT, 'dismissal reason not rendered').toBeFalsy();
    }
  });

  await test.step('Rule description edit (role sd_inspector_rules_handler-role is read-only on DynamoDB today)', async () => {
    const original = (await api('GET', `/admin/inspector/rules/${RULE_ID}`)).data.rule.description as string;
    await page.goto(`/rules/${RULE_ID}`);
    await page.getByRole('button', { name: /Edit Description/ }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByPlaceholder('Enter rule description...').fill(`${original} [e2e]`);
    const patched = page.waitForResponse((r) => r.request().method() === 'PATCH' && r.url().includes(`/admin/inspector/rules/${RULE_ID}`));
    await dialog.locator('footer').getByRole('button', { name: /Save/ }).click();
    const status = (await patched).status();
    if (status < 300) {
      try {
        await expect.poll(async () => (await api('GET', `/admin/inspector/rules/${RULE_ID}`)).data.rule.description, { timeout: 15_000 }).toBe(`${original} [e2e]`);
      } finally {
        await api('PATCH', `/admin/inspector/rules/${RULE_ID}`, { description: original, updated_by: 'e2e-restore' });
      }
      expect((await api('GET', `/admin/inspector/rules/${RULE_ID}`)).data.rule.description).toBe(original);
    } else {
      // Known defect: the handler's role only has the read-only DynamoDB policy, so PATCH/DELETE on rules 500 with
      // AccessDeniedException (UpdateItem). Recorded, not asserted, unless E2E_INSPECTOR_STRICT=1.
      test.info().annotations.push({ type: 'known-defect', description: `Edit Description PATCH → ${status}: rules handler role lacks DynamoDB write` });
      expect(process.env.E2E_INSPECTOR_STRICT, `Edit Description PATCH returned ${status}`).toBeFalsy();
      expect((await api('GET', `/admin/inspector/rules/${RULE_ID}`)).data.rule.description).toBe(original);
    }
  });
});
