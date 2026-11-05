import { fieldError } from '../../lib/crudApi'
import { DialogMaster } from '../master/MasterKit'
import { KolomSandi } from '../pengguna/KolomSandi'

export type FormSandi = { password_lama: string; password: string; password_confirmation: string }

export function DialogGantiSandi({
  form,
  setForm,
  fieldErrors,
  galat,
  menyimpan,
  onTutup,
  onSimpan,
}: {
  form: FormSandi
  setForm: (f: FormSandi) => void
  fieldErrors: Record<string, string[]>
  galat: string | null
  menyimpan: boolean
  onTutup: () => void
  onSimpan: () => void
}) {
  const adaKonfirmasi = form.password_confirmation !== ''
  const cocok = form.password === form.password_confirmation
  return (
    <DialogMaster
      judul="Ganti Password"
      sub="Password lama diperiksa sebelum diganti."
      galat={galat}
      menyimpan={menyimpan}
      simpan="Perbarui"
      onTutup={onTutup}
      onSimpan={onSimpan}
    >
      <KolomSandi
        id="sandi-lama"
        label="Password lama"
        nilai={form.password_lama}
        onUbah={(v) => setForm({ ...form, password_lama: v })}
        galat={fieldError(fieldErrors, 'password_lama')}
        placeholder="Password saat ini"
        autoComplete="current-password"
      />
      <KolomSandi
        id="sandi-baru"
        label="Password baru"
        nilai={form.password}
        onUbah={(v) => setForm({ ...form, password: v })}
        galat={fieldError(fieldErrors, 'password')}
        meter
        acak
      />
      <KolomSandi
        id="sandi-ulang"
        label="Ulangi password baru"
        nilai={form.password_confirmation}
        onUbah={(v) => setForm({ ...form, password_confirmation: v })}
        galat={fieldError(fieldErrors, 'password_confirmation') ?? (adaKonfirmasi && !cocok ? 'Konfirmasi password tidak cocok.' : undefined)}
        placeholder="Ketik ulang password baru"
      />
      {adaKonfirmasi && cocok && form.password && (
        <p className="text-[12px] font-semibold text-arutmin-forest" role="status">Konfirmasi cocok.</p>
      )}
    </DialogMaster>
  )
}
