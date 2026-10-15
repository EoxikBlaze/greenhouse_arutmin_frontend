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

/** Petakan level dari server (admin/user/petani/demo) → role aplikasi. */
export function roleFromLevel(level?: string): Role {
  const l = String(level ?? '').toLowerCase()
  if (l === 'demo') return 'demo'
  if (l === 'petani') return 'petani'
  return 'admin'
}
