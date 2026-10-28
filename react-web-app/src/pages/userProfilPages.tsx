import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { fieldError, useApiError, useApiList } from '../lib/crudApi'
import { useApiObject } from '../lib/useApiObject'
import { useAuth } from '../lib/authContext'
import { StatusBadge } from '../components/StatusBadge'
import { BtnEdit, BtnHapus, CrudScreen, Field, FieldError, type Column, type HapusTarget } from '../components/CrudScreen'

/* ── Ikon SVG inline (R3): pengganti emoji silang/centang — aria-hidden, 16px ── */
function IkonSalah({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6.4" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6.1 6.1l3.8 3.8M9.9 6.1L6.1 9.9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function IkonOk({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6.4" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5.3 8.3l1.9 1.9 3.5-4.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

type FormState = Record<string, string>

function cell(v: unknown): string {
  return v === undefined || v === null || String(v).trim() === '' ? '—' : String(v)
}

/* ============= 16 · MANAJEMEN USER — GET /user (admin & demo) ============= */

type UserRow = {
  id?: string | number
  username?: string
  email?: string | null
  level?: string | null
  is_demo?: boolean
}

const LEVELS = ['admin', 'user', 'petani']

/** Validasi klien hanya “wajib isi” minimal — batas & enum tetap urusan backend. */
function validateUser(form: FormState, editing: boolean): Record<string, string[]> {
  const errs: Record<string, string[]> = {}
  const username = (form.username ?? '').trim()
  if (username.length < 3) errs.username = ['Nama pengguna min 3 karakter.']
  if (!editing && (form.password ?? '').length < 8) errs.password = ['Password min 8 karakter.']
  if (form.level && !LEVELS.includes(form.level)) errs.level = ['Level harus admin/user/petani.']
  return errs
}

export function ManajemenUserPage() {
  const handleApiError = useApiError()
  const { username: saya } = useAuth()
  const { rows, loading, error, reload } = useApiList<UserRow>('/user')

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
    setForm({ username: '', email: '', level: 'petani', password: '', is_demo: '' })
    setEditingId(null)
    setFieldErrors({})
    setFormError(null)
    setOpen(true)
  }

  function openEdit(row: UserRow) {
    setForm({
      username: row.username == null ? '' : String(row.username),
      email: row.email == null ? '' : String(row.email),
      level: row.level == null ? '' : String(row.level),
      password: '',
      is_demo: row.is_demo ? 'ya' : '',
    })
    setEditingId(row.id == null ? null : String(row.id))
    setFieldErrors({})
    setFormError(null)
    setOpen(true)
  }

  function handleOpenChange(v: boolean) {
    if (v) {
      if (editingId !== null) setOpen(true)
      else openAdd()
    } else {
      setOpen(false)
      resetForm()
    }
  }

  async function save() {
    if (submitting) return
    setFormError(null)
    const errs = validateUser(form, editingId !== null)
    setFieldErrors(errs)
    if (Object.keys(errs).length > 0) return

    setSubmitting(true)
    try {
      const payload: Record<string, unknown> = {
        username: (form.username ?? '').trim(),
        email: (form.email ?? '').trim() || null,
        level: form.level || 'petani',
        is_demo: form.is_demo === 'ya',
      }
      const pw = form.password ?? ''
      if (pw) payload.password = pw

      if (editingId) await api.put(`/user/${editingId}`, payload)
      else await api.post('/user', payload)

      setOpen(false)
      resetForm()
      setFlash(editingId ? 'Data user diperbarui.' : 'User berhasil ditambahkan.')
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
      await api.delete(`/user/${id}`)
      setHapus(null)
      setFlash('User dihapus.')
      reload()
    } catch (err) {
      const f = handleApiError(err)
      setDeleteError(f.message)
      if (f.status === 404) reload()
    } finally {
      setDeleting(false)
    }
  }

  const columns: Column<UserRow>[] = [
    { key: 'username', header: 'Username', render: (r) => <b className="text-slate-900">{cell(r.username)}</b> },
    { key: 'email', header: 'Email', render: (r) => cell(r.email) },
    { key: 'level', header: 'Level', render: (r) => cell(r.level) },
    { key: 'demo', header: 'Demo?', render: (r) => (r.is_demo ? 'Ya' : '—') },
  ]

  return (
    <>
      <CrudScreen<UserRow>
        title="Manajemen User"
        moduleName="Manajemen User"
        addButton="+ Tambah User"
        formTitle="Tambah User"
        columns={columns}
        rows={rows}
        rowKey={(r) => String(r.id ?? r.username)}
        loading={loading}
        listError={error}
        onRetry={reload}
        flash={flash}
        open={open}
        onOpenChange={handleOpenChange}
        formError={formError}
        submitting={submitting}
        onSubmit={() => void save()}
        hapus={hapus}
        onHapusChange={setHapus}
        deleting={deleting}
        deleteError={deleteError}
        onDelete={(id) => void remove(id)}
        form={
          <>
            <Field label="Username">
              <input
                className="vsf-input w-full"
                placeholder="petani2"
                value={form.username ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
              />
              <FieldError message={fieldError(fieldErrors, 'username')} />
            </Field>
            <Field label="Email">
              <input
                className="vsf-input w-full"
                type="email"
                placeholder="nama@contoh.id"
                value={form.email ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
              <FieldError message={fieldError(fieldErrors, 'email')} />
            </Field>
            <Field label="Level">
              <select
                className="vsf-input w-full"
                value={form.level ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, level: e.target.value }))}
              >
                <option value="">— pilih —</option>
                {LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
              <FieldError message={fieldError(fieldErrors, 'level')} />
            </Field>
            <Field label={editingId ? 'Password baru (kosongkan bila tidak diganti)' : 'Password'}>
              <input
                className="vsf-input w-full"
                type="password"
                placeholder="min 8 karakter"
                value={form.password ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              />
              <FieldError message={fieldError(fieldErrors, 'password')} />
            </Field>
            <label className="flex items-center gap-2 text-[13px] text-slate-700">
              <input
                type="checkbox"
                checked={form.is_demo === 'ya'}
                onChange={(e) => setForm((f) => ({ ...f, is_demo: e.target.checked ? 'ya' : '' }))}
              />
              Akun demo (data auto-hapus 1 jam)
            </label>
          </>
        }
        notes={[
          'Live: GET /user (daftar) · POST /user (tambah) · PUT /user/:id (ubah) · DELETE /user/:id (hapus) — Bearer JWT.',
          'Kolom backend: id, username, email, level, is_demo — “terakhir login” tidak tersedia di kontrak sehingga diganti email.',
          'Level menentukan sidebar: petani hanya Dashboard / Sensor / Tanam Saya.',
          'Akun demo = admin read-only; hapus akun sendiri ditolak backend (422) — pesan tampil di dialog.',
        ]}
        actions={(r, ask) => (
          <>
            <BtnEdit name={String(r.username)} onClick={() => openEdit(r)} />
            {String(r.username) !== saya && <BtnHapus label={String(r.username)} id={String(r.id ?? '')} onPick={ask} />}
          </>
        )}
      />
    </>
  )
}

/* ================ 17 · PROFIL — GET /profil (per role) ================ */

type ProfilPayload = { user?: UserRow | null }
type SandiForm = { password_lama: string; password: string; password_confirmation: string }

export function ProfilPage() {
  const handleApiError = useApiError()
  // Profil selalu milik SENDIRI → endpoint /profil (admin, petani & demo sama).
  const { data, loading, error, reload } = useApiObject<ProfilPayload>('/profil')
  const user = data?.user ?? null

  const [banner, setBanner] = useState<string | null>(null)
  const [edit, setEdit] = useState<{ username: string; email: string } | null>(null)
  const [editErr, setEditErr] = useState<Record<string, string[]>>({})
  const [editError, setEditError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [sandi, setSandi] = useState<SandiForm>({ password_lama: '', password: '', password_confirmation: '' })
  const [sandiErr, setSandiErr] = useState<Record<string, string[]>>({})
  const [sandiError, setSandiError] = useState<string | null>(null)
  const [savingSandi, setSavingSandi] = useState(false)

  useEffect(() => {
    if (!banner) return
    const id = setTimeout(() => setBanner(null), 4000)
    return () => clearTimeout(id)
  }, [banner])

  // Form terkontrol “turunan”: belum disentuh → ikut data server; sudah diedit → ikut input.
  const nilai = edit ?? { username: user?.username ?? '', email: user?.email ?? '' }

  async function simpanProfil() {
    if (saving) return
    setEditError(null)
    const errs: Record<string, string[]> = {}
    if (nilai.username.trim().length < 3) errs.username = ['Nama pengguna min 3 karakter.']
    setEditErr(errs)
    if (Object.keys(errs).length > 0) return

    setSaving(true)
    try {
      const res = await api.post('/profil/update', {
        username: nilai.username.trim(),
        email: nilai.email.trim() || null,
      })
      const msg = String((res.data as { message?: unknown })?.message ?? 'Perubahan tersimpan.')
      setBanner(msg)
      setEdit(null)
      reload()
    } catch (err) {
      const f = handleApiError(err)
      setEditErr(f.fieldErrors)
      setEditError(f.message)
    } finally {
      setSaving(false)
    }
  }

  async function gantiSandi() {
    if (savingSandi) return
    setSandiError(null)
    const errs: Record<string, string[]> = {}
    if (sandi.password.length < 8) errs.password = ['Password baru min 8 karakter.']
    if (sandi.password !== sandi.password_confirmation)
      errs.password_confirmation = ['Konfirmasi password tidak cocok.']
    setSandiErr(errs)
    if (Object.keys(errs).length > 0) return

    setSavingSandi(true)
    try {
      const res = await api.post('/profil/password', {
        password_lama: sandi.password_lama,
        password: sandi.password,
        password_confirmation: sandi.password_confirmation,
      })
      const msg = String((res.data as { message?: unknown })?.message ?? 'Perubahan tersimpan.')
      setBanner(msg)
      setSandi({ password_lama: '', password: '', password_confirmation: '' })
      setSandiErr({})
    } catch (err) {
      const f = handleApiError(err)
      setSandiErr(f.fieldErrors)
      setSandiError(f.message)
    } finally {
      setSavingSandi(false)
    }
  }

  const daftarError = error ?? null

  return (
    <div className="mx-auto max-w-[1180px] grid gap-4 vsf-stagger">
      {banner && (
        <div
          role="status"
          className="vsf-banner rounded-card border border-arutmin-moss bg-arutmin-mint/40 px-4 py-2 text-[13px] text-arutmin-forest flex items-start gap-2"
        >
          <IkonOk className="mt-[2px] shrink-0" />
          <span>{banner}</span>
        </div>
      )}

      {daftarError && (
        <div
          role="alert"
          className="vsf-banner rounded-card vsf-tone-error px-4 py-2 text-[13px] flex flex-wrap items-center gap-3"
        >
          <span className="flex items-center gap-2">
            <IkonSalah className="shrink-0" />
            <span>{daftarError}</span>
          </span>
          <button type="button" className="vsf-input rounded-full font-semibold" onClick={reload}>
            Coba lagi
          </button>
        </div>
      )}

      {/* Kartu identitas */}
      <section className="vsf-card p-4 sm:p-5">
        <div className="text-[12px] uppercase tracking-[.14em] text-slate-500 font-bold">Kartu identitas</div>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <div className="h-[64px] w-[64px] rounded-full border border-arutmin-moss bg-arutmin-mint/40 grid place-items-center text-arutmin-forest font-bold uppercase">
            {loading && !user ? '…' : (user?.username ?? '?').slice(0, 2) || '—'}
          </div>
          <div>
            <div className="text-[16px] font-bold">{loading && !user ? 'Memuat…' : cell(user?.username)}</div>
            <div className="text-[13px] text-slate-600">
              username: {cell(user?.username)} • level: {cell(user?.level)} • email: {cell(user?.email)}
            </div>
          </div>
          {!loading && user && (
            <div className="ml-auto">
              <StatusBadge
                tone={user.is_demo ? 'warning' : 'online'}
                label={user.is_demo ? 'Akun demo' : 'Akun aktif'}
              />
            </div>
          )}
        </div>
      </section>

      {/* Edit profil */}
      <section className="vsf-card p-4 sm:p-5">
        <div className="text-[12px] uppercase tracking-[.14em] text-slate-500 font-bold">Edit profil</div>
        {editError && (
          <div
            role="alert"
            className="mt-3 vsf-banner rounded-input vsf-tone-error px-3 py-2 text-[13px] flex items-start gap-2"
          >
            <IkonSalah className="mt-[2px] shrink-0" />
            <span>{editError}</span>
          </div>
        )}
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Nama">
            <input
              className="vsf-input w-full"
              value={nilai.username}
              disabled={!user}
              onChange={(e) => setEdit({ ...nilai, username: e.target.value })}
            />
            <FieldError message={fieldError(editErr, 'username')} />
          </Field>
          <Field label="Email">
            <input
              className="vsf-input w-full"
              type="email"
              value={nilai.email}
              disabled={!user}
              onChange={(e) => setEdit({ ...nilai, email: e.target.value })}
            />
            <FieldError message={fieldError(editErr, 'email')} />
          </Field>
        </div>
        <button className="vsf-btn-primary mt-3" disabled={!user || saving} onClick={() => void simpanProfil()}>
          {saving && <span className="vsf-spinner" />}
          {saving ? 'Menyimpan…' : 'Simpan Perubahan'}
        </button>
      </section>

      {/* Ganti password */}
      <section className="vsf-card p-4 sm:p-5">
        <div className="text-[12px] uppercase tracking-[.14em] text-slate-500 font-bold">Ganti password</div>
        <div className="mt-1 text-[12px] text-slate-500">Kata sandi lama diperiksa sebelum diganti.</div>
        {sandiError && (
          <div
            role="alert"
            className="mt-3 vsf-banner rounded-input vsf-tone-error px-3 py-2 text-[13px] flex items-start gap-2"
          >
            <IkonSalah className="mt-[2px] shrink-0" />
            <span>{sandiError}</span>
          </div>
        )}
        <div className="mt-3 grid gap-3 max-w-sm">
          <Field label="Password lama">
            <input
              className="vsf-input w-full"
              type="password"
              value={sandi.password_lama}
              onChange={(e) => setSandi((s) => ({ ...s, password_lama: e.target.value }))}
            />
            <FieldError message={fieldError(sandiErr, 'password_lama')} />
          </Field>
          <Field label="Password baru">
            <input
              className="vsf-input w-full"
              type="password"
              value={sandi.password}
              onChange={(e) => setSandi((s) => ({ ...s, password: e.target.value }))}
            />
            <FieldError message={fieldError(sandiErr, 'password')} />
          </Field>
          <Field label="Ulangi password baru">
            <input
              className="vsf-input w-full"
              type="password"
              value={sandi.password_confirmation}
              onChange={(e) => setSandi((s) => ({ ...s, password_confirmation: e.target.value }))}
            />
            <FieldError message={fieldError(sandiErr, 'password_confirmation')} />
          </Field>
        </div>
        <button className="vsf-btn-primary mt-3" disabled={savingSandi} onClick={() => void gantiSandi()}>
          {savingSandi && <span className="vsf-spinner" />}
          {savingSandi ? 'Memperbarui…' : 'Perbarui Password'}
        </button>
      </section>

      <section className="vsf-card p-4 sm:p-5">
        <div className="text-[12px] uppercase tracking-[.14em] text-slate-500 font-bold">Tentang layar ini</div>
        <ul className="mt-2 list-disc pl-5 text-[13px] text-slate-700 leading-relaxed">
          <li>Live: GET /profil (identitas sesuai role) · POST /profil/update · POST /profil/password — Bearer JWT.</li>
          <li>Daftar user (GET /user) hanya untuk pengelola; role yang ditolak mendapat pesan ramah tanpa data.</li>
          <li>State: password salah / tidak cocok → error inline per field. Sukses → banner hijau ‘Perubahan tersimpan’.</li>
        </ul>
      </section>
    </div>
  )
}
