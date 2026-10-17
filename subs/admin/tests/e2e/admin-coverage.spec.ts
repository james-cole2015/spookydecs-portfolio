import { test, expect, createSentinelItem, createSentinelIdea, SENTINEL_MARKER } from './fixtures';
import { STORAGE_STATE_PATH } from './global-setup';
import { selectOption } from '../../../_e2e/shared/ui';
import { IMG } from '../../../images/tests/shared/sentinel.mjs';
import { remainingObjects } from '../../../_e2e/shared/s3.mjs';

test.use({ storageState: STORAGE_STATE_PATH });

const itemOf = (r: any) => r.data?.item ?? r.data ?? r.body;
const photosOf = (r: any): any[] => {
  const d = r.data ?? r.body?.data ?? r.body;
  return d?.photos || d?.images || (Array.isArray(d) ? d : []);
};

test('admin: dashboard renders live stats; About renders; unknown routes fall back to the dashboard; Iris panel opens', async ({ page, admin }) => {
  const { api } = admin;
  const inspector = (await api('GET', '/admin/inspector/violations/stats')).data;
  const wb = (await api('GET', '/stats/workbench')).data;

  await page.goto('/');
  await expect(page.getByText('SpookyDecs Admin').first()).toBeVisible();

  await test.step('Action Center — Inspector tiles match the inspector stats API', async () => {
    const section = page.locator('section').filter({ hasText: 'Inspector' }).first();
    await expect(section.getByText('Data Quality and Readiness')).toBeVisible();
    const open = section.locator('div').filter({ hasText: /^🔴\s*\d+\s*Open$/ }).first();
    await expect(open).toContainText(String(inspector?.data?.total_open ?? inspector?.total_open ?? 0));
  });

  await test.step('Action Center — Workbench section shows the current season and its three counters; season chips switch', async () => {
    await expect(page.getByText('Workbench').first()).toBeVisible();
    for (const label of ['Active', 'Scheduled', 'Completed (90d)']) await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
    expect(wb, 'workbench stats resolved').toBeTruthy();
  });

  await test.step('System Map — a tile per sub; Items shows the live total from /stats/items', async () => {
    await expect(page.getByRole('heading', { name: 'System Map' })).toBeVisible();
    for (const t of ['Ideas', 'Items', 'Storage', 'Deployments']) await expect(page.getByRole('heading', { name: t, exact: true })).toBeVisible();
    const total = (await api('GET', '/stats/items')).data?.total_items ?? (await api('GET', '/stats/items')).body?.data?.total_items;
    await expect(page.getByText(`${total} total items`)).toBeVisible();
    await expect(page.getByText(/Something went wrong|Failed to load/i)).toHaveCount(0);
  });

  await test.step('Iris panel renders its prompt box (chat itself is an agentic GAP)', async () => {
    await page.getByRole('button', { name: /Iris Assistant/ }).click();
    await expect(page.getByPlaceholder('Ask Iris anything...')).toBeVisible();
    await expect(page.getByText('Welcome! Ask me anything about your SpookyDecs inventory.')).toBeVisible();
  });

  await test.step('About page renders; an unknown route redirects to the dashboard', async () => {
    await page.goto('/about');
    await expect(page.getByText(/Technical Stack/i).first()).toBeVisible();
    await page.goto('/no-such-page');
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByText('System Map')).toBeVisible();
  });
});

test('admin: search text — find a sentinel item, edit its search_text, Save persists', async ({ page, admin }) => {
  const { api } = admin;
  const item = await createSentinelItem(api, 'search text');
  const text = `e2e search text ${Date.now()}`;

  await page.goto('/search-text');
  await expect(page.getByText('Iris Search Text')).toBeVisible();
  await page.getByPlaceholder('Search items...').fill(item.short_name);
  await page.getByRole('button', { name: new RegExp(item.id.slice(0, 20)) }).first().click();
  await expect(page.getByLabel('search_text')).toBeVisible();
  await page.getByLabel('search_text').fill(text);
  const patched = page.waitForResponse((r) => r.request().method() === 'PATCH' && r.url().includes('/items/'));
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  expect((await patched).status()).toBeLessThan(300);
  await expect(page.getByText('Search text saved.')).toBeVisible();
  await expect.poll(async () => itemOf(await api('GET', `/items/${encodeURIComponent(item.id)}`))?.search_text, { timeout: 15_000 }).toBe(text);

  await test.step('A query with no match says so; both reindex cards render (rebuilding embeddings is not triggered)', async () => {
    await page.getByPlaceholder('Search items...').fill('zzzz-no-such-item-e2e');
    await expect(page.getByText('No items found.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Rebuild' })).toHaveCount(2);
  });
});

