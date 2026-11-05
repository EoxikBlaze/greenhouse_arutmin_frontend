import { fieldError } from '../../lib/crudApi'
import { FieldError } from '../CrudScreen'
import { DialogMaster } from '../master/MasterKit'

export type FormProfil = { username: string; email: string }

export function DialogUbahProfil({
  form,
  setForm,
  fieldErrors,
  galat,
  menyimpan,
  onTutup,
  onSimpan,
}: {
  form: FormProfil
  setForm: (f: FormProfil) => void
  fieldErrors: Record<string, string[]>
  galat: string | null
  menyimpan: boolean
  onTutup: () => void
  onSimpan: () => void
}) {
  return (
    <DialogMaster
      judul="Ubah Profil"
      sub="Nama dan email yang dipakai di akun ini."
      galat={galat}
      menyimpan={menyimpan}
      onTutup={onTutup}
      onSimpan={onSimpan}
    >
      <div>
        <label htmlFor="profil-nama" className="vsf-label-form">Nama</label>
        <input
          id="profil-nama"
          className="vsf-input w-full"
          autoComplete="username"
          aria-invalid={!!fieldError(fieldErrors, 'username')}
          value={form.username}
          onChange={(e) => setForm({ ...form, username: e.target.value })}
        />
        <FieldError message={fieldError(fieldErrors, 'username')} />
      </div>
      <div>
        <label htmlFor="profil-email" className="vsf-label-form">Email</label>
        <input
          id="profil-email"
          className="vsf-input w-full"
          type="email"
          autoComplete="email"
          aria-invalid={!!fieldError(fieldErrors, 'email')}
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <FieldError message={fieldError(fieldErrors, 'email')} />
      </div>
    </DialogMaster>
  )
}
