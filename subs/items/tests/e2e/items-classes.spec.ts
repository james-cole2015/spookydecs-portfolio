import type { Page } from '@playwright/test';
import { test, expect, sentinelName, SEASON } from './fixtures';
import { STORAGE_STATE_PATH } from './global-setup';
import { selectOption } from '../../../_e2e/shared/ui';

test.use({ storageState: STORAGE_STATE_PATH });

type Case = {
  cls: string;
  type: string;
  /** label → value, typed into the Details step */
  fill: Record<string, string>;
  /** record field → expected value */
  expect: Record<string, string>;
  packMode?: string;
};

// Required fields mirror CLASS_TYPE_ATTRIBUTES / validators.py (#647). Every case fills them all.
const CASES: Case[] = [
  { cls: 'Decoration', type: 'Inflatable', fill: { 'Height/Length': '6.5', Stakes: '4', Tethers: '4', Adapter: 'AC-12' },
    expect: { height_length: '6.5', stakes: '4', tethers: '4', adapter: 'AC-12' } },
  { cls: 'Decoration', type: 'Animatronic', fill: { 'Height/Length': '5', Stakes: '2', Tethers: '2', Adapter: 'DC-5' },
    expect: { height_length: '5', stakes: '2', tethers: '2', adapter: 'DC-5' } },
  { cls: 'Light', type: 'String Light', fill: { Color: 'Orange', 'Bulb Type': 'LED', Length: '25' },
    expect: { color: 'Orange', bulb_type: 'LED', length: '25' } },
  { cls: 'Light', type: 'Spot Light', fill: { Color: 'Purple', 'Bulb Type': 'Incandescent' },
    expect: { color: 'Purple', bulb_type: 'Incandescent' } },
  { cls: 'Accessory', type: 'Cord', fill: { Length: '10', 'Male Ends': '1', 'Female Ends': '3', Watts: '1800', Amps: '15' },
    expect: { length: '10', male_ends: '1', female_ends: '3' } },
  { cls: 'Accessory', type: 'Plug', fill: { Length: '2', 'Male Ends': '1', 'Female Ends': '1' },
    expect: { length: '2', male_ends: '1', female_ends: '1' } },
];

async function pickClassAndType(page: Page, cls: string, type: string) {
  await page.goto('/create');
  await page.getByRole('button', { name: cls }).first().click();
  await page.getByRole('button', { name: type }).first().click();
}

/** Labels like "Length" must not match "Height/Length", so anchor at the start. */
const field = (page: Page, label: string) => page.getByLabel(new RegExp(`^${label.replace(/[/]/g, '\\/')}\\b`));

async function save(page: Page) {
  await page.getByRole('button', { name: /Review/ }).click();
  const created = page.waitForResponse((r) => r.url().endsWith('/items') && r.request().method() === 'POST');
  await page.getByRole('button', { name: /Save Item/ }).click();
  const res = await created;
  expect(res.status(), `POST /items → ${(await res.text()).slice(0, 300)}`).toBeLessThan(300);
  await page.waitForURL(/\/items$/);
}

async function findByName(api: any, name: string) {
  const res = await api('GET', '/items');
  const list: any[] = res.data?.items || res.body?.items || res.data || [];
  return list.find((i) => i.short_name === name);
}

for (const c of CASES) {
  test(`items classes: create ${c.cls} / ${c.type} through the wizard with its class fields`, async ({ page, items }) => {
    const { api } = items;
    const name = sentinelName(c.type);
    await pickClassAndType(page, c.cls, c.type);
    await page.getByLabel('Item Name').fill(name);
    await selectOption(page, 'Season', SEASON);
    for (const [label, value] of Object.entries(c.fill)) await field(page, label).fill(value);
    await save(page);

    const rec = await findByName(api, name);
    expect(rec, 'created item present via API').toBeTruthy();
    expect(rec).toMatchObject({ class: c.cls, class_type: c.type, season: SEASON, status: 'Ready' });
    for (const [k, v] of Object.entries(c.expect)) expect(String(rec[k]), k).toBe(v);
    expect(rec.storage_data).toMatchObject({ packable: true, single_packed: false });
    expect(rec.id).toBeTruthy();
  });
}

test('items classes: Large & Oversized is not packable; vendor + power fields persist', async ({ page, items }) => {
  const { api } = items;
  const name = sentinelName('Oversized');
  await pickClassAndType(page, 'Decoration', 'Static Prop');
  await page.getByLabel('Item Name').fill(name);
  await selectOption(page, 'Season', SEASON);
  await field(page, 'Stakes').fill('6');
  await field(page, 'Tethers').fill('6');
  await page.getByLabel('Cost', { exact: true }).fill('49.99');
  await page.getByLabel('Manufacturer').fill('E2E Mfg');
  await page.getByLabel('Store', { exact: true }).fill('E2E Store');
  await selectOption(page, 'Pack Mode', 'Large & Oversized');
  await save(page);

  const rec = await findByName(api, name);
  expect(rec).toBeTruthy();
  expect(rec.storage_data).toMatchObject({ packable: false, single_packed: false });
  expect(rec.vendor_metadata).toMatchObject({ manufacturer: 'E2E Mfg', vendor_store: 'E2E Store' });
  expect(Number(rec.vendor_metadata.cost)).toBeCloseTo(49.99, 2);
  // 'Power Required' is deliberately not asserted: builder.py ignores the checkbox on create (sets power_inlet only for
  // power classes, unconditionally), so a Static Prop never stores it. Flagged to the user.

  await test.step('Edit shows the stored pack mode', async () => {
    await page.goto(`/${encodeURIComponent(rec.id)}/edit`);
    await expect(page.getByRole('button', { name: /Large & Oversized/ })).toBeVisible();
  });
});

test('items classes: required class fields block the wizard until filled', async ({ page, items }) => {
  const { api } = items;
  const name = sentinelName('Cord invalid');
  let posted = 0;
  page.on('request', (r) => { if (r.url().endsWith('/items') && r.method() === 'POST') posted++; });

  await pickClassAndType(page, 'Accessory', 'Cord');
  await page.getByLabel('Item Name').fill(name);
  await selectOption(page, 'Season', SEASON);
  // Length / Male Ends / Female Ends are required for Cords (validators.py) but left empty: Review is reachable,
  // Save is not.
  await page.getByRole('button', { name: /Review/ }).click();
  await page.getByRole('button', { name: /Save Item/ }).click();
  // Native required-field validation (no app message): the empty Length input is flagged invalid.
  expect(await field(page, 'Length').evaluate((el: HTMLInputElement) => el.validity.valueMissing)).toBe(true);
  expect(posted).toBe(0);
  expect(page.url()).toContain('/create');
  expect(await findByName(api, name)).toBeFalsy();

  await test.step('Filling the required fields lets the same form save', async () => {
    await field(page, 'Length').fill('3');
    await field(page, 'Male Ends').fill('1');
    await field(page, 'Female Ends').fill('1');
    await page.getByRole('button', { name: /Save Item/ }).click();
    await page.waitForURL(/\/items$/);
    expect(await findByName(api, name)).toBeTruthy();
  });
});
