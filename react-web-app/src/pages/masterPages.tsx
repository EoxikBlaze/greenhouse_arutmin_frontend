import { useEffect, useState, type ReactNode } from 'react'
import { api } from '../lib/api'
import { fieldError, useApiError, useApiList } from '../lib/crudApi'
import {
  BtnEdit,
  BtnHapus,
  CrudScreen,
  Field,
  FieldError,
  type Column,
  type HapusTarget,
} from '../components/CrudScreen'

const notesMaster = [
  'Master data dipakai sebagai pilihan dropdown di modul lain.',
  'Hapus = modal konfirmasi; data yang sudah dipakai tidak bisa dihapus.',
]

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
  const meja = (form.id_meja ?? '').trim()
  if (meja) payload.id_meja = Number(meja)
  return payload
}

/** Label meja untuk kolom tabel (— bila kosong, `#id` bila tak ada di daftar /meja). */
function mejaLabel(rows: MejaRow[], id: unknown): string {
  if (id === undefined || id === null || String(id).trim() === '') return '—'
  const m = rows.find((r) => String(r.id_meja) === String(id))
  return m ? cell(m.meja) : `#${id}`
}

export function JenisTanamanPage() {
  const handleApiError = useApiError()
  const { rows, loading, error, reload } = useApiList<TanamanRow>('/tanaman')
  // Daftar meja live dipakai untuk label kolom & pilihan select (bukan sumber utama layar).
  const { rows: mejaRows } = useApiList<MejaRow>('/meja')

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
    setForm({ nama_tanaman: '', id_meja: '' })
    setEditingId(null)
    setFieldErrors({})
    setFormError(null)
    setOpen(true)
  }

  function openEdit(row: TanamanRow) {
    setForm({
      nama_tanaman: row.nama_tanaman == null ? '' : String(row.nama_tanaman),
      id_meja: row.id_meja == null ? '' : String(row.id_meja),
    })
    setEditingId(String(row.id_tanaman))
    setFieldErrors({})
    setFormError(null)
    setOpen(true)
  }

  /** Tombol "+ Tambah" / "Batal" dari CrudScreen → siapkan atau bersihkan form. */
  function handleOpenChange(v: boolean) {
    if (v) {
      if (editingId) setOpen(true)
      else openAdd()
    } else {
      setOpen(false)
      resetForm()
    }
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
      setFlash('✔ Data tanaman tersimpan.')
      reload()
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
      setFlash('✔ Data tanaman dihapus.')
      reload()
    } catch (err) {
      const f = handleApiError(err)
      setDeleteError(f.message)
      if (f.status === 404) reload()
    } finally {
      setDeleting(false)
    }
  }

  const columns: Column<TanamanRow>[] = [
    { key: 'id', header: 'ID', render: (r) => <span className="text-slate-500">{String(r.id_tanaman)}</span> },
    { key: 'nama', header: 'Nama Tanaman', render: (r) => <b className="text-slate-900">{cell(r.nama_tanaman)}</b> },
    { key: 'meja', header: 'Meja Bawaan', render: (r) => mejaLabel(mejaRows, r.id_meja) },
  ]

  // Opsi select: daftar meja live + nilai baris yang diedit bila id-nya tak lagi ada.
  const mejaOptions = mejaRows.map((m) => ({ id: String(m.id_meja), label: cell(m.meja) }))
  const currentMeja = (form.id_meja ?? '').trim()
  if (currentMeja && !mejaOptions.some((o) => o.id === currentMeja)) {
    mejaOptions.push({ id: currentMeja, label: `#${currentMeja}` })
  }

  return (
    <CrudScreen<TanamanRow>
      title="Jenis Tanaman"
      moduleName="Jenis Tanaman"
      addButton="+ Tambah"
      columns={columns}
      rows={rows}
      rowKey={(r) => String(r.id_tanaman)}
      loading={loading}
      listError={error}
      onRetry={reload}
      flash={flash}
      open={open}
      onOpenChange={handleOpenChange}
      formError={formError}
      submitting={submitting}
      onSubmit={() => void save()}
      form={
        <>
          {'nama_tanaman' in form && (
            <Field label="Nama tanaman">
              <input
                className="vsf-input w-full"
                placeholder="Selada"
                value={form.nama_tanaman}
                onChange={(e) => setForm((s) => ({ ...s, nama_tanaman: e.target.value }))}
              />
              <FieldError message={fieldError(fieldErrors, 'nama_tanaman')} />
            </Field>
          )}
          {'id_meja' in form && (
            <Field label="Meja bawaan (opsional)">
              <select
                className="vsf-input w-full"
                value={currentMeja}
                onChange={(e) => setForm((s) => ({ ...s, id_meja: e.target.value }))}
              >
                <option value="">— tanpa meja —</option>
                {mejaOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
              <FieldError message={fieldError(fieldErrors, 'id_meja')} />
            </Field>
          )}
        </>
      }
      hapus={hapus}
      onHapusChange={setHapus}
      deleting={deleting}
      deleteError={deleteError}
      onDelete={(id) => void remove(id)}
      notes={[
        ...notesMaster,
        'Live: GET/POST/PUT/DELETE /tanaman (Bearer JWT) — kolom whitelist backend: nama_tanaman, id_meja.',
        'Meja bawaan diambil dari GET /meja; pilihan kosong TIDAK ikut dikirim saat simpan sehingga nilai lama tetap ada (Zod menolak null).',
        'Error kontrak: 401 → redirect login · 422 per-field (mis. nama_tanaman terlalu panjang) → inline di bawah input · 404 → "Data tidak ditemukan." · 409 → "masih ada data terkait".',
      ]}
      actions={(r, ask) => (
        <>
          <BtnEdit name={cell(r.nama_tanaman)} onClick={() => openEdit(r)} />
          <BtnHapus label={cell(r.nama_tanaman)} id={String(r.id_tanaman)} onPick={ask} />
        </>
      )}
    />
  )
}

