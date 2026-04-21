import { fileURLToPath, URL } from 'node:url'

import vue from '@vitejs/plugin-vue'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const accountApiProxyTarget =
    env.VITE_ACCOUNT_API_PROXY_TARGET?.trim() || 'http://127.0.0.1:3000'

  return {
    plugins: [vue()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      proxy: {
        '/api': {
          target: accountApiProxyTarget,
          changeOrigin: true,
        },
      },
    },
    test: {
      environment: 'jsdom',
      include: ['tests/**/*.spec.ts'],
    },
  }
})
