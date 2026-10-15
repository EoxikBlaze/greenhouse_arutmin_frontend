import { useMemo, useState, type ReactNode } from 'react'
import { AuthCtx, defaultAuth, roleFromUsername, type AuthValue } from './authContext'

const KEY = 'vsf-auth'

/** Persist data auth (tanpa fungsi) supaya refresh tidak memutus sesi. */
function load(): Partial<AuthValue> {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return {}
    const d = JSON.parse(raw)
    return {
      isAuthenticated: !!d.isAuthenticated,
      username: String(d.username ?? ''),
      role: d.role ?? 'admin',
      demo: !!d.demo,
    }
  } catch {
    return {}
  }
}

function save(data: Partial<AuthValue>) {
  try {
    sessionStorage.setItem(
      KEY,
      JSON.stringify({
        isAuthenticated: data.isAuthenticated,
        username: data.username,
        role: data.role,
        demo: data.demo,
      }),
    )
  } catch {
    /* storage penuh/di-block — abaikan */
  }
}

export function AuthProvider({ children, value }: { children: ReactNode; value?: Partial<AuthValue> }) {
  const [state, setState] = useState<AuthValue>(() => ({ ...defaultAuth, ...load(), ...value }))

  const api = useMemo<AuthValue>(
    () => ({
      ...state,
      login: (username, role) =>
        setState((s) => {
          const r = role ?? roleFromUsername(username)
          const next = { ...s, isAuthenticated: true, username, role: r, demo: r === 'demo' }
          save(next)
          return next
        }),
      logout: () =>
        setState((s) => {
          const next = { ...s, isAuthenticated: false, username: '', demo: false }
          save(next)
          return next
        }),
    }),
    [state],
  )

  return <AuthCtx.Provider value={api}>{children}</AuthCtx.Provider>
}
