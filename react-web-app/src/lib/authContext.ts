import { createContext, useContext } from 'react'
import type { Role } from './authTypes'

/**
 * Nilai auth — satu sumber untuk role chip, demo banner, guard rute.
 * Default: belum login. Login dummy meniru backend Laravel:
 *   demo → role demo (read-only), petani* → petani, selain itu admin.
 */
export type AuthValue = {
  isAuthenticated: boolean
  role: Role
  username: string
  demo: boolean
  login: (username: string, role?: Role) => void
  logout: () => void
}

export const defaultAuth: AuthValue = {
  isAuthenticated: false,
  role: 'admin',
  username: '',
  demo: false,
  login: () => {},
  logout: () => {},
}

export const AuthCtx = createContext<AuthValue>(defaultAuth)

export function useAuth(): AuthValue {
  return useContext(AuthCtx)
}

/** Petakan username → role (dummy; diganti verifikasi backend saat integrasi API). */
export function roleFromUsername(username: string): Role {
  const u = username.trim().toLowerCase()
  if (u === 'demo') return 'demo'
  if (u.startsWith('petani')) return 'petani'
  return 'admin'
}
