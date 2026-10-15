import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

/**
 * BACKEND TERSEMBUNYI — semua request API diteruskan oleh dev-server
 * (same-origin proxy) ke Laravel. Browser hanya melihat origin
 * http://127.0.0.1:5173 — port/domain backend tidak pernah muncul
 * di jaringan/devtools. Backend sendiri hanya listen 127.0.0.1.
 *
 * - GET  /login → SPA (halaman login React; bypass → next() ke index.html)
 * - POST /login → Laravel (session auth, route fixed)
 * - /api, /monitoring, /sanctum, /logout → Laravel
 * - Rute halaman SPA lain (/dashboard, /tanam, dst.) TIDAK diproxy.
 */
const BACKEND = process.env.VITE_BACKEND_URL ?? 'http://127.0.0.1:8000'
const proxied = { target: BACKEND, changeOrigin: true }

export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    proxy: {
      '/api': proxied,
      '/monitoring': proxied,
      '/sanctum': proxied,
      '/logout': proxied,
      '/login': {
        ...proxied,
        bypass: (req) => (req.method === 'GET' ? '/login' : undefined),
      },
    },
  },
})
