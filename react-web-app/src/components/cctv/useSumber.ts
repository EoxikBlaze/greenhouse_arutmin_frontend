import { useEffect, useRef, useState } from 'react'
import { api } from '../../lib/api'
import { sambung, urlAmanBrowser, type Kamera } from '../../lib/cctv'

/**
 * Sumber gambar satu kamera. http(s): URL langsung (+ penanda waktu untuk snapshot).
 * rtsp: unduh JPEG dari server lewat `api` (token login ikut) → object URL, diperbarui tiap interval.
 */
export function useSumber(k: Kamera, coba: number): { src: string | null; gagal: boolean } {
  const [tik, setTik] = useState(() => Date.now())
  const [blob, setBlob] = useState<string | null>(null)
  const [gagal, setGagal] = useState(false)
  const blobRef = useRef<string | null>(null)
  const muatRef = useRef(false)

  useEffect(() => {
    if (!k.aktif || k.tipe === 'mjpeg') return
    const id = window.setInterval(() => {
      if (k.tipe === 'rtsp' && muatRef.current) return
      setTik(Date.now())
    }, Math.max(1, k.interval_detik) * 1000)
    return () => window.clearInterval(id)
  }, [k.aktif, k.tipe, k.interval_detik])

  useEffect(() => {
    if (!k.aktif || k.tipe !== 'rtsp') return
    const ctrl = new AbortController()
    muatRef.current = true
    api
      .get<Blob>(`/cctv/${k.id}/gambar`, { responseType: 'blob', signal: ctrl.signal })
      .then((r) => {
        if (ctrl.signal.aborted) return
        const u = URL.createObjectURL(r.data)
        if (blobRef.current) URL.revokeObjectURL(blobRef.current)
        blobRef.current = u
        setBlob(u)
        setGagal(false)
      })
      .catch(() => { if (!ctrl.signal.aborted) setGagal(true) })
      .finally(() => { muatRef.current = false })
    return () => {
      muatRef.current = false
      ctrl.abort()
    }
  }, [k.id, k.aktif, k.tipe, tik, coba])

  // lepas object URL terakhir saat ubin hilang
  useEffect(() => () => { if (blobRef.current) URL.revokeObjectURL(blobRef.current) }, [])

  if (k.tipe === 'rtsp') return { src: blob, gagal: gagal && !blob }
  if (!urlAmanBrowser(k.url)) return { src: null, gagal: true }
  return { src: sambung(k.url ?? '', k.tipe === 'snapshot' ? tik : coba), gagal: false }
}
