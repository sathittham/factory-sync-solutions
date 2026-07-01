import { execSync } from 'node:child_process';
import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

function getAppVersion(): string {
  try {
    return execSync('git describe --tags --always').toString().trim();
  } catch {
    return 'dev';
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // VITE_PROXY_TARGET controls where /api/* requests are forwarded.
  // Default: local backend. Set to staging URL in .env.development to proxy through.
  const proxyTarget = env.VITE_PROXY_TARGET || 'http://localhost:8080';

  return {
    // TanStack Router plugin generates src/routeTree.gen.ts from src/routes/** and regenerates it
    // on dev/build. The generated file IS committed (not git-ignored) so `tsc -b`/`type-check` works
    // on a fresh checkout and in CI without a prior build. Plugin must run before react().
    plugins: [tanstackRouter({ target: 'react', autoCodeSplitting: true }), react(), tailwindcss()],
    define: {
      __APP_VERSION__: JSON.stringify(getAppVersion()),
    },
    resolve: {
      dedupe: ['react'],
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@shared': path.resolve(__dirname, '../../packages/shared'),
      },
    },
    server: {
      port: 5173,
      headers: {
        // Required for Firebase signInWithPopup — Google's OAuth page sets COOP: same-origin,
        // which blocks the popup from communicating back without this header on the opener.
        'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
      },
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
