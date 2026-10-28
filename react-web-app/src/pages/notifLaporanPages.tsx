import { useEffect, useState, type FormEvent } from 'react'
import { api } from '../lib/api'
import { useApiError, fieldError, type ApiFailure } from '../lib/crudApi'

/** 403 dari requireRole / demoGuard — dipresentasikan ramah, bukan banner merah. */
function aksesDitolak(msg: string | null): boolean {
  return !!msg && /menu ini untuk pengelola|akses ditolak/i.test(msg)
}

/* ============= 15 · LAPORAN (GET /laporan + /laporan/csv) ============= */

type Matriks = {
  periode: string
  semai?: number | null
  remaja?: number | null
  dewasa?: number | null
  panen_kg?: number | null
  rata_ph?: number | null
}

const KOLOM = ['Periode', 'Semai', 'Remaja', 'Dewasa', 'Panen (tanaman)', 'Rata-rata pH']

function angka(v?: number | null): string {
  return typeof v === 'number' ? String(v) : '—'
}

export function LaporanPage() {
  const handleApiError = useApiError()
  const [dari, setDari] = useState('')
  const [sampai, setSampai] = useState('')
  // Filter yang benar-benar dipakai; n = penanda muat ulang tanpa ubah nilai filter.
  const [terpakai, setTerpakai] = useState({ dari: '', sampai: '', n: 0 })
  const [rows, setRows] = useState<Matriks[]>([])
  const [loading, setLoading] = useState(true)
  const [failure, setFailure] = useState<ApiFailure | null>(null)

  useEffect(() => {
    let batal = false
    void (async () => {
      try {
        const res = await api.get('/laporan', {
          params: { dari: terpakai.dari || undefined, sampai: terpakai.sampai || undefined },
        })
        if (batal) return
        const d = (res.data ?? {}) as { matriks?: Matriks[] }
        setRows(Array.isArray(d.matriks) ? d.matriks : [])
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

  function terapkan(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setTerpakai((f) => ({ dari: dari.trim(), sampai: sampai.trim(), n: f.n + 1 }))
  }

  function bersihkan() {
    setDari('')
    setSampai('')
    setLoading(true)
    setTerpakai((f) => ({ dari: '', sampai: '', n: f.n + 1 }))
  }

  async function unduhCsv() {
    try {
      const res = await api.get('/laporan/csv', {
        params: { dari: terpakai.dari || undefined, sampai: terpakai.sampai || undefined },
        responseType: 'blob',
      })
      const url = URL.createObjectURL(res.data as Blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `laporan-${terpakai.dari || 'awal'}_${terpakai.sampai || 'kini'}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setFailure(handleApiError(err))
    }
  }

  const ditolak = aksesDitolak(failure?.message ?? null)
  const errDari = failure ? fieldError(failure.fieldErrors, 'dari') : undefined
  const errSampai = failure ? fieldError(failure.fieldErrors, 'sampai') : undefined

  return (
    <div className="mx-auto w-full max-w-[1180px] grid grid-cols-[minmax(0,1fr)] gap-4 vsf-stagger">
      {/* Filter */}
      <section className="vsf-card p-4">
        <div className="text-[11px] uppercase tracking-[.14em] text-slate-500 font-bold">Filter laporan</div>
        <form className="mt-3 flex flex-wrap items-start gap-2" onSubmit={terapkan}>
          <label className="block">
            <span className="sr-only">Dari tanggal</span>
            <input
              className="vsf-input w-[210px]"
              placeholder="Dari (YYYY-MM-DD)"
              value={dari}
              onChange={(e) => setDari(e.target.value)}
              aria-label="Dari tanggal"
            />
            {errDari && <span className="mt-1 block text-[11px] text-red-700">{errDari}</span>}
          </label>
          <label className="block">
            <span className="sr-only">Sampai tanggal</span>
            <input
              className="vsf-input w-[210px]"
              placeholder="Sampai (YYYY-MM-DD)"
              value={sampai}
              onChange={(e) => setSampai(e.target.value)}
              aria-label="Sampai tanggal"
            />
            {errSampai && <span className="mt-1 block text-[11px] text-red-700">{errSampai}</span>}
          </label>
          <button type="submit" className="vsf-btn-primary">
            Terapkan
          </button>
        </form>
        <div className="mt-2 text-[12px] text-slate-500">
          Rentang kosong = seluruh data. Kolom mengikuti matriks server (per bulan).
        </div>
      </section>

      {/* Satu state per layar */}
      <section className="vsf-card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-[11px] uppercase tracking-[.14em] text-slate-500 font-bold">Matriks laporan</div>
          <span className="flex-1" />
          <button type="button" className="vsf-btn-secondary" onClick={() => void unduhCsv()} disabled={loading}>
            Unduh CSV
          </button>
        </div>

        {loading ? (
          <div className="mt-3 grid gap-2" role="status" aria-label="Memuat laporan">
            {[0, 1, 2].map((i) => (
              <div key={i} className="vsf-skeleton h-[40px] rounded-card" />
            ))}
          </div>
        ) : ditolak ? (
          <div className="mt-3 rounded-card border border-amber-500/50 bg-amber-50 px-4 py-5">
            <div className="text-[11px] uppercase tracking-[.14em] text-amber-800 font-bold">Akses terbatas</div>
            <p className="mt-2 text-[13px] leading-relaxed text-amber-900">
              Laporan hanya tersedia untuk <b>admin</b> dan <b>akun demo</b>. Peran petani dapat melihat
              progres tanam lewat menu “Tanam Saya”.
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
            <span className="inline-flex items-center gap-1.5"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0"><path d="M8 1.8 14.8 13.8H1.2L8 1.8Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/><path d="M8 6.4v3.1M8 11.5v.1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg> {failure.message}</span>
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
          <div className="mt-3 overflow-auto rounded-card border border-arutmin-border bg-white vsf-table">
            <table aria-label="Rekap tanam per bulan" className="w-full text-[13px]">
              <thead>
                <tr className="bg-arutmin-mint/25">
                  {KOLOM.map((h) => (
                    <th
                      key={h}
                      className="text-left px-3 py-2 text-[11px] uppercase tracking-[.12em] text-arutmin-forest border-b-2 border-arutmin-moss"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.periode} className="hover:bg-arutmin-mint/15">
                    <td className="px-3 py-2 font-semibold text-slate-900">{r.periode}</td>
                    <td className="px-3 py-2 text-slate-700">{angka(r.semai)}</td>
                    <td className="px-3 py-2 text-slate-700">{angka(r.remaja)}</td>
                    <td className="px-3 py-2 text-slate-700">{angka(r.dewasa)}</td>
                    <td className="px-3 py-2 text-slate-700">{angka(r.panen_kg)}</td>
                    <td className="px-3 py-2 text-slate-700">{angka(r.rata_ph)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
