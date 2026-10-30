import { useEffect, useMemo, useState, type FormEvent, type KeyboardEvent } from 'react'
import { api } from '../lib/api'
import { useApiError, fieldError, type ApiFailure } from '../lib/crudApi'
import { angkaId, angkaMaks, tanggalIso } from '../lib/format'
import { normalisasiMatriks, ringkasMatriks, unduhLaporanMatriks, type KunciMatriks, type Matriks } from '../lib/laporanXlsx'
import { Ikon } from '../components/Ikon'
import { DialogKaca } from '../components/kaca/DialogKaca'
import { Segmen } from '../components/sensor/FilterBar'

/** 403 dari requireRole / demoGuard — dipresentasikan ramah, bukan banner merah. */
function aksesDitolak(msg: string | null): boolean {
  return !!msg && /menu ini untuk pengelola|akses ditolak/i.test(msg)
}

/* ============= 15 · LAPORAN (GET /laporan → matriks per bulan; unduh .xlsx di browser) ============= */

type Preset = 'Semua' | '6 Bulan' | '12 Bulan' | 'Kustom'
const PRESET: Preset[] = ['Semua', '6 Bulan', '12 Bulan', 'Kustom']

const NAMA_BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

/** "2026-10" → "Oktober 2026". */
function namaBulan(periode: string): string {
  const [y, m] = periode.split('-').map(Number)
  return m >= 1 && m <= 12 ? `${NAMA_BULAN[m - 1]} ${y}` : periode
}

/** Rentang tanggal untuk preset; "Semua"/"Kustom" tidak mengisi tanggal. */
function rentangPreset(p: Preset): { dari: string; sampai: string } {
  if (p === 'Semua' || p === 'Kustom') return { dari: '', sampai: '' }
  const kini = new Date()
  const awal = new Date(kini.getFullYear(), kini.getMonth() - (p === '6 Bulan' ? 6 : 12), kini.getDate())
  return { dari: tanggalIso(awal.getTime()), sampai: tanggalIso(kini.getTime()) }
}

/** Sel angka matriks: angka gaya Indonesia, atau "—" bila belum ada nilai. */
function sel(v: number | null | undefined, digit = 0): string {
  return typeof v === 'number' && Number.isFinite(v) ? angkaId(v, digit) : '—'
}

const KOLOM = ['Periode', 'Semai', 'Remaja', 'Dewasa', 'Panen (tanaman)', 'Rata-rata pH']

