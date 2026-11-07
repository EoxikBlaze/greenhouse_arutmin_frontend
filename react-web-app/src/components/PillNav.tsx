import { useLayoutEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Ikon, type NamaIkon } from './Ikon'

export type PillItem = { to: string; label: string; ikon?: NamaIkon }

/**
 * Nav pill: submenu grup yang sedang aktif. Pil hijau meluncur ke item aktif
 * (transform saja, tanpa state, supaya tidak merender ulang tiap pindah halaman).
 */
export function PillNav({ items, label, className = '' }: { items: PillItem[]; label: string; className?: string }) {
  const { pathname } = useLocation()
  const wrap = useRef<HTMLDivElement>(null)
  const pil = useRef<HTMLSpanElement>(null)
  const aktif = items.findIndex((i) => pathname === i.to || pathname.startsWith(`${i.to}/`))

  useLayoutEffect(() => {
    const el = wrap.current
    const p = pil.current
    if (!el || !p) return
    const a = el.querySelector<HTMLElement>('[data-aktif="true"]')
    if (!a) {
      p.style.opacity = '0'
      return
    }
    // Baca semua geometri DOM terlebih dulu sebelum menulis style agar tidak memicu forced reflow berulang.
    const w = a.offsetWidth
    const left = a.offsetLeft
    const sw = el.scrollWidth
    const cw = el.clientWidth
    p.style.opacity = '1'
    p.style.width = `${w}px`
    p.style.transform = `translateX(${left}px)`
    // Geser item aktif ke tengah HANYA di dalam daftar pil (bukan scrollIntoView):
    // scrollIntoView pada elemen di header sticky ikut menggulung halaman ke atas.
    if (sw > cw) {
      el.scrollTo({ left: left - (cw - w) / 2 })
    }
  }, [pathname, items.length])

  useLayoutEffect(() => {
    const el = wrap.current
    const p = pil.current
    if (!el || !p) return
    const ro = new ResizeObserver(() => {
      const a = el.querySelector<HTMLElement>('[data-aktif="true"]')
      if (!a) {
        p.style.opacity = '0'
        return
      }
      const w = a.offsetWidth
      const left = a.offsetLeft
      p.style.opacity = '1'
      p.style.width = `${w}px`
      p.style.transform = `translateX(${left}px)`
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [items.length])

  if (items.length === 0) return null
  return (
    <nav aria-label={label} className={`vsf-pillnav ${className}`}>
      <div ref={wrap} className="vsf-pillnav-track">
        <span ref={pil} aria-hidden className="vsf-pillnav-pil" />
        {items.map((it, i) => (
          <Link
            key={it.to}
            to={it.to}
            data-aktif={i === aktif}
            aria-current={i === aktif ? 'page' : undefined}
            className={`vsf-pillnav-item${i === aktif ? ' is-aktif' : ''}`}
          >
            {it.ikon && <Ikon nama={it.ikon} className="h-5 w-5 shrink-0" />}
            <span>{it.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  )
}
