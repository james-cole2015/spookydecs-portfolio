/**
 * Dev-only Vite plugin that serves the shared CDN components from the on-disk
 * configs-spookydecs repo instead of the deployed CDN — so `npm run dev:<sub>`
 * loads your *working copy* of a component and live-reloads on edit, with no
 * push → CodeBuild → CloudFront-invalidation round-trip (tracker #357).
 *
 *   import { spookyCdnDev } from '@spookydecs/ui/vite-cdn-dev';
 *   export default defineConfig(({ command }) => ({
 *     plugins: [react(), spookyCdnDev()],
 *     ...
 *   }));
 *
 * Why this is needed even after the Paxin @spookydecs/ui conversion: a handful of
 * CDN components are kept CDN-served *by design* (#373) because the un-migrated
 * vanilla subs still consume them framework-agnostically — api-config.js,
 * auth-helpers.js (the window.SpookyConfig/SpookyAuth bootstrap globals) and
 * photo-upload-modal.js / photo-upload-service.js (wrapped, not replaced, by
 * usePhotoUpload #380). Those are exactly the surfaces that otherwise need a
 * deploy to test a local edit.
 *
 * How it works (two halves, both `apply: 'serve'` only — the production build is
 * never touched, so deployed index.html keeps the real CDN URLs):
 *   1. transformIndexHtml — rewrite `https://assets.spookydecs.com/components/`
 *      script srcs to a local dev prefix (`/@spooky-components/`).
 *   2. configureServer middleware — serve `/@spooky-components/<file>` from the
 *      sibling configs repo's components/ dir. A *renamed/removed* single file
 *      gets a clean 404 (so the developer notices the rename — not a silent SPA
 *      fallback).
 *
 * Graceful degradation: if the local components dir is absent (configs repo not
 * cloned) the plugin no-ops entirely — no rewrite, so index.html keeps the real
 * CDN URLs and dev still works against the deployed CDN. Same escape hatch via
 * SPOOKY_CDN_LOCAL=0 (offline, or to deliberately test against the deployed CDN).
 *
 * Plain .js (not built through Vite), package-root, mirroring tailwind-preset.js:
 * it's a build-time toolchain helper, not part of the React surface, and runs
 * directly under Node.
 */
import { createReadStream, existsSync } from 'node:fs';
import { dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url)); // packages/ui
// packages/ui → repo root (Portfolio) → sibling configs-spookydecs/components
const DEFAULT_COMPONENTS_DIR = resolve(here, '../../../configs-spookydecs/components');

const CDN_PREFIX = 'https://assets.spookydecs.com/components/';
const LOCAL_PREFIX = '/@spooky-components/';

const MIME = {
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
};

/**
 * @param {object} [opts]
 * @param {string} [opts.componentsDir] Absolute path to the components/ dir.
 *   Defaults to the sibling configs-spookydecs/components.
 */
export function spookyCdnDev(opts = {}) {
  const componentsDir = opts.componentsDir || DEFAULT_COMPONENTS_DIR;
  // Active only when explicitly enabled AND the local mirror actually exists —
  // otherwise no-op so index.html keeps the real CDN URLs (graceful degradation).
  const optedOut = process.env.SPOOKY_CDN_LOCAL === '0';
  const active = !optedOut && existsSync(componentsDir);

  return {
    name: 'spooky-cdn-dev',
    apply: 'serve',

    configResolved() {
      if (optedOut) {
        console.log('[cdn-dev] SPOOKY_CDN_LOCAL=0 — using the deployed CDN (plugin disabled).');
      } else if (active) {
        console.log(`[cdn-dev] Serving CDN components from local mirror: ${componentsDir}`);
      } else {
        console.warn(
          `[cdn-dev] Local components dir not found (${componentsDir}); ` +
            'falling back to the deployed CDN. Clone configs-spookydecs alongside ' +
            'Portfolio to edit shared components without a deploy round-trip.',
        );
      }
    },

    transformIndexHtml(html) {
      if (!active) return html;
      return html.split(CDN_PREFIX).join(LOCAL_PREFIX);
    },

    configureServer(server) {
      if (!active) return;
      server.middlewares.use((req, res, next) => {
        if (!req.url || !req.url.startsWith(LOCAL_PREFIX)) return next();

        // Strip the prefix + any query string; guard against path traversal.
        const rel = req.url.slice(LOCAL_PREFIX.length).split('?')[0];
        if (rel.includes('..')) return next();

        const filePath = resolve(componentsDir, rel);
        if (!filePath.startsWith(componentsDir) || !existsSync(filePath)) {
          // Clean 404 (not an SPA-fallback 200) so a renamed/removed component
          // surfaces loudly instead of being masked by index.html.
          res.statusCode = 404;
          res.setHeader('Content-Type', 'text/plain');
          res.end(`[cdn-dev] no local component '${rel}' in ${componentsDir}`);
          return;
        }

        res.setHeader('Content-Type', MIME[extname(filePath)] || 'application/octet-stream');
        // No-cache so an edit to the component shows on the next reload.
        res.setHeader('Cache-Control', 'no-cache');
        createReadStream(filePath).pipe(res);
      });
    },
  };
}

export default spookyCdnDev;
