import { useState } from 'react'
import clsx from 'clsx'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../lib/authContext'

type Kamera = {
  kode: string
  lokasi: string
  status: 'Online' | 'Periksa' | 'Offline'
  resolusi: string
}

const KAMERA: Kamera[] = [
  { kode: 'K-01', lokasi: 'Greenhouse A', status: 'Online', resolusi: '1080p · 24fps' },
  { kode: 'K-02', lokasi: 'Greenhouse B', status: 'Online', resolusi: '1080p · 24fps' },
  { kode: 'K-03', lokasi: 'Nursery / Semai', status: 'Online', resolusi: '720p · 24fps' },
  { kode: 'K-04', lokasi: 'Area Tandon Air', status: 'Periksa', resolusi: '1080p · 15fps' },
  { kode: 'K-05', lokasi: 'Jalur Nutrisi', status: 'Online', resolusi: '720p · 24fps' },
  { kode: 'K-06', lokasi: 'Pintu Greenhouse', status: 'Offline', resolusi: '—' },
]

const PERISTIWA = [
  { teks: 'Gerak terdeteksi · K-04', waktu: '07:39', hasil: 'peringatan dikirim' },
  { teks: 'Rekam otomatis berhenti · K-01', waktu: '07:20', hasil: '' },
  { teks: 'K-06 feed terputus', waktu: '06:12', hasil: 'alat terputus' },
  { teks: 'Snapshot dijadwalkan · K-02', waktu: '06:00', hasil: 'sukses' },
]

function statusTone(s: Kamera['status']) {
  if (s === 'Online') return 'border-arutmin-moss/50 bg-arutmin-mint/25 text-arutmin-forest'
  if (s === 'Periksa') return 'border-amber-500/60 bg-amber-50 text-amber-800'
  return 'border-red-600/50 bg-red-50 text-red-700'
}

export default function CctvPage() {
  const { role } = useAuth() // [petani] read-only: tanpa Rekam/Snapshot
  const readOnly = role === 'petani' || role === 'demo'
  const [searchParams] = useSearchParams()
  const isLoading = searchParams.get('state') === 'loading'
  const [lokasi, setLokasi] = useState('Semua lokasi')

  const daftar = KAMERA.filter((k) => lokasi === 'Semua lokasi' || k.lokasi === lokasi)

  return (
    <div className="mx-auto max-w-[1180px] grid gap-4 vsf-stagger">
      {/* Toolbar filter */}
      <section className="vsf-card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-[12px] font-bold text-slate-700">Filter lokasi:</label>
          <select className="vsf-input" value={lokasi} onChange={(e) => setLokasi(e.target.value)}>
            <option>Semua lokasi</option>
            {[...new Set(KAMERA.map((k) => k.lokasi))].map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
          <span className="flex-1" />
          <button className="vsf-input rounded-full font-semibold">⟳ Muat Ulang</button>
        </div>
        <div className="mt-2 text-[12px] text-slate-500">
          states: loading (skeleton feed) · kamera offline (feed abu + label ‘feed terputus’) · akses [petani]
          read-only (tanpa Rekam/Snapshot)
        </div>
      </section>

      {/* Grid kamera 3×2 */}
      <section className="vsf-card p-4">
        <div className="text-[11px] uppercase tracking-[.14em] text-slate-500 font-bold">Grid kamera</div>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 vsf-stagger">
          {daftar.map((k) => (
            <div key={k.kode} className="rounded-card border border-arutmin-border bg-white overflow-hidden">
              <div
                className={clsx(
                  'h-[130px] flex flex-col items-center justify-center text-[12px]',
                  k.status === 'Offline'
                    ? 'bg-slate-200 text-slate-500'
                    : 'bg-arutmin-forest/90 text-white',
                )}
              >
                {isLoading ? (
                  <div className="vsf-skeleton h-[90px] w-[85%]" />
                ) : k.status === 'Offline' ? (
                  <span>feed terputus</span>
                ) : (
                  <>
                    <span>◉ LIVE · {k.resolusi}</span>
                    <span className="mt-1 text-white/70 font-mono">07:42:15</span>
                  </>
                )}
              </div>
              <div className="p-3">
                <div className="flex items-center gap-2">
                  <b className="text-[13px] text-slate-900">{k.kode} · {k.lokasi}</b>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className={clsx('inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold', statusTone(k.status))}>
                    {k.status === 'Online' ? '●' : k.status === 'Periksa' ? '▲' : '✖'} {k.status}
                  </span>
                  <span className="text-[11px] text-slate-500">{k.resolusi}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pemutar + log peristiwa */}
      <section className="vsf-card p-4">
        <div className="grid lg:grid-cols-[1.4fr_1fr] gap-4">
          <div>
            <div className="text-[11px] uppercase tracking-[.14em] text-slate-500 font-bold">
              Pemutar — K-01 · Greenhouse A
            </div>
            <div className="mt-3 h-[220px] rounded-card bg-arutmin-forest/90 text-white flex items-center justify-center text-[13px]">
              {isLoading ? <div className="vsf-skeleton h-[180px] w-[80%]" /> : <>◉ LIVE · 1080p · 07:42:15</>}
            </div>
            <div className="mt-2 text-[12px] text-slate-600">
              Snapshot terakhir: 07:38 · Rekaman aktif: ya · Penyimpanan: 82% (1.6 TB / 2 TB)
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button className="vsf-btn-primary" disabled={readOnly}>Rekam</button>
              <button className="vsf-input rounded-full font-semibold" disabled={readOnly}>Snapshot</button>
              <button className="vsf-input rounded-full font-semibold">Buka Penuh</button>
              {readOnly && (
                <span className="text-[12px] text-slate-500 self-center">
                  aksi rekam/snapshot nonaktif untuk peran {role}
                </span>
              )}
            </div>
          </div>

          <div>
            <div className="text-[11px] uppercase tracking-[.14em] text-slate-500 font-bold" aria-live="polite">
              Peristiwa Kamera
            </div>
            <div className="mt-3 grid gap-2">
              {PERISTIWA.map((p) => (
                <div key={p.teks} className="rounded-input border border-arutmin-border bg-white px-3 py-2 text-[13px]">
                  <b className="text-slate-900">{p.teks}</b>
                  <div className="text-[12px] text-slate-500">
                    {p.waktu}
                    {p.hasil ? ` · ${p.hasil}` : ''}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 text-[12px] text-slate-500">
              → notifikasi WhatsApp mengikuti ambang peristiwa (Pengaturan › Notifikasi WhatsApp)
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
