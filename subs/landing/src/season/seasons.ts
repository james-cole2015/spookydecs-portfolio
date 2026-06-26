/**
 * Season model for the public landing page.
 *
 * The page auto-skins by the current date; the light/dark ThemeSwitch stays and
 * each season defines BOTH a light and a dark variant (see seasons.css — the two
 * axes compose: `[data-season] × (.dark | .light)`).
 *
 * Ranges (per #364 plan):
 *   halloween → Oct 1 – Nov 30
 *   christmas → Dec 1 – Jan 31  (spans the year boundary)
 *   plain     → Feb 1 – Sep 30  (default)
 */

export type Season = 'halloween' | 'christmas' | 'plain';

export const SEASONS: Season[] = ['halloween', 'christmas', 'plain'];

/** Resolve the season for a given date (defaults to now). */
export function resolveSeason(date: Date = new Date()): Season {
  const month = date.getMonth() + 1; // 1–12
  if (month === 10 || month === 11) return 'halloween';
  if (month === 12 || month === 1) return 'christmas';
  return 'plain';
}

/** Parse a `?season=` override from a query string; null if absent/invalid. */
export function parseSeasonOverride(search: string): Season | null {
  const value = new URLSearchParams(search).get('season');
  return value && (SEASONS as string[]).includes(value) ? (value as Season) : null;
}

/** Per-season hero copy + emoji. */
export interface SeasonCopy {
  emoji: string;
  /** Short top-of-hero eyebrow label. */
  eyebrow: string;
  headline: string;
  tagline: string;
  /** Label for the primary CTA. */
  cta: string;
}

/**
 * Demo-reset ("floor collapse") banner copy per season. `{t}` is replaced with the
 * formatted countdown. Halloween keeps the DCC dungeon framing; christmas/plain use
 * a neutral "demo resets" message so it doesn't read as off-theme.
 */
export const RESET_COPY: Record<Season, { icon: string; template: string }> = {
  halloween: {
    icon: '🩸',
    template: 'This floor collapses in {t} — the dungeon resets every Sunday, wiping every crawler’s sandbox.',
  },
  christmas: {
    icon: '🔄',
    template: 'Demo resets in {t} — every Sunday at 03:00 UTC, the sandbox is wiped and reseeded.',
  },
  plain: {
    icon: '🔄',
    template: 'Demo resets in {t} — every Sunday at 03:00 UTC, the sandbox is wiped and reseeded.',
  },
};

export const SEASON_COPY: Record<Season, SeasonCopy> = {
  halloween: {
    emoji: '🎃',
    eyebrow: 'The dungeon is open',
    headline: 'Enter the SpookyDecs crypt',
    tagline:
      'A serverless, AI-augmented platform for running a real Halloween & Christmas decoration operation — now haunting AWS near you.',
    cta: 'Enter the demo',
  },
  christmas: {
    emoji: '🎄',
    eyebrow: 'The workshop is lit',
    headline: 'Step inside the SpookyDecs workshop',
    tagline:
      'A serverless, AI-augmented platform for running a real holiday decoration operation — wrapped up and ready to explore.',
    cta: 'Enter the demo',
  },
  plain: {
    emoji: '✨',
    eyebrow: 'Live portfolio demo',
    headline: 'SpookyDecs — a serverless decoration platform',
    tagline:
      'An end-to-end, AI-augmented inventory, finance, and operations platform built on AWS. Take the live demo for a spin.',
    cta: 'Enter the demo',
  },
};
