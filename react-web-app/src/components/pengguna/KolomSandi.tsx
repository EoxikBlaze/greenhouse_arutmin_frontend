import { useState } from 'react'
import { buatPassword, kekuatanPassword } from '../../lib/pengguna'
import { FieldError } from '../CrudScreen'
import { Ikon } from '../Ikon'

/** Kolom password: tombol mata; opsional meter kekuatan dan tombol Acak. */
export function KolomSandi({
  id,
  label,
  nilai,
  onUbah,
  galat,
  placeholder = 'min 8 karakter',
  autoComplete = 'new-password',
  meter = false,
  acak = false,
}: {
  id: string
  label: string
  nilai: string
  onUbah: (v: string) => void
  galat?: string
  placeholder?: string
  autoComplete?: string
  meter?: boolean
  acak?: boolean
}) {
  const [lihat, setLihat] = useState(false)
  const kuat = kekuatanPassword(nilai)
  return (
    <div>
      <label htmlFor={id} className="vsf-label-form">{label}</label>
      <div className="flex gap-2">
        <div className="vsf-sandi min-w-0 flex-1">
          <input
            id={id}
            className="vsf-input w-full"
            type={lihat ? 'text' : 'password'}
            placeholder={placeholder}
            autoComplete={autoComplete}
            aria-invalid={!!galat}
            value={nilai}
            onChange={(e) => onUbah(e.target.value)}
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
        {acak && (
          <button
            type="button"
            className="vsf-btn-secondary vsf-btn-kecil"
            onClick={() => {
              onUbah(buatPassword())
              setLihat(true)
            }}
          >
            <Ikon nama="siklus" className="h-4 w-4" />
            Acak
          </button>
        )}
      </div>
      {meter && nilai && (
        <div className="vsf-meter-sandi" data-skor={kuat.skor} role="status">
          <span aria-hidden><i /><i /><i /></span>
          {kuat.label}
        </div>
      )}
      <FieldError message={galat} />
    </div>
  )
}
