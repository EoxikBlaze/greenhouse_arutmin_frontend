import { useMemo, useState, type ReactNode } from 'react'
import { api } from './api'
import { AuthCtx, defaultAuth, roleFromLevel, type AuthValue } from './authContext'
import { AUTH_KEY } from './token'
import { hapusSemuaChat } from './riwayatChat'

/** Persist data tampilan sesi (tanpa token — token ada di cookie HttpOnly). */
function load(): Partial<AuthValue> {
  try {
    const raw = localStorage.getItem(AUTH_KEY)
    if (!raw) return {}
    const d = JSON.parse(raw)
    // Sesi lama menyimpan token di sini: dibuang (token kini hanya di cookie HttpOnly).
    if (d.token !== undefined) {
      delete d.token
      localStorage.setItem(AUTH_KEY, JSON.stringify(d))
    }
    const role = d.role ?? 'admin'
    return {
      isAuthenticated: !!d.isAuthenticated,
      username: String(d.username ?? ''),
      role,
      demo: role === 'demo',
    }
  } catch {
    return {}
  }
}

function save(data: Partial<AuthValue>) {
  try {
    localStorage.setItem(
      AUTH_KEY,
      JSON.stringify({
        isAuthenticated: data.isAuthenticated,
        username: data.username,
        role: data.role,
        demo: data.demo,
      }),
    )
    // bersihkan sesi lama (migrasi localStorage)
    sessionStorage.removeItem(AUTH_KEY)
  } catch {
    /* storage penuh/di-block — abaikan */
  }
}

export function AuthProvider({ children, value }: { children: ReactNode; value?: Partial<AuthValue> }) {
  const [state, setState] = useState<AuthValue>(() => ({ ...defaultAuth, ...load(), ...value }))

  const apiVal = useMemo<AuthValue>(
    () => {
      const login = async (username: string, password: string): Promise<string> => {
        // Login NYATA — backend memverifikasi bcrypt + rate limit anti brute-force
        const res = await api.post('/login', { username, password, sesi: 'cookie' })
        const d = (res.data ?? {}) as {
          user?: { username?: string; level?: string; is_demo?: boolean }
          redirect?: string
        }
        // QW7 — pakai is_demo dari publicUser: akun demo seed punya level 'user'
        // (bukan 'demo'), jadi level saja tak cukup untuk menandai role demo.
        const role = roleFromLevel(d.user?.level, d.user?.is_demo)
        const next = {
          isAuthenticated: true,
          username: String(d.user?.username ?? username),
          role,
          demo: role === 'demo',
        }
        save(next)
        setState((s) => ({ ...s, ...next }))
        return String(d.redirect ?? (role === 'petani' ? '/tanam' : '/dashboard'))
      }

      const logout = () => {
        // best-effort — server menghapus cookie sesi; sesi lokal dibuang
        api.post('/logout').catch(() => {})
        save({})
        hapusSemuaChat() // riwayat Asisten AI tidak boleh terlihat oleh akun berikutnya di tab ini
        setState((s) => ({
          ...s,
          isAuthenticated: false,
          username: '',
          demo: false,
          role: 'admin',
        }))
      }

      return { ...state, login, logout }
    },
    [state],
  )

  return <AuthCtx.Provider value={apiVal}>{children}</AuthCtx.Provider>
}
