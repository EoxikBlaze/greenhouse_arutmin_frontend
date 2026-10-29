import { useEffect, useRef, useState } from 'react'
import { api } from '../../lib/api'
import { sambung, type Kamera } from '../../lib/cctv'

/**
 * Sumber gambar satu kamera. http(s): URL langsung (+ penanda waktu untuk snapshot).
 * rtsp: unduh JPEG dari server lewat `api` (token login ikut) → object URL, diperbarui tiap interval.
 */
export function useSumber(k: Kamera, coba: number): { src: string | null; gagal: boolean } {
  const [tik, setTik] = useState(() => Date.now())
  const [blob, setBlob] = useState<string | null>(null)
  const [gagal, setGagal] = useState(false)
  const blobRef = useRef<string | null>(null)

  useEffect(() => {
    if (!k.aktif || k.tipe === 'mjpeg') return
    const id = window.setInterval(() => setTik(Date.now()), Math.max(1, k.interval_detik) * 1000)
    return () => window.clearInterval(id)
  }, [k.aktif, k.tipe, k.interval_detik])

  useEffect(() => {
    if (!k.aktif || k.tipe !== 'rtsp') return
    let batal = false
    api
      .get<Blob>(`/cctv/${k.id}/gambar`, { responseType: 'blob' })
      .then((r) => {
        if (batal) return
        const u = URL.createObjectURL(r.data)
        if (blobRef.current) URL.revokeObjectURL(blobRef.current)
        blobRef.current = u
        setBlob(u)
        setGagal(false)
      })
      .catch(() => { if (!batal) setGagal(true) })
    return () => { batal = true }
  }, [k.id, k.aktif, k.tipe, tik, coba])

  // lepas object URL terakhir saat ubin hilang
  useEffect(() => () => { if (blobRef.current) URL.revokeObjectURL(blobRef.current) }, [])

  if (k.tipe === 'rtsp') return { src: blob, gagal: gagal && !blob }
  return { src: sambung(k.url ?? '', k.tipe === 'snapshot' ? tik : coba), gagal: false }
}
