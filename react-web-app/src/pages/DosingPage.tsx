import { useEffect, useState, type ReactNode } from 'react'
import clsx from 'clsx'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { fieldError, useApiError, useApiList } from '../lib/crudApi'
import { useApiObject } from '../lib/useApiObject'
import { PresetNutrisi, TargetPenampung } from '../components/PresetDosing'
import { NaikHarian } from '../components/NaikHarian'
import { Ikon } from '../components/Ikon'
import { PageHeader } from '../components/PageHeader'

/**
 * Dosing otomatis — terhubung ke endpoint KONFIGURASI V2 riil (routes/konfigurasi.js):
 *   GET  /konfigurasi-dosis   → parameter racikan (19 baris)   PUT /konfigurasi-dosis/:param  (admin)
 *   GET  /timing-operasi      → timing operasi   (16 baris)    PUT /timing-operasi/:param     (admin)
 *   GET  /aturan-fail-safe    → aturan fail-safe (20 baris, baca saja)
 *   GET  /jadwal-perawatan    → jadwal perawatan (5 baris, baca saja)
 *   /dosing/preset & /dosing/target → preset nutrisi (template) + target tiap penampung (routes/preset.js)
 * Semua nilai di layar berasal dari server — tidak ada angka simulasi.
 * Ringkasan katup tetap dari GET /watercontrol/status (perangkat berbagi).
 */

/** Baris GET /konfigurasi-dosis & /timing-operasi — PK `param`, `nilai` numeric dari pg. */
type ParameterRow = {
  param: string
  nilai: string | number
  satuan: string | null
  keterangan: string | null
  sumber: string | null
  diubah_pada?: string | null
}

/** Baris GET /aturan-fail-safe — PK `kode`, tanpa stempel waktu. */
type FailSafeRow = {
  kode: string
  kondisi: string
  aksi: string
  ambang: string | number | null
  satuan: string | null
  aktif: boolean | null
  sumber: string | null
}

/** Baris GET /jadwal-perawatan — PK `kode`. */
type JadwalRow = {
  kode: string
  periode: string
  periode_hari: number | null
  kegiatan: string
  lama_menit: number | null
  sumber: string | null
}

/** Baris GET /watercontrol/status (routes/watercontrol.js) — ringkasan katup. */
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

/** numeric pg datang sebagai string ("20.0000") → tampil ringkas, tetap jujur. */
function tampilNilai(v: string | number | null | undefined): string {
  if (v === null || v === undefined || v === '') return '—'
  const n = Number(v)
  return Number.isFinite(n) ? String(n) : String(v)
}

function Head({ children }: { children: ReactNode }) {
  return (
    <th
      scope="col"
      className="border-b border-navy/25 px-4 py-2.5 text-left text-[12px] font-bold uppercase tracking-[.14em] text-navy"
    >
      {children}
    </th>
  )
}

/** Banner error kontrak (satu gaya dengan halaman lain). */
function Galat({ pesan, onTutup }: { pesan: string; onTutup: () => void }) {
  return (
    <div
      role="alert"
      className="vsf-banner mb-3 rounded-input vsf-tone-error px-3 py-2 text-[13px] flex flex-wrap items-center gap-3"
    >
      <span className="inline-flex items-center gap-1.5">
        <Ikon nama="peringatan" className="h-4 w-4" />
        {pesan}
      </span>
      <button type="button" className="vsf-input rounded-full font-semibold" onClick={onTutup}>
        Tutup
      </button>
    </div>
  )
}

/**
 * Tabel parameter V2 dengan EDIT inline → PUT <path>/:param { nilai }.
 * Kolom lain (satuan/keterangan/sumber) ikut terbaca dari GET daftar.
 */
