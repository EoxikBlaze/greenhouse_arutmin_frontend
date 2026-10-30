import { useEffect, useRef, useState } from 'react'

/** Angka yang menghitung naik/turun mulus ke [target]; langsung loncat bila gerak dikurangi. */
export function useCountUp(target: number | null, ms = 600): number | null {
  const [tampil, setTampil] = useState<number | null>(target)
  const kini = useRef<number | null>(target)

  useEffect(() => {
    if (target === null || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      kini.current = target
      const id = requestAnimationFrame(() => setTampil(target))
      return () => cancelAnimationFrame(id)
    }
    const dari = kini.current ?? 0
    const mulai = performance.now()
    let id = 0
    const langkah = (t: number) => {
      const p = Math.min(1, (t - mulai) / ms)
      const nilai = dari + (target - dari) * (1 - Math.pow(1 - p, 3))
      kini.current = nilai
      setTampil(nilai)
      if (p < 1) id = requestAnimationFrame(langkah)
    }
    id = requestAnimationFrame(langkah)
    return () => cancelAnimationFrame(id)
  }, [target, ms])

  return tampil
}
