import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// Minimal Vitest setup mirroring apps/web-app/vitest.config.ts — packages/shared previously
// had no test infra; this is the first package to need it (chat-widget, CR-004 Phase 1).
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    exclude: ['node_modules/**'],
  },
});
