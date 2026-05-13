import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  base: '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 3092,
    allowedHosts: true,
    hmr: {
      // Connect HMR directly to the Vite dev server (3092), not through
      // nginx (80). Without this, the dashboard HMR WebSocket goes to nginx
      // port 80 which routes '/' to the frontend container → wrong target.
      clientPort: 3092,
    },
    watch: {
      usePolling: true,
    },
    // Proxy para acesso direto (localhost:3092) sem passar pelo nginx
    proxy: {
      '/api': {
        target: 'http://backend:3000',
        changeOrigin: true,
      },
      '/cable': {
        target: 'ws://backend:3000',
        ws: true,
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    typecheck: { tsconfig: './tsconfig.test.json' },
  },
})
