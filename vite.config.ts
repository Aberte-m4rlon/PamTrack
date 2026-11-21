import { defineConfig } from 'vitest/config';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

function offlinePrecacheManifestPlugin(): Plugin {
  return {
    name: 'pamtrack-offline-precache-manifest',
    apply: 'build',
    generateBundle(_options, bundle) {
      const assets = Object.keys(bundle)
        .filter((fileName) => /\.(js|css|png|jpg|svg|webp|woff2?)$/i.test(fileName))
        .map((fileName) => `/${fileName}`);

      this.emitFile({
        type: 'asset',
        fileName: 'precache-manifest.json',
        source: JSON.stringify(
          {
            generatedAt: new Date().toISOString(),
            assets,
          },
          null,
          2
        ),
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), offlinePrecacheManifestPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'supabase-vendor': ['@supabase/supabase-js', '@tanstack/react-query'],
          'map-vendor': ['leaflet', 'react-leaflet'],
          'charts-vendor': ['recharts', 'framer-motion'],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
  },
});
