import { fieldError } from '../../lib/crudApi'
import { LEVELS, LEVEL_INFO } from '../../lib/pengguna'
import { FieldError } from '../CrudScreen'
import { DialogMaster } from '../master/MasterKit'
import { KolomSandi } from './KolomSandi'

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

      <KolomSandi
        id="user-password"
        label={mengubah ? 'Password baru' : 'Password'}
        nilai={form.password}
        onUbah={(v) => ubah({ password: v })}
        galat={fieldError(fieldErrors, 'password')}
        meter
        acak
      />

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
