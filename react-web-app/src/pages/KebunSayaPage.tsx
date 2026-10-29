import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useApiList } from '../lib/crudApi'
import { useAuth } from '../lib/authContext'
import { Ikon } from '../components/Ikon'
import { NaikHarian } from '../components/NaikHarian'
import { RingkasanKebun } from '../components/kebun/RingkasanKebun'
import { KartuBatch } from '../components/kebun/KartuBatch'
import { DialogMulaiSemai } from '../components/kebun/DialogMulaiSemai'
import { ringkasBatch, saring, type FilterTahap, type TanamRow } from '../lib/kebun'

/** Ilustrasi empty-state: tunas dalam pot (SVG murni, bukan emoji). */
function IlustrasiTanam() {
  return (
    <svg viewBox="0 0 160 110" className="mx-auto h-[104px] w-[152px]" aria-hidden="true" focusable="false">
      <ellipse cx="80" cy="98" rx="52" ry="8" fill="#E2E8DD" />
      <path d="M56 70h48l-6 26a8 8 0 0 1-8 6H70a8 8 0 0 1-8-6z" fill="#CFE2CE" stroke="#6B9D4A" strokeWidth="2" />
      <path d="M52 64h56v8H52z" fill="#fff" stroke="#6B9D4A" strokeWidth="2" />
      <path d="M80 64V38" stroke="#4C6A4B" strokeWidth="3" strokeLinecap="round" />
      <path d="M80 46c-12 0-20-7-21-19 12-1 21 6 21 19z" fill="#CFE2CE" stroke="#6B9D4A" strokeWidth="2" strokeLinejoin="round" />
      <path d="M80 52c11 0 19-6 20-17-11-1-20 5-20 17z" fill="#fff" stroke="#6B9D4A" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="122" cy="26" r="10" fill="#F59E0B" opacity=".55" />
      <path d="M122 8v6M106 26h6M134 26h4M110 14l4 4M134 14l-4 4" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export default function KebunSayaPage() {
  const { rows, loading, error, reload } = useApiList<TanamRow>('/tanam')
  const [cari, setCari] = useState('')
  const [tahap, setTahap] = useState<FilterTahap>('Semua')

  const { role } = useAuth()
  const kelola = role !== 'petani' // membuat semai = pengelola (sama dgn tombol hero Dashboard)
  const location = useLocation()
  const navigate = useNavigate()

  // Pesan sukses & pemicu form dari navigasi (redirect /tanam dgn flash).
  const stateAwal = (location.state ?? null) as { flash?: string; mulaiBaru?: boolean } | null
  const [flash, setFlash] = useState<string | null>(stateAwal?.flash ?? null)
  const [mulaiOpen, setMulaiOpen] = useState<boolean>(!!stateAwal?.mulaiBaru)

  // Bersihkan state navigasi SETELAH dibaca (refresh tidak membuka form lagi).
  useEffect(() => {
    if (location.state) navigate(location.pathname, { replace: true, state: null })
  }, [location.state, location.pathname, navigate])

  useEffect(() => {
    if (!flash) return
    const id = window.setTimeout(() => setFlash(null), 4000)
    return () => window.clearTimeout(id)
  }, [flash])

  const terfilter = useMemo(() => saring(rows, cari, tahap), [rows, cari, tahap])
  const ringkas = useMemo(() => ringkasBatch(rows), [rows])

  // GET /tanam dilayani semua role (index.js: semuaRole) — 403 tidak mungkin di sini,
  // sehingga error apa pun cukup ditampilkan apa adanya + Muat ulang.
  return (
    <div className="vsf-halaman vsf-stagger">
      {flash && (
        <div
          role="status"
          aria-live="polite"
          className="vsf-banner flex items-center gap-2 rounded-std border border-arutmin-moss bg-arutmin-mint/50 px-3 py-2 text-[13px] text-arutmin-forest"
        >
          <Ikon nama="centang" className="h-4 w-4" />
          {flash}
        </div>
      )}

      <RingkasanKebun
        ringkas={ringkas}
        memuat={loading}
        cari={cari}
        onCari={setCari}
        tahap={tahap}
        onTahap={setTahap}
        kelola={kelola}
        onMulai={() => setMulaiOpen(true)}
        onMuat={reload}
      />

      {/* Satu state per layar: loading → error → kosong → daftar */}
      <section className="vsf-card p-4 sm:p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div className="vsf-judul-bagian">Daftar tanam</div>
          {!loading && !error && rows.length > 0 && (
            <span className="text-[12px] text-abu">
              {terfilter.length === rows.length ? `${rows.length} batch` : `${terfilter.length} dari ${rows.length} batch`}
            </span>
          )}
        </div>

        {loading ? (
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3" role="status" aria-label="Memuat daftar tanam">
            {[0, 1, 2].map((i) => (
              <div key={i} className="vsf-skeleton h-[236px] rounded-card" />
            ))}
          </div>
        ) : error ? (
          <div role="alert" className="vsf-banner vsf-tone-error mt-3 flex flex-wrap items-center gap-3 rounded-input px-3 py-3 text-[13px]">
            <span className="inline-flex items-center gap-1.5">
              <Ikon nama="peringatan" className="h-4 w-4" /> {error}
            </span>
            <button type="button" className="vsf-btn-secondary !min-h-[36px] text-[13px]" onClick={reload}>
              Muat ulang
            </button>
          </div>
        ) : rows.length === 0 ? (
          <div className="mt-3 rounded-card bg-white/55 p-8 text-center">
            <IlustrasiTanam />
            <div className="mt-3 font-bold text-tinta">Belum ada tanam aktif</div>
            <div className="mx-auto mt-1 max-w-[440px] text-[13px] leading-relaxed text-abu">
              Begitu ada batch semai, peremajaan, atau pendewasaan yang berjalan, daftarnya tampil di sini lengkap dengan
              progres harinya.
            </div>
            {kelola && (
              <button type="button" className="vsf-btn-primary mt-4" onClick={() => setMulaiOpen(true)}>
                <Ikon nama="tambah" />
                Mulai Semai Baru
              </button>
            )}
          </div>
        ) : terfilter.length === 0 ? (
          <div className="mt-3 rounded-card bg-white/55 p-8 text-center">
            <div className="font-bold text-tinta">Tidak ada hasil untuk filter ini</div>
            <div className="mt-1 text-[13px] text-abu">
              Coba kata kunci lain, atau bersihkan filter untuk melihat semua {rows.length} batch.
            </div>
            <button
              type="button"
              className="vsf-btn-secondary mt-3"
              onClick={() => {
                setCari('')
                setTahap('Semua')
              }}
            >
              Bersihkan filter
            </button>
          </div>
        ) : (
          <div className="vsf-stagger mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {terfilter.map((t) => (
              <KartuBatch key={`${t.tipe}-${t.id}`} r={t} />
            ))}
          </div>
        )}
      </section>

      {/* Form mulai tanam (POST /tanam/mulai) — terbuka dari hero Dashboard juga. */}
      {kelola && mulaiOpen && (
        <DialogMulaiSemai
          onClose={() => setMulaiOpen(false)}
          onSukses={(pesan) => {
            setFlash(pesan)
            setMulaiOpen(false)
            reload()
          }}
        />
      )}

      {/* target ppm naik harian per tanaman — petani cukup isi target akhir */}
      <NaikHarian />
    </div>
  )
}
