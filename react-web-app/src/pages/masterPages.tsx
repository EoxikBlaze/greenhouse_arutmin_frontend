import { useEffect, useState, type ReactNode } from 'react'
import { api } from '../lib/api'
import { fieldError, useApiError, useApiList } from '../lib/crudApi'
import { Field, FieldError } from '../components/CrudScreen'
import { useAuth } from '../lib/authContext'
import { useApiObject } from '../lib/useApiObject'
import { angkaMaks } from '../lib/format'
import {
  bodyTargetDosing,
  formDariNaik,
  targetBerubah,
  validasiTargetDosing,
  type NaikBaris,
} from '../lib/targetDosing'
import {
  AksiBaris,
  DialogHapusMaster,
  DialogMaster,
  MasterFrame,
  SENSOR_INFO,
  TabelMaster,
  type HapusTarget,
  type KolomMaster,
} from '../components/master/MasterKit'

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

/** Baris GET /tanaman — kolom whitelist backend: `nama_tanaman`, `id_meja`. */
type TanamanRow = Record<string, unknown> & {
  id_tanaman: string | number
  nama_tanaman: string
  /** FK → mejas.id_meja, nullable. */
  id_meja: string | number | null
}

/**
 * Validasi klien hanya untuk "wajib isi" — batas panjang varchar & FK meja tetap
 * urusan Zod backend, supaya 422 per-field kontrak (§2) yang muncul di UI memang
 * berasal dari server (bukan tebakan klien).
 */
function validateTanaman(form: FormState): Record<string, string[]> {
  const errs: Record<string, string[]> = {}
  if (!(form.nama_tanaman ?? '').trim()) errs.nama_tanaman = ['Kolom nama_tanaman wajib diisi.']
  return errs
}

/** Susun body: nilai kosong TIDAK dikirim (`id_meja` nullable, tapi Zod menolak `null`). */
function payloadTanaman(form: FormState): Record<string, unknown> {
  const payload: Record<string, unknown> = {}
  const nama = (form.nama_tanaman ?? '').trim()
  if (nama) payload.nama_tanaman = nama
  return payload
}

