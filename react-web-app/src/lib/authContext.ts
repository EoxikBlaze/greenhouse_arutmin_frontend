import { createContext, useContext } from 'react'
import type { Role } from './authTypes'

/**
 * Nilai auth — satu sumber untuk role chip, demo banner, guard rute.
 * Login NYATA ke backend (POST /login) — bukan dummy.
 */
export type AuthValue = {
  isAuthenticated: boolean
  role: Role
  username: string
  demo: boolean
  token: string
  /**
   * Login ke backend. Mengembalikan redirect dari server
   * ('/dashboard' atau '/tanam'). Melempar AxiosError bila gagal.
   */
  login: (username: string, password: string) => Promise<string>
  logout: () => void
}

export const defaultAuth: AuthValue = {
  isAuthenticated: false,
  role: 'admin',
  username: '',
  demo: false,
  token: '',
  login: async () => '/dashboard',
  logout: () => {},
}

export const AuthCtx = createContext<AuthValue>(defaultAuth)

export function useAuth(): AuthValue {
  return useContext(AuthCtx)
}

/**
 * Petakan level dari server → role aplikasi.
 *
 * Sumber data (backend-nodejs/database/seed.sql & POST /user):
 * - id 1 'admin'   → level 'admin'   → role 'admin'
 * - id 3 'petani'  → level 'petani'  → role 'petani'
 * - id 2 'demo'    → level 'user' + is_demo=TRUE → role 'demo'
 *   (karena itu `is_demo` IKUT diperiksa — dulu akun demo jadi admin di UI)
 * - default POST /user = level 'user' (user.js:31); ada pula 'supervisor'/'root'
 *   di uji backend.
 *
 * Keputusan untuk level selain admin/demo/petani (termasuk 'user'):
 * → role 'petani' (non-admin). Alasan: backend requireRole() menolak level
 *   'user' dari semua rute pengelola (403 "Akses ditolak", hanya lolos
 *   requireRole('all')), dan di guard router (router.tsx) satu-satunya role
 *   non-admin adalah 'petani' dengan allow=ALL — sehingga peta UI = peta backend.
 */
export function roleFromLevel(level?: string, isDemo?: boolean): Role {
  const l = String(level ?? '').toLowerCase()
  if (isDemo || l === 'demo') return 'demo'
  if (l === 'admin') return 'admin'
  return 'petani'
}
