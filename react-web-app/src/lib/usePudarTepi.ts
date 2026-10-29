import { useEffect } from 'react'

/** Elemen yang ikut memudar; hero (anak pertama main) dan elemen bersarang dikecualikan. */
const SEL = 'main > :not(:first-child) :is(.vsf-card, .vsf-kaca, .vsf-judul-latar, .vsf-eyebrow, #tim .vsf-muncul:not(.group), #tim img)'
/** Kotak mask dilebarkan sekian px ke segala arah agar bayangan/rim kartu tidak terpotong. */
const PAD = 40
const VARS = ['--p1', '--p2', '--p3', '--p4']

/**
 * Empat batas pudar (px, relatif ke kotak mask) untuk elemen di [top,bottom] viewport:
 * transparan sampai p1 → buram penuh di p2 … p3 → transparan lagi di p4.
 * null bila elemen tidak menyentuh zona atas (di bawah header) maupun bawah layar.
 */
export function hitungPudar(top: number, bottom: number, vh: number, hb: number) {
  const y1 = hb - 6
  const y2 = hb + 40
  const y3 = vh - 44
  const y4 = vh - 8
  const diAtas = bottom > 0 && top < y2
  const diBawah = bottom > y3 && top < vh
  if (!diAtas && !diBawah) return null
  const o = top - PAD
  return [y1 - o, y2 - o, y3 - o, y4 - o]
}

type Butir = { el: HTMLElement; top: number; bottom: number; aktif: boolean }

function bersihkan(el: HTMLElement) {
  el.classList.remove('vsf-pudar')
  for (const v of VARS) el.style.removeProperty(v)
}

/**
 * Konten yang melewati tepi atas (di bawah header) dan bawah layar memudar bertahap; latar tetap utuh.
 * Mulus: posisi elemen di-cache sekali (koordinat dokumen), jadi saat gulir TIDAK ada pembacaan
 * layout — hanya aritmetika + tulis style untuk beberapa elemen di zona, satu kali per frame.
 */
export function usePudarTepi(aktif: boolean) {
  useEffect(() => {
    if (!aktif || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined
    let butir: Butir[] = []
    let vh = window.innerHeight
    let hb = 70
    let raf = 0

    const ukur = () => {
      const sy = window.scrollY
      vh = window.innerHeight
      hb = document.querySelector('.vsf-topbar .vsf-bilah')?.getBoundingClientRect().bottom ?? 70
      const kini = new Map(butir.map((b) => [b.el, b.aktif]))
      butir = [...document.querySelectorAll<HTMLElement>(SEL)]
        .filter((el) => !el.parentElement?.closest(SEL))
        .map((el) => {
          const r = el.getBoundingClientRect()
          return { el, top: r.top + sy, bottom: r.bottom + sy, aktif: kini.get(el) ?? false }
        })
      minta()
    }

    const jalan = () => {
      raf = 0
      const sy = window.scrollY
      for (const b of butir) {
        const p = hitungPudar(b.top - sy, b.bottom - sy, vh, hb)
        if (!p) {
          if (b.aktif) {
            bersihkan(b.el)
            b.aktif = false
          }
          continue
        }
        if (!b.aktif) {
          b.el.classList.add('vsf-pudar')
          b.aktif = true
        }
        for (let i = 0; i < 4; i++) b.el.style.setProperty(VARS[i], `${p[i].toFixed(1)}px`)
      }
    }
    function minta() {
      if (!raf) raf = requestAnimationFrame(jalan)
    }

    ukur()
    // animasi masuk (.vsf-muncul) menggeser elemen ±24px lalu selesai; ukur ulang setelahnya
    const t1 = window.setTimeout(ukur, 900)
    const t2 = window.setTimeout(ukur, 2500)
    const ro = new ResizeObserver(ukur)
    const main = document.querySelector('main')
    if (main) ro.observe(main)
    window.addEventListener('scroll', minta, { passive: true })
    window.addEventListener('resize', ukur)
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
      ro.disconnect()
      window.removeEventListener('scroll', minta)
      window.removeEventListener('resize', ukur)
      cancelAnimationFrame(raf)
      document.querySelectorAll<HTMLElement>('.vsf-pudar').forEach(bersihkan)
    }
  }, [aktif])
}