export function JenisTanamanPage() {
  const handleApiError = useApiError()
  const { rows, loading, error, reload } = useApiList<TanamanRow>('/tanaman')
  // Target awal/akhir dosing per tanaman (GET /dosing/naik-harian); disimpan lewat PUT /dosing/naik-harian/:id.
  const { data: naik, reload: reloadNaik } = useApiObject<{ data: NaikBaris[]; ambang_tds: { min: number; max: number } | null }>('/dosing/naik-harian')
  const naikPer = new Map((naik?.data ?? []).map((n) => [String(n.id_tanaman), n]))
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

  function openAdd() {
    setForm({ nama_tanaman: '', ...formDariNaik(null) })
    setEditingId(null)
    setFieldErrors({})
    setFormError(null)
    setOpen(true)
  }

  function openEdit(row: TanamanRow) {
    setForm({
      nama_tanaman: row.nama_tanaman == null ? '' : String(row.nama_tanaman),
      ...formDariNaik(naikPer.get(String(row.id_tanaman))),
    })
    setEditingId(String(row.id_tanaman))
    setFieldErrors({})
    setFormError(null)
    setOpen(true)
  }

  async function save() {
    if (submitting) return
    setFormError(null)
    const errs = { ...validateTanaman(form), ...validasiTargetDosing(form) }
    setFieldErrors(errs)
    if (Object.keys(errs).length > 0) return

    setSubmitting(true)
    try {
      const payload = payloadTanaman(form)
      let id = editingId
      if (id) await api.put(`/tanaman/${id}`, payload)
      else {
        const r = await api.post('/tanaman', payload)
        id = String((r.data as { data?: { id_tanaman?: string | number } }).data?.id_tanaman ?? '')
      }
      // Langkah 2: target dosing hanya dikirim bila berubah. Gagal di sini ≠ tanaman gagal tersimpan.
      if (id && targetBerubah(form, naikPer.get(id))) {
        try {
          await api.put(`/dosing/naik-harian/${id}`, bodyTargetDosing(form))
        } catch (err2) {
          const f2 = handleApiError(err2)
          setEditingId(id) // simpan ulang hanya memperbarui; tidak membuat tanaman kedua
          setFieldErrors(f2.fieldErrors)
          setFormError(`Tanaman tersimpan, tetapi target dosing belum tersimpan: ${f2.message}`)
          reload()
          reloadNaik()
          return
        }
      }
      setOpen(false)
      resetForm()
      setFlash('Data tanaman tersimpan.')
      reload()
      reloadNaik()
    } catch (err) {
      const f = handleApiError(err)
      setFieldErrors(f.fieldErrors)
      setFormError(f.message)
      // 404 → data sudah hilang di server: segarkan daftar di belakang modal.
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
      key: 'target-awal',
      header: 'Target awal nutrisi',
      render: (r) => {
        const n = naikPer.get(String(r.id_tanaman))
        return n?.ppm_awal == null ? (
          <span className="vsf-master-chip is-kosong" title="Belum diatur; memakai preset per tahap">Belum diatur</span>
        ) : (
          <span className="vsf-master-chip">{angkaMaks(Number(n.ppm_awal), 1)} ppm</span>
        )
      },
    },
    {
      key: 'target-akhir',
      header: 'Target akhir nutrisi',
      render: (r) => {
        const n = naikPer.get(String(r.id_tanaman))
        return n?.ppm_target == null ? (
          <span className="vsf-master-chip is-kosong" title="Belum diatur; memakai preset per tahap">Belum diatur</span>
        ) : (
          <>
            <span className="vsf-master-chip">{angkaMaks(Number(n.ppm_target), 1)} ppm</span>
            {n.hari_capai != null && <small className="vsf-master-id">dicapai dalam {String(n.hari_capai)} hari</small>}
          </>
        )
      },
    },
  ]
  const tutup = () => {
    setOpen(false)
    resetForm()
  }

  return (
    <>
      <MasterFrame
        judul="Jenis Tanaman"
        deskripsi="Tanaman yang ditanam di kebun serta target awal dan akhir nutrisi."
        jumlah={`${rows.length} jenis`}
        tambah="Tambah"
        onTambah={openAdd}
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
              onUbah={() => openEdit(r)}
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
          sub="Isi nama tanaman dan, bila perlu, target nutrisinya."
          galat={formError}
          menyimpan={submitting}
          onTutup={tutup}
          onSimpan={() => void save()}
        >
          <Field label="Nama tanaman">
            <input
              className="vsf-input w-full"
              placeholder="Selada"
              value={form.nama_tanaman ?? ''}
              onChange={(e) => setForm((s) => ({ ...s, nama_tanaman: e.target.value }))}
            />
            <FieldError message={fieldError(fieldErrors, 'nama_tanaman')} />
          </Field>
          <div className="mt-4 border-t border-black/10 pt-3">
            <div className="text-[12px] font-bold text-slate-700">Target nutrisi (opsional)</div>
            <p className="mt-1 text-[12px] leading-relaxed text-slate-600">
              Target ppm penampung naik rata tiap hari dari <b>target awal</b> sampai <b>target akhir</b> dalam sekian hari sejak pindah
              netpot. Isi ketiga kolom, atau kosongkan semuanya untuk memakai preset per tahap. Menyimpan langsung memperbarui target
              penampung yang memakai tanaman ini; ini hanya pengaturan target, eksekusi pompa saat ini dinonaktifkan.
            </p>
            <div className="mt-2 grid gap-3 sm:grid-cols-3">
              <Field label="Target awal nutrisi (ppm)">
                <input
                  className="vsf-input w-full"
                  inputMode="decimal"
                  placeholder="kosong = preset"
                  value={form.ppm_awal ?? ''}
                  onChange={(e) => setForm((s) => ({ ...s, ppm_awal: e.target.value }))}
                />
                <FieldError message={fieldError(fieldErrors, 'ppm_awal')} />
              </Field>
              <Field label="Target akhir nutrisi (ppm)">
                <input
                  className="vsf-input w-full"
                  inputMode="decimal"
                  placeholder="kosong = preset"
                  value={form.ppm_target ?? ''}
                  onChange={(e) => setForm((s) => ({ ...s, ppm_target: e.target.value }))}
                />
                <FieldError message={fieldError(fieldErrors, 'ppm_target')} />
              </Field>
              <Field label="Dicapai dalam (hari)">
                <input
                  className="vsf-input w-full"
                  inputMode="numeric"
                  placeholder="kosong = preset"
                  value={form.hari_capai ?? ''}
                  onChange={(e) => setForm((s) => ({ ...s, hari_capai: e.target.value }))}
                />
                <FieldError message={fieldError(fieldErrors, 'hari_capai')} />
              </Field>
            </div>
            {maksAmbang != null && Number((form.ppm_target ?? '').replace(',', '.')) > maksAmbang && (
              <p role="alert" className="mt-2 text-[12px] text-amber-800">
                Target akhir melewati batas alert TDS ({angkaMaks(maksAmbang, 0)} ppm); alert akan menyala saat target tercapai.
              </p>
            )}
          </div>
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