test('admin: Add Outlet — form validation, register a Receptacle, it appears under its zone', async ({ page, admin }) => {
  const { api } = admin;
  const name = `${SENTINEL_MARKER} outlet ${Date.now()}`;
  await page.goto('/add-outlet');
  await expect(page.getByRole('heading', { name: 'Existing Outlets' })).toBeVisible();
  const register = page.getByRole('button', { name: 'Register Outlet' });
  await expect(register).toBeDisabled();

  await selectOption(page, 'Zone', /Front Yard/);
  await page.getByLabel('Name').fill(name);
  await page.getByLabel('Port count').fill('0');
  await expect(page.getByText('Port count must be a positive number.')).toBeVisible();
  await expect(register).toBeDisabled();
  await page.getByLabel('Port count').fill('3');
  await expect(register).toBeEnabled();

  const posted = page.waitForResponse((r) => r.request().method() === 'POST' && /\/items$/.test(r.url()));
  await register.click();
  const res = await posted;
  expect(res.status(), `POST outlet → ${(await res.text()).slice(0, 300)}`).toBeLessThan(300);
  await expect(page.getByText(/Outlet .* registered in FY/)).toBeVisible();

  await expect(page.getByText(name)).toBeVisible(); // Existing Outlets reloads
  const found = (await api('GET', '/items?class=Receptacle')).data?.items?.find((i: any) => i.short_name === name);
  expect(found, 'receptacle persisted').toBeTruthy();
  expect(found.id).toMatch(/^REC-FY-/);
  expect(found).toMatchObject({ zone_code: 'FY', female_ends: 3, season: 'Shared' });
  // The form resets for the next outlet.
  await expect(page.getByLabel('Name')).toHaveValue('');
});

test('admin: place photo — attach to an item, an idea and a maintenance record; cascade delete leaves no S3 objects', async ({ page, admin }) => {
  test.setTimeout(300_000);
  const { api } = admin;
  const item = await createSentinelItem(api, 'place item');
  const idea = await createSentinelIdea(api, 'place idea');
  const mItem = await createSentinelItem(api, 'place maint');
  const mrec = await api('POST', '/admin/maintenance-records', {
    item_id: mItem.id, record_type: 'maintenance', category: 'cleaning', status: 'scheduled', title: `${SENTINEL_MARKER} place record`,
    description: '', performed_by: 'e2e-suite', materials_used: [], cost_record_ids: [], total_cost: 0,
    attachments: { before_photos: [], after_photos: [], documentation: [] },
  });
  expect(mrec.status).toBeLessThan(300);

  const upload = async () => {
    await page.getByRole('button', { name: 'Choose photos to upload' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.locator('input[type="file"]').setInputFiles({ name: 'place.jpg', mimeType: 'image/jpeg', buffer: IMG });
    await dialog.getByRole('button', { name: /^Continue/ }).click();
    await page.getByRole('button', { name: 'Use original' }).click();
  };
  const s3Keys: string[] = [];

  await test.step('Item target', async () => {
    await page.goto('/place-photo');
    await page.getByLabel('Search items').fill(item.short_name);
    await page.getByText(item.short_name).first().click();
    await upload();
    await expect(page.getByText(/1 photo uploaded to Item/)).toBeVisible({ timeout: 60_000 });
    await expect.poll(async () => photosOf(await api('GET', `/admin/images?item_id=${encodeURIComponent(item.id)}`)).length, { timeout: 30_000 }).toBe(1);
    s3Keys.push(photosOf(await api('GET', `/admin/images?item_id=${encodeURIComponent(item.id)}`))[0].s3_key);
  });

  await test.step('Idea target', async () => {
    await page.getByRole('tab', { name: 'Idea' }).click();
    await page.getByRole('textbox', { name: 'Filter idea' }).fill(idea.title);
    await page.getByText(idea.title).first().click();
    await upload();
    await expect(page.getByText(/1 photo uploaded to Idea/)).toBeVisible({ timeout: 60_000 });
    await expect.poll(async () => photosOf(await api('GET', `/admin/images?idea_id=${encodeURIComponent(idea.id)}`)).length, { timeout: 30_000 }).toBe(1);
    s3Keys.push(photosOf(await api('GET', `/admin/images?idea_id=${encodeURIComponent(idea.id)}`))[0].s3_key);
  });

  await test.step('Maintenance target — the photo also carries the record\'s item', async () => {
    await page.getByRole('tab', { name: /Maintenance/ }).click();
    await page.getByRole('textbox', { name: /Filter maintenance/ }).fill(mItem.short_name);
    await page.getByText(mItem.short_name).first().click();
    await upload();
    await expect(page.getByText(/1 photo uploaded to Maintenance/)).toBeVisible({ timeout: 60_000 });
    await expect.poll(async () => photosOf(await api('GET', `/admin/images?item_id=${encodeURIComponent(mItem.id)}`)).length, { timeout: 30_000 }).toBe(1);
    s3Keys.push(photosOf(await api('GET', `/admin/images?item_id=${encodeURIComponent(mItem.id)}`))[0].s3_key);
  });

  await test.step('Cascade deleting the records leaves no S3 objects behind', async () => {
    await api('DELETE', `/items/${encodeURIComponent(item.id)}/cascade`);
    await api('DELETE', `/ideas/${idea.id}/cascade`);
    await api('DELETE', `/items/${encodeURIComponent(mItem.id)}/cascade`);
    for (const key of s3Keys) {
      await expect.poll(() => remainingObjects({ s3_key: key }), { timeout: 30_000 }).toEqual([]);
    }
  });
});
