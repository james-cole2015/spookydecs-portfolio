import type { Page } from '@playwright/test';
import { test, expect, createItem, createIdea, findSentinelCosts, sentinelName } from './fixtures';
import { STORAGE_STATE_PATH } from './global-setup';
import { selectOption } from '../../../_e2e/shared/ui';

test.use({ storageState: STORAGE_STATE_PATH });

const today = () => new Date().toISOString().slice(0, 10);
const costOf = (r: any) => r.data?.item ?? r.data ?? r.body;

interface CostInput { name: string; type: string; category: string; store?: string; total?: string; manufacturer?: string }

/** Fills the single-item CostForm (not the related-entity picker, which varies by cost type). */
async function fillCostForm(page: Page, c: CostInput) {
  await page.getByLabel('Item Name').fill(c.name);
  await page.getByLabel('Cost Date').fill(today());
  await selectOption(page, 'Cost Type', c.type, { first: true });
  await selectOption(page, 'Category', c.category);
  await page.getByLabel('Store').fill(c.store ?? 'E2E Store');
  if (c.manufacturer) await page.getByLabel('Manufacturer').fill(c.manufacturer);
  await page.getByLabel('Total Cost').fill(c.total ?? '12.50');
}

/** Review & Submit → Confirm & Submit, and returns the POST /finance/costs response status + cost. */
async function submitCost(page: Page) {
  const posted = page.waitForResponse((r) => r.request().method() === 'POST' && /\/finance\/costs$/.test(r.url()));
  await page.getByRole('button', { name: /Review & Submit/ }).click();
  await page.getByRole('button', { name: /Confirm & Submit/ }).click();
  const res = await posted;
  expect(res.status(), `POST /finance/costs → ${(await res.text()).slice(0, 300)}`).toBeLessThan(300);
}

async function pickRelated(page: Page, label: RegExp, search: string) {
  await page.getByLabel(label).fill(search);
  await page.getByRole('option', { name: new RegExp(search.slice(-13)) }).first().click();
}

test('finance lifecycle: create (Other) → list + search + filter → detail → delete', async ({ page, finance }) => {
  const { api } = finance;
  const name = sentinelName('other');
  let costId = '';

  await test.step('Create — single-item cost through CostForm + review modal', async () => {
    await page.goto('/new');
    await fillCostForm(page, { name, type: 'Other', category: 'Other' });
    await submitCost(page);
    await expect.poll(async () => (await findSentinelCosts(api)).find((c: any) => c.item_name === name)?.cost_id, { timeout: 15_000 }).toBeTruthy();
    const rec = (await findSentinelCosts(api)).find((c: any) => c.item_name === name)!;
    costId = rec.cost_id;
    expect(rec.cost_type).toBe('other');
    expect(Number(rec.total_cost)).toBe(12.5);
    expect(rec.vendor).toBe('E2E Store');
  });

  await test.step('List — records page finds it by search and by Type filter', async () => {
    await page.goto('/records');
    await page.getByLabel('Search').fill(name);
    await expect(page.getByText(name).first()).toBeVisible();
    await selectOption(page, 'Type', 'Other');
    await expect(page.getByText(name).first()).toBeVisible();
    await selectOption(page, 'Type', 'Repair');
    await expect(page.getByText(name)).toHaveCount(0);
  });

  await test.step('Detail — cost page renders the record', async () => {
    await page.goto(`/costs/${costId}`);
    await expect(page.getByText(name).first()).toBeVisible();
    await expect(page.getByText('E2E Store').first()).toBeVisible();
  });

  await test.step('Delete — remove from the detail page', async () => {
    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click();
    await expect.poll(async () => (await api('GET', `/finance/costs/${costId}`)).status, { timeout: 15_000 }).toBe(404);
  });
});

test('finance: acquisition requires its related item, then syncs vendor metadata to the item', async ({ page, finance }) => {
  const { api } = finance;
  const item = await createItem(api, 'acq');
  const name = sentinelName('acquisition');

  await page.goto('/new');
  await fillCostForm(page, { name, type: 'Acquisition', category: 'Decoration', manufacturer: 'E2E Maker' });

  await test.step('Validation — Related Item is required for a decoration acquisition', async () => {
    // The required Related Item is enforced by the browser's native constraint validation (the field is
    // isRequired), so submit is blocked with no app-level message: no review modal, an :invalid field, no POST.
    let posted = false;
    page.on('request', (r) => { if (r.method() === 'POST' && /\/finance\/costs$/.test(r.url())) posted = true; });
    await page.getByRole('button', { name: /Review & Submit/ }).click();
    await expect(page.getByRole('button', { name: /Confirm & Submit/ })).toHaveCount(0);
    await expect(page.locator('input:invalid')).not.toHaveCount(0);
    expect(posted).toBe(false);
  });

  await test.step('Create — link the sentinel item and submit', async () => {
    await pickRelated(page, /Related Item/, item.short_name);
    await submitCost(page);
    await expect.poll(async () => (await findSentinelCosts(api)).find((c: any) => c.item_name === name)?.related_item_id, { timeout: 15_000 }).toBe(item.id);
  });

  await test.step('EDA — acquisition cost syncs vendor metadata onto the item', async () => {
    await expect.poll(async () => {
      const it = costOf(await api('GET', `/items/${item.id}`));
      return JSON.stringify(it?.vendor_metadata ?? {});
    }, { timeout: 45_000, intervals: [1000, 2000, 3000, 5000], message: 'finance → items vendor sync' }).toContain('E2E Store');
  });

  await test.step('Item costs — /:itemId lists the cost', async () => {
    await page.goto(`/${item.id}`);
    await expect(page.getByText(item.short_name).first()).toBeVisible();
    await expect(page.getByText('Cost History (1)')).toBeVisible();
    await expect(page.getByText('$12.50').first()).toBeVisible();
    await expect(page.getByText('E2E Store • Decoration')).toBeVisible();
  });
});

