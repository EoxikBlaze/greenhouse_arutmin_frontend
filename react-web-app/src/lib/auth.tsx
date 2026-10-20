import { useMemo, useState, type ReactNode } from 'react'
import { api } from './api'
import { AuthCtx, defaultAuth, roleFromLevel, type AuthValue } from './authContext'
import { AUTH_KEY } from './token'

/** Klaim JWT (payload base64url) — dipakai untuk MEMPERBAIKI sesi lama di storage. */
function claimsOf(token: string): { level?: string; demo?: boolean } | null {
  try {
    const seg = token.split('.')[1]
    if (!seg) return null
    const b64 = seg.replace(/-/g, '+').replace(/_/g, '/')
    const bin = atob(b64)
    const json = decodeURIComponent(
      bin.split('').map((c) => `%${c.charCodeAt(0).toString(16).padStart(2, '0')}`).join(''),
    )
    return JSON.parse(json) as { level?: string; demo?: boolean }
  } catch {
    return null
  }
}

/** Persist data auth + token (localStorage — selamat saat tab ditutup). */
function load(): Partial<AuthValue> {
  try {
    const raw = localStorage.getItem(AUTH_KEY) ?? sessionStorage.getItem(AUTH_KEY)
    if (!raw) return {}
    const d = JSON.parse(raw)
    const token = String(d.token ?? '')
    // QW7 — role dihitung ULANG dari klaim JWT {level, demo} bila token ada:
    // storage lama menyimpan hasil mapping salah ('user' → 'admin') dan akun
    // demo (level 'user' + is_demo) tersimpan sebagai admin.
    const c = token ? claimsOf(token) : null
    const role = c ? roleFromLevel(c.level, c.demo) : (d.role ?? 'admin')
    return {
      isAuthenticated: !!d.isAuthenticated,
      username: String(d.username ?? ''),
      role,
      demo: role === 'demo',
      token,
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
        token: data.token,
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
        const res = await api.post('/login', { username, password })
        const d = (res.data ?? {}) as {
          token?: string
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
          token: String(d.token ?? ''),
        }
        save(next)
        setState((s) => ({ ...s, ...next }))
        return String(d.redirect ?? (role === 'petani' ? '/tanam' : '/dashboard'))
      }

      const logout = () => {
        // best-effort — token JWT bersifat stateless, yang penting sesi lokal dibuang
        api.get('/logout').catch(() => {})
        save({})
        setState((s) => ({
          ...s,
          isAuthenticated: false,
          username: '',
          demo: false,
          token: '',
          role: 'admin',
        }))
      }

      return { ...state, login, logout }
    },
    [state],
  )

  return <AuthCtx.Provider value={apiVal}>{children}</AuthCtx.Provider>
}
