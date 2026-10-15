import { useEffect, useState } from 'react'

/**
 * Banner mode demo (State Gallery .pen):
 * - aksi destruktif disabled (ditegakkan di level komponen)
 * - countdown "X menit lagi dihapus otomatis" — tick tiap 60 detik (role=status, polite)
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
      className="vsf-banner border-b border-arutmin-border bg-arutmin-mint/40 px-4 py-2 text-[13px] text-arutmin-forest"
      role="status"
      aria-live="polite"
    >
      <b>Mode Demo:</b> aksi destruktif dinonaktifkan. Data Demo: {menit} menit lagi dihapus otomatis.
    </div>
  )
}
