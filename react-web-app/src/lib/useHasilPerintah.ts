import { useEffect, useState } from 'react'
import { api } from './api'

export type HasilPerintah = { id: string; status: string; alasan: string | null }
type Baris = { id: number | string; status: string; hasil?: { alasan?: string } | null }

const AKHIR = ['selesai', 'gagal', 'batal', 'kedaluwarsa']
const LABEL: Record<string, string> = {
  menunggu: 'menunggu diambil alat',
  dikirim: 'sudah dikirim, menunggu laporan alat',
  selesai: 'alat melapor selesai',
  gagal: 'alat melapor GAGAL',
  batal: 'dibatalkan',
  kedaluwarsa: 'kedaluwarsa: alat tidak mengambil perintah (alat offline?)',
}

/** Kalimat status untuk ditampilkan; alasan dari firmware ikut bila ada. */
export function kalimatHasil(h: HasilPerintah | null): string {
  if (!h) return 'menunggu kabar dari server…'
  return `${LABEL[h.status] ?? h.status}${h.alasan ? ` (${h.alasan})` : ''}`
}

/** Pantau satu perintah aktuator sampai alat melapor (GET /api/aktuator/perintah, tiap 3 detik). */
export function useHasilPerintah(id: number | string | null): HasilPerintah | null {
  const [hasil, setHasil] = useState<HasilPerintah | null>(null)

  useEffect(() => {
    if (id === null) return
    let berhenti = false
    let timer = 0
    const cek = async () => {
      try {
        const r = await api.get('/api/aktuator/perintah', { params: { batas: 20 } })
        const baris = ((r.data?.data ?? []) as Baris[]).find((b) => String(b.id) === String(id))
        if (berhenti || !baris) return
        setHasil({ id: String(id), status: baris.status, alasan: baris.hasil?.alasan ?? null })
        if (AKHIR.includes(baris.status)) window.clearInterval(timer)
      } catch {
        // jaringan putus sesaat: dicoba lagi di putaran berikut
      }
    }
    timer = window.setInterval(() => void cek(), 3000)
    void cek()
    return () => {
      berhenti = true
      window.clearInterval(timer)
    }
  }, [id])

  return hasil && id !== null && hasil.id === String(id) ? hasil : null
}
