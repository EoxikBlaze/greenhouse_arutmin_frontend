import type { ReactNode } from 'react'

/** Satu kolom isian angka dengan label, galat, dan aksi opsional di kanan (mis. "Ambil bacaan"). */
export function Isian({
  label,
  value,
  onChange,
  galat,
  contoh,
  aksi,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  galat?: string
  contoh?: string
  aksi?: ReactNode
}) {
  return (
    <label className="block min-w-0 text-[13px] font-semibold text-slate-700">
      {label}
      <span className="mt-1 flex gap-2">
        <input
          className="vsf-input w-full min-w-0"
          inputMode="decimal"
          value={value}
          placeholder={contoh}
          aria-invalid={galat ? true : undefined}
          onChange={(e) => onChange(e.target.value)}
        />
        {aksi}
      </span>
      {galat && <span className="vsf-field-error block font-normal">{galat}</span>}
    </label>
  )
}
