// Resolve the Tailwind config by absolute path so it is found regardless of cwd.
// `npm run dev:<sub>` runs Vite from the repo root (cwd = root) while `npm run
// build` runs from this sub dir; without an explicit path the tailwindcss PostCSS
// plugin auto-resolves tailwind.config.js relative to cwd, silently falls back to
// its default (empty `content`) config in dev, and emits a near-empty stylesheet
// ("content option ... missing or empty"). See react_migration_playbook.md §7. (#358)
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

export default {
  plugins: {
    tailwindcss: { config: resolve(here, 'tailwind.config.js') },
    autoprefixer: {},
  },
};
