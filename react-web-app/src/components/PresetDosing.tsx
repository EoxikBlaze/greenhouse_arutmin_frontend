import { useEffect, useState, type ReactNode } from 'react'
import clsx from 'clsx'
import { api } from '../lib/api'
import { useAuth } from '../lib/authContext'
import { fieldError, useApiError, useApiList } from '../lib/crudApi'
import { ModalBackdrop } from './ModalBackdrop'

/**
 * Preset dosing (template) + target tiap penampung — routes/preset.js:
 *   GET/POST/PUT/DELETE /dosing/preset · GET /dosing/target · PUT /dosing/target/:id_meja · POST /dosing/sinkron
 * Preset = target EC/pH per tanaman × tahap × umur. Penampung bermode Otomatis mengambil target dari
 * preset yang cocok dengan batch yang sedang berjalan di mejanya; Manual = diisi admin.
 */

type Preset = {
  id: number | string
  id_tanaman: number | string | null
  nama_tanaman: string | null
  tahap: string
  umur_min_hari: number | null
  umur_max_hari: number | null
  ec_min_ppm: string | number | null
  ec_max_ppm: string | number | null
  ph_min: string | number | null
  ph_max: string | number | null
  status: string
  keterangan: string | null
}

type TargetMeja = {
  id_meja: number | string
  meja: string
  target_mode: 'otomatis' | 'manual'
  target_ec_ppm: string | number | null
  target_ph: string | number | null
  target_preset_id: number | string | null
  target_diperbarui: string | null
  status_lock: boolean
  lock_alasan: string | null
  mode_pemeliharaan: boolean
  batch: { tahap: string; id: number | string; nama_tanaman: string | null; umur_hari: number; jumlah: number | null; jumlah_batch: number } | null
  preset_cocok: { id: number | string } | null
  naik_harian: { hari: number; hari_capai: number; per_hari: number; target_hari_ini: number; ppm_target: number; tercapai: boolean } | null
  catatan: string | null
}

type TanamanMini = { id_tanaman: number | string; nama_tanaman: string }

const TAHAP = ['Semai', 'Peremajaan', 'Pendewasaan']
const STATUS_LABEL: Record<string, string> = { aktif: 'Aktif', menunggu_konfirmasi: 'Menunggu konfirmasi', kadaluarsa: 'Kedaluwarsa' }

const n = (v: unknown): string => {
  if (v === null || v === undefined || v === '') return '—'
  const x = Number(v)
  return Number.isFinite(x) ? String(x).replace('.', ',') : String(v)
}
const rentang = (a: unknown, b: unknown, satuan = ''): string => {
  if ((a === null || a === undefined || a === '') && (b === null || b === undefined || b === '')) return '—'
  return `${n(a)}–${n(b)}${satuan}`
}

function Head({ children }: { children: ReactNode }) {
  return (
    <th scope="col" className="border-b border-navy/25 px-4 py-2.5 text-left text-[12px] font-bold uppercase tracking-[.14em] text-navy">
      {children}
    </th>
  )
}

function Banner({ jenis, children, onTutup }: { jenis: 'ok' | 'galat'; children: ReactNode; onTutup?: () => void }) {
  return (
    <div
      role={jenis === 'galat' ? 'alert' : 'status'}
      className={clsx(
        'vsf-banner mt-3 flex flex-wrap items-center gap-3 rounded-input border px-3 py-2 text-[13px]',
        jenis === 'galat' ? 'vsf-tone-error' : 'border-arutmin-moss/50 bg-arutmin-mint/40 text-arutmin-forest',
      )}
    >
      <span className="flex-1">{children}</span>
      {onTutup && (
        <button type="button" className="vsf-input rounded-full font-semibold" onClick={onTutup}>
          Tutup
        </button>
      )}
    </div>
  )
}

