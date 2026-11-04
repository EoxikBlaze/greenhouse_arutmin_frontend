/**
 * Switch liquid glass: rel kaca ber-tint hijau saat ON, thumb kaca yang melar saat ditekan
 * (interaktif) lalu meluncur dengan spring. Role switch + zona sentuh 44 px untuk HP.
 */
export function SwitchKaca({
  nyala,
  onUbah,
  label,
  disabled = false,
}: {
  nyala: boolean
  onUbah: (v: boolean) => void
  label: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={nyala}
      aria-label={label}
      disabled={disabled}
      onClick={() => onUbah(!nyala)}
      className="vsf-switch-kaca"
      data-nyala={nyala}
    >
      <span aria-hidden className="vsf-switch-kaca-thumb" />
    </button>
  )
}
