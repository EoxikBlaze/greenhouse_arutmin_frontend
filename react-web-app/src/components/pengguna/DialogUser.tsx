import { useState } from 'react'
import { fieldError } from '../../lib/crudApi'
import { buatPassword, kekuatanPassword, LEVELS, LEVEL_INFO } from '../../lib/pengguna'
import { FieldError } from '../CrudScreen'
import { Ikon } from '../Ikon'
import { DialogMaster } from '../master/MasterKit'

export type FormUser = { username: string; email: string; level: string; password: string; demo: boolean }

/** Popup Tambah/Ubah user: kartu pilih level, password dengan mata + meter + buat acak. */
export function DialogUser({
  mengubah,
  form,
  setForm,
  fieldErrors,
  galat,
  menyimpan,
  onTutup,
  onSimpan,
}: {
  mengubah: boolean
  form: FormUser
  setForm: (f: FormUser) => void
  fieldErrors: Record<string, string[]>
  galat: string | null
  menyimpan: boolean
  onTutup: () => void
  onSimpan: () => void
}) {
  const [lihat, setLihat] = useState(false)
  const kuat = kekuatanPassword(form.password)
  const ubah = (p: Partial<FormUser>) => setForm({ ...form, ...p })

  return (
    <DialogMaster
      judul={mengubah ? 'Ubah User' : 'Tambah User'}
      sub={mengubah ? 'Kosongkan password bila tidak ingin menggantinya.' : 'Akun baru langsung bisa dipakai masuk.'}
      galat={galat}
      menyimpan={menyimpan}
      onTutup={onTutup}
      onSimpan={onSimpan}
    >
      <div>
        <label htmlFor="user-username" className="vsf-label-form">Username</label>
        <input
          id="user-username"
          className="vsf-input w-full"
          placeholder="mis. petani2"
          autoComplete="off"
          aria-invalid={!!fieldError(fieldErrors, 'username')}
          value={form.username}
          onChange={(e) => ubah({ username: e.target.value })}
        />
        <FieldError message={fieldError(fieldErrors, 'username')} />
      </div>
      <div>
        <label htmlFor="user-email" className="vsf-label-form">Email</label>
        <input
          id="user-email"
          className="vsf-input w-full"
          type="email"
          placeholder="nama@contoh.id"
          autoComplete="off"
          aria-invalid={!!fieldError(fieldErrors, 'email')}
          value={form.email}
          onChange={(e) => ubah({ email: e.target.value })}
        />
        <FieldError message={fieldError(fieldErrors, 'email')} />
      </div>

      <fieldset>
        <legend className="vsf-label-form">Level akses</legend>
        <div className="vsf-kartu-level-grup">
          {LEVELS.map((l) => (
            <label key={l} className="vsf-kartu-level">
              <input
                type="radio"
                name="level"
                value={l}
                checked={form.level === l}
                onChange={() => ubah({ level: l })}
              />
              <span className="vsf-kartu-level-isi">
                <b>{LEVEL_INFO[l].label}</b>
                <small>{LEVEL_INFO[l].ringkas}</small>
              </span>
            </label>
          ))}
        </div>
        <FieldError message={fieldError(fieldErrors, 'level')} />
      </fieldset>

      <div>
        <label htmlFor="user-password" className="vsf-label-form">
          {mengubah ? 'Password baru' : 'Password'}
        </label>
        <div className="flex gap-2">
          <div className="vsf-sandi min-w-0 flex-1">
            <input
              id="user-password"
              className="vsf-input w-full"
              type={lihat ? 'text' : 'password'}
              placeholder="min 8 karakter"
              autoComplete="new-password"
              aria-invalid={!!fieldError(fieldErrors, 'password')}
              value={form.password}
              onChange={(e) => ubah({ password: e.target.value })}
            />
            <button
              type="button"
              className="vsf-sandi-mata"
              aria-label={lihat ? 'Sembunyikan password' : 'Tampilkan password'}
              aria-pressed={lihat}
              onClick={() => setLihat((v) => !v)}
            >
              <Ikon nama={lihat ? 'mataCoret' : 'mata'} className="h-4 w-4" />
            </button>
          </div>
          <button
            type="button"
            className="vsf-btn-secondary vsf-btn-kecil"
            onClick={() => {
              ubah({ password: buatPassword() })
              setLihat(true)
            }}
          >
            <Ikon nama="siklus" className="h-4 w-4" />
            Acak
          </button>
        </div>
        {form.password && (
          <div className="vsf-meter-sandi" data-skor={kuat.skor} role="status">
            <span aria-hidden><i /><i /><i /></span>
            {kuat.label}
          </div>
        )}
        <FieldError message={fieldError(fieldErrors, 'password')} />
      </div>

      <label className="vsf-saklar">
        <input type="checkbox" checked={form.demo} onChange={(e) => ubah({ demo: e.target.checked })} />
        <span className="vsf-saklar-isi">
          <b>Akun demo</b>
          <small>Hanya bisa melihat; datanya dihapus otomatis setelah 1 jam.</small>
        </span>
      </label>
    </DialogMaster>
  )
}
