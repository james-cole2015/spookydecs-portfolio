import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    react(),
    dts({ include: ['src'], insertTypesEntry: true }),
  ],
  build: {
    lib: {
      // Two entries: the React barrel (index) and the standalone theme plugin
      // (theme). theme.js stays free of the React surface so a sub's
      // tailwind.config can import `@spookydecs/ui/theme` without pulling React
      // into the Tailwind/PostCSS toolchain.
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        theme: resolve(__dirname, 'src/theme.ts'),
      },
      formats: ['es'],
    },
    rollupOptions: {
      external: [/^react(\/|$)/, /^react-dom(\/|$)/, '@heroui/react', 'framer-motion', 'lucide-react'],
      output: {
        entryFileNames: '[name].js',
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
        },
      },
    },
    emptyOutDir: true,
  },
});
