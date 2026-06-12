// Theme tokens are centralized in @spookydecs/ui (#324). Imported via the
// `./theme` subpath so Tailwind evaluates only the heroui() plugin, not the
// package's React surface.
import { spookyHeroUI } from '@spookydecs/ui/theme';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
    // @spookydecs/ui components: source path covers the dev alias build; the
    // built dist covers CI/prod (lib is built before storage). Both are listed
    // so the library's utility classes are never purged.
    '../../packages/ui/src/**/*.{ts,tsx}',
    '../../packages/ui/dist/**/*.js',
    './node_modules/@spookydecs/ui/dist/**/*.js',
    // @heroui/theme is hoisted to the workspace root node_modules (not the sub's
    // local node_modules) because npm workspaces deduplicate packages. Both paths
    // are listed so this works whether run from the sub dir or the repo root.
    './node_modules/**/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}',
    '../../node_modules/**/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {},
  },
  darkMode: 'class',
  plugins: [spookyHeroUI],
};
