import type { Locator } from '@playwright/test';
import { test, expect, sentinelName, findSentinels } from './fixtures';
import { STORAGE_STATE_PATH } from './global-setup';
import { createSentinelItem } from '../../../_e2e/shared/entities.mjs';

test.use({ storageState: STORAGE_STATE_PATH });

const MAX_ACTIVE_BUILDS = 3; // sd_ideas_handler.MAX_ACTIVE_BUILDS

const asList = (res: any) => {
  const d = res.data ?? res.body?.data ?? res.body;
  return Array.isArray(d) ? d : d?.costs || d?.ideas || [];
};

async function createIdea(api: any, label: string, extra: Record<string, unknown> = {}) {
  const title = sentinelName(label);
  const res = await api('POST', '/ideas', { title, season: 'Halloween', status: 'Considering', tags: [], ...extra });
  expect(res.status, `POST /ideas → ${JSON.stringify(res.body).slice(0, 200)}`).toBeLessThan(300);
  const found = (await findSentinels(api)).find((i: any) => i.title === title);
  expect(found, 'seeded idea present').toBeTruthy();
  return found;
}

/** PUT /ideas/{id} requires id + title + season in the body (the UI always sends them). */
const putIdea = (api: any, idea: any, patch: Record<string, unknown>) =>
  api('PUT', `/ideas/${idea.id}`, { id: idea.id, title: idea.title, season: 'Halloween', ...patch });

const getIdea = async (api: any, id: string) => (await findSentinels(api)).find((i: any) => i.id === id);

test('ideas workflow: inline edit → gated Planning transition → server gate → back to Considering', async ({ page, ideas }) => {
  const { api } = ideas;
  const idea = await createIdea(api, 'Workflow');
  const title = idea.title;

  await test.step('Considering — Move to Planning is gated until description + link/cost exist', async () => {
    await page.goto(`/${idea.id}`);
    await expect(page.getByText(/Missing for Planning:.*Description.*Link or Estimated Cost/)).toBeVisible();
    await expect(page.getByRole('button', { name: /Move to Planning/ })).toBeDisabled();
  });

  await test.step('Server enforces the same gate (direct PUT bypassing the UI)', async () => {
    const res = await putIdea(api, idea, { status: 'Planning' });
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).toMatch(/missing/i);
    expect((await getIdea(api, idea.id)).status).toBe('Considering');
  });

  await test.step('Inline edit — title, description, notes, link persist', async () => {
    const edit = async (trigger: Locator, next: string, key: 'Enter' | 'Tab') => {
      await trigger.click();
      const box = page.locator('input:focus, textarea:focus');
      await box.fill(next);
      await box.press(key);
    };

    await edit(page.getByRole('button', { name: title }), `${title} (edited)`, 'Enter');
    await expect.poll(async () => (await getIdea(api, idea.id))?.title).toBe(`${title} (edited)`);

    // Textareas commit on blur, not Enter.
    await edit(page.getByRole('button', { name: /Click to add a description/ }), 'Edited description from the #623 e2e suite.', 'Tab');
    await expect.poll(async () => (await getIdea(api, idea.id))?.description).toBe('Edited description from the #623 e2e suite.');

    await edit(page.getByRole('button', { name: /Click to add notes/ }), 'e2e note', 'Tab');
    await expect.poll(async () => (await getIdea(api, idea.id))?.notes).toBe('e2e note');
  });

  await test.step('Still gated without a link or estimated cost; supplying a link opens the gate', async () => {
    await expect(page.getByRole('button', { name: /Move to Planning/ })).toBeDisabled();
    await page.getByRole('button', { name: /Click to add/ }).last().click();
    const box = page.locator('input:focus');
    await box.fill('https://example.com/e2e-idea');
    await box.press('Enter');
    await expect.poll(async () => (await getIdea(api, idea.id))?.link).toBe('https://example.com/e2e-idea');
    await expect(page.getByRole('button', { name: /Move to Planning/ })).toBeEnabled();
  });

  await test.step('Move to Planning — confirm dialog, status persists', async () => {
    await page.getByRole('button', { name: /Move to Planning/ }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Move to Planning' }).click();
    await expect.poll(async () => (await getIdea(api, idea.id))?.status).toBe('Planning');
    await expect(page.getByText(/Missing for Workbench:.*Materials.*Build Instructions/)).toBeVisible();
    await expect(page.getByRole('button', { name: /Move to Workbench|Build Limit Reached/ })).toBeDisabled();
  });

  await test.step('Server gate for Workbench (materials + instructions missing)', async () => {
    const res = await putIdea(api, idea, { status: 'Workbench' });
    expect(res.status).toBe(400);
    expect((await getIdea(api, idea.id)).status).toBe('Planning');
  });

  await test.step('Back to Considering', async () => {
    await page.getByRole('button', { name: /Back to Considering/ }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Back to Considering' }).click();
    await expect.poll(async () => (await getIdea(api, idea.id))?.status).toBe('Considering');
  });
});

test('ideas workflow: Workbench WIP cap is enforced in the UI and by the API', async ({ page, ideas }) => {
  const { api } = ideas;
  const idea = await createIdea(api, 'Cap', {
    description: 'cap check',
    link: 'https://example.com/cap',
    materials: [{ name: 'PVC pipe', done: false }],
    build_instructions: [{ title: 'Cut pipe', description: 'Cut it', status: 'pending' }],
  });
  await putIdea(api, idea, { status: 'Planning' });

  const active = asList(await api('GET', '/ideas')).filter((i: any) => i.status === 'Workbench').length;
  await page.goto(`/${idea.id}`);

  if (active >= MAX_ACTIVE_BUILDS) {
    test.info().annotations.push({ type: 'cap', description: `dev has ${active} Workbench ideas — asserting the block` });
    await expect(page.getByRole('button', { name: /Build Limit Reached/ })).toBeDisabled();
    const res = await putIdea(api, idea, { status: 'Workbench' });
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).toMatch(/limit/i);
    expect((await getIdea(api, idea.id)).status).toBe('Planning');
  } else {
    test.info().annotations.push({ type: 'cap', description: `dev has ${active} Workbench ideas — asserting the move succeeds` });
    const move = page.getByRole('button', { name: 'Move to Workbench' });
    await expect(move).toBeEnabled();
    await move.click();
    // The advisory instruction review may interject "Build Instructions May Be Thin"; proceed either way.
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 60_000 });
    await dialog.getByRole('button', { name: /Move to Workbench|Proceed Anyway/ }).click();
    await expect.poll(async () => (await getIdea(api, idea.id))?.status, { timeout: 15_000 }).toBe('Workbench');
  }
});

