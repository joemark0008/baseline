/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'

/** Where the dev server forwards /graphql and /api; the hosted dev service points it at its api container. */
const apiProxyTarget = process.env.API_PROXY_TARGET ?? 'http://localhost:3001'
const publicHost = process.env.PUBLIC_HOST

export default defineConfig({
  plugins: [
    // Must run before react() so route files are transformed first.
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
      routesDirectory: './src/routes',
      generatedRouteTree: './src/routeTree.gen.ts',
    }),
    react(),
    tailwindcss(),
  ],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  // Read VITE_* from the repo-root .env (local dev); Docker builds pass build args instead.
  envDir: '../..',
  server: {
    port: 4173,
    host: true,
    // Same origin as production: the dev server proxies the API paths nginx proxies in the image.
    proxy: {
      '/graphql': { target: apiProxyTarget, changeOrigin: false },
      '/api': { target: apiProxyTarget, changeOrigin: false },
    },
    // Hosted dev mode (Coolify "<name>-dev" service): accept the public hostname and run HMR
    // through the TLS proxy. Unset locally, so nothing changes on a developer machine.
    ...(publicHost
      ? {
          allowedHosts: [publicHost],
          hmr: { host: publicHost, protocol: 'wss', clientPort: 443 },
        }
      : {}),
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
})
