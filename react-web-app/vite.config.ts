import react from '@vitejs/plugin-react'
import { defineConfig, type ProxyOptions } from 'vite'

/**
 * BACKEND TERSEMBUNYI — semua request API diteruskan dev-server
 * (same-origin proxy). Browser hanya melihat origin http://127.0.0.1:5173 —
 * port/domain backend tidak pernah muncul di jaringan/devtools.
 *
 * Aturan tabrakan rute (nama sama untuk halaman web & API JSON):
 *   - navigasi browser (Sec-Fetch-Mode: navigate / Accept text/html) → halaman SPA
 *   - fetch/axios/curl (tanpa header itu)                    → API backend
 * Sama persis dengan konfigurasi nginx di deploy-pi.
 */
const BACKEND = process.env.VITE_BACKEND_URL ?? 'http://127.0.0.1:8000'

function apiProxy(): ProxyOptions {
  return {
    target: BACKEND,
    changeOrigin: true,
    bypass: (req) => {
      const nav =
        req.headers['sec-fetch-mode'] === 'navigate' ||
        (req.method === 'GET' && String(req.headers.accept ?? '').includes('text/html'))
      return nav ? '/' : undefined // '/' = index.html SPA
    },
  }
}

/** Route API backend (kontrak FIXED) — beberapa sekaligus rute SPA. */
const API_PATHS = [
  '/api',
  '/monitoring',
  '/sanctum',
  '/logout',
  '/login',
  '/dashboard',
  '/profil',
  '/user',
  '/meja',
  '/tanaman',
  '/siklus',
  '/tanam',
  '/semai',
  '/peremajaan',
  '/pendewasaan',
  '/panen',
  '/ambang',
  '/watercontrol',
  '/laporan',
  '/cctv',
  // ── Riwayat audit (khusus admin) — GET /audit-logs ──
  '/audit-logs',
  // ── Konfigurasi V2 (modul Dosing) — rute JSON tanpa halaman web ──
  '/konfigurasi-dosis',
  '/timing-operasi',
  '/aturan-fail-safe',
  '/jadwal-perawatan',
]

export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    proxy: Object.fromEntries(API_PATHS.map((p) => [p, apiProxy()])),
  },
})
