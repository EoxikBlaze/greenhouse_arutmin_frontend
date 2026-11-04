import { useLayoutEffect, useRef } from 'react'

const MS = 600

/**
 * Angka KPI yang bergeser mulus saat nilainya berubah; "—" bila kosong.
 * Teks ditulis langsung ke DOM lewat ref (tanpa setState per frame), supaya belasan angka
 * di dashboard tidak memicu belasan render React tiap frame. Muat pertama langsung tampil.
 */
export function AngkaHidup({ nilai, digit = 0, akhiran = '' }: { nilai: number | null; digit?: number; akhiran?: string }) {
  const el = useRef<HTMLSpanElement>(null)
  const kini = useRef<number | null>(null)
  const pertama = useRef(true)

  useLayoutEffect(() => {
    const node = el.current
    if (!node) return
    const tulis = (v: number | null) => {
      node.textContent = v === null ? `—${akhiran}` : `${v.toFixed(digit)}${akhiran}`
    }
    const dari = kini.current
    const langsung =
      pertama.current ||
      nilai === null ||
      dari === null ||
      dari === nilai ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    pertama.current = false
    if (langsung) {
      kini.current = nilai
      tulis(nilai)
      return
    }
    const mulai = performance.now()
    let id = 0
    const langkah = (t: number) => {
      const p = Math.min(1, (t - mulai) / MS)
      const v = dari + (nilai - dari) * (1 - Math.pow(1 - p, 3))
      kini.current = v
      tulis(v)
      if (p < 1) id = requestAnimationFrame(langkah)
    }
    id = requestAnimationFrame(langkah)
    return () => cancelAnimationFrame(id)
  }, [nilai, digit, akhiran])

  return <span ref={el} className="tabular-nums" />
}
