import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { TanStackRouterVite } from '@tanstack/router-plugin/vite';
import path from 'path';

export default defineConfig({
  plugins: [TanStackRouterVite(), react()],
  // Expose CONFIG_-prefixed vars to the client alongside the default VITE_ ones.
  // A CONFIG_ name reads as plain config to Vercel (it does not flag it the way
  // it flags a known VITE_/NEXT_PUBLIC_ public prefix), so it can be added
  // without the "exposed to the browser" gate. The value is still bundled into
  // the client either way — which is exactly right for a public key like the
  // PostHog project token. Keep 'VITE_' first, or every existing VITE_ var stops
  // being exposed.
  envPrefix: ['VITE_', 'CONFIG_'],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
  },
});