test('ideas workflow: IdeaBuild.Complete → item vendor_metadata + finance acquisition (batch of 2)', async ({ page, ideas }) => {
  const { api, marker } = ideas;
  const idea = await createIdea(api, 'Build', {
    description: 'build chain',
    link: 'https://example.com/build',
  });
  const itemA = await createSentinelItem(api, marker, 'built A');
  const itemB = await createSentinelItem(api, marker, 'built B');

  await test.step('Log a build cost through the Costs card', async () => {
    await page.goto(`/${idea.id}`);
    await putIdea(api, idea, { status: 'Planning' });
    await page.reload();
    await page.getByRole('button', { name: '+ Log Cost' }).click();
    const modal = page.getByRole('dialog');
    await modal.getByLabel(/Item \/ Description/).fill('E2E build materials');
    await modal.getByLabel(/Total Cost/).fill('12.35');
    await modal.getByLabel(/Store/).fill('E2E Hardware');
    await modal.getByRole('button', { name: 'Save Cost' }).click();
    await expect(page.getByText('$12.35').first()).toBeVisible();
    const costs = asList(await api('GET', `/finance/costs?related_idea_id=${idea.id}`));
    expect(costs.length).toBe(1);
    expect(costs[0].cost_type).toBe('build');
  });

  await test.step('Mark Built with two items (what the wizard submits) → event fan-out', async () => {
    const res = await putIdea(api, idea, {
      status: 'Built',
      build_complete: new Date().toISOString().slice(0, 10),
      item_id: itemA.id, related_item_id: itemA.id, built_item_ids: [itemA.id, itemB.id],
    });
    expect(res.status, JSON.stringify(res.body).slice(0, 300)).toBeLessThan(300);
  });

  await test.step('Ideas → Items: vendor_metadata split 6.17 / 6.18 and source_idea_id set', async () => {
    const read = async (id: string) => {
      const r = await api('GET', `/items/${id}`);
      return r.data?.item ?? r.body?.data?.item ?? r.data ?? r.body?.data ?? r.body;
    };
    await expect.poll(async () => (await read(itemA.id))?.source_idea_id, { timeout: 60_000, intervals: [2_000] }).toBe(idea.id);
    await expect.poll(async () => (await read(itemB.id))?.source_idea_id, { timeout: 60_000, intervals: [2_000] }).toBe(idea.id);
    const [a, b] = [await read(itemA.id), await read(itemB.id)];
    expect(a.vendor_metadata).toMatchObject({ vendor_store: 'SpookyDecs Ent', manufacturer: 'SpookyDecs Ent' });
    expect([a.vendor_metadata.cost, b.vendor_metadata.cost]).toEqual(['6.17', '6.18']);
  });

  await test.step('Ideas → Finance: one acquisition row for the build at the full total', async () => {
    await expect
      .poll(async () => asList(await api('GET', `/finance/costs?related_idea_id=${idea.id}`)).some((c: any) => c.cost_id === `acq-build-${idea.id}`), {
        timeout: 60_000, intervals: [2_000],
      })
      .toBe(true);
    const acq = asList(await api('GET', `/finance/costs?related_idea_id=${idea.id}`)).find((c: any) => c.cost_id === `acq-build-${idea.id}`);
    expect(acq).toMatchObject({ cost_type: 'acquisition', related_item_id: itemA.id, related_idea_id: idea.id });
    expect(Number(acq.total_cost)).toBeCloseTo(12.35, 2);
    expect(Number(acq.quantity)).toBe(2);
  });

  await test.step('Built idea renders locked with a link to its item', async () => {
    await page.goto(`/${idea.id}`);
    await expect(page.getByText(/Build complete — this idea is locked/)).toBeVisible();
    await expect(page.getByRole('link', { name: /View Item/ }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Delete', exact: true })).toHaveCount(0);
  });
});
