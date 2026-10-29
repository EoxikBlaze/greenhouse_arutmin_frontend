import { useEffect, useState } from 'react'
import clsx from 'clsx'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/authContext'
import { fieldError, useApiError, useApiList } from '../../lib/crudApi'
import type { Daftar } from '../../lib/dosing'
import { Ikon } from '../Ikon'
import { Segmen } from '../sensor/FilterBar'
import { DialogKaca, Kosong, Pesan, Rangka } from './DialogKaca'

/**
 * Target tiap penampung + preset nutrisi — routes/preset.js:
 *   GET/POST/PUT/DELETE /dosing/preset · GET /dosing/target · PUT /dosing/target/:id_meja · POST /dosing/sinkron
 * Preset = target EC/pH per tanaman × tahap × umur. Penampung Otomatis mengambil target dari preset yang cocok
 * dengan batch di mejanya; Manual = diisi admin.
 */

export type Preset = {
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

export type TargetMeja = {
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
const FILTER_TAHAP = ['Semua', ...TAHAP] as const
type FilterTahap = (typeof FILTER_TAHAP)[number]
const STATUS_LABEL: Record<string, string> = { aktif: 'Aktif', menunggu_konfirmasi: 'Menunggu konfirmasi', kadaluarsa: 'Kedaluwarsa' }

const n = (v: unknown): string => {
  if (v === null || v === undefined || v === '') return '—'
  const x = Number(v)
  return Number.isFinite(x) ? String(x).replace('.', ',') : String(v)
}
const rentang = (a: unknown, b: unknown): string => {
  if ((a === null || a === undefined || a === '') && (b === null || b === undefined || b === '')) return '—'
  return `${n(a)}–${n(b)}`
}

function useCatatan() {
  const [pesan, setPesan] = useState<string | null>(null)
  useEffect(() => {
    if (!pesan) return
    const id = window.setTimeout(() => setPesan(null), 4000)
    return () => window.clearTimeout(id)
  }, [pesan])
  return [pesan, setPesan] as const
}

/* ── Target tiap penampung ─────────────────────────────────────────── */
export function TargetPenampung({ data, onUbah }: { data: Daftar<TargetMeja>; onUbah: () => void }) {
  const { role } = useAuth()
  const bolehTulis = role === 'admin'
  const handleApiError = useApiError()
  const { rows, loading, error, reload } = data
  const [pesan, setPesan] = useCatatan()
  const [galat, setGalat] = useState<string | null>(null)
  const [sibuk, setSibuk] = useState<string | null>(null)
  const [manual, setManual] = useState<TargetMeja | null>(null)
  const [konfSinkron, setKonfSinkron] = useState(false)
  const [ec, setEc] = useState('')
  const [ph, setPh] = useState('')
  const [errs, setErrs] = useState<Record<string, string[]>>({})

  async function sinkron() {
    setSibuk('sinkron')
    setGalat(null)
    try {
      const r = await api.post('/dosing/sinkron', {})
      setPesan((r.data as { message?: string }).message ?? 'Target diperbarui.')
      setKonfSinkron(false)
      reload()
      onUbah()
    } catch (e) {
      setGalat(handleApiError(e).message)
      setKonfSinkron(false)
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
    <section className="vsf-card w-full min-w-0 p-4 sm:p-5" aria-label="Target tiap penampung">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 max-w-[720px] flex-1">
          <div className="vsf-judul-bagian">Target tiap penampung</div>
          <p className="mt-0.5 text-[13px] leading-relaxed text-abu">
            <b className="text-tinta">Otomatis</b>: target EC/pH mengikuti preset sesuai batch yang sedang berjalan.{' '}
            <b className="text-tinta">Manual</b>: target diisi admin dan tidak diubah sistem. Batas keselamatan dosing tetap berlaku.
          </p>
        </div>
        {bolehTulis && (
          <button type="button" className="vsf-btn-secondary" onClick={() => setKonfSinkron(true)} disabled={sibuk !== null}>
            <Ikon nama="siklus" className="h-4 w-4" />
            Sinkronkan sekarang
          </button>
        )}
      </div>

      {pesan && <Pesan jenis="ok">{pesan}</Pesan>}
      {galat && <Pesan jenis="galat" onTutup={() => setGalat(null)}>{galat}</Pesan>}
      {error && !loading && <Pesan jenis="galat">{error}</Pesan>}

      {loading && rows.length === 0 ? (
        <Rangka />
      ) : aktif.length === 0 ? (
        <Kosong>Belum ada meja dengan batch berjalan atau target.</Kosong>
      ) : (
        <ul className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {aktif.map((r) => (
            <li key={String(r.id_meja)} className={clsx('vsf-batch flex flex-col', r.status_lock && 'is-lock')}>
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-[16px] font-bold text-tinta">{r.meja}</div>
                  <div className="mt-0.5 text-[13px] text-abu">
                    {r.batch ? (
                      <>
                        <b className="text-tinta">{r.batch.nama_tanaman ?? 'Tanaman'}</b> · {r.batch.tahap} · umur {r.batch.umur_hari} hari
                        {r.batch.jumlah_batch > 1 ? ` · ${r.batch.jumlah_batch} batch` : ''}
                      </>
                    ) : (
                      'Tidak ada batch berjalan'
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className={clsx('vsf-chip-nilai', r.target_mode === 'otomatis' ? 'is-normal' : 'is-kosong')}>
                    {r.target_mode === 'otomatis' ? 'Otomatis' : 'Manual'}
                  </span>
                  {r.status_lock && <span className="vsf-chip-nilai is-luar">LOCK</span>}
                </div>
              </div>

              <dl className="mt-3 grid grid-cols-2 gap-2">
                <div className="vsf-stat">
                  <dt className="vsf-label">Target EC</dt>
                  <dd className="text-[17px] font-bold tabular-nums text-tinta">
                    {r.target_ec_ppm == null ? '—' : n(r.target_ec_ppm)}
                    {r.target_ec_ppm != null && <small className="ml-1 text-[12px] font-normal text-abu">ppm</small>}
                  </dd>
                </div>
                <div className="vsf-stat">
                  <dt className="vsf-label">Target pH</dt>
                  <dd className="text-[17px] font-bold tabular-nums text-tinta">{n(r.target_ph)}</dd>
                </div>
              </dl>

              <p className="mt-3 flex-1 text-[12.5px] leading-relaxed text-abu">
                {r.target_mode === 'otomatis' && r.naik_harian
                  ? r.naik_harian.tercapai
                    ? `Naik harian: target akhir ${n(r.naik_harian.ppm_target)} ppm tercapai, ditahan sampai panen.`
                    : `Naik harian: hari ke-${r.naik_harian.hari} dari ${r.naik_harian.hari_capai} (+${n(r.naik_harian.per_hari)} ppm/hari) menuju ${n(r.naik_harian.ppm_target)} ppm.`
                  : r.catatan ?? (r.target_preset_id ? `Dari preset #${r.target_preset_id}.` : '')}
              </p>
              {r.status_lock && r.lock_alasan && <div className="vsf-tone-warn mt-2 rounded-input px-2.5 py-1.5 text-[12px]">{r.lock_alasan}</div>}

              {bolehTulis && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" className="vsf-btn-secondary !min-h-[40px] !px-3 text-[13px]" onClick={() => bukaManual(r)} disabled={sibuk !== null}>
                    <Ikon nama="ubah" className="h-4 w-4" />
                    {r.target_mode === 'manual' ? 'Ubah manual' : 'Atur manual'}
                  </button>
                  {r.target_mode === 'manual' && (
                    <button type="button" className="vsf-btn-primary !min-h-[40px] !px-3 text-[13px]" onClick={() => void keOtomatis(r)} disabled={sibuk !== null}>
                      {sibuk === String(r.id_meja) ? 'Menyimpan…' : 'Kembali otomatis'}
                    </button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {konfSinkron && (
        <DialogKaca judul="Sinkronkan target?" onTutup={() => setKonfSinkron(false)} sibuk={sibuk === 'sinkron'}>
          <p className="mt-3 text-[13px] leading-relaxed text-abu">
            Target semua penampung <b className="text-tinta">Otomatis</b> dihitung ulang dari preset aktif dan batch yang sedang berjalan. Penampung{' '}
            <b className="text-tinta">Manual</b> tidak berubah.
          </p>
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <button type="button" className="vsf-btn-secondary" onClick={() => setKonfSinkron(false)} disabled={sibuk === 'sinkron'}>
              Batal
            </button>
            <button type="button" className="vsf-btn-primary" onClick={() => void sinkron()} disabled={sibuk === 'sinkron'}>
              {sibuk === 'sinkron' && <span className="vsf-spinner" aria-hidden />}
              {sibuk === 'sinkron' ? 'Menyinkronkan…' : 'Ya, sinkronkan'}
            </button>
          </div>
        </DialogKaca>
      )}

      {manual && (
        <DialogKaca
          judul="Target manual"
          sub={manual.meja}
          onTutup={() => setManual(null)}
          sibuk={sibuk === 'manual'}
          onSubmit={() => void simpanManual()}
        >
          <p className="mt-3 text-[13px] text-abu">Sistem tidak akan mengubah target ini sampai dikembalikan ke otomatis.</p>
          {[
            { k: 'target_ec_ppm', label: 'Target EC', satuan: 'ppm', v: ec, set: setEc, ph: '800', fokus: true },
            { k: 'target_ph', label: 'Target pH', satuan: 'pH', v: ph, set: setPh, ph: '6,0', fokus: false },
          ].map((f) => (
            <label key={f.k} className="mt-3 block">
              <span className="vsf-label !text-tinta">{f.label}</span>
              <span className="relative mt-1 block">
                <input
                  className="vsf-input w-full pr-14"
                  inputMode="decimal"
                  autoFocus={f.fokus}
                  value={f.v}
                  onChange={(e) => f.set(e.target.value)}
                  placeholder={f.ph}
                  aria-invalid={fieldError(errs, f.k) ? true : undefined}
                />
                <span className="vsf-suffix">{f.satuan}</span>
              </span>
              {fieldError(errs, f.k) && <div className="vsf-field-error">{fieldError(errs, f.k)}</div>}
            </label>
          ))}
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <button type="button" className="vsf-btn-secondary" onClick={() => setManual(null)} disabled={sibuk === 'manual'}>
              Batal
            </button>
            <button type="submit" className="vsf-btn-primary" disabled={sibuk === 'manual'}>
              {sibuk === 'manual' && <span className="vsf-spinner" aria-hidden />}
              {sibuk === 'manual' ? 'Menyimpan…' : 'Simpan manual'}
            </button>
          </div>
        </DialogKaca>
      )}
    </section>
  )
}

/* ── Preset nutrisi (template) ─────────────────────────────────────── */
type FormPreset = Record<'id_tanaman' | 'tahap' | 'umur_min_hari' | 'umur_max_hari' | 'ec_min_ppm' | 'ec_max_ppm' | 'ph_min' | 'ph_max' | 'status' | 'keterangan', string>
const KOSONG: FormPreset = {
  id_tanaman: '', tahap: 'Semai', umur_min_hari: '', umur_max_hari: '', ec_min_ppm: '', ec_max_ppm: '', ph_min: '', ph_max: '', status: 'aktif', keterangan: '',
}

export function PresetNutrisi({ data, onUbah }: { data: Daftar<Preset>; onUbah: () => void }) {
  const { role } = useAuth()
  const bolehTulis = role === 'admin'
  const handleApiError = useApiError()
  const { rows, loading, error, reload } = data
  const { rows: tanaman } = useApiList<TanamanMini>('/tanaman')
  const [tahap, setTahap] = useState<FilterTahap>('Semua')
  const [form, setForm] = useState<FormPreset | null>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [errs, setErrs] = useState<Record<string, string[]>>({})
  const [sibuk, setSibuk] = useState(false)
  const [pesan, setPesan] = useCatatan()
  const [galat, setGalat] = useState<string | null>(null)
  const [hapus, setHapus] = useState<Preset | null>(null)

  // desimal ditampilkan berkoma, sama dengan kartu (simpan() menerima koma maupun titik)
  const isi = (v: unknown) => (v === null || v === undefined ? '' : String(Number(v)).replace('.', ','))
  function buka(p: Preset | null) {
    setErrs({})
    setGalat(null)
    setEditId(p ? String(p.id) : null)
    setForm(
      p
        ? {
            id_tanaman: p.id_tanaman == null ? '' : String(p.id_tanaman), tahap: p.tahap,
            umur_min_hari: isi(p.umur_min_hari), umur_max_hari: isi(p.umur_max_hari),
            ec_min_ppm: isi(p.ec_min_ppm), ec_max_ppm: isi(p.ec_max_ppm), ph_min: isi(p.ph_min), ph_max: isi(p.ph_max),
            status: p.status, keterangan: p.keterangan ?? '',
          }
        : { ...KOSONG },
    )
  }

  async function simpan() {
    if (!form || sibuk) return
    setSibuk(true)
    setErrs({})
    setGalat(null)
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

  const tampil = rows.filter((p) => tahap === 'Semua' || p.tahap === tahap)

  const isian = (k: keyof FormPreset, label: string, contoh: string, satuan?: string) => (
    <label key={k} className="block">
      <span className="vsf-label !text-tinta">{label}</span>
      <span className="relative mt-1 block">
        <input
          className={clsx('vsf-input w-full', satuan && 'pr-14')}
          inputMode="decimal"
          value={form?.[k] ?? ''}
          placeholder={contoh}
          aria-invalid={fieldError(errs, k) ? true : undefined}
          onChange={(e) => setForm((f) => (f ? { ...f, [k]: e.target.value } : f))}
        />
        {satuan && <span className="vsf-suffix">{satuan}</span>}
      </span>
      {fieldError(errs, k) && <span className="vsf-field-error block">{fieldError(errs, k)}</span>}
    </label>
  )

  return (
    <section className="vsf-card w-full min-w-0 p-4 sm:p-5" aria-label="Preset nutrisi">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 max-w-[720px] flex-1">
          <div className="vsf-judul-bagian">Preset nutrisi</div>
          <p className="mt-0.5 text-[13px] leading-relaxed text-abu">
            Satu preset = rentang EC dan pH untuk satu tahap. Target penampung = titik tengah rentang. Hanya preset{' '}
            <b className="text-tinta">Aktif</b> yang dipakai; preset tanaman tertentu didahulukan dari “Semua tanaman”.
          </p>
        </div>
        {bolehTulis && (
          <button type="button" className="vsf-btn-primary" onClick={() => buka(null)}>
            <Ikon nama="tambah" className="h-4 w-4" />
            Tambah preset
          </button>
        )}
      </div>

      <div className="mt-3">
        <Segmen label="Filter tahap" pilihan={FILTER_TAHAP} nilai={tahap} onPilih={setTahap} />
      </div>

      {pesan && <Pesan jenis="ok">{pesan}</Pesan>}
      {galat && !form && <Pesan jenis="galat" onTutup={() => setGalat(null)}>{galat}</Pesan>}
      {error && !loading && <Pesan jenis="galat">{error}</Pesan>}

      {loading && rows.length === 0 ? (
        <Rangka />
      ) : tampil.length === 0 ? (
        <Kosong>{rows.length === 0 ? 'Belum ada preset.' : `Belum ada preset untuk tahap ${tahap}.`}</Kosong>
      ) : (
        <div className="vsf-daftar mt-4">
          {tampil.map((p) => (
            <div
              key={String(p.id)}
              className={clsx('vsf-param', p.status !== 'aktif' && 'is-kosong')}
              style={{ ['--kolom' as string]: 'minmax(0,1.3fr) minmax(90px,.7fr) minmax(0,.9fr) minmax(0,.9fr) minmax(0,1fr) auto' }}
            >
              <div className="vsf-param-sel">
                <b>{p.nama_tanaman ?? 'Semua tanaman'}</b>
                {p.keterangan && <span className="vsf-param-kode !font-sans">{p.keterangan}</span>}
              </div>
              <div className="vsf-param-sel">
                <span className="vsf-chip-nilai is-normal">{p.tahap}</span>
              </div>
              <div className="vsf-param-sel">
                <span className="vsf-param-label">Umur (hari)</span>
                <b className="tabular-nums">
                  {p.umur_min_hari == null && p.umur_max_hari == null ? 'Semua umur' : `${p.umur_min_hari ?? 0}–${p.umur_max_hari ?? '…'}`}
                </b>
              </div>
              <div className="vsf-param-sel">
                <span className="vsf-param-label">EC (ppm)</span>
                <b className="tabular-nums">{rentang(p.ec_min_ppm, p.ec_max_ppm)}</b>
              </div>
              <div className="vsf-param-sel">
                <span className="vsf-param-label">pH</span>
                <b className="tabular-nums">{rentang(p.ph_min, p.ph_max)}</b>
              </div>
              <div className="vsf-param-sel flex flex-wrap items-center gap-2 md:justify-end">
                <span className={clsx('vsf-chip-nilai', p.status === 'aktif' ? 'is-normal' : 'is-luar')}>{STATUS_LABEL[p.status] ?? p.status}</span>
                {bolehTulis && (
                  <>
                    <button type="button" className="vsf-btn-secondary !min-h-[40px] !px-3 text-[13px]" aria-label="Ubah preset" onClick={() => buka(p)}>
                      <Ikon nama="ubah" className="h-4 w-4" />
                      Ubah
                    </button>
                    <button type="button" className="vsf-btn-danger !min-h-[40px] !px-3 text-[13px]" aria-label="Hapus preset" onClick={() => setHapus(p)}>
                      <Ikon nama="hapus" className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {form && (
        <DialogKaca
          judul={editId ? 'Ubah preset' : 'Tambah preset nutrisi'}
          sub={editId ? `Preset #${editId}` : 'Rentang EC dan pH untuk satu tahap'}
          lebar={540}
          onTutup={() => setForm(null)}
          sibuk={sibuk}
          onSubmit={() => void simpan()}
        >
          {galat && (
            <div role="alert" className="vsf-banner vsf-tone-error mt-3 rounded-input px-3 py-2 text-[13px]">
              {galat}
            </div>
          )}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="col-span-2 block sm:col-span-1">
              <span className="vsf-label !text-tinta">Tanaman</span>
              <select className="vsf-input mt-1 w-full" value={form.id_tanaman} onChange={(e) => setForm({ ...form, id_tanaman: e.target.value })}>
                <option value="">Semua tanaman</option>
                {tanaman.map((t) => (
                  <option key={String(t.id_tanaman)} value={String(t.id_tanaman)}>{t.nama_tanaman}</option>
                ))}
              </select>
              {fieldError(errs, 'id_tanaman') && <span className="vsf-field-error block">{fieldError(errs, 'id_tanaman')}</span>}
            </label>
            <label className="col-span-2 block sm:col-span-1">
              <span className="vsf-label !text-tinta">Tahap</span>
              <select className="vsf-input mt-1 w-full" value={form.tahap} onChange={(e) => setForm({ ...form, tahap: e.target.value })}>
                {TAHAP.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              {fieldError(errs, 'tahap') && <span className="vsf-field-error block">{fieldError(errs, 'tahap')}</span>}
            </label>
            {isian('umur_min_hari', 'Umur dari (opsional)', '0', 'hari')}
            {isian('umur_max_hari', 'Umur sampai (opsional)', '14', 'hari')}
            {isian('ec_min_ppm', 'EC minimal', '600', 'ppm')}
            {isian('ec_max_ppm', 'EC maksimal', '800', 'ppm')}
            {isian('ph_min', 'pH minimal', '5,8')}
            {isian('ph_max', 'pH maksimal', '6,2')}
            <label className="col-span-2 block">
              <span className="vsf-label !text-tinta">Status</span>
              <select className="vsf-input mt-1 w-full" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
            <label className="col-span-2 block">
              <span className="vsf-label !text-tinta">Keterangan (opsional)</span>
              <input className="vsf-input mt-1 w-full" value={form.keterangan} onChange={(e) => setForm({ ...form, keterangan: e.target.value })} placeholder="mis. hasil uji lab Okt 2026" />
            </label>
          </div>
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <button type="button" className="vsf-btn-secondary" onClick={() => setForm(null)} disabled={sibuk}>
              Batal
            </button>
            <button type="submit" className="vsf-btn-primary" disabled={sibuk}>
              {sibuk && <span className="vsf-spinner" aria-hidden />}
              {sibuk ? 'Menyimpan…' : 'Simpan preset'}
            </button>
          </div>
        </DialogKaca>
      )}

      {hapus && (
        <DialogKaca judul="Hapus preset?" onTutup={() => setHapus(null)} sibuk={sibuk}>
          <p className="mt-3 text-[13px] leading-relaxed text-abu">
            Preset <b className="text-tinta">{hapus.nama_tanaman ?? 'Semua tanaman'} · {hapus.tahap}</b> dihapus. Penampung otomatis yang
            memakainya akan mencari preset lain; bila tidak ada, targetnya dikosongkan dan dosing otomatis diam.
          </p>
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <button type="button" className="vsf-btn-secondary" onClick={() => setHapus(null)} disabled={sibuk}>
              Batal
            </button>
            <button type="button" className="vsf-btn-danger" onClick={() => void konfirmasiHapus()} disabled={sibuk}>
              {sibuk ? 'Menghapus…' : 'Ya, hapus'}
            </button>
          </div>
        </DialogKaca>
      )}
    </section>
  )
}
