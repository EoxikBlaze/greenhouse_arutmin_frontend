import clsx from 'clsx'
import { Link } from 'react-router-dom'
import { useApiObject } from '../lib/useApiObject'

/** Baris GET /watercontrol/status (routes/watercontrol.js) — dipakai sbg ringkasan katup. */
type Status = {
  id?: string | number
  command?: string | null
  mode?: string | null
  valve_state?: string | null
  updated_at?: string | null
}

const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

function tgl(iso?: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const jam = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  return `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()} · ${jam}`
}

/** Ilustrasi empty-state: botol nutrisi + tetesan (SVG, bukan emoji). */
function IlustrasiDosing() {
  return (
    <svg viewBox="0 0 170 110" className="mx-auto h-[100px] w-[152px]" aria-hidden="true" focusable="false">
      <ellipse cx="85" cy="100" rx="56" ry="7" fill="#E2E8DD" />
      {/* botol */}
      <path d="M62 44h30v46a10 10 0 0 1-10 10H72a10 10 0 0 1-10-10z" fill="#CFE2CE" stroke="#6B9D4A" strokeWidth="2" />
      <path d="M70 30h14v14H70z" fill="#fff" stroke="#6B9D4A" strokeWidth="2" />
      <path d="M67 24h20v8H67z" fill="#4C6A4B" />
      <path d="M62 62h30" stroke="#6B9D4A" strokeWidth="2" strokeDasharray="4 4" />
      {/* pompa / selang */}
      <path d="M104 36h22a8 8 0 0 1 8 8v40" fill="none" stroke="#4C6A4B" strokeWidth="3" strokeLinecap="round" />
      <rect x="100" y="26" width="14" height="20" rx="4" fill="#fff" stroke="#4C6A4B" strokeWidth="2" />
      {/* tetesan */}
      <path d="M134 66c4 5 6 8 6 11a6 6 0 0 1-12 0c0-3 2-6 6-11z" fill="#F59E0B" opacity=".85" />
      <path d="M40 60c0-6 4-9 4-9s4 3 4 9a4 4 0 0 1-8 0z" fill="#6B9D4A" opacity=".7" />
      <path d="M28 84h16M28 90h10" stroke="#E2E8DD" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

export default function DosingPage() {
  const { data, loading, error, reload } = useApiObject<Status>('/watercontrol/status')
  const aksesDitolak = !!error && /menu ini untuk pengelola|akses ditolak/i.test(error)

  return (
    <div className="mx-auto max-w-[1180px] grid gap-4 vsf-stagger">
      {/* Ringkas modul */}
      <section className="vsf-card p-4">
        <div className="flex flex-wrap items-start gap-3">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-[.14em] text-slate-500 font-bold">Dosing otomatis</div>
            <p className="mt-1 text-[13px] leading-relaxed text-slate-600">
              Injeksi nutrisi yang diatur sendiri: pompa dosing menambah larutan sesuai ambang TDS,
              dengan jeda dan batas harian agar botol nutrisi tidak habis mendadak.
            </p>
          </div>
          <span className="flex-1" />
          <span className="vsf-pill border-amber-500/60 bg-amber-50 text-amber-800">
            <span className="vsf-dot mr-1 h-[7px] w-[7px] rounded-full bg-amber-500" aria-hidden="true" />
            Menunggu integrasi API
          </span>
        </div>
      </section>

      {/* Layar jujur — modul memang belum punya endpoint */}
      <section className="vsf-card p-6">
        <div className="rounded-card border border-dashed border-arutmin-border px-4 py-8 text-center">
          <IlustrasiDosing />
          <div className="mx-auto mt-4 max-w-[560px]">
            <div className="text-[11px] uppercase tracking-[.14em] text-slate-500 font-bold">Status modul</div>
            <h2 className="mt-1.5 text-[17px] font-bold text-slate-900">
              Modul dosing otomatis belum punya endpoint API
            </h2>
            <p className="mt-2 text-[13px] leading-relaxed text-slate-600">
              Kontrak backend (<code className="rounded bg-arutmin-mint/60 px-1 py-0.5 text-[12px]">docs/openapi.yaml</code>)
              tidak memuat rute untuk status dosing, perintah injeksi, mode AUTO/MANUAL, ambang TDS, maupun
              log injeksi. Karena itu halaman ini <b>tidak menampilkan tombol atau angka simulasi</b> —
              semua yang tampil di bawah berasal dari server.
            </p>
            <ul className="mx-auto mt-3 max-w-[520px] list-disc space-y-1 pl-5 text-left text-[13px] text-slate-600">
              <li>Parameter racikan statis tersedia lewat modul Konfigurasi V2 (<code className="text-[12px]">GET /konfigurasi-dosis</code>, <code className="text-[12px]">GET /target-nutrisi</code>).</li>
              <li>Kendali katup &amp; pompa air yang sudah ada tetap di halaman Water Control.</li>
              <li>Begitu endpoint dosing masuk kontrak, layar kendali + log akan diaktifkan di halaman ini.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Ringkasan status katup — sumber nyata: GET /watercontrol/status */}
      <section className="vsf-card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-[.14em] text-slate-500 font-bold">
              Status terkait · Water Control
            </div>
            <div className="mt-1 text-[12px] text-slate-500">
              GET /watercontrol/status — modul dosing berbagi perangkat katup &amp; pompa dengan Water Control.
            </div>
          </div>
          <span className="flex-1" />
          <Link to="/watercontrol" className="vsf-btn-secondary">
            Buka Water Control
          </Link>
        </div>

        {loading ? (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3" role="status" aria-label="Memuat status katup">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="vsf-skeleton h-[86px] rounded-card" />
            ))}
          </div>
        ) : aksesDitolak ? (
          <div className="mt-3 rounded-card border border-amber-500/50 bg-amber-50 px-4 py-4 text-[13px] leading-relaxed text-amber-900">
            Ringkasan katup hanya untuk <b>admin</b> dan <b>akun demo</b>. Peran petani tidak memiliki akses
            ke modul Water Control — data sensor tetap dapat dilihat di menu Sensor Real-Time.
          </div>
        ) : error ? (
          <div
            role="alert"
            className="vsf-banner mt-3 rounded-input border border-red-600/50 bg-red-50 px-3 py-2 text-[13px] text-red-700 flex flex-wrap items-center gap-3"
          >
            <span className="inline-flex items-center gap-1.5"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0"><path d="M8 1.8 14.8 13.8H1.2L8 1.8Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/><path d="M8 6.4v3.1M8 11.5v.1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg> {error}</span>
            <button type="button" className="vsf-input rounded-full font-semibold" onClick={reload}>
              Muat ulang
            </button>
          </div>
        ) : !data ? (
          <div className="mt-3 rounded-card border border-dashed border-arutmin-border p-6 text-center">
            <div className="font-bold text-slate-700">Status katup belum tersedia</div>
            <div className="mt-1 text-[13px] text-slate-500">Server tidak mengirim data status.</div>
            <button type="button" className="vsf-btn-secondary mt-3" onClick={reload}>
              Muat ulang
            </button>
          </div>
        ) : (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 vsf-stagger">
            <div className="rounded-card border border-arutmin-border bg-white p-4">
              <div className="text-[11px] uppercase tracking-[.12em] text-slate-500">Katup</div>
              <div
                className={clsx(
                  'mt-1 text-[15px] font-bold',
                  String(data.valve_state ?? '').toUpperCase() === 'ON' ? 'text-arutmin-forest' : 'text-slate-700',
                )}
              >
                {data.valve_state ?? '—'}
              </div>
              <div className="text-[11px] text-slate-500">state katup tandon</div>
            </div>
            <div className="rounded-card border border-arutmin-border bg-white p-4">
              <div className="text-[11px] uppercase tracking-[.12em] text-slate-500">Mode</div>
              <div className="mt-1 text-[15px] font-bold text-slate-900">{data.mode ?? '—'}</div>
              <div className="text-[11px] text-slate-500">AUTO mengikuti ambang sensor</div>
            </div>
            <div className="rounded-card border border-arutmin-border bg-white p-4">
              <div className="text-[11px] uppercase tracking-[.12em] text-slate-500">Perintah terakhir</div>
              <div className="mt-1 text-[15px] font-bold text-slate-900">{data.command ?? '—'}</div>
              <div className="text-[11px] text-slate-500">tersimpan di server</div>
            </div>
            <div className="rounded-card border border-arutmin-border bg-white p-4">
              <div className="text-[11px] uppercase tracking-[.12em] text-slate-500">Diperbarui</div>
              <div className="mt-1 text-[15px] font-bold text-slate-900">{tgl(data.updated_at)}</div>
              <div className="text-[11px] text-slate-500">waktu server</div>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
