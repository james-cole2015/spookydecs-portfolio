import type { Plugin } from 'vite';

export interface SpookyCdnDevOptions {
  /**
   * Absolute path to the configs-spookydecs `components/` dir. Defaults to the
   * sibling repo: `<repo>/../configs-spookydecs/components`.
   */
  componentsDir?: string;
}

/**
 * Dev-only Vite plugin that serves the shared CDN components from the on-disk
 * configs-spookydecs repo instead of the deployed CDN (tracker #357). No-ops in
 * `vite build` and when the local mirror is unavailable / `SPOOKY_CDN_LOCAL=0`.
 */
export function spookyCdnDev(opts?: SpookyCdnDevOptions): Plugin;
export default spookyCdnDev;
