import { test, expect, createSentinelItem, createSentinelIdea, SENTINEL_MARKER } from './fixtures';
import { STORAGE_STATE_PATH } from './global-setup';

test.use({ storageState: STORAGE_STATE_PATH });

// Seeded in NEXT year's buckets so the sentinels never mix with real work; the page's year pill for it is current+1.
const YEAR = new Date().getFullYear() + 1;
const put = (api: any, idea: any, patch: Record<string, unknown>) =>
  api('PUT', `/ideas/${idea.id}`, { id: idea.id, title: idea.title, season: 'Halloween', ...patch });

test('workbench: the seasonal monitor renders seeded ideas and maintenance by bucket, status and year; cards preview and deep-link', async ({ page, workbench }) => {
  const { api } = workbench;
  const item = await createSentinelItem(api, 'wb item');
  const active = await createSentinelIdea(api, 'wb active idea');
  const done = await createSentinelIdea(api, 'wb abandoned idea');
  const planning = await put(api, active, { status: 'Planning', link: 'https://example.com/wb-e2e', estimated_cost: 10, bucket: `${YEAR} Off-Season`, description: 'Seeded for the workbench e2e.', notes: 'wb notes' });
  expect(planning.status, JSON.stringify(planning.body).slice(0, 300)).toBeLessThan(300);
  const abandoned = await put(api, done, { status: 'Abandoned', bucket: `${YEAR} Off-Season` });
  expect(abandoned.status, JSON.stringify(abandoned.body).slice(0, 300)).toBeLessThan(300);

  const rec = async (record_type: string, bucket: string, extra: Record<string, unknown> = {}) => {
    const title = `${SENTINEL_MARKER} wb ${record_type} ${bucket}`;
    const r = await api('POST', '/admin/maintenance-records', {
      item_id: item.id, record_type, category: record_type === 'inspection' ? 'exterior_inspection' : 'cleaning', status: 'scheduled',
      title, description: `${record_type} notes`, performed_by: 'e2e-suite', materials_used: [], cost_record_ids: [], total_cost: 0,
      attachments: { before_photos: [], after_photos: [], documentation: [] }, date_scheduled: bucket,
      ...(record_type === 'repair' ? { criticality: 'high' } : {}), ...extra,
    });
    expect(r.status, JSON.stringify(r.body).slice(0, 300)).toBeLessThan(300);
    return title;
  };
  const halloweenRepair = await rec('repair', `${YEAR} Halloween`);
  const christmasInspection = await rec('inspection', `${YEAR} Christmas`);
  const offSeasonTask = await rec('maintenance', `${YEAR} Off-Season`);
  const completedTask = await rec('maintenance', `${YEAR} Halloween`, { status: 'completed', date_performed: new Date().toISOString() });

  await test.step('API summary places each record in the right bucket and section', async () => {
    const s = (await api('GET', `/workbench/summary?year=${YEAR}`)).data;
    expect(s.off_season.ideas.map((i: any) => i.title)).toContain(active.title);
    expect(s.off_season.completed.ideas.map((i: any) => i.title)).toContain(done.title);
    expect(s.halloween.repairs.map((r: any) => r.title)).toContain(halloweenRepair);
    expect(s.christmas.inspections.map((r: any) => r.title)).toContain(christmasInspection);
    expect(s.off_season.maintenance_tasks.map((r: any) => r.title)).toContain(offSeasonTask);
    expect(s.halloween.completed.maintenance_tasks.map((r: any) => r.title)).toContain(completedTask);
  });

  await test.step('Year pills — the seeded year selects, is shareable in the URL, and Clear returns to the current year', async () => {
    await page.goto('/');
    await expect(page.getByText('Seasonal Monitor')).toBeVisible();
    await page.getByRole('button', { name: String(YEAR), exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`year=${YEAR}`));
    await expect(page.getByText(`${YEAR} Off-Season`, { exact: true })).toBeVisible();
    await expect(page.getByText(`${YEAR} Halloween`, { exact: true })).toBeVisible();
    await expect(page.getByText(`${YEAR} Christmas`, { exact: true })).toBeVisible();
  });

  await test.step('Columns — each card lands in its season column and work section', async () => {
    const col = (label: string) => page.locator('section').filter({ has: page.getByText(`${YEAR} ${label}`, { exact: true }) });
    await expect(col('Off-Season').getByText(active.title)).toBeVisible();
    await expect(col('Off-Season').getByText(offSeasonTask)).toBeVisible();
    await expect(col('Halloween').getByText(halloweenRepair)).toBeVisible();
    await expect(col('Christmas').getByText(christmasInspection)).toBeVisible();
    // Terminal work is tucked into the "completed" disclosure, not the active list.
    await expect(col('Off-Season').getByText(done.title)).toBeHidden();
    await expect(col('Halloween').getByText(completedTask)).toBeHidden();
    await col('Halloween').getByRole('button', { name: /completed/ }).click();
    await expect(col('Halloween').getByText(completedTask)).toBeVisible();
  });

  await test.step('Idea card — preview modal shows description and notes, with a deep link to the idea', async () => {
    await page.locator('section').filter({ has: page.getByText(`${YEAR} Off-Season`, { exact: true }) }).getByText(active.title).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Seeded for the workbench e2e.')).toBeVisible();
    await expect(dialog.getByText('wb notes')).toBeVisible();
    await expect(dialog.locator('a', { hasText: 'View Record' })).toHaveAttribute('href', new RegExp(`/${active.id}$`));
    await dialog.getByRole('button', { name: 'Close', exact: true }).last().click();
    await expect(dialog).toBeHidden();
  });

  await test.step('Maintenance card — preview shows the item, criticality and a deep link to the record', async () => {
    await page.locator('section').filter({ has: page.getByText(`${YEAR} Halloween`, { exact: true }) }).getByText(halloweenRepair).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText(item.short_name)).toBeVisible(); // item name resolved from the id
    await expect(dialog.getByText('High', { exact: false }).first()).toBeVisible();
    await expect(dialog.locator('a', { hasText: 'View Record' })).toHaveAttribute('href', new RegExp(`/${encodeURIComponent(item.id)}/[^/]+$|/${item.id}/[^/]+$`));
  });

  await test.step('Clear deselects the pill; a year with no work shows the empty state', async () => {
    await page.goto(`/?year=${YEAR + 5}`);
    await expect(page.getByText(/No active work|Nothing scheduled/).first()).toBeVisible();
    await page.goto('/?year=clear');
    await expect(page.getByText('Seasonal Monitor')).toBeVisible();
    await expect(page.getByText(/Something went wrong|Failed to load/i)).toHaveCount(0);
  });
});
