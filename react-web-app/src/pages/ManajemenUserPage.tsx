import { useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api'
import { useApiError, useApiList } from '../lib/crudApi'
import { useAuth } from '../lib/authContext'
import { hitungPerLevel, LEVELS, saring, type UserRow } from '../lib/pengguna'
import { Ikon } from '../components/Ikon'
import { AksiBaris, DialogHapusMaster, MasterFrame, TabelMaster, type HapusTarget, type KolomMaster } from '../components/master/MasterKit'
import { DialogDetailUser } from '../components/pengguna/DialogDetailUser'
import { DialogUser, type FormUser } from '../components/pengguna/DialogUser'
import { Avatar, LencanaDemo, LencanaLevel } from '../components/pengguna/Penanda'
import { RingkasanUser } from '../components/pengguna/RingkasanUser'

const FORM_KOSONG: FormUser = { username: '', email: '', level: 'petani', password: '', demo: false }

/** Validasi klien hanya “wajib isi” minimal — batas & enum tetap urusan backend. */
function validasi(form: FormUser, mengubah: boolean): Record<string, string[]> {
  const errs: Record<string, string[]> = {}
  if (form.username.trim().length < 3) errs.username = ['Nama pengguna min 3 karakter.']
  if (!mengubah && form.password.length < 8) errs.password = ['Password min 8 karakter.']
  if (mengubah && form.password && form.password.length < 8) errs.password = ['Password min 8 karakter.']
  if (!(LEVELS as readonly string[]).includes(form.level)) errs.level = ['Pilih level akses.']
  return errs
}

const cell = (v: unknown) => (v === undefined || v === null || String(v).trim() === '' ? '—' : String(v))

/* ===== Manajemen User — GET/POST/PUT/DELETE /user (admin; akun demo hanya melihat) ===== */
export function ManajemenUserPage() {
  const handleApiError = useApiError()
  const { username: saya, demo } = useAuth()
  const { rows, loading, error, reload } = useApiList<UserRow>('/user')

  const [kata, setKata] = useState('')
  const [level, setLevel] = useState<string | null>(null)
  const tampil = useMemo(() => saring(rows, kata, level), [rows, kata, level])
  const perLevel = useMemo(() => hitungPerLevel(rows), [rows])

  const [detail, setDetail] = useState<UserRow | null>(null)
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormUser>(FORM_KOSONG)
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

  function tutupForm() {
    setOpen(false)
    setForm(FORM_KOSONG)
    setEditingId(null)
    setFieldErrors({})
    setFormError(null)
  }

  function bukaTambah() {
    setForm(FORM_KOSONG)
    setEditingId(null)
    setFieldErrors({})
    setFormError(null)
    setOpen(true)
  }

  function bukaUbah(r: UserRow) {
    setDetail(null)
    setForm({
      username: r.username == null ? '' : String(r.username),
      email: r.email == null ? '' : String(r.email),
      level: r.level == null ? 'petani' : String(r.level),
      password: '',
      demo: !!r.is_demo,
    })
    setEditingId(r.id == null ? null : String(r.id))
    setFieldErrors({})
    setFormError(null)
    setOpen(true)
  }

  function mintaHapus(r: UserRow) {
    setDetail(null)
    setDeleteError(null)
    setHapus({ label: cell(r.username), id: String(r.id ?? '') })
  }

  async function simpan() {
    if (submitting) return
    setFormError(null)
    const errs = validasi(form, editingId !== null)
    setFieldErrors(errs)
    if (Object.keys(errs).length > 0) return

    setSubmitting(true)
    try {
      const payload: Record<string, unknown> = {
        username: form.username.trim(),
        email: form.email.trim() || null,
        level: form.level || 'petani',
        is_demo: form.demo,
      }
      if (form.password) payload.password = form.password

      if (editingId) await api.put(`/user/${editingId}`, payload)
      else await api.post('/user', payload)

      const ubah = editingId !== null
      tutupForm()
      setFlash(ubah ? 'Data user diperbarui.' : 'User berhasil ditambahkan.')
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

  async function hapusUser(id: string) {
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

  const kolom: KolomMaster<UserRow>[] = [
    {
      key: 'username',
      header: 'Pengguna',
      render: (r) => (
        <button type="button" className="vsf-pengguna" onClick={() => setDetail(r)} aria-label={`Lihat detail ${cell(r.username)}`}>
          <Avatar nama={r.username} />
          <span className="min-w-0">
            <b className="block truncate text-tinta">{cell(r.username)}</b>
            {String(r.username) === saya && <small className="vsf-master-id">Anda</small>}
          </span>
        </button>
      ),
    },
    { key: 'email', header: 'Email', render: (r) => <span className="break-all">{cell(r.email)}</span> },
    { key: 'level', header: 'Level', render: (r) => <LencanaLevel level={r.level} /> },
    { key: 'demo', header: 'Status', render: (r) => (r.is_demo ? <LencanaDemo /> : <span className="text-abu">Aktif</span>) },
  ]

  const alasanKunci = 'Akun demo tidak boleh mengelola user'

  return (
    <>
      <MasterFrame
        judul="Manajemen User"
        deskripsi="Akun yang bisa masuk ke GARAP, beserta level aksesnya."
        jumlah={`${rows.length} akun`}
        flash={flash}
      >
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className="vsf-cari">
            <Ikon nama="cari" className="h-4 w-4" />
            <input
              type="search"
              className="vsf-input"
              placeholder="Cari username atau email…"
              aria-label="Cari user"
              value={kata}
              onChange={(e) => setKata(e.target.value)}
            />
          </label>
          <button
            type="button"
            className="vsf-btn-primary ml-auto"
            disabled={demo}
            title={demo ? alasanKunci : undefined}
            onClick={bukaTambah}
          >
            <Ikon nama="tambah" className="h-4 w-4" />
            Tambah User
          </button>
        </div>
        <RingkasanUser total={rows.length} perLevel={perLevel} level={level} onLevel={setLevel} />
        <TabelMaster
          label="Daftar user"
          kolom={kolom}
          rows={tampil}
          rowKey={(r) => String(r.id ?? r.username)}
          memuat={loading}
          galat={error}
          onUlang={reload}
          kosong={rows.length === 0 ? 'Belum ada akun.' : 'Tidak ada user yang cocok dengan pencarian atau filter.'}
          aksi={(r) => (
            <AksiBaris
              nama={cell(r.username)}
              terkunci={demo}
              alasan={alasanKunci}
              onUbah={() => bukaUbah(r)}
              onHapus={String(r.username) !== saya ? () => mintaHapus(r) : undefined}
            />
          )}
        />
      </MasterFrame>

      {detail && (
        <DialogDetailUser
          user={detail}
          sendiri={String(detail.username) === saya}
          terkunci={demo}
          onTutup={() => setDetail(null)}
          onUbah={() => bukaUbah(detail)}
          onHapus={String(detail.username) !== saya ? () => mintaHapus(detail) : undefined}
        />
      )}
      {open && (
        <DialogUser
          mengubah={editingId !== null}
          form={form}
          setForm={setForm}
          fieldErrors={fieldErrors}
          galat={formError}
          menyimpan={submitting}
          onTutup={tutupForm}
          onSimpan={() => void simpan()}
        />
      )}
      {hapus && (
        <DialogHapusMaster
          target={hapus}
          menghapus={deleting}
          galat={deleteError}
          onYa={() => void hapusUser(hapus.id)}
          onBatal={() => setHapus(null)}
        />
      )}
    </>
  )
}
