import { useEffect, useState, type ReactNode } from 'react'
import { api } from '../lib/api'
import { fieldError, useApiError, useApiList } from '../lib/crudApi'
import { Field, FieldError } from '../components/CrudScreen'
import { useAuth } from '../lib/authContext'
import { useApiObject } from '../lib/useApiObject'
import { angkaMaks } from '../lib/format'
import {
  AksiBaris,
  DialogHapusMaster,
  DialogMaster,
  MasterFrame,
  TabelMaster,
  type HapusTarget,
  type KolomMaster,
} from '../components/master/MasterKit'
import { SENSOR_INFO } from '../lib/sensorInfo'

/** Definisi satu field: dipakai bersama oleh kolom tabel DAN input form. */
type FieldDef = {
  key: string
  label: string
  header: string
  placeholder: string
  kind: 'text' | 'int' | 'num' | 'select'
  /** false = kolom fisik opsional (migrasi 2026-10-19) — hanya tampil bila dikirim backend. */
  core: boolean
  options?: string[]
}

function cell(v: unknown): string {
  return v === undefined || v === null || String(v).trim() === '' ? '—' : String(v)
}

function present(rows: Array<Record<string, unknown>>, key: string): boolean {
  return rows.some((r) => {
    const v = r[key]
    return v !== undefined && v !== null && String(v).trim() !== ''
  })
}

/** Form terkontrol: kunci = field yang sedang diedit. */
type FormState = Record<string, string>

