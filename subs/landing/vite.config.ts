import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { spookyCdnDev } from '@spookydecs/ui/vite-cdn-dev';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

// The landing page is public and anonymous — no API calls, no auth bundle in v1.
// So unlike the gallery sub there is no auto-auth plugin and no /devapi proxy here.
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

export default defineConfig({
  plugins: [react(), spookyCdnDev()],
  resolve: {
    alias: {
      '@spookydecs/ui': resolve(repoRoot, 'packages/ui/src'),
    },
  },
  server: {
    port: 3006,
    open: true,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
