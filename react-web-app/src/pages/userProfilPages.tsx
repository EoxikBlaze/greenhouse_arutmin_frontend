import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { fieldError, useApiError } from '../lib/crudApi'
import { Field, FieldError } from '../components/CrudScreen'
import { useApiObject } from '../lib/useApiObject'
import { StatusBadge } from '../components/StatusBadge'
import { Ikon } from '../components/Ikon'
import { bacaKaca, PILIHAN_KACA, setKaca, type Kaca } from '../lib/kaca'
import type { UserRow } from '../lib/pengguna'

function cell(v: unknown): string {
  return v === undefined || v === null || String(v).trim() === '' ? '—' : String(v)
}

/* ================ 17 · PROFIL — GET /profil (per role) ================ */

type ProfilPayload = { user?: UserRow | null }
type SandiForm = { password_lama: string; password: string; password_confirmation: string }

export function ProfilPage() {
  const handleApiError = useApiError()
  // Profil selalu milik SENDIRI → endpoint /profil (admin, petani & demo sama).
  const { data, loading, error, reload } = useApiObject<ProfilPayload>('/profil')
  const user = data?.user ?? null

  const [kaca, setKacaState] = useState<Kaca>(bacaKaca)
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
    <div className="vsf-halaman vsf-stagger">
      {banner && (
        <div
          role="status"
          className="vsf-banner rounded-card border border-arutmin-moss bg-arutmin-mint/40 px-4 py-2 text-[13px] text-arutmin-forest flex items-start gap-2"
        >
          <Ikon nama="ok" className="h-4 w-4 mt-[2px] shrink-0" />
          <span>{banner}</span>
        </div>
      )}

      {daftarError && (
        <div
          role="alert"
          className="vsf-banner rounded-card vsf-tone-error px-4 py-2 text-[13px] flex flex-wrap items-center gap-3"
        >
          <span className="flex items-center gap-2">
            <Ikon nama="salah" className="h-4 w-4 shrink-0" />
            <span>{daftarError}</span>
          </span>
          <button type="button" className="vsf-input rounded-full font-semibold" onClick={reload}>
            Coba lagi
          </button>
        </div>
      )}

      {/* Kartu identitas */}
      <section className="vsf-card p-4 sm:p-5">
        <div className="vsf-judul-bagian">Kartu identitas</div>
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
        <div className="vsf-judul-bagian">Edit profil</div>
        {editError && (
          <div
            role="alert"
            className="mt-3 vsf-banner rounded-input vsf-tone-error px-3 py-2 text-[13px] flex items-start gap-2"
          >
            <Ikon nama="salah" className="h-4 w-4 mt-[2px] shrink-0" />
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
        <div className="vsf-judul-bagian">Ganti password</div>
        <div className="mt-1 text-[12px] text-slate-500">Kata sandi lama diperiksa sebelum diganti.</div>
        {sandiError && (
          <div
            role="alert"
            className="mt-3 vsf-banner rounded-input vsf-tone-error px-3 py-2 text-[13px] flex items-start gap-2"
          >
            <Ikon nama="salah" className="h-4 w-4 mt-[2px] shrink-0" />
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
        <div className="vsf-judul-bagian">Tampilan kaca</div>
        <p className="mt-1 text-[12.5px] leading-relaxed text-slate-600">
          Atur seberapa tembus pandang kartu dan menu. Pilih Pekat bila teks sulit dibaca.
        </p>
        <div role="radiogroup" aria-label="Transparansi kaca" className="mt-3 flex flex-wrap gap-2">
          {PILIHAN_KACA.map((p) => (
            <button
              key={p.nilai}
              type="button"
              role="radio"
              aria-checked={kaca === p.nilai}
              className={kaca === p.nilai ? 'vsf-btn-primary' : 'vsf-btn-secondary'}
              onClick={() => {
                setKacaState(p.nilai)
                setKaca(p.nilai)
              }}
            >
              {p.label}
              <span className="hidden text-[12px] font-medium opacity-80 sm:inline">· {p.ket}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="vsf-card p-4 sm:p-5">
        <div className="vsf-judul-bagian">Tentang layar ini</div>
        <ul className="mt-2 list-disc pl-5 text-[13px] text-slate-700 leading-relaxed">
          <li>Live: GET /profil (identitas sesuai role) · POST /profil/update · POST /profil/password — Bearer JWT.</li>
          <li>Daftar user (GET /user) hanya untuk pengelola; role yang ditolak mendapat pesan ramah tanpa data.</li>
          <li>State: password salah / tidak cocok → error inline per field. Sukses → banner hijau ‘Perubahan tersimpan’.</li>
        </ul>
      </section>
    </div>
  )
}
