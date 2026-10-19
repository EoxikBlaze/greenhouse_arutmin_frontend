import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from './api'
import { useAuth } from './authContext'

/**
 * Penanganan error KONTRAK API (docs/KONTRAK_API.md §2) untuk layar CRUD.
 *
 * Semua respons error memakai bentuk seragam:
 *   { message }                     → 401 / 403 / 404 / 429 / 500
 *   { message, errors: { f: [...] } } → 422 (validasi)
 *
 * Di sini satu tempat menerjemahkannya menjadi state UI:
 *   401 → sesi dibuang + redirect /login
 *   403 → pesan "Mode demo: …" bila role demo
 *   404 → "Data tidak ditemukan."
 *   422 → errors per-field (ditampilkan di bawah input yang salah)
 *   0   → server tidak terjangka (offline / proxy mati)
 */
export type ApiFailure = {
  /** HTTP status; 0 = tidak ada respons (jaringan/offline). */
  status: number
  message: string
  /** errors[field] = [pesan, …] sesuai kontrak 422. */
  fieldErrors: Record<string, string[]>
}

type ErrShape = {
  response?: {
    status?: number
    data?: { message?: unknown; errors?: unknown }
  }
  request?: unknown
}

/** Terjemahkan AxiosError → ApiFailure (tanpa efek samping — aman dipanggil di mana pun). */
export function parseApiFailure(err: unknown): ApiFailure {
  const e = err as ErrShape | null
  const status = e?.response?.status ?? 0
  const data = e?.response?.data

  const fieldErrors: Record<string, string[]> = {}
  const raw = data?.errors
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    for (const [field, val] of Object.entries(raw as Record<string, unknown>)) {
      if (Array.isArray(val)) fieldErrors[field] = val.map((v) => String(v))
      else if (typeof val === 'string') fieldErrors[field] = [val]
    }
  }

  const serverMsg = typeof data?.message === 'string' ? data.message.trim() : ''
  let message = serverMsg
  if (!message) {
    if (status === 404) message = 'Data tidak ditemukan.'
    else if (status === 401) message = 'Tidak terautentikasi.'
    else if (status === 403) message = 'Akses ditolak.'
    else if (status === 0) message = 'Tidak dapat terhubung ke server. Periksa koneksi lalu coba lagi.'
    else if (status >= 500) message = 'Terjadi kesalahan pada server.'
    else message = 'Permintaan gagal diproses.'
  }
  // 404 tanpa pesan → selalu memakai teks kontrak.
  if (status === 404 && !serverMsg) message = 'Data tidak ditemukan.'

  return { status, message, fieldErrors }
}

/**
 * Hook: parse error API + jalur wajib kontrak (401 → login, 403 demo → pesan mode demo).
 * Dipakai halaman Meja Tanam & Ambang Sensor.
 */
export function useApiError(): (err: unknown) => ApiFailure {
  const navigate = useNavigate()
  const { logout, role } = useAuth()

  return useCallback(
    (err: unknown): ApiFailure => {
      const f = parseApiFailure(err)

      if (f.status === 401) {
        // Token kedaluwarsa/hilang → buang sesi lokal lalu kembali ke login.
        logout()
        navigate('/login', { replace: true })
        return { ...f, message: 'Sesi berakhir — silakan login kembali.' }
      }

      if (f.status === 403 && role === 'demo') {
        const msg = /^mode demo/i.test(f.message)
          ? f.message
          : `Mode demo: ${f.message}`
        return { ...f, message: msg }
      }

      if (f.status === 404) {
        return { ...f, message: f.message || 'Data tidak ditemukan.' }
      }

      return f
    },
    [logout, navigate, role],
  )
}

function rowsOf(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload
  if (payload && typeof payload === 'object') {
    const d = (payload as { data?: unknown }).data
    if (Array.isArray(d)) return d
    const list = (payload as { list?: unknown }).list
    if (Array.isArray(list)) return list
  }
  return []
}

/**
 * Hook daftar GET: spinner saat muat pertama + error kontrak.
 * `reload()` dipanggil halaman setelah POST/PUT/DELETE sukses → tabel ikut
 * segar tanpa mengosongkan baris yang sedang dibaca.
 */
export function useApiList<T>(path: string): {
  rows: T[]
  loading: boolean
  error: string | null
  reload: () => void
} {
  const handleApiError = useApiError()
  const [rows, setRows] = useState<T[]>([])
  // true hanya untuk muat pertama (isi awal state — bukan setState di dalam effect).
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const seq = useRef(0)

  const load = useCallback(async () => {
    const id = ++seq.current
    try {
      const res = await api.get(path)
      if (id !== seq.current) return
      setRows(rowsOf(res.data) as T[])
      setError(null)
    } catch (err) {
      if (id !== seq.current) return
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

  const reload = useCallback(() => {
    void load()
  }, [load])

  return { rows, loading, error, reload }
}

/** Pesan error per-field pertama untuk sebuah kolom (kontrak 422). */
export function fieldError(
  fieldErrors: Record<string, string[]>,
  field: string,
): string | undefined {
  const list = fieldErrors[field]
  return list && list.length ? list[0] : undefined
}
