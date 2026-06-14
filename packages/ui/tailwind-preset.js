/**
 * Shared Tailwind config for SpookyDecs React subs — consumed so each sub keeps
 * ONLY its own content globs and inherits everything cross-cutting:
 *
 *   import spookyTailwindPreset, { spookyUIContent } from '@spookydecs/ui/tailwind-preset';
 *   export default {
 *     presets: [spookyTailwindPreset],
 *     content: ['./index.html', './src/**\/*.{ts,tsx}', ...spookyUIContent],
 *   };
 *
 * Two exports because Tailwind v3 treats them differently:
 *   - `spookyTailwindPreset` (default) — the HeroUI plugin + brand theme + dark
 *     mode. These merge cleanly through `presets: [...]`.
 *   - `spookyUIContent` (named) — the @spookydecs/ui + @heroui/theme safelist
 *     globs. Tailwind does NOT merge the `content` key from a preset (a consuming
 *     config's `content` overrides it), so the safelist can't ride in on the
 *     preset; it is exported separately and spread into the sub's `content`.
 *
 * Why this exists: #320 patched storage's tailwind.config inline with a widened,
 * hoist-guessing @heroui/theme glob that every migration would otherwise re-copy.
 * Centralizing that brittle glob here solves the HeroUI CSS-purge bug (playbook
 * §7 — HeroUI classes purged → ~25 kB instead of ~240 kB) once. The @heroui/theme
 * path is resolved via require.resolve so it is correct regardless of where npm
 * workspace hoisting placed the package.
 *
 * Plain .js (not built through vite) on purpose: this is a build-time config
 * helper for the Tailwind/PostCSS toolchain, so it stays free of the React
 * surface and runs directly under Node — same reasoning as the `./theme` subpath.
 */
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spookyHeroUI } from '@spookydecs/ui/theme';

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url)); // packages/ui

/**
 * Glob for @heroui/theme's compiled classes. @heroui/theme cannot be resolved
 * directly (its package.json isn't an exported subpath, and npm frequently nests
 * it under @heroui/react/node_modules rather than hoisting it). So anchor on
 * @heroui/react — always resolvable as a direct dep — derive the node_modules
 * dir it lives in, and glob recursively from there: the `**` catches
 * @heroui/theme whether it sits at that node_modules root or nested below it.
 * This is what makes the safelist hoist-location-independent.
 */
function heroUIThemeContent() {
  try {
    const heroReact = require.resolve('@heroui/react/package.json');
    const marker = '/node_modules/';
    const nodeModules = heroReact.slice(0, heroReact.lastIndexOf(marker) + marker.length - 1);
    return [`${nodeModules}/**/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}`];
  } catch {
    // Defensive fallback: both common hoist locations relative to a sub dir.
    return [
      './node_modules/**/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}',
      '../../node_modules/**/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}',
    ];
  }
}

/**
 * Cross-cutting content globs every React sub must include so @spookydecs/ui's
 * own classes (source for the dev alias build, dist for CI/prod) and HeroUI's
 * theme classes survive Tailwind's purge. Absolute paths derived from this
 * file's own location, so they hold for any consuming sub regardless of cwd.
 */
export const spookyUIContent = [
  resolve(here, 'src/**/*.{ts,tsx}'),
  resolve(here, 'dist/**/*.js'),
  ...heroUIThemeContent(),
];

/**
 * A consuming sub's COMPLETE content list — its own `index.html` + `src`, plus
 * the cross-cutting `spookyUIContent` safelist. Each sub calls this from its
 * tailwind.config.js as `content: spookySubContent(import.meta.url)`.
 *
 * The sub's own globs are resolved to ABSOLUTE paths from the sub's config-file
 * location (passed in as `import.meta.url`) — not left relative. Tailwind resolves
 * relative `content` globs against `process.cwd()`, and `npm run dev:<sub>` runs
 * Vite from the repo root (cwd = root), so a relative `./src/**` silently matches
 * nothing in dev: the sub's bespoke classes (responsive grid breakpoints, custom
 * layout) get purged and the UI renders in a degraded single-column/mobile layout
 * even though HeroUI's safelisted classes still load. Anchoring on the config-file
 * dir makes the globs cwd-independent so dev and build scan the same files. (#358)
 */
export function spookySubContent(importMetaUrl) {
  const subDir = dirname(fileURLToPath(importMetaUrl));
  return [
    resolve(subDir, 'index.html'),
    resolve(subDir, 'src/**/*.{ts,tsx}'),
    ...spookyUIContent,
  ];
}

/** HeroUI plugin + brand theme + dark mode. Consume via `presets: [...]`. */
const spookyTailwindPreset = {
  theme: { extend: {} },
  darkMode: 'class',
  plugins: [spookyHeroUI],
};

export default spookyTailwindPreset;
export { spookyTailwindPreset };