function inputFor(
  def: FieldDef,
  value: string,
  onChange: (v: string) => void,
  extraOptions: string[] = [],
): ReactNode {
  if (def.kind === 'select') {
    const opts = Array.from(new Set([...(def.options ?? []), ...extraOptions]))
    return (
      <select className="vsf-input w-full" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">— pilih —</option>
        {opts.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    )
  }
  if (def.kind === 'int' || def.kind === 'num') {
    return (
      <input
        className="vsf-input w-full"
        type="number"
        inputMode="decimal"
        step={def.kind === 'int' ? 1 : 'any'}
        placeholder={def.placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    )
  }
  return (
    <input
      className="vsf-input w-full"
      placeholder={def.placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

/* ============= 11 · JENIS TANAMAN — API NYATA ============= */

/**
 * Baris GET /tanaman — DUA resep tanaman (per hari & per siklus) + pH (migrasi 2026-11-19_01).
 * Cara yang dipakai dipilih saat Mulai Semai; resep disalin ke batch lalu dipakai server untuk target ke alat.
 */
type TanamanRow = Record<string, unknown> & {
  id_tanaman: string | number
  nama_tanaman: string
  id_meja: string | number | null
  ppm_awal?: string | number | null
  ppm_target?: string | number | null
  hari_capai?: number | null
  ppm_semai?: number | null
  ppm_peremajaan?: number | null
  ppm_pendewasaan?: number | null
  ph_min?: string | number | null
  ph_max?: string | number | null
}

const KOLOM_HARIAN = ['ppm_awal', 'ppm_target', 'hari_capai'] as const
const KOLOM_TAHAP = ['ppm_semai', 'ppm_peremajaan', 'ppm_pendewasaan'] as const
const KOLOM_RESEP = [...KOLOM_HARIAN, ...KOLOM_TAHAP, 'ph_min', 'ph_max'] as const

const isi = (v: unknown) => (v == null ? '' : String(v))
const angkaForm = (v: string | undefined) => {
  const t = (v ?? '').trim().replace(',', '.')
  return t === '' ? null : Number(t)
}

/**
 * Validasi klien: tiap resep diisi lengkap atau dikosongkan semua, minimal satu resep lengkap, pH wajib.
 * Batas rentang tetap dijaga Zod + CHECK backend (422 per-field).
 */
function validateTanaman(form: FormState): Record<string, string[]> {
  const errs: Record<string, string[]> = {}
  if (!(form.nama_tanaman ?? '').trim()) errs.nama_tanaman = ['Nama tanaman wajib diisi.']
  const lengkap = (kolom: readonly string[]) => kolom.every((k) => angkaForm(form[k]) != null)
  const kosong = (kolom: readonly string[]) => kolom.every((k) => angkaForm(form[k]) == null)
  for (const kolom of [KOLOM_HARIAN, KOLOM_TAHAP]) {
    if (!lengkap(kolom) && !kosong(kolom)) for (const k of kolom) if (angkaForm(form[k]) == null) errs[k] = ['Lengkapi, atau kosongkan semua.']
  }
  if (kosong(KOLOM_HARIAN) && kosong(KOLOM_TAHAP)) errs.ppm_awal = ['Isi minimal satu resep: per hari atau per siklus.']
  if ((angkaForm(form.ppm_awal) ?? 0) > (angkaForm(form.ppm_target) ?? Infinity)) errs.ppm_target = ['ppm akhir harus ≥ ppm awal.']
  const phMin = angkaForm(form.ph_min)
  const phMax = angkaForm(form.ph_max)
  if (phMin == null) errs.ph_min = ['Wajib diisi.']
  if (phMax == null) errs.ph_max = ['Wajib diisi.']
  else if (phMin != null && phMax - phMin < 0.2) errs.ph_max = ['pH maks harus ≥ pH min + 0,2.']
  return errs
}

/** Body PUT/POST /tanaman: kolom kosong dikirim null (resep boleh dikosongkan). */
function payloadTanaman(form: FormState): Record<string, unknown> {
  const payload: Record<string, unknown> = { nama_tanaman: (form.nama_tanaman ?? '').trim() }
  for (const k of KOLOM_RESEP) payload[k] = angkaForm(form[k])
  return payload
}

function ringkasHarian(r: TanamanRow): string | null {
  if (r.ppm_awal == null) return null
  return `${angkaMaks(Number(r.ppm_awal), 0)} → ${angkaMaks(Number(r.ppm_target), 0)} ppm / ${isi(r.hari_capai)} hari`
}
function ringkasSiklus(r: TanamanRow): string | null {
  if (r.ppm_semai == null) return null
  return `${r.ppm_semai} → ${r.ppm_peremajaan} → ${r.ppm_pendewasaan} ppm`
}

export function JenisTanamanPage() {
  const handleApiError = useApiError()
  const { rows, loading, error, reload } = useApiList<TanamanRow>('/tanaman')
  // batas alert TDS (Ambang Sensor) — hanya untuk peringatan di form
  const { data: naik } = useApiObject<{ ambang_tds: { min: number; max: number } | null }>('/dosing/naik-harian')
  const maksAmbang = naik?.ambang_tds?.max ?? null

  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>({})
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [hapus, setHapus] = useState<HapusTarget | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const [flash, setFlash] = useState<string | null>(null)
  useEffect(() => {
    if (!flash) return
    const id = setTimeout(() => setFlash(null), 4000)
    return () => clearTimeout(id)
  }, [flash])

  function resetForm() {
    setForm({})
    setEditingId(null)
    setFieldErrors({})
    setFormError(null)
  }

  function buka(row: TanamanRow | null) {
    setForm({
      nama_tanaman: isi(row?.nama_tanaman),
      ...Object.fromEntries(KOLOM_RESEP.map((k) => [k, k.startsWith('ph_') && row?.[k] != null ? isi(Number(row[k])).replace('.', ',') : isi(row?.[k])])),
    })
    setEditingId(row ? String(row.id_tanaman) : null)
    setFieldErrors({})
    setFormError(null)
    setOpen(true)
  }

  async function save() {
    if (submitting) return
    setFormError(null)
    const errs = validateTanaman(form)
    setFieldErrors(errs)
    if (Object.keys(errs).length > 0) return

    setSubmitting(true)
    try {
      const payload = payloadTanaman(form)
      if (editingId) await api.put(`/tanaman/${editingId}`, payload)
      else await api.post('/tanaman', payload)
      setOpen(false)
      resetForm()
      setFlash('Data tanaman tersimpan. Batch yang sedang berjalan tetap memakai resep lamanya.')
      reload()
    } catch (err) {
      const f = handleApiError(err)
      setFieldErrors(f.fieldErrors)
      setFormError(f.message)
      if (f.status === 404) reload()
    } finally {
      setSubmitting(false)
    }
  }

  async function remove(id: string) {
    if (deleting) return
    setDeleting(true)
    setDeleteError(null)
    try {
      await api.delete(`/tanaman/${id}`)
      setHapus(null)
      setFlash('Data tanaman dihapus.')
      reload()
    } catch (err) {
      const f = handleApiError(err)
      setDeleteError(f.message)
      if (f.status === 404) reload()
    } finally {
      setDeleting(false)
    }
  }

  const { demo } = useAuth()
  const columns: KolomMaster<TanamanRow>[] = [
    {
      key: 'nama',
      header: 'Nama tanaman',
      render: (r) => (
        <>
          <b className="text-tinta">{cell(r.nama_tanaman)}</b>
          <small className="vsf-master-id">ID {String(r.id_tanaman)}</small>
        </>
      ),
    },
    {
      key: 'per-hari',
      header: 'Naik per hari',
      render: (r) => {
        const t = ringkasHarian(r)
        return t ? <span className="vsf-master-chip">{t}</span> : <span className="vsf-master-chip is-kosong">Belum diatur</span>
      },
    },
    {
      key: 'per-siklus',
      header: 'Per siklus (Semai → Peremajaan → Pendewasaan)',
      render: (r) => {
        const t = ringkasSiklus(r)
        return t ? <span className="vsf-master-chip">{t}</span> : <span className="vsf-master-chip is-kosong">Belum diatur</span>
      },
    },
    {
      key: 'ph',
      header: 'Rentang pH',
      render: (r) =>
        r.ph_min == null ? (
          <span className="vsf-master-chip is-kosong">Belum diatur</span>
        ) : (
          <span className="vsf-master-chip">
            {String(Number(r.ph_min)).replace('.', ',')}–{String(Number(r.ph_max)).replace('.', ',')}
          </span>
        ),
    },
  ]
  const tutup = () => {
    setOpen(false)
    resetForm()
  }
  const ubah = (k: string) => (e: { target: { value: string } }) => setForm((s) => ({ ...s, [k]: e.target.value }))
  const kotak = (k: string, label: string, contoh: string) => (
    <Field key={k} label={label}>
      <input className="vsf-input w-full" inputMode="decimal" placeholder={contoh} value={form[k] ?? ''} onChange={ubah(k)} />
      <FieldError message={fieldError(fieldErrors, k)} />
    </Field>
  )
  const ppmTertinggi = Math.max(...[...KOLOM_TAHAP, 'ppm_target'].map((k) => angkaForm(form[k]) ?? 0))

  return (
    <>
      <MasterFrame
        judul="Jenis Tanaman"
        deskripsi="Resep tiap tanaman: kenaikan nutrisi per hari dan per siklus, serta rentang pH. Cara yang dipakai dipilih saat Mulai Semai."
        jumlah={`${rows.length} jenis`}
        tambah="Tambah"
        onTambah={() => buka(null)}
        flash={flash}
      >
        <TabelMaster
          label="Jenis Tanaman"
          kolom={columns}
          rows={rows}
          rowKey={(r) => String(r.id_tanaman)}
          memuat={loading}
          galat={error}
          onUlang={reload}
          kosong="Belum ada jenis tanaman — tambah yang pertama untuk memulai."
          aksi={(r) => (
            <AksiBaris
              nama={cell(r.nama_tanaman)}
              terkunci={demo}
              onUbah={() => buka(r)}
              onHapus={() => {
                setDeleteError(null)
                setHapus({ label: cell(r.nama_tanaman), id: String(r.id_tanaman) })
              }}
            />
          )}
        />
      </MasterFrame>
      {open && (
        <DialogMaster
          judul={editingId ? 'Ubah Jenis Tanaman' : 'Tambah Jenis Tanaman'}
          sub="Durasi tiap tahap diatur di menu Siklus."
          galat={formError}
          menyimpan={submitting}
          onTutup={tutup}
          onSimpan={() => void save()}
        >
          <Field label="Nama tanaman">
            <input className="vsf-input w-full" placeholder="Melon" value={form.nama_tanaman ?? ''} onChange={ubah('nama_tanaman')} />
            <FieldError message={fieldError(fieldErrors, 'nama_tanaman')} />
          </Field>

          <fieldset className="mt-4 border-t border-black/10 pt-3">
            <legend className="text-[12px] font-bold text-slate-700">Resep naik per hari</legend>
            <p className="mt-1 text-[12px] leading-relaxed text-slate-600">
              Saat Semai ppm = ppm awal. Sejak pindah netpot ppm naik rata tiap hari sampai ppm akhir pada hari ke-N, lalu ditahan sampai panen.
            </p>
            <div className="mt-2 grid gap-3 sm:grid-cols-3">
              {[kotak('ppm_awal', 'ppm awal', '400'), kotak('ppm_target', 'ppm akhir', '1200'), kotak('hari_capai', 'Dicapai hari ke- (sejak netpot)', '30')]}
            </div>
          </fieldset>

          <fieldset className="mt-4 border-t border-black/10 pt-3">
            <legend className="text-[12px] font-bold text-slate-700">Resep per siklus</legend>
            <p className="mt-1 text-[12px] leading-relaxed text-slate-600">ppm dijaga tetap selama satu tahap, lalu naik ke angka tahap berikutnya.</p>
            <div className="mt-2 grid gap-3 sm:grid-cols-3">
              {[kotak('ppm_semai', 'Semai (ppm)', '300'), kotak('ppm_peremajaan', 'Peremajaan (ppm)', '700'), kotak('ppm_pendewasaan', 'Pendewasaan (ppm)', '1100')]}
            </div>
            <p className="mt-2 text-[12px] text-slate-600">Isi salah satu atau keduanya. Petani memilih cara yang dipakai saat Mulai Semai.</p>
            {maksAmbang != null && ppmTertinggi > maksAmbang && (
              <p role="alert" className="mt-2 text-[12px] text-amber-800">
                Melewati batas aman nutrisi di Ambang Sensor ({angkaMaks(maksAmbang, 0)} ppm); peringatan akan menyala saat target tercapai.
              </p>
            )}
          </fieldset>

          <fieldset className="mt-4 border-t border-black/10 pt-3">
            <legend className="text-[12px] font-bold text-slate-700">Rentang pH</legend>
            <p className="mt-1 text-[12px] text-slate-600">Dijaga alat selama tanam (4,0–8,5; selisih minimal 0,2).</p>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              {[kotak('ph_min', 'pH min', '5,5'), kotak('ph_max', 'pH maks', '6,5')]}
            </div>
          </fieldset>
        </DialogMaster>
      )}
      {hapus && (
        <DialogHapusMaster
          target={hapus}
          menghapus={deleting}
          galat={deleteError}
          onYa={() => void remove(hapus.id)}
          onBatal={() => setHapus(null)}
        />
      )}
    </>
  )
}

/* ============== 12 · MEJA TANAMAN — API NYATA ============== */

const MEJA_FIELDS: FieldDef[] = [
  { key: 'meja', label: 'Nama meja', header: 'Nama Meja', placeholder: 'Meja Selada', kind: 'text', core: true },
  { key: 'jumlah_lubang', label: 'Jumlah lubang', header: 'Jumlah Lubang', placeholder: '10', kind: 'int', core: true },
  { key: 'jenis_talang', label: 'Jenis talang', header: 'Jenis Talang', placeholder: 'NFT', kind: 'select', core: false, options: ['NFT', 'DFT'] },
  { key: 'kapasitas_penampung_l', label: 'Volume penampung air (L)', header: 'Volume (L)', placeholder: '100', kind: 'num', core: false },
  { key: 'jumlah_talang', label: 'Jumlah talang', header: 'Jumlah Talang', placeholder: '12', kind: 'int', core: false },
  { key: 'lubang_per_talang', label: 'Lubang per talang', header: 'Lubang/Talang', placeholder: '26', kind: 'int', core: false },
  { key: 'panjang_talang_m', label: 'Panjang talang (m)', header: 'Panjang (m)', placeholder: '8.1', kind: 'num', core: false },
  { key: 'laju_per_talang_lpm', label: 'Laju per talang (L/menit)', header: 'Laju (L/mnt)', placeholder: '1', kind: 'num', core: false },
  { key: 'kenaikan_air_cm', label: 'Kenaikan air (cm)', header: 'Kenaikan (cm)', placeholder: '40', kind: 'int', core: false },
  // dikirim ke alat (KONFIGURASI) saat Mulai Semai; kosong = dihitung otomatis dari volume & talang
  { key: 'monitoring_menit', label: 'Waktu monitoring (menit) — kosong = otomatis', header: 'Monitoring (mnt)', placeholder: 'otomatis', kind: 'int', core: false },
  { key: 'jeda_ab_dtk', label: 'Jeda pompa A→B (detik) — kosong = otomatis', header: 'Jeda A→B (dtk)', placeholder: 'otomatis', kind: 'int', core: false },
]
/** Kolom yang boleh dikosongkan lagi (null = kembali dihitung otomatis). */
const MEJA_OTOMATIS = new Set(['monitoring_menit', 'jeda_ab_dtk'])

/** GET /meja/konfigurasi-alat — nilai yang dikirim ke alat & alat yang terpasang. */
type KonfigMeja = {
  id_meja: string | number
  volume_l: number | null
  putaran_menit: number | null
  monitoring_menit: number | null
  monitoring_otomatis: boolean
  jeda_ab_dtk: number | null
  jeda_otomatis: boolean
  alat: string | null
  alat_nama: string | null
}
type AlatRow = { kode: string; nama: string | null; id_meja: string | number | null; online: boolean | null }

export type MejaRow = Record<string, unknown> & {
  id_meja: string | number
  meja: string
  jumlah_lubang: number | string
}

function validateMeja(form: FormState): Record<string, string[]> {
  const errs: Record<string, string[]> = {}
  const nama = (form.meja ?? '').trim()
  if (!nama) errs.meja = ['Kolom meja wajib diisi.']

  const lubang = (form.jumlah_lubang ?? '').trim()
  if (!lubang) errs.jumlah_lubang = ['Kolom jumlah_lubang wajib diisi.']
  else {
    const n = Number(lubang)
    if (!Number.isInteger(n)) errs.jumlah_lubang = ['Kolom jumlah_lubang harus berupa bilangan bulat.']
    else if (n < 1 || n > 1_000_000) errs.jumlah_lubang = ['Kolom jumlah_lubang harus antara 1 dan 1000000.']
  }

  for (const f of MEJA_FIELDS) {
    if (f.core) continue
    const v = (form[f.key] ?? '').trim()
    if (!v) continue
    const n = Number(v)
    if (f.kind === 'int' && !Number.isInteger(n)) errs[f.key] = [`Kolom ${f.key} harus berupa bilangan bulat.`]
    if (f.kind === 'num' && !Number.isFinite(n)) errs[f.key] = [`Kolom ${f.key} harus berupa angka.`]
    if (f.key === 'kapasitas_penampung_l' && Number.isFinite(n) && n <= 0) {
      errs[f.key] = ['Kolom kapasitas_penampung_l harus lebih besar dari 0.']
    }
  }
  return errs
}

function payloadOfMeja(form: FormState): Record<string, unknown> {
  const payload: Record<string, unknown> = {}
  for (const f of MEJA_FIELDS) {
    if (!(f.key in form)) continue
    const v = (form[f.key] ?? '').trim()
    if (v === '') {
      if (MEJA_OTOMATIS.has(f.key)) payload[f.key] = null
      continue
    }
    payload[f.key] = f.kind === 'text' || f.kind === 'select' ? v : Number(v)
  }
  return payload
}

export function MejaTanamanPage() {
  const handleApiError = useApiError()
  const { rows, loading, error, reload: reloadMeja } = useApiList<MejaRow>('/meja')
  const { data: konfig, reload: reloadKonfig } = useApiObject<{ data: KonfigMeja[]; alat: AlatRow[] }>('/meja/konfigurasi-alat')
  const konfigPer = new Map((konfig?.data ?? []).map((k) => [String(k.id_meja), k]))
  const reload = () => {
    reloadMeja()
    reloadKonfig()
  }
  const [alatDipilih, setAlatDipilih] = useState('')
  const [namaAlat, setNamaAlat] = useState('')
  const alatList = konfig?.alat ?? []
  const namaAlatAsli = alatList.find((a) => a.kode === alatDipilih)?.nama ?? ''

  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>({})
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [hapus, setHapus] = useState<HapusTarget | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const [flash, setFlash] = useState<string | null>(null)
  useEffect(() => {
    if (!flash) return
    const id = setTimeout(() => setFlash(null), 4000)
    return () => clearTimeout(id)
  }, [flash])

  function resetForm() {
    setForm({})
    setAlatDipilih('')
    setNamaAlat('')
    setEditingId(null)
    setFieldErrors({})
    setFormError(null)
  }

  function openAdd() {
    const next: FormState = {}
    for (const f of MEJA_FIELDS) {
      next[f.key] = '' // semua kolom tampil: dipakai menghitung konfigurasi alat
    }
    setForm(next)
    setEditingId(null)
    setFieldErrors({})
    setFormError(null)
    setOpen(true)
  }

  function openEdit(row: MejaRow) {
    const next: FormState = {}
    for (const f of MEJA_FIELDS) {
      const v = row[f.key]
      const filled = v !== undefined && v !== null && String(v).trim() !== ''
      next[f.key] = filled ? String(v) : ''
    }
    setForm(next)
    const kodeAlat = konfigPer.get(String(row.id_meja))?.alat ?? ''
    setAlatDipilih(kodeAlat)
    setNamaAlat(alatList.find((a) => a.kode === kodeAlat)?.nama ?? '')
    setEditingId(String(row.id_meja))
    setFieldErrors({})
    setFormError(null)
    setOpen(true)
  }

  async function save() {
    if (submitting) return
    setFormError(null)
    const errs = validateMeja(form)
    setFieldErrors(errs)
    if (Object.keys(errs).length > 0) return

    setSubmitting(true)
    try {
      const payload = payloadOfMeja(form)
      let id = editingId
      if (id) await api.put(`/meja/${id}`, payload)
      else {
        const r = await api.post('/meja', payload)
        id = String((r.data as { data?: { id_meja?: string | number } }).data?.id_meja ?? '')
      }
      // alat terpasang (perangkat.id_meja) disimpan terpisah; hanya bila berubah
      if (id && ((konfigPer.get(id)?.alat ?? '') !== alatDipilih || (alatDipilih && namaAlat.trim() !== namaAlatAsli))) {
        await api.put(`/meja/${id}/alat`, { kode: alatDipilih || null, ...(alatDipilih && namaAlat.trim() ? { nama: namaAlat.trim() } : {}) })
      }
      setOpen(false)
      resetForm()
      setFlash('Data meja tersimpan.')
      reload()
    } catch (err) {
      const f = handleApiError(err)
      setFieldErrors(f.fieldErrors)
      setFormError(f.message)
      if (f.status === 404) reload()
    } finally {
      setSubmitting(false)
    }
  }

  async function remove(id: string) {
    if (deleting) return
    setDeleting(true)
    setDeleteError(null)
    try {
      await api.delete(`/meja/${id}`)
      setHapus(null)
      setFlash('Data meja dihapus.')
      reload()
    } catch (err) {
      const f = handleApiError(err)
      setDeleteError(f.message)
      if (f.status === 404) reload()
    } finally {
      setDeleting(false)
    }
  }

  const { demo } = useAuth()
  const columns: KolomMaster<MejaRow>[] = [
    {
      key: 'meja',
      header: 'Nama meja',
      render: (r) => (
        <>
          <b className="text-tinta">{cell(r.meja)}</b>
          <small className="vsf-master-id">ID {String(r.id_meja)}</small>
        </>
      ),
    },
    {
      key: 'jumlah_lubang',
      header: 'Jumlah lubang',
      kanan: true,
      render: (r) => <span className="tabular-nums">{cell(r.jumlah_lubang)} lubang</span>,
    },
    {
      key: 'ke-alat',
      header: 'Dikirim ke alat',
      render: (r) => {
        const k = konfigPer.get(String(r.id_meja))
        if (!k) return '—'
        const v = (n: number | null, satuan: string, oto: boolean) => (n == null ? 'belum bisa dihitung' : `${n} ${satuan}${oto ? ' (otomatis)' : ''}`)
        return (
          <>
            <b className="text-tinta">{k.alat ? k.alat_nama : 'Belum ada alat'}</b>
            <small className="vsf-master-id">
              {k.volume_l == null ? 'volume belum diisi' : `${k.volume_l} L`} · monitoring {v(k.monitoring_menit, 'mnt', k.monitoring_otomatis)} · jeda A→B{' '}
              {v(k.jeda_ab_dtk, 'dtk', k.jeda_otomatis)}
            </small>
          </>
        )
      },
    },
    ...MEJA_FIELDS.filter((f) => !f.core && !MEJA_OTOMATIS.has(f.key) && present(rows, f.key)).map(
      (f): KolomMaster<MejaRow> => ({
        key: f.key,
        header: f.header,
        kanan: f.kind !== 'select',
        render: (r) => <span className="tabular-nums">{cell(r[f.key])}</span>,
      }),
    ),
  ]
  const tutup = () => {
    setOpen(false)
    resetForm()
  }

  return (
    <>
      <MasterFrame
        judul="Meja Tanaman"
        deskripsi="Meja hidroponik beserta penampung airnya. Volume & talang dipakai menghitung konfigurasi yang dikirim ke alat saat Mulai Semai."
        jumlah={`${rows.length} meja`}
        tambah="Tambah"
        onTambah={openAdd}
        flash={flash}
      >
        <TabelMaster
          label="Meja Tanaman"
          kolom={columns}
          rows={rows}
          rowKey={(r) => String(r.id_meja)}
          memuat={loading}
          galat={error}
          onUlang={reload}
          kosong="Belum ada meja — tambah meja pertama untuk memulai."
          aksi={(r) => (
            <AksiBaris
              nama={cell(r.meja)}
              terkunci={demo}
              onUbah={() => openEdit(r)}
              onHapus={() => {
                setDeleteError(null)
                setHapus({ label: cell(r.meja), id: String(r.id_meja) })
              }}
            />
          )}
        />
      </MasterFrame>
      {open && (
        <DialogMaster
          judul={editingId ? 'Ubah Meja Tanaman' : 'Tambah Meja Tanaman'}
          sub="Volume, jumlah talang, dan laju per talang dipakai menghitung waktu monitoring & jeda A→B untuk alat."
          galat={formError}
          menyimpan={submitting}
          onTutup={tutup}
          onSimpan={() => void save()}
        >
          {'meja' in form && (
            <Field label="Nama meja">
              {inputFor(MEJA_FIELDS[0], form.meja ?? '', (v) => setForm((s) => ({ ...s, meja: v })))}
              <FieldError message={fieldError(fieldErrors, 'meja')} />
            </Field>
          )}
          {'jumlah_lubang' in form && (
            <Field label="Jumlah lubang">
              {inputFor(MEJA_FIELDS[1], form.jumlah_lubang ?? '', (v) => setForm((s) => ({ ...s, jumlah_lubang: v })))}
              <FieldError message={fieldError(fieldErrors, 'jumlah_lubang')} />
            </Field>
          )}
          {MEJA_FIELDS.filter((f) => !f.core && f.key in form).map((f) => (
            <Field key={f.key} label={f.label}>
              {inputFor(
                f,
                form[f.key] ?? '',
                (v) => setForm((s) => ({ ...s, [f.key]: v })),
                rows.map((r) => String(r[f.key] ?? '')).filter(Boolean),
              )}
              <FieldError message={fieldError(fieldErrors, f.key)} />
            </Field>
          ))}
          <Field label="Alat terpasang di penampung meja ini">
            <select
              className="vsf-input w-full"
              value={alatDipilih}
              onChange={(e) => {
                setAlatDipilih(e.target.value)
                setNamaAlat(alatList.find((a) => a.kode === e.target.value)?.nama ?? '')
              }}
            >
              <option value="">— tidak ada alat —</option>
              {alatList.map((a) => (
                <option key={a.kode} value={a.kode}>
                  {a.nama || a.kode} ({a.kode})
                  {a.id_meja != null && String(a.id_meja) !== editingId ? ' — sedang di meja lain, akan dipindah' : ''}
                </option>
              ))}
            </select>
          </Field>
          {alatDipilih && (
            <Field label="Nama alat (tampil di web)">
              <input className="vsf-input w-full" placeholder="Alat 1" value={namaAlat} onChange={(e) => setNamaAlat(e.target.value)} />
            </Field>
          )}
          <p className="text-[12px] text-abu">Saat alat dipindah, cukup ganti pilihan ini. Mulai Semai berikutnya memakai volume & waktu meja ini.</p>
        </DialogMaster>
      )}
      {hapus && (
        <DialogHapusMaster
          target={hapus}
          menghapus={deleting}
          galat={deleteError}
          onYa={() => void remove(hapus.id)}
          onBatal={() => setHapus(null)}
        />
      )}
    </>
  )
}

/** Kolom tambahan sensor_thresholds (migrasi 2026-10-19) — tampil bila dikirim backend. */
const AMBANG_OPT: FieldDef[] = [
  { key: 'deadband', label: 'Deadband (pita mati)', header: 'Deadband', placeholder: '0.2', kind: 'num', core: false },
]

type AmbangRow = Record<string, unknown> & {
  id: string | number
  sensor: string
  min: number | string
  max: number | string
}

function validateAmbang(form: FormState): Record<string, string[]> {
  const errs: Record<string, string[]> = {}
  const minRaw = (form.min ?? '').trim()
  const maxRaw = (form.max ?? '').trim()
  if (!minRaw) errs.min = ['Minimum wajib diisi.']
  else if (!Number.isFinite(Number(minRaw))) errs.min = ['Minimum harus berupa angka.']

  if (!maxRaw) errs.max = ['Maksimum wajib diisi.']
  else if (!Number.isFinite(Number(maxRaw))) errs.max = ['Maksimum harus berupa angka.']

  if (!errs.min && !errs.max && Number(maxRaw) <= Number(minRaw)) {
    errs.max = ['Maksimum harus lebih besar dari minimum.']
  }

  const db = (form.deadband ?? '').trim()
  if (db) {
    if (!Number.isFinite(Number(db))) errs.deadband = ['Kolom deadband harus berupa angka.']
    else if (Number(db) < 0) errs.deadband = ['Kolom deadband tidak boleh negatif.']
  }
  return errs
}

export function AmbangSensorPage() {
  const handleApiError = useApiError()
  const { rows, loading, error, reload } = useApiList<AmbangRow>('/ambang')

  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editing, setEditing] = useState<AmbangRow | null>(null)
  const [form, setForm] = useState<FormState>({})
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [flash, setFlash] = useState<string | null>(null)

  useEffect(() => {
    if (!flash) return
    const id = setTimeout(() => setFlash(null), 4000)
    return () => clearTimeout(id)
  }, [flash])

  const optActive = (key: string): boolean =>
    present(rows, key) ||
    (editing
      ? editing[key] !== undefined && editing[key] !== null && String(editing[key]).trim() !== ''
      : false)

  function openEdit(row: AmbangRow) {
    const next: FormState = { min: String(row.min ?? ''), max: String(row.max ?? '') }
    for (const f of AMBANG_OPT) {
      if (optActive(f.key)) {
        const v = row[f.key]
        next[f.key] = v === undefined || v === null ? '' : String(v)
      }
    }
    setForm(next)
    setEditing(row)
    setEditingId(String(row.id))
    setFieldErrors({})
    setFormError(null)
    setOpen(true)
  }

  async function save() {
    if (submitting || !editingId) return
    setFormError(null)
    const errs = validateAmbang(form)
    setFieldErrors(errs)
    if (Object.keys(errs).length > 0) return

    const payload: Record<string, unknown> = {
      min: Number(form.min.trim()),
      max: Number(form.max.trim()),
    }
    for (const f of AMBANG_OPT) {
      if (!(f.key in form)) continue
      const v = (form[f.key] ?? '').trim()
      if (v !== '') payload[f.key] = Number(v)
    }

    setSubmitting(true)
    try {
      await api.put(`/ambang/${editingId}`, payload)
      setOpen(false)
      setForm({})
      setEditing(null)
      setEditingId(null)
      setFieldErrors({})
      setFormError(null)
      setFlash('Ambang sensor diperbarui.')
      reload()
    } catch (err) {
      const f = handleApiError(err)
      setFieldErrors(f.fieldErrors)
      setFormError(f.message)
      if (f.status === 404) reload()
    } finally {
      setSubmitting(false)
    }
  }

  const showDeadband = AMBANG_OPT.some((f) => present(rows, f.key)) || (editing?.deadband != null)

  const { demo } = useAuth()
  const infoDari = (r: AmbangRow) => SENSOR_INFO[String(r.sensor)]
  const satuanDari = (r: AmbangRow) => (r.satuan ? String(r.satuan) : (infoDari(r)?.satuan ?? ''))

  const columns: KolomMaster<AmbangRow>[] = [
    {
      key: 'sensor',
      header: 'Parameter',
      render: (r) => (
        <>
          <b className="text-tinta">{infoDari(r)?.label ?? cell(r.sensor)}</b>
          <small className="vsf-master-id">{cell(r.sensor)}</small>
        </>
      ),
    },
    {
      key: 'rentang',
      header: 'Rentang aman',
      render: (r) => (
        <span className="tabular-nums">
          <b className="text-tinta">{cell(r.min)}</b> – <b className="text-tinta">{cell(r.max)}</b>
          {satuanDari(r) && <small className="ml-1 text-abu">{satuanDari(r)}</small>}
        </span>
      ),
    },
    ...(showDeadband
      ? [({ key: 'deadband', header: 'Deadband', kanan: true, render: (r: AmbangRow) => cell(r.deadband) } as KolomMaster<AmbangRow>)]
      : []),
  ]

  const info = editing ? infoDari(editing) : undefined
  const namaEdit = editing ? (info?.label ?? cell(editing.sensor)) : ''
  const satuanEdit = editing ? satuanDari(editing) : ''
  const lbl = (t: string) => (satuanEdit ? `${t} (${satuanEdit})` : t)
  const tutup = () => {
    setOpen(false)
    setForm({})
    setEditing(null)
    setEditingId(null)
    setFieldErrors({})
    setFormError(null)
  }

  return (
    <>
      <MasterFrame
        judul="Ambang Sensor"
        deskripsi="Batas aman tiap sensor. Di luar rentang ini bacaan dianggap tidak normal."
        jumlah={`${rows.length} parameter`}
        flash={flash}
      >
        <TabelMaster
          label="Ambang Sensor"
          kolom={columns}
          rows={rows}
          rowKey={(r) => String(r.id)}
          memuat={loading}
          galat={error}
          onUlang={reload}
          kosong="Belum ada ambang sensor."
          aksi={(r) => (
            <AksiBaris nama={infoDari(r)?.label ?? cell(r.sensor)} terkunci={demo} onUbah={() => openEdit(r)} />
          )}
        />
      </MasterFrame>
      {open && editing && (
        <DialogMaster
          judul={`Ubah ambang · ${namaEdit}`}
          sub={`Kode sensor: ${cell(editing.sensor)} (dipakai alat, tidak dapat diubah).`}
          simpan="Simpan Perubahan"
          galat={formError}
          menyimpan={submitting}
          onTutup={tutup}
          onSimpan={() => void save()}
        >
          <div className="grid grid-cols-2 gap-3">
            <Field label={lbl('Minimum')}>
              {inputFor(
                { key: 'min', label: 'Minimum', header: 'Minimum', placeholder: '5', kind: 'num', core: true },
                form.min ?? '',
                (v) => setForm((s) => ({ ...s, min: v })),
              )}
              <FieldError message={fieldError(fieldErrors, 'min')} />
            </Field>
            <Field label={lbl('Maksimum')}>
              {inputFor(
                { key: 'max', label: 'Maksimum', header: 'Maksimum', placeholder: '7', kind: 'num', core: true },
                form.max ?? '',
                (v) => setForm((s) => ({ ...s, max: v })),
              )}
              <FieldError message={fieldError(fieldErrors, 'max')} />
            </Field>
          </div>
          {AMBANG_OPT.filter((f) => f.key in form).map((f) => (
            <Field key={f.key} label={f.label}>
              {inputFor(f, form[f.key], (v) => setForm((s) => ({ ...s, [f.key]: v })))}
              <FieldError message={fieldError(fieldErrors, f.key)} />
            </Field>
          ))}
          <p className="text-[12px] text-abu">Nilai ini juga dipakai Asisten AI dan perangkat untuk menilai kondisi sensor.</p>
        </DialogMaster>
      )}
    </>
  )
}
