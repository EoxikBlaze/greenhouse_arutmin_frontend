import { useEffect, useRef } from 'react'

/**
 * Munculkan elemen `.vsf-muncul` di dalam container saat mendekati layar (sekali saja).
 * - Tanpa IntersectionObserver, semua langsung ditampilkan agar konten tak pernah tersembunyi.
 * - Scroll cepat bisa "melompati" elemen sehingga tak pernah terdeteksi: karena itu elemen yang
 *   sudah terlewati (di atas batas bawah layar) selalu ikut ditampilkan, termasuk lewat penyapuan
 *   saat scroll berhenti.
 */
export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  useEffect(() => {
    const root = ref.current
    if (!root) return undefined
    const items = new Set<HTMLElement>(root.querySelectorAll<HTMLElement>('.vsf-muncul'))
    const tampil = (el: Element) => el.classList.add('is-in')
    if (typeof IntersectionObserver === 'undefined') {
      items.forEach(tampil)
      return undefined
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          // terlihat, atau sudah terlewati (di atas layar) akibat scroll cepat
          if (e.isIntersecting || e.boundingClientRect.top < 0) {
            tampil(e.target)
            io.unobserve(e.target)
          }
        }
      },
      { threshold: 0, rootMargin: '0px 0px 700px 0px' },
    )
    items.forEach((i) => io.observe(i))
    // elemen yang baru dirender belakangan (mis. data langsung) ikut diamati
    const mo = new MutationObserver(() => {
      root.querySelectorAll<HTMLElement>('.vsf-muncul:not(.is-in)').forEach((el) => {
        if (!items.has(el)) {
          items.add(el)
          io.observe(el)
        }
      })
    })
    mo.observe(root, { childList: true, subtree: true })

    let t: number | undefined
    const sapu = () => {
      const batas = window.innerHeight + 700
      for (const el of items) {
        if (!el.classList.contains('is-in') && el.getBoundingClientRect().top < batas) {
          tampil(el)
          io.unobserve(el)
        }
      }
    }
    const onGulir = () => {
      window.clearTimeout(t)
      t = window.setTimeout(sapu, 90)
    }
    window.addEventListener('scroll', onGulir, { passive: true })
    window.addEventListener('resize', onGulir)
    return () => {
      window.clearTimeout(t)
      window.removeEventListener('scroll', onGulir)
      window.removeEventListener('resize', onGulir)
      mo.disconnect()
      io.disconnect()
    }
  }, [])
  return ref
}
