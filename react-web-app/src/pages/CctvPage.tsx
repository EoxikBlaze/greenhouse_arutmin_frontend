import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../lib/authContext'
import { useApiList } from '../lib/crudApi'
import type { Kamera, StatusKamera } from '../lib/cctv'
import { Kosong, Pesan } from '../components/dosing/DialogKaca'
import { DialogHapusKamera } from '../components/cctv/DialogHapusKamera'
import { DialogKamera } from '../components/cctv/DialogKamera'
import { DialogPerbesar } from '../components/cctv/DialogPerbesar'
import { KartuKamera } from '../components/cctv/KartuKamera'
import { RingkasanCctv } from '../components/cctv/RingkasanCctv'

/**
 * CCTV greenhouse — papan kamera nyata.
 *   GET /cctv (semua role) · POST/PUT/DELETE /cctv (admin; demo hanya baca)
 *   - 'mjpeg'    → <img> aliran MJPEG langsung dari kamera (ESP32-CAM: http://IP:81/stream)
 *   - 'snapshot' → <img> JPEG langsung dari kamera, dimuat ulang tiap N detik (http://IP/capture)
 *   - 'rtsp'     → kamera RTSP (EZVIZ H8C, kamera IP): server mengambil frame lewat ffmpeg,
 *                  browser memuat GET /cctv/:id/gambar (membawa login) tiap N detik. URL berisi
 *                  sandi kamera tidak pernah sampai ke browser; HP tak perlu satu jaringan dengan kamera.
 */
type Popup = { jenis: 'form'; kamera?: Kamera } | { jenis: 'hapus' | 'besar'; kamera: Kamera } | null

export default function CctvPage() {
  const { role, demo } = useAuth()
  const admin = role === 'admin' && !demo
  const { rows, loading, error, reload } = useApiList<Kamera>('/cctv')
  const [popup, setPopup] = useState<Popup>(null)
  const [pesan, setPesan] = useState<{ ok: boolean; teks: string } | null>(null)
  const [status, setStatus] = useState<Record<string, StatusKamera>>({})

  useEffect(() => {
    if (!pesan) return
    const id = window.setTimeout(() => setPesan(null), 5000)
    return () => window.clearTimeout(id)
  }, [pesan])

  const onStatus = useCallback((id: Kamera['id'], s: StatusKamera) => {
    setStatus((p) => (p[String(id)] === s ? p : { ...p, [String(id)]: s }))
  }, [])

  const selesai = (teks: string) => {
    setPopup(null)
    setPesan({ ok: true, teks })
    reload()
  }
  const terputus = rows.filter((k) => k.aktif && status[String(k.id)] === 'terputus').length

  return (
    <div className="vsf-halaman vsf-stagger">
      <RingkasanCctv
        total={rows.length}
        aktif={rows.filter((k) => k.aktif).length - terputus}
        terputus={terputus}
        memuat={loading}
        kelola={admin}
        onTambah={() => setPopup({ jenis: 'form' })}
      />
      {pesan && <Pesan jenis={pesan.ok ? 'ok' : 'galat'} onTutup={() => setPesan(null)}>{pesan.teks}</Pesan>}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" role="status" aria-label="Memuat daftar kamera">
          {[0, 1, 2].map((i) => <div key={i} className="vsf-skeleton h-[260px] rounded-card" />)}
        </div>
      ) : error ? (
        <div role="alert" className="vsf-card p-4 text-[13px] text-red-700 sm:p-5">{error}</div>
      ) : rows.length === 0 ? (
        <section className="vsf-card p-4 sm:p-5">
          <Kosong>
            <div className="text-[15px] font-bold">Belum ada kamera</div>
            <p className="max-w-[460px] text-abu">
              {admin
                ? 'Tambahkan kamera pertama: RTSP untuk EZVIZ / kamera IP, atau snapshot / MJPEG dari ESP32-CAM.'
                : 'Admin belum menambahkan kamera.'}
            </p>
          </Kosong>
        </section>
      ) : (
        <section aria-label="Daftar kamera" className="vsf-card p-4 sm:p-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((k) => (
              <KartuKamera
                key={k.id}
                k={k}
                kelola={admin}
                onStatus={onStatus}
                onPerbesar={(x) => setPopup({ jenis: 'besar', kamera: x })}
                onUbah={(x) => setPopup({ jenis: 'form', kamera: x })}
                onHapus={(x) => setPopup({ jenis: 'hapus', kamera: x })}
              />
            ))}
          </div>
        </section>
      )}

      {admin && popup?.jenis === 'form' && (
        <DialogKamera kamera={popup.kamera} onSelesai={selesai} onTutup={() => setPopup(null)} />
      )}
      {admin && popup?.jenis === 'hapus' && (
        <DialogHapusKamera k={popup.kamera} onSelesai={() => selesai('Kamera dihapus.')} onTutup={() => setPopup(null)} />
      )}
      {popup?.jenis === 'besar' && <DialogPerbesar k={popup.kamera} onTutup={() => setPopup(null)} />}
    </div>
  )
}
