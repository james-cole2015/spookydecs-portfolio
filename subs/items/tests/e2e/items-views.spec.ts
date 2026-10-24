import { test, expect, sentinelName, SEASON } from './fixtures';
import { STORAGE_STATE_PATH } from './global-setup';
import { selectOption } from '../../../_e2e/shared/ui';

test.use({ storageState: STORAGE_STATE_PATH });

const listOf = (res: any): any[] => {
  const d = res.data ?? res.body?.data ?? res.body;
  return Array.isArray(d) ? d : d?.items || [];
};
const recordOf = (r: any) => r.data?.item ?? r.body?.data?.item ?? r.data ?? r.body?.data ?? r.body;

async function create(api: any, body: Record<string, unknown>) {
  const res = await api('POST', '/items', body);
  expect(res.status, JSON.stringify(res.body).slice(0, 300)).toBeLessThan(300);
  const rec = listOf(await api('GET', '/items')).find((i) => i.short_name === body.shortName);
  expect(rec, `created ${body.shortName}`).toBeTruthy();
  return rec;
}

test('items views: list search + filters, landing, and the item detail page with its maintenance history', async ({ page, items }) => {
  const { api, marker } = items;
  const prop = await create(api, {
    type: 'Decoration', category: 'Static Prop', shortName: sentinelName('Prop'), season: 'Halloween', status: 'Ready',
    stakes: '4', tethers: '2', packable: true, singlePacked: false, generalNotes: 'views notes',
  });
  const light = await create(api, {
    type: 'Light', category: 'String Light', shortName: sentinelName('Lights'), season: 'Christmas', status: 'Ready',
    color: 'Orange', bulbType: 'LED', length: '25', packable: true, singlePacked: false,
  });

  await test.step('List — search finds a sentinel by name and by id; unknown text finds none', async () => {
    await page.goto('/items');
    await page.getByPlaceholder('Search by name or ID...').fill(prop.short_name);
    await expect(page.getByText(prop.short_name).first()).toBeVisible();
    await expect(page.getByText(light.short_name)).toHaveCount(0);
    await page.getByPlaceholder('Search by name or ID...').fill('zzz-no-such-item-zzz');
    await expect(page.getByText(prop.short_name)).toHaveCount(0);
  });

  await test.step('List — class, type, season and status filters narrow the sentinels', async () => {
    const q = encodeURIComponent(marker);
    const shows = async (qs: string, present: any[], absent: any[]) => {
      await page.goto(`/items?search=${q}&${qs}`);
      for (const i of present) await expect(page.getByText(i.short_name).first(), `${qs}: ${i.short_name}`).toBeVisible();
      for (const i of absent) await expect(page.getByText(i.short_name), `${qs}: not ${i.short_name}`).toHaveCount(0);
    };
    await shows('class=Light', [light], [prop]);
    await shows('class=Decoration&class_type=Static+Prop', [prop], [light]);
    await shows('season=Christmas', [light], [prop]);
    await shows('season=Halloween', [prop], [light]);
    await shows('status=Ready', [prop, light], []);
    await shows('status=Deployed', [], [prop, light]);
    await shows('maintenance=needs_repair', [], [prop, light]);
  });

  await test.step('List — the Class filter control drives the URL', async () => {
    await page.goto(`/items?search=${encodeURIComponent(marker)}`);
    await selectOption(page, 'Class', /Light$/);
    await expect(page).toHaveURL(/class=Light/);
    await expect(page.getByText(light.short_name).first()).toBeVisible();
    await expect(page.getByText(prop.short_name)).toHaveCount(0);
  });

  await test.step('Landing — loads without errors', async () => {
    const resp = await page.goto('/');
    expect(resp?.status()).toBeLessThan(400);
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/Something went wrong|Unable to load|Failed to load/i)).toHaveCount(0);
  });

  await test.step('Detail — every section renders with the stored values', async () => {
    await page.goto(`/${encodeURIComponent(prop.id)}`);
    await expect(page.getByText(prop.short_name).first()).toBeVisible();
    for (const section of ['Overview', 'Storage', 'Deployment', 'Finance', 'Maintenance', 'Photos', 'Related Links']) {
      await expect(page.getByRole('heading', { name: section }).or(page.getByText(section, { exact: true })).first(), section).toBeVisible();
    }
    await expect(page.getByText('views notes')).toBeVisible();
    await expect(page.getByText('No active repair records')).toBeVisible();

    await page.goto(`/${encodeURIComponent(light.id)}`);
    for (const [label, value] of [['Color', 'Orange'], ['Bulb Type', 'LED'], ['Length', '25 ft']]) {
      await expect(page.getByText(`${label}:`, { exact: true }).first(), label).toBeVisible();
      await expect(page.getByText(value, { exact: true }).first(), value).toBeVisible();
    }
  });

  await test.step('Detail — a critical repair record appears under Maintenance and flags the item', async () => {
    const title = sentinelName('repair');
    const made = await api('POST', '/admin/maintenance-records', {
      item_id: prop.id, record_type: 'repair', category: 'replacement', status: 'scheduled', criticality: 'critical',
      title, description: '', performed_by: 'e2e-suite', materials_used: [], cost_record_ids: [], total_cost: 0,
      attachments: { before_photos: [], after_photos: [], documentation: [] },
    });
    expect(made.status, JSON.stringify(made.body).slice(0, 300)).toBeLessThan(300);
    await expect.poll(async () => recordOf(await api('GET', `/items/${encodeURIComponent(prop.id)}`))?.maintenance?.repair_data?.needs_repair, {
      timeout: 60_000, intervals: [2_000],
    }).toBe(true);

    await page.goto(`/${encodeURIComponent(prop.id)}`);
    await expect(page.getByText(title).first()).toBeVisible();
    await expect(page.getByText('Needs Repair').first()).toBeVisible();
    await expect(page.getByText('Non-Operational').first()).toBeVisible();

    await page.goto(`/items?search=${encodeURIComponent(marker)}&maintenance=needs_repair`);
    await expect(page.getByText(prop.short_name).first()).toBeVisible();
    await expect(page.getByText(light.short_name)).toHaveCount(0);
    await page.goto(`/items?search=${encodeURIComponent(marker)}&maintenance=non_operational`);
    await expect(page.getByText(prop.short_name).first()).toBeVisible();
  });
});
