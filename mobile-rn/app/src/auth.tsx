import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { ambil, masuk, muatSesi, pasangSesiHabis, Pengguna, simpanSesi, SERVER_BAWAAN } from './api'

type Ctx = {
  pengguna: Pengguna | null; siap: boolean; server: string
  masuk: (u: string, p: string, server: string) => Promise<void>; keluar: () => Promise<void>
  perbarui: (p: Pengguna) => void
}
const AuthCtx = createContext<Ctx | null>(null)
export const useAuth = () => {
  const x = useContext(AuthCtx)
  if (!x) throw new Error('useAuth di luar AuthProvider')
  return x
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [pengguna, setPengguna] = useState<Pengguna | null>(null)
  const [siap, setSiap] = useState(false)
  const [server, setServer] = useState(SERVER_BAWAAN)

  const keluar = useCallback(async () => { await simpanSesi(null); setPengguna(null) }, [])

  useEffect(() => {
    pasangSesiHabis(() => { void keluar() })
    muatSesi().then(async (s) => {
      setServer(s.server)
      if (s.token) {
        try {
          
          const p = await ambil<{ user?: Pengguna | null }>('profil')
          if (p.user) setPengguna(p.user)
        } catch { /* token tidak berlaku: tampilkan login */ }
      }
      setSiap(true)
    })
  }, [keluar])

  const nilai = useMemo<Ctx>(() => ({
    pengguna, siap, server, keluar, perbarui: setPengguna,
    masuk: async (u, p, srv) => {
      await simpanSesi(null, srv)
      const r = await masuk(u.trim(), p)
      await simpanSesi(r.token, srv)
      setServer(srv)
      setPengguna(r.user)
    },
  }), [pengguna, siap, server, keluar])
  return <AuthCtx.Provider value={nilai}>{children}</AuthCtx.Provider>
}