/* ============== 12 · MEJA TANAMAN — API NYATA ============== */

/**
 * Field form/kolom meja. Dua baris pertama = whitelist backend lama
 * (`meja`, `jumlah_lubang`); sisanya kolom fisik hasil migrasi
 * 2026-10-19 (tabel `mejas` kini 13 kolom) — ditampilkan & dikirim hanya
 * bila respons GET memang memuatnya, sehingga halaman ini ikut melebar
 * otomatis begitu serializer backend ikut melebar.
 */
const MEJA_FIELDS: FieldDef[] = [
  { key: 'meja', label: 'Nama meja', header: 'Nama Meja', placeholder: 'Meja Selada', kind: 'text', core: true },
  { key: 'jumlah_lubang', label: 'Jumlah lubang', header: 'Jumlah Lubang', placeholder: '10', kind: 'int', core: true },
  { key: 'jenis_talang', label: 'Jenis talang', header: 'Jenis Talang', placeholder: 'NFT', kind: 'select', core: false, options: ['NFT', 'DFT'] },
  { key: 'kapasitas_penampung_l', label: 'Kapasitas penampung (L)', header: 'Kapasitas (L)', placeholder: '70', kind: 'num', core: false },
  { key: 'jumlah_talang', label: 'Jumlah talang', header: 'Jumlah Talang', placeholder: '12', kind: 'int', core: false },
  { key: 'lubang_per_talang', label: 'Lubang per talang', header: 'Lubang/Talang', placeholder: '26', kind: 'int', core: false },
  { key: 'panjang_talang_m', label: 'Panjang talang (m)', header: 'Panjang (m)', placeholder: '8.1', kind: 'num', core: false },
  { key: 'laju_per_talang_lpm', label: 'Laju per talang (L/menit)', header: 'Laju (L/mnt)', placeholder: '1', kind: 'num', core: false },
  { key: 'kenaikan_air_cm', label: 'Kenaikan air (cm)', header: 'Kenaikan (cm)', placeholder: '40', kind: 'int', core: false },
]