test('finance: build and supply_purchase costs attribute to an idea through the Related Idea picker', async ({ page, finance }) => {
  const { api } = finance;
  const idea = await createIdea(api, 'attrib');

  for (const c of [
    { type: 'Build', category: 'Parts', wire: 'build' },
    { type: 'Supply Purchase', category: 'Consumables', wire: 'supply_purchase' },
  ]) {
    await test.step(`${c.type} — picker shows and the idea id is persisted`, async () => {
      const name = sentinelName(c.wire);
      await page.goto('/new');
      await fillCostForm(page, { name, type: c.type, category: c.category });
      await pickRelated(page, /Related Idea/, idea.title);
      await submitCost(page);
      await expect.poll(async () => (await findSentinelCosts(api)).find((x: any) => x.item_name === name)?.related_idea_id, { timeout: 15_000 }).toBe(idea.id);
    });
  }

  await test.step('Cost type without an idea link (Other) offers an item picker, not an idea picker', async () => {
    await page.goto('/new');
    await selectOption(page, 'Cost Type', 'Other', { first: true });
    await expect(page.getByLabel(/Related Idea/)).toHaveCount(0);
    await expect(page.getByLabel(/Related Item/)).toBeVisible();
  });
});

test('finance: pack purchase splits cost across items and syncs vendor metadata', async ({ page, finance }) => {
  const { api } = finance;
  const a = await createItem(api, 'pack-a');
  const b = await createItem(api, 'pack-b');
  const pack = sentinelName('pack');

  await page.goto('/new');
  await page.getByRole('tab', { name: 'Pack Purchase' }).click();
  await page.getByLabel('Pack Name').fill(pack);
  await page.getByLabel(/Vendor \/ Store/).fill('E2E Store');
  await page.getByLabel('Purchase Date').fill(today());
  await page.getByLabel(/Total Cost/).fill('20');
  for (const it of [a, b]) {
    await page.getByLabel('Search items').fill(it.short_name);
    await page.getByRole('option', { name: new RegExp(it.short_name.slice(-13)) }).first().click();
  }
  await expect(page.getByText('Items Selected').locator('..').getByText('2')).toBeVisible();
  await page.keyboard.press('Escape'); // close the item picker popover (it aria-hides the rest of the page)
  await page.getByRole('button', { name: /Review & Save Pack/ }).click();
  const posted = page.waitForResponse((r) => r.request().method() === 'POST' && /\/finance\/costs$/.test(r.url()));
  await page.getByRole('dialog').getByRole('button', { name: 'Create Pack' }).click();
  expect((await posted).status()).toBeLessThan(300);

  await expect.poll(async () => (await findSentinelCosts(api)).find((c: any) => c.pack_name === pack || c.item_name === pack), { timeout: 15_000 }).toBeTruthy();
  const cost = (await findSentinelCosts(api)).find((c: any) => c.pack_name === pack || c.item_name === pack)!;
  expect(cost.pack_item_ids ?? []).toEqual(expect.arrayContaining([a.id, b.id]));
  expect(Number(cost.cost_per_item)).toBe(10);

  await test.step('EDA — pack cost syncs vendor metadata onto every item in the pack', async () => {
    for (const it of [a, b]) {
      await expect.poll(async () => {
        const rec = costOf(await api('GET', `/items/${it.id}`));
        return JSON.stringify(rec?.vendor_metadata ?? {});
      }, { timeout: 45_000, intervals: [1000, 2000, 3000, 5000], message: `pack vendor sync → ${it.id}` }).toContain('E2E Store');
    }
  });
});

test('finance: landing, items, statistics and receipts views load without errors', async ({ page }) => {
  for (const path of ['/', '/items', '/statistics', '/receipts', '/records']) {
    await test.step(path, async () => {
      const resp = await page.goto(path);
      expect(resp?.status()).toBeLessThan(400);
      await page.waitForLoadState('networkidle');
      await expect(page.getByText(/Something went wrong|Unable to load|Failed to load/i)).toHaveCount(0);
    });
  }
});
