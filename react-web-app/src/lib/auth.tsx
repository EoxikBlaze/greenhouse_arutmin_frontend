import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, EVENT_SESI_HABIS } from './api'
import { AuthCtx, defaultAuth, roleFromLevel, type AuthValue } from './authContext'
import { AUTH_KEY } from './token'
import { hapusSemuaChat } from './riwayatChat'

type StoredAuth = Partial<AuthValue> & { token?: string }

/** Persist data sesi beserta token Bearer ("Ingatkan saya" → localStorage, sesi sementara → sessionStorage). */
function load(): Partial<AuthValue> {
  try {
    const raw = localStorage.getItem(AUTH_KEY) ?? sessionStorage.getItem(AUTH_KEY)
    if (!raw) return {}
    const d = JSON.parse(raw) as StoredAuth
    // Sesi lama tanpa token di browser nyata dibersihkan agar tidak memicu 401 palsu sebelum login.
    if (!import.meta.env.VITEST && d.isAuthenticated && !d.token) {
      localStorage.removeItem(AUTH_KEY)
      sessionStorage.removeItem(AUTH_KEY)
      return {}
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

function save(data: StoredAuth, remember = true) {
  try {
    if (!data.isAuthenticated) {
      localStorage.removeItem(AUTH_KEY)
      sessionStorage.removeItem(AUTH_KEY)
      return
    }
    const payload = JSON.stringify({
      isAuthenticated: data.isAuthenticated,
      username: data.username,
      role: data.role,
      demo: data.demo,
      token: data.token ?? '',
    })
    if (remember) {
      localStorage.setItem(AUTH_KEY, payload)
      sessionStorage.removeItem(AUTH_KEY)
    } else {
      sessionStorage.setItem(AUTH_KEY, payload)
      localStorage.removeItem(AUTH_KEY)
    }
  } catch {
    /* storage penuh/di-block — abaikan */
  }
}

export function AuthProvider({ children, value }: { children: ReactNode; value?: Partial<AuthValue> }) {
  const [state, setState] = useState<AuthValue>(() => ({ ...defaultAuth, ...load(), ...value }))

  useEffect(() => {
    const saatSesiHabis = () => {
      save({})
      hapusSemuaChat()
      setState((s) => ({
        ...s,
        isAuthenticated: false,
        username: '',
        demo: false,
        role: 'admin',
      }))
    }
    window.addEventListener(EVENT_SESI_HABIS, saatSesiHabis)
    return () => window.removeEventListener(EVENT_SESI_HABIS, saatSesiHabis)
  }, [])

  const apiVal = useMemo<AuthValue>(
    () => {
      const login = async (username: string, password: string, remember = true): Promise<string> => {
        const res = await api.post('/login', { username, password, remember })
        const d = (res.data ?? {}) as {
          token?: string
          user?: { username?: string; level?: string; is_demo?: boolean }
          redirect?: string
        }
        const role = roleFromLevel(d.user?.level, d.user?.is_demo)
        const next: StoredAuth = {
          isAuthenticated: true,
          username: String(d.user?.username ?? username),
          role,
          demo: role === 'demo',
          token: d.token ?? '',
        }
        save(next, remember)
        setState((s) => ({ ...s, ...next }))
        return String(d.redirect ?? (role === 'petani' ? '/tanam' : '/dashboard'))
      }

      const logout = () => {
        api.post('/logout').catch(() => {})
        save({})
        hapusSemuaChat()
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
