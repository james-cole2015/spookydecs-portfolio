import { expect, type Page } from '@playwright/test';

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Opens a HeroUI select by its label and picks an option, verifying the trigger now shows the value.
 *
 * `value` is a plain string (matched at the end of the option's accessible name, so a leading icon like
 * "🎃 Halloween" is fine) or a RegExp for an exact/anchored match.
 *
 * Popovers can close again right after opening, so open + pick is retried — but re-clicking an
 * already-selected option DESELECTS it, so each attempt first checks whether the value is already set.
 */
export async function selectOption(page: Page, label: string, value: string | RegExp, { first = false, last = false } = {}) {
  const optionName = typeof value === 'string' ? new RegExp(`(^|\\s)${escapeRe(value)}$`) : value;
  // After selection the trigger reads "<label><value>" with no separator (e.g. "Class TypeStatic Prop"), so
  // match the value un-anchored, but not when it is merely a prefix of another word ("Critical" vs "Criticality").
  const core = typeof value === 'string' ? escapeRe(value) : value.source.replace(/^\^/, '').replace(/\$$/, '');
  const shown = new RegExp(`(${core})(?![a-z])`);

  const triggers = page.getByRole('button', { name: new RegExp(`\\b${escapeRe(label)}\\b`) });
  // `first`/`last` disambiguate when other triggers merely mention the label (e.g. a placeholder "Select a Cost Type first").
  const trigger = first ? triggers.first() : last ? triggers.last() : triggers;
  const option = page.getByRole('option', { name: optionName });
  await expect(async () => {
    if (await trigger.filter({ hasText: shown }).count()) return;
    if (!(await option.first().isVisible())) await trigger.click();
    await option.first().click({ timeout: 3_000 });
    // The page is aria-hidden while the popover is open, so wait for it to close before reading the trigger.
    await expect(option.first()).toBeHidden({ timeout: 3_000 });
    await expect(trigger.filter({ hasText: shown })).toHaveCount(1, { timeout: 3_000 });
  }).toPass({ timeout: 20_000 });
}
