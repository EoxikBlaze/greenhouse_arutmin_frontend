import { LEVELS, LEVEL_INFO, type Level } from '../../lib/pengguna'

/** Strip ringkasan: jumlah total + per level. Klik level = filter; klik lagi = lepas. */
export function RingkasanUser({
  total,
  perLevel,
  level,
  onLevel,
}: {
  total: number
  perLevel: Record<Level, number>
  level: string | null
  onLevel: (l: string | null) => void
}) {
  return (
    <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Filter level">
      <button type="button" className="vsf-chip-ringkas" aria-pressed={level === null} onClick={() => onLevel(null)}>
        <b>{total}</b> Semua
      </button>
      {LEVELS.map((l) => (
        <button
          key={l}
          type="button"
          className="vsf-chip-ringkas"
          aria-pressed={level === l}
          onClick={() => onLevel(level === l ? null : l)}
        >
          <b>{perLevel[l]}</b> {LEVEL_INFO[l].label}
        </button>
      ))}
    </div>
  )
}
