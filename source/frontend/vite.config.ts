/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: ['localhost', '127.0.0.1'],
    hmr: {
      clientPort: 80,
    },
    watch: {
      usePolling: true,
    },
    // Proxy para acesso direto (localhost:3090) sem passar pelo nginx
    proxy: {
      '/api': {
        target: 'http://backend:3000',
        changeOrigin: true,
      },
    },
  },
})
