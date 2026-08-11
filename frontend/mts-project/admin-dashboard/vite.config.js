import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

const DEFAULT_BACKEND_BASE_URL = 'http://54.147.40.109/'

const trimTrailingSlashes = (value = '') => String(value).trim().replace(/\/+$/, '')

const getProxyTarget = (env) => {
  const configured = trimTrailingSlashes(env.VITE_BASE_URL || env.VITE_API_BASE_URL || DEFAULT_BACKEND_BASE_URL)
  return configured.endsWith('/api') ? configured.slice(0, -4) : configured
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: getProxyTarget(env),
          changeOrigin: true
        }
      }
    }
  }
})
