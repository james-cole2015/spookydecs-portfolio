/**
 * spookyHeroUI — the shared HeroUI theme plugin for all SpookyDecs React subs.
 *
 * Centralizes the brand palette (neutral zinc surfaces, a single blue accent,
 * muted blue-gray secondary) and the dark/light token blocks so every sub
 * inherits identical branding instead of copying the config into its own
 * tailwind.config. Refreshed in #728 (was violet). Consume it from a sub's
 * tailwind.config.js:
 *
 *   import { spookyHeroUI } from '@spookydecs/ui/theme';
 *   plugins: [spookyHeroUI]
 *
 * Imported via the `./theme` subpath (not the barrel) so the Tailwind/PostCSS
 * toolchain evaluates only the heroui() plugin, not the package's React surface.
 *
 * Semantics: `primary` is THE accent (primary actions, selected state, focus, AI
 * surfaces). `secondary` is deliberately quiet (muted blue-gray) for supporting
 * actions and neutral emphasis — do not use it to signal "AI" or "selected".
 */
import { heroui } from '@heroui/react';

// Tailwind blue scale — the accent. DEFAULT differs by theme (see per-theme notes).
const blue = {
  50: '#eff6ff',
  100: '#dbeafe',
  200: '#bfdbfe',
  300: '#93c5fd',
  400: '#60a5fa',
  500: '#3b82f6',
  600: '#2563eb',
  700: '#1d4ed8',
  800: '#1e40af',
  900: '#1e3a8a',
};

// Annotate with ReturnType<typeof heroui> so the emitted .d.ts references only
// the imported `heroui` symbol — without it tsc infers a non-portable path into
// @heroui/react's nested tailwindcss/plugin (TS2742).
export const spookyHeroUI: ReturnType<typeof heroui> = heroui({
  defaultTheme: 'dark',
  themes: {
    dark: {
      layout: {
        // Cards/popovers are defined by a 1px ring instead of a drop shadow
        // (shadows are invisible on a near-black canvas anyway). Because the ring
        // is the HeroUI shadow token, every stock <Card shadow="…"> picks it up.
        boxShadow: {
          small: '0 0 0 1px #1f1f23',
          medium: '0 0 0 1px #1f1f23',
          large: '0 0 0 1px #2e2e33, 0 8px 24px rgba(0, 0, 0, 0.5)',
        },
        radius: { small: '6px', medium: '8px', large: '12px' },
      },
      colors: {
        // Near-black canvas with neutral zinc surfaces; blue is the accent only.
        background: '#09090b',
        foreground: '#ECEDEE',
        focus: '#60a5fa',
        divider: '#1f1f23',
        // Progressive surface tokens (each a step lighter) so cards/inputs read
        // as layers above the canvas.
        content1: '#101012',
        content2: '#17171a',
        content3: '#1f1f23',
        content4: '#2a2a2f',
        // Neutral zinc scale — drives borders (default-200/300) and bordered
        // input outlines so controls are legible on the dark surfaces.
        default: {
          50: '#121214',
          100: '#1f1f23',
          200: '#2e2e33',
          300: '#3f3f46',
          400: '#71717a',
          500: '#a1a1aa',
          600: '#d4d4d8',
          700: '#e4e4e7',
          800: '#f4f4f5',
          900: '#fafafa',
          DEFAULT: '#2e2e33',
          foreground: '#ECEDEE',
        },
        // 500 on #09090b reads well as text/icons (≈5.3:1). White on 500 is
        // ≈3.7:1 — fine for UI/large text, below AA for small solid-button labels.
        primary: { ...blue, DEFAULT: '#3b82f6', foreground: '#ffffff' },
        // Muted blue-gray: supporting actions, not an accent. DEFAULT-only so
        // HeroUI generates the secondary-50…900 scale from it.
        secondary: { DEFAULT: '#94a3b8', foreground: '#0b1220' },
      },
    },
    light: {
      layout: {
        boxShadow: {
          small: '0 0 0 1px #e4e4e7',
          medium: '0 0 0 1px #e4e4e7, 0 1px 2px rgba(24, 24, 27, 0.04)',
          large: '0 0 0 1px #e4e4e7, 0 8px 24px rgba(24, 24, 27, 0.08)',
        },
        radius: { small: '6px', medium: '8px', large: '12px' },
      },
      colors: {
        // Clean neutral light surfaces with the same blue accent as dark mode.
        background: '#fafafa',
        foreground: '#18181b',
        focus: '#2563eb',
        divider: '#e4e4e7',
        content1: '#ffffff',
        content2: '#f4f4f5',
        content3: '#ececee',
        content4: '#e4e4e7',
        // 600 gives ≈5.2:1 with white text and ≈5:1 as text on the light canvas.
        primary: { ...blue, DEFAULT: '#2563eb', foreground: '#ffffff' },
        secondary: { DEFAULT: '#64748b', foreground: '#ffffff' },
      },
    },
  },
});
