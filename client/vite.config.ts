import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on('error', (err) => {
            console.error('[Vite proxy]', err.message)
          })
          proxy.on('proxyReq', (_, req) => {
            console.log('[Vite proxy]', req.method, req.url, '-> http://localhost:8000' + req.url)
          })
        },
      },
    },
  },
})
