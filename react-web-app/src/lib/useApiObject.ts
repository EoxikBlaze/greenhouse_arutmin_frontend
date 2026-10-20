import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from './api'
import { useApiError } from './crudApi'

/**
 * Hook GET untuk respons berbentuk OBJEK (bukan array — untuk itu pakai
 * `useApiList` di crudApi.ts). Pola & terjemahan error sama persis dengan
 * helper F1: 401 → sesi dibuang + redirect login, 403 → pesan kontrak
 * (mode demo), 404 → "Data tidak ditemukan.", 0 → server tak terjangkau.
 *
 * `pollMs` = refresh senyap tiap N ms (status/perangkat) — skeleton hanya
 * muncul pada muat PERTAMA, data lama tetap tampil sampai pengganti tiba.
 */
export function useApiObject<T>(
  path: string,
  options?: { pollMs?: number },
): {
  data: T | null
  loading: boolean
  error: string | null
  reload: () => void
} {
  const handleApiError = useApiError()
  const [data, setData] = useState<T | null>(null)
  // true hanya untuk muat pertama (isi awal state — bukan setState sinkron di effect).
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const seq = useRef(0)
  const pollMs = options?.pollMs

  const load = useCallback(async () => {
    const id = ++seq.current
    try {
      const res = await api.get(path)
      if (id !== seq.current) return
      setData(res.data as T)
      setError(null)
    } catch (err) {
      if (id !== seq.current) return
      // Data lama TIDAK dibuang — banner error tampil di atas data terakhir.
      setError(handleApiError(err).message)
    } finally {
      if (id === seq.current) setLoading(false)
    }
  }, [path, handleApiError])

  useEffect(() => {
    // setState terjadi SETELAH await (asinkron) — bukan sinkron di dalam effect.
    // eslint-disable-next-line react/set-state-in-effect
    void load()
    return () => {
      seq.current += 1 // batalkan hasil yang masih mendarat setelah unmount
    }
  }, [load])

  useEffect(() => {
    if (!pollMs) return
    const id = setInterval(() => void load(), pollMs)
    return () => clearInterval(id)
  }, [pollMs, load])

  const reload = useCallback(() => {
    void load()
  }, [load])

  return { data, loading, error, reload }
}
