import { useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Ikon, type NamaIkon } from './Ikon'

export type PillItem = { to: string; label: string; ikon?: NamaIkon }

/**
 * Nav pill: submenu grup yang sedang aktif. Pil hijau digambar lewat CSS pada item aktif
 * (`.is-aktif`) — tidak ada pembacaan layout saat render, supaya paint pertama tidak tertahan.
 */
export function PillNav({ items, label, className = '' }: { items: PillItem[]; label: string; className?: string }) {
  const { pathname } = useLocation()
  const wrap = useRef<HTMLDivElement>(null)
  const aktif = items.findIndex((i) => pathname === i.to || pathname.startsWith(`${i.to}/`))

  useEffect(() => {
    // Geser item aktif ke tengah HANYA di dalam daftar pil (bukan scrollIntoView):
    // scrollIntoView pada elemen di header sticky ikut menggulung halaman ke atas.
    // Dijalankan di frame berikutnya (setelah paint) dan hanya bila daftar memang meluap.
    const id = requestAnimationFrame(() => {
      const el = wrap.current
      const a = el?.querySelector<HTMLElement>('[data-aktif="true"]')
      if (!el || !a || el.scrollWidth <= el.clientWidth) return
      el.scrollTo({ left: a.offsetLeft - (el.clientWidth - a.offsetWidth) / 2 })
    })
    return () => cancelAnimationFrame(id)
  }, [pathname, items.length])

  if (items.length === 0) return null
  return (
    <nav aria-label={label} className={`vsf-pillnav ${className}`}>
      <div ref={wrap} className="vsf-pillnav-track">
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
