import { defineConfig } from 'vite';

export default defineConfig({
  root: './subs',
  publicDir: '../public',  // Shared config.json location
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  }
});