function TabelParameter({
  judul,
  sumber,
  path,
  rows,
  loading,
  error,
  reload,
}: {
  judul: string
  sumber: string
  path: string
  rows: ParameterRow[]
  loading: boolean
  error: string | null
  reload: () => void
}) {
  const handleApiError = useApiError()
  const [edit, setEdit] = useState<ParameterRow | null>(null)
  const [nilai, setNilai] = useState('')
  const [sedangSimpan, setSedangSimpan] = useState(false)
  const [galat, setGalat] = useState<string | null>(null)
  const [catatan, setCatatan] = useState<string | null>(null)

  useEffect(() => {
    if (!catatan) return
    const id = window.setTimeout(() => setCatatan(null), 4000)
    return () => window.clearTimeout(id)
  }, [catatan])

  function bukaEdit(row: ParameterRow) {
    setEdit(row)
    setNilai(tampilNilai(row.nilai) === '—' ? '' : tampilNilai(row.nilai))
    setGalat(null)
    setCatatan(null)
  }

  async function simpan() {
    if (!edit || sedangSimpan) return
    const teks = nilai.trim()
    const n = Number(teks)
    if (!teks || !Number.isFinite(n)) {
      setGalat('Nilai harus berupa angka (gunakan titik untuk desimal).')
      return
    }
    if (n < 0) {
      setGalat('Nilai tidak boleh negatif.')
      return
    }
    setSedangSimpan(true)
    setGalat(null)
    try {
      await api.put(`${path}/${encodeURIComponent(edit.param)}`, { nilai: n })
      setCatatan(`${edit.param} diperbarui menjadi ${n}.`)
      setEdit(null)
      reload()
    } catch (err) {
      const f = handleApiError(err)
      setGalat(fieldError(f.fieldErrors, 'nilai') ?? f.message)
      if (f.status === 404) {
        setEdit(null)
        reload()
      }
    } finally {
      setSedangSimpan(false)
    }
  }

  const kosong = !loading && !error && rows.length === 0

  return (
    <section className="vsf-card w-full min-w-0 p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0">
          <div className="vsf-judul-bagian">{judul}</div>
          <div className="mt-1 text-[12px] text-slate-500">
            <code className="rounded bg-arutmin-mint/60 px-1 py-0.5 text-[12px] text-slate-700">GET {path}</code>
            {' · '}
            <code className="rounded bg-arutmin-mint/60 px-1 py-0.5 text-[12px] text-slate-700">PUT {path}/:param</code>
            {' — '}
            {sumber}
          </div>
        </div>
        <span className="flex-1" />
        <span className="vsf-pill border-arutmin-moss bg-white text-arutmin-forest">
          {loading ? 'Memuat…' : `${rows.length} baris`}
        </span>
        <button type="button" className="vsf-btn-secondary" onClick={reload} disabled={loading}>
          Muat ulang
        </button>
      </div>

      {galat && <div className="mt-3"><Galat pesan={galat} onTutup={() => setGalat(null)} /></div>}
      {catatan && (
        <div className="vsf-banner mt-3 rounded-input border border-arutmin-moss/50 bg-arutmin-mint/40 px-3 py-2 text-[13px] text-arutmin-forest">
          {catatan}
        </div>
      )}

      {error && !loading ? (
        <div
          role="alert"
          className="mt-3 rounded-card vsf-tone-error px-4 py-3 text-[13px]"
        >
          {error}
        </div>
      ) : null}

      <div className="mt-3 w-full min-w-0 overflow-x-auto rounded-card border border-arutmin-border bg-white vsf-table">
        <table aria-label="Parameter dosing" className="w-full text-[13px]">
          <thead>
            <tr className="bg-navy/[.055]">
              <Head>Parameter</Head>
              <Head>Nilai</Head>
              <Head>Satuan</Head>
              <Head>Keterangan</Head>
              <Head>Aksi</Head>
            </tr>
          </thead>
          <tbody>
            {loading && rows.length === 0 ? (
              [0, 1, 2, 3].map((i) => (
                <tr key={i}>
                  <td colSpan={5} className="px-4 py-3">
                    <div className="vsf-skeleton h-5 w-full rounded" />
                  </td>
                </tr>
              ))
            ) : kosong ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-slate-500">
                  Server belum mengirim baris parameter untuk modul ini.
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const sedangEdit = edit?.param === r.param
                return (
                  <tr key={r.param} className="even:bg-navy/[.03] hover:bg-navy/[.06] transition-colors">
                    <td className="px-4 py-2.5 font-semibold text-slate-900">{r.param}</td>
                    <td className="px-4 py-2.5 tabular-nums">
                      {sedangEdit ? (
                        <input
                          className="vsf-input w-32 text-[13px]"
                          value={nilai}
                          inputMode="decimal"
                          autoFocus
                          aria-label={`Nilai ${r.param}`}
                          onChange={(e) => setNilai(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') void simpan()
                            if (e.key === 'Escape') setEdit(null)
                          }}
                        />
                      ) : (
                        <b className="text-slate-900">{tampilNilai(r.nilai)}</b>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-slate-700">{r.satuan ?? '—'}</td>
                    <td className="min-w-[240px] px-4 py-2.5 text-slate-700">{r.keterangan ?? '—'}</td>
                    <td className="px-4 py-2.5">
                      {sedangEdit ? (
                        <span className="flex items-center gap-2">
                          <button
                            type="button"
                            className="vsf-btn-primary min-h-[44px] sm:min-h-[36px] px-3 py-1 text-[13px]"
                            onClick={() => void simpan()}
                            disabled={sedangSimpan}
                          >
                            {sedangSimpan ? 'Menyimpan…' : 'Simpan'}
                          </button>
                          <button
                            type="button"
                            className="vsf-btn-secondary min-h-[44px] sm:min-h-[36px] px-3 py-1 text-[13px]"
                            onClick={() => setEdit(null)}
                            disabled={sedangSimpan}
                          >
                            Batal
                          </button>
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="vsf-btn-secondary min-h-[44px] sm:min-h-[36px] px-3 py-1 text-[13px]"
                          onClick={() => bukaEdit(r)}
                        >
                          Ubah
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-2 text-[12px] text-slate-500">
        Perubahan nilai disimpan lewat <code className="rounded bg-arutmin-mint/60 px-1 py-0.5 text-[12px] text-slate-700">PUT {path}/:param</code>{' '}
        (hanya kolom <b>nilai</b> yang dikirim — satuan, keterangan, dan stempel waktu tidak ikut diubah).
      </div>
    </section>
  )
}

export default function DosingPage() {
  const dosis = useApiList<ParameterRow>('/konfigurasi-dosis')
  const timing = useApiList<ParameterRow>('/timing-operasi')
  const failSafe = useApiList<FailSafeRow>('/aturan-fail-safe')
  const jadwal = useApiList<JadwalRow>('/jadwal-perawatan')
  const { data, loading, error, reload } = useApiObject<Status>('/watercontrol/status')
  const aksesDitolak = !!error && /menu ini untuk pengelola|akses ditolak/i.test(error)
  // naik setiap preset/target diubah → tabel target memuat ulang
  const [versiTarget, setVersiTarget] = useState(0)
  const ubahTarget = () => setVersiTarget((v) => v + 1)

  return (
    <div className="vsf-halaman vsf-stagger">
      {/* Ringkas modul — sumber daya nyata */}
      <PageHeader
        judul="Dosing otomatis"
        deskripsi={
          <>
            Injeksi nutrisi yang diatur sendiri: target EC/pH tiap penampung diambil otomatis dari
            <b> preset nutrisi</b> sesuai tanaman, tahap, dan umur batch di meja itu, lalu pompa dosing
            mengejarnya dengan jeda dan batas harian. Parameter, timing, aturan fail-safe, dan jadwal
            perawatan di bawah diambil langsung dari modul Konfigurasi V2.
          </>
        }
        aksi={
          <span className="vsf-pill border-arutmin-moss/50 bg-arutmin-mint/40 text-arutmin-forest">
            <span className="vsf-dot mr-1 h-[7px] w-[7px] rounded-full bg-arutmin-forest" aria-hidden="true" />
            Terhubung · Konfigurasi V2
          </span>
        }
      />

      <TargetPenampung versi={versiTarget} onUbah={ubahTarget} />
      <NaikHarian />
      <PresetNutrisi onUbah={ubahTarget} />

      <TabelParameter
        judul="Parameter dosing"
        sumber="parameter racikan statis (angka, satuan, keterangan, sumber rancangan)"
        path="/konfigurasi-dosis"
        rows={dosis.rows}
        loading={dosis.loading}
        error={dosis.error}
        reload={dosis.reload}
      />

      <TabelParameter
        judul="Timing operasi"
        sumber="durasi & jeda operasi pompa, sensor, dan pengisian"
        path="/timing-operasi"
        rows={timing.rows}
        loading={timing.loading}
        error={timing.error}
        reload={timing.reload}
      />

      {/* Aturan fail-safe — baca saja (tidak ada endpoint tulis di kontrak V2) */}
      <section className="vsf-card w-full min-w-0 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0">
            <div className="vsf-judul-bagian">Aturan fail-safe</div>
            <div className="mt-1 text-[12px] text-slate-500">
              <code className="rounded bg-arutmin-mint/60 px-1 py-0.5 text-[12px] text-slate-700">GET /aturan-fail-safe</code>
              {' — perlindungan darurat (E-STOP, ambang EC, jatah kejadian dosing). Baca saja.'}
            </div>
          </div>
          <span className="flex-1" />
          <span className="vsf-pill border-arutmin-moss bg-white text-arutmin-forest">
            {failSafe.loading ? 'Memuat…' : `${failSafe.rows.length} baris`}
          </span>
        </div>
        {failSafe.error && !failSafe.loading ? (
          <div role="alert" className="mt-3 rounded-card vsf-tone-error px-4 py-3 text-[13px]">
            {failSafe.error}
          </div>
        ) : (
          <div className="mt-3 w-full min-w-0 overflow-x-auto rounded-card border border-arutmin-border bg-white vsf-table">
            <table aria-label="Aturan fail-safe" className="w-full text-[13px]">
              <thead>
                <tr className="bg-navy/[.055]">
                  <Head>Kode</Head>
                  <Head>Kondisi</Head>
                  <Head>Aksi</Head>
                  <Head>Ambang</Head>
                  <Head>Status</Head>
                </tr>
              </thead>
              <tbody>
                {failSafe.loading && failSafe.rows.length === 0 ? (
                  [0, 1, 2].map((i) => (
                    <tr key={i}>
                      <td colSpan={5} className="px-4 py-3">
                        <div className="vsf-skeleton h-5 w-full rounded" />
                      </td>
                    </tr>
                  ))
                ) : failSafe.rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-slate-500">
                      Server belum mengirim baris aturan fail-safe.
                    </td>
                  </tr>
                ) : (
                  failSafe.rows.map((r) => (
                    <tr key={r.kode} className="even:bg-navy/[.03] hover:bg-navy/[.06] transition-colors">
                      <td className="px-4 py-2.5 font-semibold text-slate-900">{r.kode}</td>
                      <td className="min-w-[220px] px-4 py-2.5 text-slate-700">{r.kondisi}</td>
                      <td className="min-w-[260px] px-4 py-2.5 text-slate-700">{r.aksi}</td>
                      <td className="px-4 py-2.5 tabular-nums text-slate-700">
                        {r.ambang == null ? '—' : `${tampilNilai(r.ambang)}${r.satuan ? ` ${r.satuan}` : ''}`}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={clsx(
                            'vsf-pill border-arutmin-moss/50 px-2 py-0.5 text-[12px]',
                            r.aktif ? 'bg-arutmin-mint/40 text-arutmin-forest' : 'bg-slate-100 text-slate-600',
                          )}
                        >
                          {r.aktif ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Jadwal perawatan — baca saja */}
      <section className="vsf-card w-full min-w-0 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0">
            <div className="vsf-judul-bagian">Jadwal perawatan</div>
            <div className="mt-1 text-[12px] text-slate-500">
              <code className="rounded bg-arutmin-mint/60 px-1 py-0.5 text-[12px] text-slate-700">GET /jadwal-perawatan</code>
              {' — kegiatan kalibrasi & pembersihan berkala. Baca saja.'}
            </div>
          </div>
          <span className="flex-1" />
          <span className="vsf-pill border-arutmin-moss bg-white text-arutmin-forest">
            {jadwal.loading ? 'Memuat…' : `${jadwal.rows.length} baris`}
          </span>
        </div>
        {jadwal.error && !jadwal.loading ? (
          <div role="alert" className="mt-3 rounded-card vsf-tone-error px-4 py-3 text-[13px]">
            {jadwal.error}
          </div>
        ) : (
          <div className="mt-3 w-full min-w-0 overflow-x-auto rounded-card border border-arutmin-border bg-white vsf-table">
            <table aria-label="Jadwal perawatan" className="w-full text-[13px]">
              <thead>
                <tr className="bg-navy/[.055]">
                  <Head>Periode</Head>
                  <Head>Kegiatan</Head>
                  <Head>Setiap</Head>
                  <Head>Lama</Head>
                </tr>
              </thead>
              <tbody>
                {jadwal.loading && jadwal.rows.length === 0 ? (
                  [0, 1, 2].map((i) => (
                    <tr key={i}>
                      <td colSpan={4} className="px-4 py-3">
                        <div className="vsf-skeleton h-5 w-full rounded" />
                      </td>
                    </tr>
                  ))
                ) : jadwal.rows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-8 text-center text-slate-500">
                      Server belum mengirim baris jadwal perawatan.
                    </td>
                  </tr>
                ) : (
                  jadwal.rows.map((r) => (
                    <tr key={r.kode} className="even:bg-navy/[.03] hover:bg-navy/[.06] transition-colors">
                      <td className="px-4 py-2.5 font-semibold text-slate-900">{r.periode}</td>
                      <td className="min-w-[300px] px-4 py-2.5 text-slate-700">{r.kegiatan}</td>
                      <td className="px-4 py-2.5 tabular-nums text-slate-700">
                        {r.periode_hari == null ? '—' : `${r.periode_hari} hari`}
                      </td>
                      <td className="px-4 py-2.5 tabular-nums text-slate-700">
                        {r.lama_menit == null ? '—' : `${r.lama_menit} menit`}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Ringkasan status katup — sumber nyata: GET /watercontrol/status */}
      <section className="vsf-card w-full min-w-0 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <div className="vsf-judul-bagian">
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
            className="vsf-banner mt-3 rounded-input vsf-tone-error px-3 py-2 text-[13px] flex flex-wrap items-center gap-3"
          >
            <span className="inline-flex items-center gap-1.5"><Ikon nama="peringatan" className="h-4 w-4" /> {error}</span>
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
              <div className="vsf-label">Katup</div>
              <div
                className={clsx(
                  'mt-1 text-[15px] font-bold',
                  String(data.valve_state ?? '').toUpperCase() === 'ON' ? 'text-arutmin-forest' : 'text-slate-700',
                )}
              >
                {data.valve_state ?? '—'}
              </div>
              <div className="text-[12px] text-slate-500">state katup tandon</div>
            </div>
            <div className="rounded-card border border-arutmin-border bg-white p-4">
              <div className="vsf-label">Mode</div>
              <div className="mt-1 text-[15px] font-bold text-slate-900">{data.mode ?? '—'}</div>
              <div className="text-[12px] text-slate-500">AUTO mengikuti ambang sensor</div>
            </div>
            <div className="rounded-card border border-arutmin-border bg-white p-4">
              <div className="vsf-label">Perintah terakhir</div>
              <div className="mt-1 text-[15px] font-bold text-slate-900">{data.command ?? '—'}</div>
              <div className="text-[12px] text-slate-500">tersimpan di server</div>
            </div>
            <div className="rounded-card border border-arutmin-border bg-white p-4">
              <div className="vsf-label">Diperbarui</div>
              <div className="mt-1 text-[15px] font-bold text-slate-900">{tgl(data.updated_at)}</div>
              <div className="text-[12px] text-slate-500">waktu server</div>
            </div>
          </div>
        )}
      </section>

      {/* Sumber data — transparan */}
      <section className="vsf-card w-full min-w-0 p-4 sm:p-5">
        <div className="vsf-judul-bagian">Sumber data layar ini</div>
        <ul className="mt-2 grid gap-1.5 text-[13px] leading-relaxed text-slate-700">
          <li><code className="rounded bg-arutmin-mint/60 px-1 py-0.5 text-[12px] text-slate-700">GET/PUT /konfigurasi-dosis</code> — parameter dosing (bisa diubah admin).</li>
          <li><code className="rounded bg-arutmin-mint/60 px-1 py-0.5 text-[12px] text-slate-700">GET/PUT /timing-operasi</code> — timing operasi (bisa diubah admin).</li>
          <li><code className="rounded bg-arutmin-mint/60 px-1 py-0.5 text-[12px] text-slate-700">GET /aturan-fail-safe</code> dan <code className="rounded bg-arutmin-mint/60 px-1 py-0.5 text-[12px] text-slate-700">GET /jadwal-perawatan</code> — baca saja.</li>
          <li><code className="rounded bg-arutmin-mint/60 px-1 py-0.5 text-[12px] text-slate-700">GET /watercontrol/status</code> — ringkasan katup &amp; pompa.</li>
        </ul>
      </section>
    </div>
  )
}
