import { useEffect, useState } from 'react'

export type RingkasanPublik = {
  meja: number
  lubang: number
  jenis_tanaman: number
  panen: { kali: number; berhasil: number; gagal: number }
  alert_terbuka: number | null
  iot: { online: boolean; detik_lalu: number | null }
  rata_6_jam: { ph: number | null; tds: number | null; suhu_air: number | null; suhu_udara: number | null; kelembapan: number | null; jumlah: number }
  tren_24_jam: Array<{ jam: string; ph: number | null; tds: number | null; suhu_air: number | null }>
  diperbarui: string
}

/** Data publik landing page — polling 30 dtk, berhenti saat tab tersembunyi, tanpa token. */
export function usePublik() {
  const [data, setData] = useState<RingkasanPublik | null>(null)
  const [galat, setGalat] = useState(false)
  const [memuat, setMemuat] = useState(true)

  useEffect(() => {
    const ac = new AbortController()
    const muat = () =>
      fetch('/api/publik/ringkasan', { signal: ac.signal, headers: { Accept: 'application/json' } })
        .then((r) => {
          if (!r.ok) throw new Error(String(r.status))
          return r.json() as Promise<RingkasanPublik>
        })
        .then((d) => {
          setData(d)
          setGalat(false)
        })
        .catch((e: Error) => {
          if (e.name !== 'AbortError') setGalat(true)
        })
        .finally(() => setMemuat(false))
    void muat()
    const t = window.setInterval(() => {
      if (!document.hidden) void muat()
    }, 30_000)
    return () => {
      ac.abort()
      window.clearInterval(t)
    }
  }, [])

  return { data, galat, memuat }
}
