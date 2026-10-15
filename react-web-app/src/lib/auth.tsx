import { useMemo, useState, type ReactNode } from 'react'
import { api } from './api'
import { AuthCtx, defaultAuth, roleFromLevel, type AuthValue } from './authContext'
import { AUTH_KEY } from './token'

/** Persist data auth + token (sessionStorage — hilang saat tab ditutup). */
function load(): Partial<AuthValue> {
  try {
    const raw = sessionStorage.getItem(AUTH_KEY)
    if (!raw) return {}
    const d = JSON.parse(raw)
    return {
      isAuthenticated: !!d.isAuthenticated,
      username: String(d.username ?? ''),
      role: d.role ?? 'admin',
      demo: !!d.demo,
      token: String(d.token ?? ''),
    }
  } catch {
    return {}
  }
}

function save(data: Partial<AuthValue>) {
  try {
    sessionStorage.setItem(
      AUTH_KEY,
      JSON.stringify({
        isAuthenticated: data.isAuthenticated,
        username: data.username,
        role: data.role,
        demo: data.demo,
        token: data.token,
      }),
    )
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
          user?: { username?: string; level?: string }
          redirect?: string
        }
        const role = roleFromLevel(d.user?.level)
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