/* ── Target tiap penampung ─────────────────────────────────────────── */
export function TargetPenampung({ versi, onUbah }: { versi: number; onUbah: () => void }) {
  const { role } = useAuth()
  const bolehTulis = role === 'admin'
  const handleApiError = useApiError()
  const { rows, loading, error, reload } = useApiList<TargetMeja>(`/dosing/target?v=${versi}`)
  const [pesan, setPesan] = useState<string | null>(null)
  const [galat, setGalat] = useState<string | null>(null)
  const [sibuk, setSibuk] = useState<string | null>(null)
  const [manual, setManual] = useState<TargetMeja | null>(null)
  const [ec, setEc] = useState('')
  const [ph, setPh] = useState('')
  const [errs, setErrs] = useState<Record<string, string[]>>({})

  useEffect(() => {
    if (!pesan) return
    const id = window.setTimeout(() => setPesan(null), 4000)
    return () => window.clearTimeout(id)
  }, [pesan])

  async function sinkron() {
    setSibuk('sinkron')
    setGalat(null)
    try {
      const r = await api.post('/dosing/sinkron', {})
      setPesan((r.data as { message?: string }).message ?? 'Target diperbarui.')
      reload()
      onUbah()
    } catch (e) {
      setGalat(handleApiError(e).message)
    } finally {
      setSibuk(null)
    }
  }

  async function keOtomatis(r: TargetMeja) {
    setSibuk(String(r.id_meja))
    setGalat(null)
    try {
      const res = await api.put(`/dosing/target/${r.id_meja}`, { mode: 'otomatis' })
      setPesan(`${r.meja}: ${(res.data as { message?: string }).message ?? 'target otomatis.'}`)
      reload()
    } catch (e) {
      setGalat(handleApiError(e).message)
    } finally {
      setSibuk(null)
    }
  }

  function bukaManual(r: TargetMeja) {
    setManual(r)
    setEc(r.target_ec_ppm == null ? '' : String(Number(r.target_ec_ppm)))
    setPh(r.target_ph == null ? '' : String(Number(r.target_ph)).replace('.', ','))
    setErrs({})
  }

  async function simpanManual() {
    if (!manual) return
    setSibuk('manual')
    try {
      await api.put(`/dosing/target/${manual.id_meja}`, {
        mode: 'manual',
        target_ec_ppm: ec.trim() === '' ? null : Number(ec.replace(',', '.')),
        target_ph: ph.trim() === '' ? null : Number(ph.replace(',', '.')),
      })
      setPesan(`${manual.meja}: target manual disimpan.`)
      setManual(null)
      reload()
    } catch (e) {
      const f = handleApiError(e)
      setErrs(f.fieldErrors)
      if (!Object.keys(f.fieldErrors).length) setGalat(f.message)
    } finally {
      setSibuk(null)
    }
  }

  const aktif = rows.filter((r) => r.batch || r.target_mode === 'manual' || r.target_ec_ppm != null)

  return (
    <section className="vsf-card w-full min-w-0 p-4 sm:p-5">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 max-w-[720px]">
          <div className="text-[12px] uppercase tracking-[.14em] text-slate-500 font-bold">Target tiap penampung</div>
          <p className="mt-1 text-[13px] leading-relaxed text-slate-600">
            Mode <b>Otomatis</b>: target EC/pH diambil dari preset yang cocok dengan tanaman, tahap, dan umur batch
            yang sedang berjalan di meja itu, lalu ikut berganti saat tahap berpindah. Mode <b>Manual</b>: target
            diisi admin dan tidak diubah sistem. Pagar keselamatan dosing tetap berlaku di kedua mode.
          </p>
        </div>
        <span className="flex-1" />
        {bolehTulis && (
          <button type="button" className="vsf-btn-secondary" onClick={() => void sinkron()} disabled={sibuk !== null}>
            {sibuk === 'sinkron' ? 'Menyinkronkan…' : 'Sinkronkan sekarang'}
          </button>
        )}
      </div>

      {pesan && <Banner jenis="ok">{pesan}</Banner>}
      {galat && <Banner jenis="galat" onTutup={() => setGalat(null)}>{galat}</Banner>}
      {error && !loading && <Banner jenis="galat">{error}</Banner>}

      <div className="mt-3 w-full min-w-0 overflow-x-auto rounded-card border border-arutmin-border bg-white vsf-table">
        <table aria-label="Target tiap penampung" className="w-full text-[13px]">
          <thead>
            <tr className="bg-navy/[.055]">
              <Head>Meja</Head>
              <Head>Batch berjalan</Head>
              <Head>Mode</Head>
              <Head>Target EC</Head>
              <Head>Target pH</Head>
              <Head>Keterangan</Head>
              {bolehTulis && <Head>Aksi</Head>}
            </tr>
          </thead>
          <tbody>
            {loading && rows.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-3"><div className="vsf-skeleton h-5 w-full rounded" /></td></tr>
            ) : aktif.length === 0 ? (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-slate-500">Belum ada meja dengan batch berjalan atau target.</td></tr>
            ) : (
              aktif.map((r) => (
                <tr key={String(r.id_meja)} className="even:bg-navy/[.03]">
                  <td className="px-4 py-2.5 font-semibold text-slate-900">
                    {r.meja}
                    {r.status_lock && <span className="ml-2 vsf-pill vsf-tone-error">LOCK</span>}
                  </td>
                  <td className="px-4 py-2.5 text-slate-700">
                    {r.batch ? (
                      <>
                        <b className="text-slate-900">{r.batch.nama_tanaman ?? 'Tanaman'}</b> · {r.batch.tahap}
                        <div className="text-[12px] text-slate-600">umur {r.batch.umur_hari} hari{r.batch.jumlah_batch > 1 ? ` · ${r.batch.jumlah_batch} batch di meja ini` : ''}</div>
                      </>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={clsx('vsf-pill', r.target_mode === 'otomatis'
                      ? 'border-arutmin-moss bg-arutmin-mint/50 text-arutmin-forest'
                      : 'border-navy/25 bg-navy/[.05] text-navy')}>
                      {r.target_mode === 'otomatis' ? 'Otomatis' : 'Manual'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 tabular-nums font-semibold text-slate-900">{r.target_ec_ppm == null ? '—' : `${n(r.target_ec_ppm)} ppm`}</td>
                  <td className="px-4 py-2.5 tabular-nums font-semibold text-slate-900">{n(r.target_ph)}</td>
                  <td className="min-w-[220px] px-4 py-2.5 text-[12.5px] text-slate-600">
                    {r.target_mode === 'otomatis' && r.naik_harian
                      ? (r.naik_harian.tercapai
                        ? `Naik harian: target akhir ${n(r.naik_harian.ppm_target)} ppm tercapai, ditahan sampai panen.`
                        : `Naik harian: hari ke-${r.naik_harian.hari} dari ${r.naik_harian.hari_capai} (+${n(r.naik_harian.per_hari)} ppm/hari) menuju ${n(r.naik_harian.ppm_target)} ppm.`)
                      : r.catatan ?? (r.target_preset_id ? `Dari preset #${r.target_preset_id}.` : '—')}
                  </td>
                  {bolehTulis && (
                    <td className="px-4 py-2.5">
                      <span className="flex flex-wrap gap-2">
                        <button type="button" className="vsf-btn-secondary min-h-[44px] sm:min-h-[36px] px-3 py-1 text-[13px]" onClick={() => bukaManual(r)} disabled={sibuk !== null}>
                          {r.target_mode === 'manual' ? 'Ubah manual' : 'Atur manual'}
                        </button>
                        {r.target_mode === 'manual' && (
                          <button type="button" className="vsf-btn-primary min-h-[44px] sm:min-h-[36px] px-3 py-1 text-[13px]" onClick={() => void keOtomatis(r)} disabled={sibuk !== null}>
                            {sibuk === String(r.id_meja) ? 'Menyimpan…' : 'Kembali otomatis'}
                          </button>
                        )}
                      </span>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {manual && (
        <ModalBackdrop onMouseDown={(e) => { if (e.target === e.currentTarget && sibuk === null) setManual(null) }}>
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="vsf-manual-judul"
            className="w-full max-w-[420px] rounded-card bg-white p-5 vsf-modal-card"
            onSubmit={(e) => { e.preventDefault(); void simpanManual() }}
            onKeyDown={(e) => { if (e.key === 'Escape' && sibuk === null) setManual(null) }}
          >
            <div id="vsf-manual-judul" className="text-[12px] uppercase tracking-[.14em] font-bold text-slate-500">Target manual · {manual.meja}</div>
            <p className="mt-2 text-[13px] text-slate-600">Sistem tidak akan mengubah target ini sampai dikembalikan ke otomatis.</p>
            <label className="mt-3 block text-[13px] font-semibold text-slate-700">
              Target EC (ppm)
              <input className="vsf-input mt-1 w-full" inputMode="decimal" value={ec} autoFocus onChange={(e) => setEc(e.target.value)} placeholder="800" />
            </label>
            {fieldError(errs, 'target_ec_ppm') && <div className="vsf-field-error">{fieldError(errs, 'target_ec_ppm')}</div>}
            <label className="mt-3 block text-[13px] font-semibold text-slate-700">
              Target pH
              <input className="vsf-input mt-1 w-full" inputMode="decimal" value={ph} onChange={(e) => setPh(e.target.value)} placeholder="6,0" />
            </label>
            {fieldError(errs, 'target_ph') && <div className="vsf-field-error">{fieldError(errs, 'target_ph')}</div>}
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="vsf-btn-secondary" onClick={() => setManual(null)} disabled={sibuk !== null}>Batal</button>
              <button type="submit" className="vsf-btn-primary" disabled={sibuk !== null}>{sibuk === 'manual' ? 'Menyimpan…' : 'Simpan manual'}</button>
            </div>
          </form>
        </ModalBackdrop>
      )}
    </section>
  )
}

/* ── Preset nutrisi (template) ─────────────────────────────────────── */
type FormPreset = Record<'id_tanaman' | 'tahap' | 'umur_min_hari' | 'umur_max_hari' | 'ec_min_ppm' | 'ec_max_ppm' | 'ph_min' | 'ph_max' | 'status' | 'keterangan', string>
const KOSONG: FormPreset = {
  id_tanaman: '', tahap: 'Semai', umur_min_hari: '', umur_max_hari: '', ec_min_ppm: '', ec_max_ppm: '', ph_min: '', ph_max: '', status: 'aktif', keterangan: '',
}

export function PresetNutrisi({ onUbah }: { onUbah: () => void }) {
  const { role } = useAuth()
  const bolehTulis = role === 'admin'
  const handleApiError = useApiError()
  const { rows, loading, error, reload } = useApiList<Preset>('/dosing/preset')
  const { rows: tanaman } = useApiList<TanamanMini>('/tanaman')
  const [form, setForm] = useState<FormPreset | null>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [errs, setErrs] = useState<Record<string, string[]>>({})
  const [sibuk, setSibuk] = useState(false)
  const [pesan, setPesan] = useState<string | null>(null)
  const [galat, setGalat] = useState<string | null>(null)
  const [hapus, setHapus] = useState<Preset | null>(null)

  useEffect(() => {
    if (!pesan) return
    const id = window.setTimeout(() => setPesan(null), 4000)
    return () => window.clearTimeout(id)
  }, [pesan])

  // desimal ditampilkan berkoma, sama dengan tabel (simpan() menerima koma maupun titik)
  const isi = (v: unknown) => (v === null || v === undefined ? '' : String(Number(v)).replace('.', ','))
  function buka(p: Preset | null) {
    setErrs({})
    setGalat(null)
    setEditId(p ? String(p.id) : null)
    setForm(p ? {
      id_tanaman: p.id_tanaman == null ? '' : String(p.id_tanaman), tahap: p.tahap,
      umur_min_hari: isi(p.umur_min_hari), umur_max_hari: isi(p.umur_max_hari),
      ec_min_ppm: isi(p.ec_min_ppm), ec_max_ppm: isi(p.ec_max_ppm), ph_min: isi(p.ph_min), ph_max: isi(p.ph_max),
      status: p.status, keterangan: p.keterangan ?? '',
    } : { ...KOSONG })
  }

  async function simpan() {
    if (!form || sibuk) return
    setSibuk(true)
    setErrs({})
    const angka = (s: string) => (s.trim() === '' ? null : Number(s.replace(',', '.')))
    const body = {
      id_tanaman: form.id_tanaman ? Number(form.id_tanaman) : null,
      tahap: form.tahap,
      umur_min_hari: angka(form.umur_min_hari), umur_max_hari: angka(form.umur_max_hari),
      ec_min_ppm: angka(form.ec_min_ppm), ec_max_ppm: angka(form.ec_max_ppm),
      ph_min: angka(form.ph_min), ph_max: angka(form.ph_max),
      status: form.status, keterangan: form.keterangan.trim() || null,
    }
    try {
      if (editId) await api.put(`/dosing/preset/${editId}`, body)
      else await api.post('/dosing/preset', body)
      setPesan(editId ? 'Preset diperbarui — target penampung otomatis ikut disesuaikan.' : 'Preset tersimpan — target penampung otomatis ikut disesuaikan.')
      setForm(null)
      reload()
      window.setTimeout(onUbah, 600)
    } catch (e) {
      const f = handleApiError(e)
      setErrs(f.fieldErrors)
      if (!Object.keys(f.fieldErrors).length) setGalat(f.message)
    } finally {
      setSibuk(false)
    }
  }

  async function konfirmasiHapus() {
    if (!hapus || sibuk) return
    setSibuk(true)
    try {
      await api.delete(`/dosing/preset/${hapus.id}`)
      setPesan('Preset dihapus.')
      setHapus(null)
      reload()
      onUbah()
    } catch (e) {
      setGalat(handleApiError(e).message)
      setHapus(null)
    } finally {
      setSibuk(false)
    }
  }

  const Isian = ({ k, label, ph: contoh, lebar = 'w-full' }: { k: keyof FormPreset; label: string; ph?: string; lebar?: string }) => (
    <label className="block text-[13px] font-semibold text-slate-700">
      {label}
      <input
        className={clsx('vsf-input mt-1', lebar)}
        inputMode="decimal"
        value={form?.[k] ?? ''}
        placeholder={contoh}
        onChange={(e) => setForm((f) => (f ? { ...f, [k]: e.target.value } : f))}
      />
      {fieldError(errs, k) && <span className="vsf-field-error block font-normal">{fieldError(errs, k)}</span>}
    </label>
  )

  return (
    <section className="vsf-card w-full min-w-0 p-4 sm:p-5">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 max-w-[720px]">
          <div className="text-[12px] uppercase tracking-[.14em] text-slate-500 font-bold">Preset nutrisi (template)</div>
          <p className="mt-1 text-[13px] leading-relaxed text-slate-600">
            Satu preset = rentang EC dan pH untuk satu tahap, berlaku untuk satu tanaman atau semua tanaman, dan bisa
            dibatasi umur (hari sejak semai). Target penampung = titik tengah rentang. Hanya preset berstatus
            <b> Aktif</b> yang dipakai; preset tanaman tertentu didahulukan dari preset semua tanaman.
          </p>
        </div>
        <span className="flex-1" />
        {bolehTulis && (
          <button type="button" className="vsf-btn-primary" onClick={() => buka(null)}>+ Tambah preset</button>
        )}
      </div>

      {pesan && <Banner jenis="ok">{pesan}</Banner>}
      {galat && <Banner jenis="galat" onTutup={() => setGalat(null)}>{galat}</Banner>}
      {error && !loading && <Banner jenis="galat">{error}</Banner>}

      <div className="mt-3 w-full min-w-0 overflow-x-auto rounded-card border border-arutmin-border bg-white vsf-table">
        <table aria-label="Preset nutrisi per tanaman dan tahap" className="w-full text-[13px]">
          <thead>
            <tr className="bg-navy/[.055]">
              <Head>Tanaman</Head>
              <Head>Tahap</Head>
              <Head>Umur (hari)</Head>
              <Head>EC (ppm)</Head>
              <Head>pH</Head>
              <Head>Status</Head>
              {bolehTulis && <Head>Aksi</Head>}
            </tr>
          </thead>
          <tbody>
            {loading && rows.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-3"><div className="vsf-skeleton h-5 w-full rounded" /></td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-slate-500">Belum ada preset.</td></tr>
            ) : (
              rows.map((p) => (
                <tr key={String(p.id)} className="even:bg-navy/[.03]">
                  <td className="px-4 py-2.5 font-semibold text-slate-900">{p.nama_tanaman ?? 'Semua tanaman'}</td>
                  <td className="px-4 py-2.5">{p.tahap}</td>
                  <td className="px-4 py-2.5 tabular-nums">
                    {p.umur_min_hari == null && p.umur_max_hari == null ? 'semua umur' : `${p.umur_min_hari ?? 0}–${p.umur_max_hari ?? '…'}`}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums font-semibold text-slate-900">{rentang(p.ec_min_ppm, p.ec_max_ppm)}</td>
                  <td className="px-4 py-2.5 tabular-nums font-semibold text-slate-900">{rentang(p.ph_min, p.ph_max)}</td>
                  <td className="px-4 py-2.5">
                    <span className={clsx('vsf-pill', p.status === 'aktif'
                      ? 'border-arutmin-moss bg-arutmin-mint/50 text-arutmin-forest'
                      : 'vsf-tone-warn')}>
                      {STATUS_LABEL[p.status] ?? p.status}
                    </span>
                  </td>
                  {bolehTulis && (
                    <td className="px-4 py-2.5">
                      <span className="flex flex-wrap gap-2">
                        <button type="button" className="vsf-btn-secondary min-h-[44px] sm:min-h-[36px] px-3 py-1 text-[13px]" onClick={() => buka(p)}>Ubah</button>
                        <button type="button" className="vsf-btn-danger min-h-[44px] sm:min-h-[36px] px-3 py-1 text-[13px]" onClick={() => setHapus(p)}>Hapus</button>
                      </span>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {form && (
        <ModalBackdrop onMouseDown={(e) => { if (e.target === e.currentTarget && !sibuk) setForm(null) }}>
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="vsf-preset-judul"
            className="w-full max-w-[520px] rounded-card bg-white p-5 vsf-modal-card max-h-[90vh] overflow-auto"
            onSubmit={(e) => { e.preventDefault(); void simpan() }}
            onKeyDown={(e) => { if (e.key === 'Escape' && !sibuk) setForm(null) }}
          >
            <div id="vsf-preset-judul" className="text-[12px] uppercase tracking-[.14em] font-bold text-slate-500">
              {editId ? `Ubah preset #${editId}` : 'Tambah preset nutrisi'}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="col-span-2 block text-[13px] font-semibold text-slate-700 sm:col-span-1">
                Tanaman
                <select className="vsf-input mt-1 w-full" value={form.id_tanaman} onChange={(e) => setForm({ ...form, id_tanaman: e.target.value })}>
                  <option value="">Semua tanaman</option>
                  {tanaman.map((t) => <option key={String(t.id_tanaman)} value={String(t.id_tanaman)}>{t.nama_tanaman}</option>)}
                </select>
                {fieldError(errs, 'id_tanaman') && <span className="vsf-field-error block font-normal">{fieldError(errs, 'id_tanaman')}</span>}
              </label>
              <label className="col-span-2 block text-[13px] font-semibold text-slate-700 sm:col-span-1">
                Tahap
                <select className="vsf-input mt-1 w-full" value={form.tahap} onChange={(e) => setForm({ ...form, tahap: e.target.value })}>
                  {TAHAP.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                {fieldError(errs, 'tahap') && <span className="vsf-field-error block font-normal">{fieldError(errs, 'tahap')}</span>}
              </label>
              {Isian({ k: 'umur_min_hari', label: 'Umur dari (hari, opsional)', ph: '0' })}
              {Isian({ k: 'umur_max_hari', label: 'Umur sampai (hari, opsional)', ph: '14' })}
              {Isian({ k: 'ec_min_ppm', label: 'EC minimal (ppm)', ph: '600' })}
              {Isian({ k: 'ec_max_ppm', label: 'EC maksimal (ppm)', ph: '800' })}
              {Isian({ k: 'ph_min', label: 'pH minimal', ph: '5,8' })}
              {Isian({ k: 'ph_max', label: 'pH maksimal', ph: '6,2' })}
              <label className="col-span-2 block text-[13px] font-semibold text-slate-700">
                Status
                <select className="vsf-input mt-1 w-full" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </label>
              <label className="col-span-2 block text-[13px] font-semibold text-slate-700">
                Keterangan (opsional)
                <input className="vsf-input mt-1 w-full" value={form.keterangan} onChange={(e) => setForm({ ...form, keterangan: e.target.value })} placeholder="mis. hasil uji lab Okt 2026" />
              </label>
            </div>
            {galat && <Banner jenis="galat">{galat}</Banner>}
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="vsf-btn-secondary" onClick={() => setForm(null)} disabled={sibuk}>Batal</button>
              <button type="submit" className="vsf-btn-primary" disabled={sibuk}>{sibuk ? 'Menyimpan…' : 'Simpan preset'}</button>
            </div>
          </form>
        </ModalBackdrop>
      )}

      {hapus && (
        <ModalBackdrop onMouseDown={(e) => { if (e.target === e.currentTarget && !sibuk) setHapus(null) }}>
          <div role="dialog" aria-modal="true" aria-labelledby="vsf-hapus-preset" className="w-full max-w-[420px] rounded-card bg-white p-5 vsf-modal-card">
            <div id="vsf-hapus-preset" className="text-[15px] font-bold text-slate-900">Hapus preset?</div>
            <p className="mt-2 text-[13px] text-slate-600">
              Preset <b>{hapus.nama_tanaman ?? 'Semua tanaman'} · {hapus.tahap}</b> dihapus. Penampung otomatis yang memakainya akan
              mencari preset lain; bila tidak ada, targetnya dikosongkan dan dosing otomatis diam.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="vsf-btn-secondary" onClick={() => setHapus(null)} disabled={sibuk}>Batal</button>
              <button type="button" className="vsf-btn-danger" onClick={() => void konfirmasiHapus()} disabled={sibuk}>{sibuk ? 'Menghapus…' : 'Ya, hapus'}</button>
            </div>
          </div>
        </ModalBackdrop>
      )}
    </section>
  )
}
