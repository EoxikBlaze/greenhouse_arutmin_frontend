import { useMemo, useState } from 'react'
import clsx from 'clsx'
import { useApiList } from '../lib/crudApi'

/** Satu baris `list` dari GET /tanam (routes/tanam.js — UNION semai/peremajaan/pendewasaan). */
type TanamRow = {
  id: string | number
  tipe: string
  status?: string | null
  mulai?: string | null
  varietas?: string | null
  meja?: string | null
  jumlah_benih?: number | null
  jumlah_masuk?: number | null
}

const TIPE_LABEL: Record<string, string> = {
  semai: 'Penyemaian',
  peremajaan: 'Peremajaan',
  pendewasaan: 'Pendewasaan',
}

const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

function tgl(iso?: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`
}

function statusTone(status?: string | null): string {
  const s = String(status ?? '').toLowerCase()
  if (s === 'aktif') return 'border-arutmin-moss/50 bg-arutmin-mint/25 text-arutmin-forest'
  if (s === 'proses') return 'border-amber-500/60 bg-amber-50 text-amber-800'
  return 'border-arutmin-border2 bg-slate-50 text-slate-600'
}

function statusLabel(status?: string | null): string {
  const s = String(status ?? '').trim()
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : 'Tanpa status'
}

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

export default function TanamSayaPage() {
  const { rows, loading, error, reload } = useApiList<TanamRow>('/tanam')
  const [filter, setFilter] = useState('')

  const terfilter = useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) =>
      `${r.varietas ?? ''} ${r.meja ?? ''} ${TIPE_LABEL[r.tipe] ?? r.tipe} ${r.status ?? ''}`
        .toLowerCase()
        .includes(q),
    )
  }, [rows, filter])

  // GET /tanam dilayani semua role (index.js: semuaRole) — 403 tidak mungkin di sini,
  // sehingga error apa pun cukup ditampilkan apa adanya + Muat ulang.
  return (
    <div className="mx-auto max-w-[1180px] grid gap-4 vsf-stagger">
      {/* Ringkasan + pencarian */}
      <section className="vsf-card p-4">
        <div className="flex flex-wrap items-start gap-3">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-[.14em] text-slate-500 font-bold">Tanam aktif</div>
            <p className="mt-1 text-[13px] leading-relaxed text-slate-600">
              Gabungan batch semai, peremajaan, dan pendewasaan yang sedang berjalan — segar dari server.
            </p>
          </div>
          <span className="flex-1" />
          <span className="vsf-pill border-arutmin-moss bg-white text-arutmin-forest">
            {loading ? 'Memuat…' : `${rows.length} batch aktif`}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            className="vsf-input w-full sm:w-[260px]"
            placeholder="Cari varietas / meja / tahap"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            aria-label="Cari tanam aktif"
          />
          <span className="flex-1" />
          <button type="button" className="vsf-btn-secondary" onClick={reload}>
            Muat ulang
          </button>
        </div>
      </section>

      {/* Satu state per layar: loading → error → kosong → daftar */}
      <section className="vsf-card p-4">
        <div className="text-[11px] uppercase tracking-[.14em] text-slate-500 font-bold">Daftar tanam</div>

        {loading ? (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3" role="status" aria-label="Memuat daftar tanam">
            {[0, 1, 2].map((i) => (
              <div key={i} className="vsf-skeleton h-[132px] rounded-card" />
            ))}
          </div>
        ) : error ? (
          <div
            role="alert"
            className="vsf-banner mt-3 rounded-input border border-red-600/50 bg-red-50 px-3 py-3 text-[13px] text-red-700 flex flex-wrap items-center gap-3"
          >
            <span className="inline-flex items-center gap-1.5"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0"><path d="M8 1.8 14.8 13.8H1.2L8 1.8Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/><path d="M8 6.4v3.1M8 11.5v.1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg> {error}</span>
            <button type="button" className="vsf-input rounded-full font-semibold" onClick={reload}>
              Muat ulang
            </button>
          </div>
        ) : rows.length === 0 ? (
          <div className="mt-3 rounded-card border border-dashed border-arutmin-border p-8 text-center">
            <IlustrasiTanam />
            <div className="mt-3 font-bold text-slate-700">Belum ada tanam aktif</div>
            <div className="mx-auto mt-1 max-w-[440px] text-[13px] leading-relaxed text-slate-500">
              Begitu ada batch semai, peremajaan, atau pendewasaan yang berjalan, daftarnya tampil di sini
              lengkap dengan tahap dan tanggal mulainya.
            </div>
          </div>
        ) : terfilter.length === 0 ? (
          <div className="mt-3 rounded-card border border-dashed border-arutmin-border p-8 text-center">
            <div className="font-bold text-slate-700">Tidak ada hasil untuk pencarian ini</div>
            <div className="mt-1 text-[13px] text-slate-500">
              Coba kata kunci lain, atau bersihkan pencarian untuk melihat semua {rows.length} batch.
            </div>
            <button
              type="button"
              className="vsf-btn-secondary mt-3"
              onClick={() => setFilter('')}
            >
              Bersihkan pencarian
            </button>
          </div>
        ) : (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 vsf-stagger">
            {terfilter.map((t) => {
              const jumlah = t.tipe === 'semai' ? t.jumlah_benih : t.jumlah_masuk
              return (
                <article
                  key={`${t.tipe}-${t.id}`}
                  className="rounded-card border border-arutmin-border bg-white p-4 transition-all duration-200 hover:border-arutmin-moss/60"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-[15px] font-bold text-slate-900">{t.varietas || 'Tanaman'}</div>
                      <div className="mt-0.5 text-[12px] text-slate-500">
                        {TIPE_LABEL[t.tipe] ?? t.tipe} · #{t.id}
                      </div>
                    </div>
                    <span
                      className={clsx(
                        'inline-flex shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold',
                        statusTone(t.status),
                      )}
                    >
                      {statusLabel(t.status)}
                    </span>
                  </div>
                  <dl className="mt-3 grid gap-1.5 text-[13px]">
                    <div className="flex items-center justify-between gap-2">
                      <dt className="text-slate-500">Meja</dt>
                      <dd className="font-semibold text-slate-800">{t.meja || '—'}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <dt className="text-slate-500">Mulai</dt>
                      <dd className="font-semibold text-slate-800">{tgl(t.mulai)}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <dt className="text-slate-500">{t.tipe === 'semai' ? 'Jumlah benih' : 'Jumlah masuk'}</dt>
                      <dd className="font-semibold text-slate-800">
                        {typeof jumlah === 'number' ? jumlah : '—'}
                      </dd>
                    </div>
                  </dl>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
