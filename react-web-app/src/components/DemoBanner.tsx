import { useEffect, useState } from 'react'
import { Ikon } from './Ikon'

/**
 * Banner mode demo (State Gallery .pen):
 * - aksi destruktif disabled (ditegakkan di level komponen)
 * - countdown "X menit lagi dihapus otomatis" — tick tiap 60 detik (role=status, polite)
 * Poles ROMBAK-A: chip "DEMO" navy/emas + ikon SVG (bukan emoji) + shadow halus.
 * Logika countdown TIDAK diubah.
 */
export function DemoBanner({ demo }: { demo: boolean }) {
  const [menit, setMenit] = useState(60)

  useEffect(() => {
    if (!demo) return
    const id = setInterval(() => setMenit((m) => Math.max(0, m - 1)), 60_000)
    return () => clearInterval(id)
  }, [demo])

  if (!demo) return null
  return (
    <div
      className="vsf-banner flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-arutmin-border2 bg-[linear-gradient(90deg,rgba(233,205,83,.30)_0%,rgba(207,226,206,.55)_45%,rgba(244,247,242,.9)_100%)] px-4 py-2 text-[13px] text-arutmin-forest shadow-[0_10px_24px_-22px_rgba(7,21,39,.9)]"
      role="status"
      aria-live="polite"
    >
      <span className="vsf-eyebrow vsf-eyebrow-emas inline-flex items-center gap-1.5 rounded-full bg-navy px-2.5 py-0.5">
        <Ikon nama="peringatan" className="h-3 w-3" />
        Demo
      </span>
      <span>
        <b>Aksi destruktif dinonaktifkan.</b> Data Demo: {menit} menit lagi dihapus otomatis.
      </span>
    </div>
  )
}
