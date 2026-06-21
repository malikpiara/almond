import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    tsconfigPaths(),
    VitePWA({
      registerType: 'autoUpdate',
      // We register the SW manually (in main.tsx) so we can skip it inside the
      // Capacitor WebView — a SW there only reintroduces stale-cache bugs.
      injectRegister: false,
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon-180.png'],
      manifest: {
        name: 'Almond',
        short_name: 'Almond',
        description: 'A local-first, private journaling app.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        theme_color: '#FAF9F5',
        background_color: '#FAF9F5',
        icons: [
          { src: '/icons/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/pwa-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icons/pwa-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Precache the full app shell, incl. the self-hosted Geist woff2 files,
        // so the UI loads offline.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Serve index.html for in-app routes (e.g. /boards/$id) while offline.
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            // Never cache LLM output — always hit the network for extraction.
            urlPattern: ({ url }) => url.pathname.endsWith('/extract-entities'),
            handler: 'NetworkOnly',
            method: 'POST',
          },
        ],
      },
      // Keep the service worker out of `vite dev` to avoid caching surprises;
      // it's exercised via `vite build` + `vite preview`.
      devOptions: { enabled: false },
    }),
  ],
});
