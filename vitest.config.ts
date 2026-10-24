import { defineConfig } from 'vitest/config';

// Root unit-test runner (#623). Specs live in each sub's tests/unit/ — Playwright e2e
// specs (tests/e2e/) are deliberately excluded; those run via `npm run test:e2e:<sub>`.
export default defineConfig({
  test: {
    include: ['subs/*/tests/unit/**/*.test.ts'],
    environment: 'node',
  },
});
