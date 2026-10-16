import { expect, type Page } from '@playwright/test';

/**
 * Opens a HeroUI select by its label and picks an option, verifying the trigger now shows the value.
 * Popovers can close again right after opening, so open + pick is retried — but re-clicking an
 * already-selected option DESELECTS it, so each attempt first checks whether the value is already set.
 */
export async function selectOption(page: Page, label: string, name: RegExp, { last = false } = {}) {
  const triggers = page.getByRole('button', { name: new RegExp(`\\b${label}\\b`) });
  const trigger = last ? triggers.last() : triggers;
  const option = page.getByRole('option', { name });
  // After selection the trigger reads "<label><value>" with no separator (e.g. "Class TypeStatic Prop"), so
  // match the value un-anchored, but not when it is merely a prefix of another word ("Critical" vs "Criticality").
  const shown = new RegExp(`(${name.source.replace(/^\^/, '').replace(/\$$/, '')})(?![a-z])`);
  await expect(async () => {
    if (await trigger.filter({ hasText: shown }).count()) return;
    if (!(await option.first().isVisible())) await trigger.click();
    await option.first().click({ timeout: 3_000 });
    // The page is aria-hidden while the popover is open, so wait for it to close before reading the trigger.
    await expect(option.first()).toBeHidden({ timeout: 3_000 });
    await expect(trigger.filter({ hasText: shown })).toHaveCount(1, { timeout: 3_000 });
  }).toPass({ timeout: 20_000 });
}
