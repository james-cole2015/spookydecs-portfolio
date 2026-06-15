import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { spookyCdnDev } from '@spookydecs/ui/vite-cdn-dev';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

// Reuse the repo-root .env.local (COGNITO_USERNAME/PASSWORD) so local dev auth
// works without duplicating creds into subs/admin/.
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

// Per-sub Vite config for the admin React app (#331). Mirrors the storage/
// workbench foundation: the `/devapi` proxy + Cognito auto-auth for local dev,
// builds a self-contained bundle to ./dist for the #269 GitHub Actions deploy
// (build_command: "npm ci && npm run build", artifact_dir: "dist").
export default defineConfig(({ mode }) => {
  // Load from the repo root (.env.local lives there), falling back to the sub dir.
  const env = { ...loadEnv(mode, process.cwd(), ''), ...loadEnv(mode, repoRoot, '') };

  const AUTH_URL = 'https://miinu7boec.execute-api.us-east-2.amazonaws.com/dev/auth';
  const DEV_API = 'https://miinu7boec.execute-api.us-east-2.amazonaws.com/dev';
  const tokenStore: { token: string | null; refreshTimer: ReturnType<typeof setTimeout> | null } = {
    token: env.COGNITO_TOKEN || null,
    refreshTimer: null,
  };

  async function fetchToken() {
    const { COGNITO_USERNAME, COGNITO_PASSWORD } = env;
    if (!COGNITO_USERNAME || !COGNITO_PASSWORD) return;
    try {
      const res = await fetch(AUTH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: COGNITO_USERNAME, password: COGNITO_PASSWORD }),
      });
      const data = await res.json();
      tokenStore.token = data.idToken;
      const refreshIn = ((data.expiresIn || 3600) - 300) * 1000;
      if (tokenStore.refreshTimer) clearTimeout(tokenStore.refreshTimer);
      tokenStore.refreshTimer = setTimeout(fetchToken, refreshIn);
      console.log('[auth] Token acquired, refreshes in', Math.round(refreshIn / 60000), 'min');
    } catch (e: any) {
      console.error('[auth] Failed to acquire token:', e?.message ?? e);
    }
  }

  const autoAuthPlugin = {
    name: 'auto-auth',
    async configureServer() {
      await fetchToken();
    },
  };

  return {
    // spookyCdnDev: dev-only — serve assets.spookydecs.com/components/* from the
    // local configs-spookydecs repo so CDN-component edits are testable without a
    // deploy round-trip (#357). No-op in `vite build` (production keeps CDN URLs).
    plugins: [react(), autoAuthPlugin, spookyCdnDev()],
    resolve: {
      alias: {
        '@spookydecs/ui': resolve(repoRoot, 'packages/ui/src'),
      },
    },
    server: {
      port: 3000,
      // Open straight to /admin (routes carry the prefix; bare root just redirects).
      open: '/admin',
      proxy: {
        '/devapi': {
          target: DEV_API,
          changeOrigin: true,
          rewrite: (path: string) => path.replace(/^\/devapi/, ''),
          configure: (proxy: any) => {
            proxy.on('proxyReq', (proxyReq: any) => {
              if (tokenStore.token) {
                proxyReq.setHeader('Authorization', `Bearer ${tokenStore.token}`);
              }
            });
          },
        },
      },
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
    },
  };
});