type MejaRow = Record<string, unknown> & {
  id_meja: string | number
  meja: string
  jumlah_lubang: number | string
}

/** Validasi klien — kalimat sengaja disamakan dengan pesan 422 backend (Zod). */
function validateMeja(form: FormState): Record<string, string[]> {
  const errs: Record<string, string[]> = {}
  const nama = (form.meja ?? '').trim()
  if (!nama) errs.meja = ['Kolom meja wajib diisi.']
  else if (nama.length > 200) errs.meja = ['Kolom meja maksimal 200 karakter.']

  const lubang = (form.jumlah_lubang ?? '').trim()
  if (!lubang) errs.jumlah_lubang = ['Kolom jumlah_lubang wajib diisi.']
  else {
    const n = Number(lubang)
    if (!Number.isInteger(n) || n < 1 || n > 1_000_000) {
      errs.jumlah_lubang = ['Kolom jumlah_lubang harus antara 1 dan 1000000.']
    }
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

/** Susun body request: nilai kosong TIDAK dikirim (update parsial aman). */
function payloadOf(form: FormState): Record<string, unknown> {
  const payload: Record<string, unknown> = {}
  for (const f of MEJA_FIELDS) {
    if (!(f.key in form)) continue
    const v = (form[f.key] ?? '').trim()
    if (v === '') continue
    payload[f.key] = f.kind === 'text' || f.kind === 'select' ? v : Number(v)
  }
  return payload
}

export function MejaTanamanPage() {
  const handleApiError = useApiError()
  const { rows, loading, error, reload } = useApiList<MejaRow>('/meja')

  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editing, setEditing] = useState<MejaRow | null>(null)
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

  const optActive = (key: string): boolean =>
    present(rows, key) ||
    (editing
      ? editing[key] !== undefined && editing[key] !== null && String(editing[key]).trim() !== ''
      : false)

  function resetForm() {
    setForm({})
    setEditing(null)
    setEditingId(null)
    setFieldErrors({})
    setFormError(null)
  }

  function openAdd() {
    const next: FormState = {}
    for (const f of MEJA_FIELDS) {
      if (f.core || optActive(f.key)) next[f.key] = ''
    }
    setForm(next)
    setEditing(null)
    setEditingId(null)
    setFieldErrors({})
    setFormError(null)
    setOpen(true)
  }

  function openEdit(row: MejaRow) {
    const next: FormState = {}
    for (const f of MEJA_FIELDS) {
      if (!f.core && !optActive(f.key)) continue
      const v = row[f.key]
      const filled = v !== undefined && v !== null && String(v).trim() !== ''
      next[f.key] = filled ? String(v) : ''
    }
    setForm(next)
    setEditing(row)
    setEditingId(String(row.id_meja))
    setFieldErrors({})
    setFormError(null)
    setOpen(true)
  }

  /** Tombol "+ Tambah" / "Batal" dari CrudScreen → siapkan atau bersihkan form. */
  function handleOpenChange(v: boolean) {
    if (v) {
      if (editingId) setOpen(true)
      else openAdd()
    } else {
      setOpen(false)
      resetForm()
    }
  }

  async function save() {
    if (submitting) return
    setFormError(null)
    const errs = validateMeja(form)
    setFieldErrors(errs)
    if (Object.keys(errs).length > 0) return

    setSubmitting(true)
    try {
      const payload = payloadOf(form)
      if (editingId) await api.put(`/meja/${editingId}`, payload)
      else await api.post('/meja', payload)
      setOpen(false)
      resetForm()
      setFlash('✔ Data meja tersimpan.')
      reload()
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
      await api.delete(`/meja/${id}`)
      setHapus(null)
      setFlash('✔ Data meja dihapus.')
      reload()
    } catch (err) {
      const f = handleApiError(err)
      setDeleteError(f.message)
      if (f.status === 404) reload()
    } finally {
      setDeleting(false)
    }
  }

  const columns: Column<MejaRow>[] = [
    { key: 'id', header: 'ID', render: (r) => <span className="text-slate-500">{String(r.id_meja)}</span> },
    { key: 'meja', header: 'Nama Meja', render: (r) => <b className="text-slate-900">{cell(r.meja)}</b> },
    { key: 'jumlah_lubang', header: 'Jumlah Lubang', render: (r) => cell(r.jumlah_lubang) },
    ...MEJA_FIELDS.filter((f) => !f.core && present(rows, f.key)).map(
      (f): Column<MejaRow> => ({
        key: f.key,
        header: f.header,
        render: (r) => cell(r[f.key]),
      }),
    ),
  ]

  return (
    <CrudScreen<MejaRow>
      title="Meja Tanam"
      moduleName="Meja Tanam"
      addButton="+ Tambah"
      columns={columns}
      rows={rows}
      rowKey={(r) => String(r.id_meja)}
      loading={loading}
      listError={error}
      onRetry={reload}
      flash={flash}
      open={open}
      onOpenChange={handleOpenChange}
      formError={formError}
      submitting={submitting}
      onSubmit={() => void save()}
      form={
        <>
          {'meja' in form && (
            <Field label="Nama meja">
              {inputFor(
                MEJA_FIELDS[0],
                form.meja,
                (v) => setForm((s) => ({ ...s, meja: v })),
              )}
              <FieldError message={fieldError(fieldErrors, 'meja')} />
            </Field>
          )}
          {'jumlah_lubang' in form && (
            <Field label="Jumlah lubang">
              {inputFor(
                MEJA_FIELDS[1],
                form.jumlah_lubang,
                (v) => setForm((s) => ({ ...s, jumlah_lubang: v })),
              )}
              <FieldError message={fieldError(fieldErrors, 'jumlah_lubang')} />
            </Field>
          )}
          {MEJA_FIELDS.filter((f) => !f.core && f.key in form).map((f) => (
            <Field key={f.key} label={f.label}>
              {inputFor(
                f,
                form[f.key],
                (v) => setForm((s) => ({ ...s, [f.key]: v })),
                rows.map((r) => String(r[f.key] ?? '')).filter(Boolean),
              )}
              <FieldError message={fieldError(fieldErrors, f.key)} />
            </Field>
          ))}
        </>
      }
      hapus={hapus}
      onHapusChange={setHapus}
      deleting={deleting}
      deleteError={deleteError}
      onDelete={(id) => void remove(id)}
      notes={[
        ...notesMaster,
        'Live: GET/POST/PUT/DELETE /meja (Bearer JWT) — daftar ikut segar setelah simpan/hapus.',
        'Kolom fisik meja (jenis_talang, kapasitas_penampung_l, jumlah_talang, …) tampil otomatis bila ikut dikirim backend.',
        'Error kontrak: 401 → redirect login · 422 → pesan per-field di bawah input · 404 → "Data tidak ditemukan." · 403 → mode demo.',
      ]}
      actions={(r, ask) => (
        <>
          <BtnEdit name={cell(r.meja)} onClick={() => openEdit(r)} />
          <BtnHapus label={cell(r.meja)} id={String(r.id_meja)} onPick={ask} />
        </>
      )}
    />
  )
}

/* ============= 13 · AMBANG SENSOR — API NYATA (GET + PUT) ============= */

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
  if (!minRaw) errs.min = ['Kolom min wajib diisi.']
  else if (!Number.isFinite(Number(minRaw))) errs.min = ['Kolom min harus berupa angka.']

  if (!maxRaw) errs.max = ['Kolom max wajib diisi.']
  else if (!Number.isFinite(Number(maxRaw))) errs.max = ['Kolom max harus berupa angka.']

  if (!errs.min && !errs.max && Number(maxRaw) < Number(minRaw)) {
    errs.max = ['Kolom max harus lebih besar atau sama dengan min.']
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

  /** Tombol "Batal" dari CrudScreen → tutup + bersihkan form. */
  function handleOpenChange(v: boolean) {
    if (v) {
      setOpen(true)
      return
    }
    setOpen(false)
    setForm({})
    setEditing(null)
    setEditingId(null)
    setFieldErrors({})
    setFormError(null)
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
      setFlash('✔ Ambang sensor diperbarui.')
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
  const showSatuan = present(rows, 'satuan')

  const columns: Column<AmbangRow>[] = [
    { key: 'id', header: 'ID', render: (r) => <span className="text-slate-500">{String(r.id)}</span> },
    { key: 'sensor', header: 'Parameter', render: (r) => <b className="text-slate-900">{cell(r.sensor)}</b> },
    { key: 'min', header: 'Minimum', render: (r) => cell(r.min) },
    { key: 'max', header: 'Maksimum', render: (r) => cell(r.max) },
    ...(showDeadband
      ? [({ key: 'deadband', header: 'Deadband', render: (r: AmbangRow) => cell(r.deadband) } as Column<AmbangRow>)]
      : []),
    ...(showSatuan
      ? [({ key: 'satuan', header: 'Satuan', render: (r: AmbangRow) => cell(r.satuan) } as Column<AmbangRow>)]
      : []),
  ]

  return (
    <CrudScreen<AmbangRow>
      title="Ambang Sensor"
      moduleName="Ambang Sensor"
      addButton="+ Tambah"
      hideAdd
      columns={columns}
      rows={rows}
      rowKey={(r) => String(r.id)}
      loading={loading}
      listError={error}
      onRetry={reload}
      flash={flash}
      open={open}
      onOpenChange={handleOpenChange}
      formError={formError}
      submitting={submitting}
      submitLabel="Simpan Perubahan"
      onSubmit={() => void save()}
      form={
        <>
          <Field label="Parameter sensor">
            <div className="vsf-input w-full bg-slate-50 text-slate-600">
              {editing ? cell(editing.sensor) : '—'}
            </div>
            <div className="mt-1 text-[11px] text-slate-500">
              Nama sensor dipakai ESP32 — tidak diubah lewat layar ini.
            </div>
          </Field>
          <Field label="Minimum">
            {inputFor(
              { key: 'min', label: 'Minimum', header: 'Minimum', placeholder: '5', kind: 'num', core: true },
              form.min ?? '',
              (v) => setForm((s) => ({ ...s, min: v })),
            )}
            <FieldError message={fieldError(fieldErrors, 'min')} />
          </Field>
          <Field label="Maksimum">
            {inputFor(
              { key: 'max', label: 'Maksimum', header: 'Maksimum', placeholder: '7', kind: 'num', core: true },
              form.max ?? '',
              (v) => setForm((s) => ({ ...s, max: v })),
            )}
            <FieldError message={fieldError(fieldErrors, 'max')} />
          </Field>
          {AMBANG_OPT.filter((f) => f.key in form).map((f) => (
            <Field key={f.key} label={f.label}>
              {inputFor(f, form[f.key], (v) => setForm((s) => ({ ...s, [f.key]: v })))}
              <FieldError message={fieldError(fieldErrors, f.key)} />
            </Field>
          ))}
        </>
      }
      notes={[
        'Live: GET /ambang (daftar) + PUT /ambang/:id (ubah min/max/deadband) — Bearer JWT.',
        'Hanya ubah nilai: nama sensor dipakai untuk feed ESP32 (GET /api/get-thresholds), tombol Tambah/Hapus sengaja tidak ditampilkan.',
        'Kolom deadband/satuan tampil otomatis bila ikut dikirim backend (migrasi 2026-10-19).',
        'Error kontrak: 401 → redirect login · 422 → pesan per-field · 404 → "Data tidak ditemukan." · 403 → mode demo.',
      ]}
      actions={(r) => <BtnEdit name={cell(r.sensor)} onClick={() => openEdit(r)} />}
    />
  )
}
