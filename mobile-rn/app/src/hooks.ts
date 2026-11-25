import { useCallback, useEffect, useRef, useState } from 'react'
import { ambil, GalatApi } from './api'

/** GET dengan muat ulang berkala; data lama dipertahankan saat muat ulang gagal. */
export function useGet<T>(path: string | null, tiapMs = 0) {
  const [data, setData] = useState<T | null>(null)
  const [galat, setGalat] = useState<string | null>(null)
  const [memuat, setMemuat] = useState(path !== null)
  const hidup = useRef(true)
  const muat = useCallback(async () => {
    if (path === null) return
    try {
      const d = await ambil<T>(path)
      if (hidup.current) { setData(d); setGalat(null) }
    } catch (e) {
      if (hidup.current) setGalat(e instanceof GalatApi ? e.message : 'Terjadi kesalahan.')
    } finally {
      if (hidup.current) setMemuat(false)
    }
  }, [path])
  useEffect(() => {
    hidup.current = true
    muat()
    const t = tiapMs > 0 ? setInterval(muat, tiapMs) : null
    return () => { hidup.current = false; if (t) clearInterval(t) }
  }, [muat, tiapMs])
  return { data, galat, memuat, muat }
}

/** Jalankan aksi tulis dengan status sibuk, pesan sukses, dan pesan galat. */
export function useAksi() {
  const [sibuk, setSibuk] = useState<string | null>(null)
  const [pesan, setPesan] = useState<string | null>(null)
  const [galat, setGalat] = useState<string | null>(null)
  const jalan = useCallback(async (nama: string, f: () => Promise<string | void>) => {
    setSibuk(nama); setPesan(null); setGalat(null)
    try {
      const p = await f()
      setPesan(p || 'Berhasil.')
    } catch (e) {
      setGalat(e instanceof Error ? e.message : 'Gagal.')
    } finally {
      setSibuk(null)
    }
  }, [])
  return { sibuk, pesan, galat, jalan }
}
