import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The WebSocket proxy logs EPIPE/ECONNRESET whenever a ws connection is torn
// down mid-write (HMR reloads, StrictMode double-mount, tab refresh/close).
// These are unactionable disconnect noise — swallow them, surface everything else.
const silenceWsDisconnect = (proxy) => {
  proxy.on('error', (err) => {
    if (err && (err.code === 'EPIPE' || err.code === 'ECONNRESET')) return
    console.error('[ws proxy]', err)
  })
}

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8001',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:8001',
        ws: true,
        configure: silenceWsDisconnect,
      },
    },
  },
  preview: {
    port: 4173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:8080',
        ws: true,
        configure: silenceWsDisconnect,
      },
    },
  },
})