export function LaporanPage() {
  const handleApiError = useApiError()
  const [dari, setDari] = useState('')
  const [sampai, setSampai] = useState('')
  const [preset, setPreset] = useState<Preset>('Semua')
  // Filter yang benar-benar dipakai; n = penanda muat ulang tanpa ubah nilai filter.
  const [terpakai, setTerpakai] = useState({ dari: '', sampai: '', n: 0 })
  const [rows, setRows] = useState<Matriks[]>([])
  const [loading, setLoading] = useState(true)
  const [failure, setFailure] = useState<ApiFailure | null>(null)
  const [pilih, setPilih] = useState<Matriks | null>(null)
  const [mengunduh, setMengunduh] = useState(false)
  const [galatUnduh, setGalatUnduh] = useState<string | null>(null)

  useEffect(() => {
    let batal = false
    void (async () => {
      try {
        const res = await api.get('/laporan', {
          params: { dari: terpakai.dari || undefined, sampai: terpakai.sampai || undefined },
        })
        if (batal) return
        const d = (res.data ?? {}) as { matriks?: Parameters<typeof normalisasiMatriks>[0] }
        setRows(Array.isArray(d.matriks) ? normalisasiMatriks(d.matriks) : [])
        setFailure(null)
      } catch (err) {
        if (batal) return
        setFailure(handleApiError(err))
      } finally {
        if (!batal) setLoading(false)
      }
    })()
    return () => {
      batal = true
    }
  }, [terpakai, handleApiError])

  const stat = useMemo(() => ringkasMatriks(rows), [rows])
  const tertinggiPanen = stat.find((s) => s.kunci === 'panen_kg')?.tertinggi?.periode ?? null

  function terapkan(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setGalatUnduh(null)
    setTerpakai((f) => ({ dari: dari.trim(), sampai: sampai.trim(), n: f.n + 1 }))
  }

  function pilihPreset(p: Preset) {
    setPreset(p)
    if (p === 'Kustom') return
    const r = rentangPreset(p)
    setDari(r.dari)
    setSampai(r.sampai)
    setLoading(true)
    setGalatUnduh(null)
    setTerpakai((f) => ({ ...r, n: f.n + 1 }))
  }

  function bersihkan() {
    setPreset('Semua')
    setDari('')
    setSampai('')
    setLoading(true)
    setGalatUnduh(null)
    setTerpakai((f) => ({ dari: '', sampai: '', n: f.n + 1 }))
  }

  async function unduh() {
    setMengunduh(true)
    setGalatUnduh(null)
    try {
      await unduhLaporanMatriks({
        rows,
        periode: terpakai.dari || terpakai.sampai ? `${terpakai.dari || 'awal'} – ${terpakai.sampai || 'kini'}` : 'Seluruh data',
        dibuat: Date.now(),
        dari: terpakai.dari,
        sampai: terpakai.sampai,
      })
    } catch {
      setGalatUnduh('Laporan gagal dibuat. Coba lagi.')
    } finally {
      setMengunduh(false)
    }
  }

  const ditolak = aksesDitolak(failure?.message ?? null)
  const errDari = failure ? fieldError(failure.fieldErrors, 'dari') : undefined
  const errSampai = failure ? fieldError(failure.fieldErrors, 'sampai') : undefined
  const adaData = !loading && !ditolak && !failure && rows.length > 0

  return (
    <div className="vsf-halaman vsf-stagger vsf-laporan">
      {/* Filter */}
      <section className="vsf-card p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="vsf-judul-bagian">Rentang laporan</div>
          <Segmen label="Preset rentang" pilihan={PRESET} nilai={preset} onPilih={pilihPreset} />
        </div>
        <form className="mt-3 flex flex-wrap items-start gap-2" onSubmit={terapkan}>
          <label className="block">
            <span className="sr-only">Dari tanggal</span>
            <input
              className="vsf-input w-[210px]"
              placeholder="Dari (YYYY-MM-DD)"
              value={dari}
              onChange={(e) => {
                setDari(e.target.value)
                setPreset('Kustom')
              }}
              aria-label="Dari tanggal"
            />
            {errDari && <span className="mt-1 block text-[12px] text-red-700">{errDari}</span>}
          </label>
          <label className="block">
            <span className="sr-only">Sampai tanggal</span>
            <input
              className="vsf-input w-[210px]"
              placeholder="Sampai (YYYY-MM-DD)"
              value={sampai}
              onChange={(e) => {
                setSampai(e.target.value)
                setPreset('Kustom')
              }}
              aria-label="Sampai tanggal"
            />
            {errSampai && <span className="mt-1 block text-[12px] text-red-700">{errSampai}</span>}
          </label>
          <button type="submit" className="vsf-btn-primary">
            Terapkan
          </button>
        </form>
        <div className="mt-2 text-[12px] text-slate-500">
          Rentang kosong = seluruh data. Bulan dihitung dari tanggal semai.
        </div>
      </section>

      {/* Ringkasan kartu */}
      {adaData && (
        <section className="vsf-laporan-ringkas" aria-label="Ringkasan rentang">
          {stat.map((s) => {
            const digit = s.kunci === 'rata_ph' ? 2 : 0
            const utama = s.kunci === 'rata_ph' ? s.rata : s.total
            return (
              <div key={s.kunci} className="vsf-card vsf-laporan-kartu">
                <div className="text-[11px] uppercase tracking-[.12em] text-slate-500">{s.label}</div>
                <div className="vsf-laporan-angka">{sel(utama, digit)}</div>
                <div className="text-[12px] text-slate-500">
                  {s.kunci === 'rata_ph'
                    ? `${rows.filter((r) => typeof r.rata_ph === 'number').length} bulan ada data`
                    : `rata ${sel(s.rata, 1)} / bulan`}
                </div>
              </div>
            )
          })}
        </section>
      )}

      {/* Matriks */}
      <section className="vsf-card p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="vsf-judul-bagian">Matriks laporan</div>
          <span className="flex-1" />
          <button
            type="button"
            className="vsf-btn-primary"
            onClick={() => void unduh()}
            disabled={!adaData || mengunduh}
          >
            <Ikon nama="unduh" className="h-4 w-4" />
            {mengunduh ? 'Menyiapkan…' : 'Unduh Laporan'}
          </button>
        </div>
        {galatUnduh && (
          <div role="alert" className="mt-2 text-[13px] text-red-700">
            {galatUnduh}
          </div>
        )}

        {loading ? (
          <div className="mt-3 grid gap-2" role="status" aria-label="Memuat laporan">
            {[0, 1, 2].map((i) => (
              <div key={i} className="vsf-skeleton h-[40px] rounded-card" />
            ))}
          </div>
        ) : ditolak ? (
          <div className="mt-3 rounded-card border border-amber-500/50 bg-amber-50 px-4 py-5">
            <div className="text-[12px] uppercase tracking-[.14em] text-amber-800 font-bold">Akses terbatas</div>
            <p className="mt-2 text-[13px] leading-relaxed text-amber-900">
              Laporan hanya tersedia untuk <b>admin</b> dan <b>akun demo</b>. Peran petani dapat melihat
              progres tanam lewat menu “Kebun Saya”.
            </p>
            <button type="button" className="vsf-btn-secondary mt-3" onClick={bersihkan}>
              Bersihkan filter
            </button>
          </div>
        ) : failure ? (
          <div
            role="alert"
            className="vsf-banner mt-3 rounded-input vsf-tone-error px-3 py-2 text-[13px] flex flex-wrap items-center gap-3"
          >
            <span className="inline-flex items-center gap-1.5"><Ikon nama="peringatan" className="h-4 w-4" /> {failure.message}</span>
            <button
              type="button"
              className="vsf-input rounded-full font-semibold"
              onClick={() => {
                setLoading(true)
                setTerpakai((f) => ({ ...f, n: f.n + 1 }))
              }}
            >
              Muat ulang
            </button>
          </div>
        ) : rows.length === 0 ? (
          <div className="mt-3 rounded-card border border-dashed border-arutmin-border p-8 text-center">
            <div className="font-bold text-slate-700">Tidak ada data pada rentang yang dipilih</div>
            <div className="mx-auto mt-1 max-w-[420px] text-[13px] leading-relaxed text-slate-500">
              Rentang tanam yang cocok akan muncul sebagai baris per bulan — jumlah semai, peremajaan,
              pendewasaan, panen, dan rata-rata pH.
            </div>
            <button type="button" className="vsf-btn-secondary mt-3" onClick={bersihkan}>
              Reset filter
            </button>
          </div>
        ) : (
          <div className="vsf-laporan-tabel mt-3 overflow-auto rounded-card vsf-table">
            <table aria-label="Rekap tanam per bulan" className="w-full text-[13px]">
              <thead>
                <tr>
                  {KOLOM.map((h) => (
                    <th key={h} scope="col">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const buka = () => setPilih(r)
                  return (
                    <tr
                      key={r.periode}
                      tabIndex={0}
                      role="button"
                      aria-label={`Detail ${namaBulan(r.periode)}`}
                      onClick={buka}
                      onKeyDown={(e: KeyboardEvent) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          buka()
                        }
                      }}
                    >
                      <td className="font-semibold text-slate-900">
                        {r.periode}
                        {r.periode === tertinggiPanen && <span className="vsf-laporan-tag">Tertinggi</span>}
                      </td>
                      <td>{sel(r.semai)}</td>
                      <td>{sel(r.remaja)}</td>
                      <td>{sel(r.dewasa)}</td>
                      <td>{sel(r.panen_kg)}</td>
                      <td>{sel(r.rata_ph, 2)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        {adaData && <div className="mt-2 text-[12px] text-slate-500">Klik baris untuk melihat detail bulan.</div>}
      </section>

      {pilih && <PopupBulan r={pilih} rows={rows} stat={stat} onTutup={() => setPilih(null)} />}
    </div>
  )
}

/** Detail satu bulan: angka per kolom, pangsa panen terhadap rentang, dan rata pH. */
function PopupBulan({
  r,
  rows,
  stat,
  onTutup,
}: {
  r: Matriks
  rows: Matriks[]
  stat: ReturnType<typeof ringkasMatriks>
  onTutup: () => void
}) {
  const totalPanen = stat.find((s) => s.kunci === 'panen_kg')?.total ?? 0
  const pangsa = totalPanen > 0 && typeof r.panen_kg === 'number' ? (r.panen_kg / totalPanen) * 100 : null
  const item: { kunci: KunciMatriks; label: string; digit: number }[] = [
    { kunci: 'semai', label: 'Semai', digit: 0 },
    { kunci: 'remaja', label: 'Remaja', digit: 0 },
    { kunci: 'dewasa', label: 'Dewasa', digit: 0 },
    { kunci: 'panen_kg', label: 'Panen (tanaman)', digit: 0 },
  ]
  return (
    <DialogKaca
      judul={namaBulan(r.periode)}
      sub={`Periode ${r.periode} · ${rows.length} bulan dalam rentang`}
      onTutup={onTutup}
      lebar={520}
    >
      <div className="vsf-laporan-popup-grid mt-4">
        {item.map((i) => (
          <div key={i.kunci} className="vsf-laporan-popup-sel">
            <div className="text-[11px] uppercase tracking-[.12em] text-slate-500">{i.label}</div>
            <div className="vsf-laporan-angka">{sel(r[i.kunci], i.digit)}</div>
          </div>
        ))}
      </div>
      <div className="mt-3 grid gap-2 text-[13px] text-slate-700">
        <div className="flex justify-between gap-3">
          <span>Rata-rata pH</span>
          <b>{sel(r.rata_ph, 2)}</b>
        </div>
        <div className="flex justify-between gap-3">
          <span>Pangsa panen dari rentang</span>
          <b>{pangsa === null ? '—' : `${angkaMaks(pangsa, 1)}%`}</b>
        </div>
      </div>
    </DialogKaca>
  )
}
