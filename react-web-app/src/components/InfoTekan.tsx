import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

type Gelembung = { judul: string; teks: string; href?: string; x: number; y: number; atas: boolean }

const TAHAN_MS = 450
const GESER_MAKS = 10

/**
 * Lapisan interaksi global untuk elemen ber-atribut data-info-*.
 *  • Tekan singkat  → membuka tautan (jika ada), jika tidak ada tautan → menampilkan penjelasan.
 *  • Tahan ≥ 0,45 dtk → menampilkan penjelasan (juga tombol "i" / "?" pada papan ketik).
 */
export function InfoTekan() {
  const navigate = useNavigate()
  const [g, setG] = useState<Gelembung | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const ditahan = useRef(false)
  const awal = useRef({ x: 0, y: 0 })

  const tutup = useCallback(() => setG(null), [])

  const buka = useCallback((el: HTMLElement) => {
    const r = el.getBoundingClientRect()
    const lebar = 320
    const x = Math.min(Math.max(r.left + r.width / 2, lebar / 2 + 12), window.innerWidth - lebar / 2 - 12)
    const atas = r.top > 240
    setG({
      judul: el.dataset.infoJudul ?? '',
      teks: el.dataset.infoTeks ?? '',
      href: el.dataset.infoHref,
      x,
      y: atas ? r.top - 10 : r.bottom + 10,
      atas,
    })
  }, [])

  const ikuti = useCallback(
    (href: string) => {
      if (href.startsWith('/')) navigate(href)
      else window.open(href, '_blank', 'noopener,noreferrer')
    },
    [navigate],
  )

  useEffect(() => {
    const cari = (t: EventTarget | null) => (t as HTMLElement | null)?.closest?.<HTMLElement>('[data-info-judul]') ?? null
    const adaTautanAsli = (t: EventTarget | null, batas: HTMLElement) => {
      const a = (t as HTMLElement | null)?.closest?.('a,button')
      return !!a && batas.contains(a)
    }

    const turun = (e: PointerEvent) => {
      const el = cari(e.target)
      if (!el) {
        if (!(e.target as HTMLElement).closest?.('[data-gelembung]')) setG(null)
        return
      }
      ditahan.current = false
      awal.current = { x: e.clientX, y: e.clientY }
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => {
        ditahan.current = true
        navigator.vibrate?.(12)
        buka(el)
      }, TAHAN_MS)
    }
    const geser = (e: PointerEvent) => {
      if (Math.hypot(e.clientX - awal.current.x, e.clientY - awal.current.y) > GESER_MAKS) window.clearTimeout(timer.current)
    }
    const batal = () => window.clearTimeout(timer.current)
    const klik = (e: MouseEvent) => {
      const el = cari(e.target)
      if (!el) return
      if (ditahan.current) {
        // klik susulan setelah tahan → jangan buka tautan
        e.preventDefault()
        e.stopPropagation()
        ditahan.current = false
        return
      }
      if (adaTautanAsli(e.target, el)) return
      const href = el.dataset.infoHref
      if (href) ikuti(href)
      else buka(el)
    }
    const tombol = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return setG(null)
      const el = cari(document.activeElement)
      if (!el || (e.target as HTMLElement).closest('a,button') === e.target) return
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        const href = el.dataset.infoHref
        if (href) ikuti(href)
        else buka(el)
      } else if (e.key === 'i' || e.key === '?') {
        buka(el)
      }
    }
    const menu = (e: Event) => {
      if (cari(e.target)) e.preventDefault() // cegah menu konteks saat tahan di layar sentuh
    }
    const gulir = () => setG(null)

    document.addEventListener('pointerdown', turun)
    document.addEventListener('pointermove', geser)
    document.addEventListener('pointerup', batal)
    document.addEventListener('pointercancel', batal)
    document.addEventListener('click', klik, true)
    document.addEventListener('keydown', tombol)
    document.addEventListener('contextmenu', menu)
    window.addEventListener('scroll', gulir, { passive: true })
    return () => {
      window.clearTimeout(timer.current)
      document.removeEventListener('pointerdown', turun)
      document.removeEventListener('pointermove', geser)
      document.removeEventListener('pointerup', batal)
      document.removeEventListener('pointercancel', batal)
      document.removeEventListener('click', klik, true)
      document.removeEventListener('keydown', tombol)
      document.removeEventListener('contextmenu', menu)
      window.removeEventListener('scroll', gulir)
    }
  }, [buka, ikuti])

  if (!g) return null
  return (
    <div
      data-gelembung
      role="dialog"
      aria-label={g.judul}
      className="vsf-gelembung vsf-kaca vsf-kaca-gelap fixed z-[60] w-[320px] max-w-[calc(100vw-24px)] rounded-2xl p-4 text-white"
      style={{ left: g.x, top: g.y, transform: `translate(-50%, ${g.atas ? '-100%' : '0'})` }}
    >
      <div className="text-[14px] font-bold">{g.judul}</div>
      <p className="mt-1 text-[13px] leading-relaxed text-white/85">{g.teks}</p>
      {g.href && (
        <button
          type="button"
          onClick={() => {
            ikuti(g.href!)
            tutup()
          }}
          className="mt-3 inline-flex min-h-[44px] sm:min-h-[36px] items-center rounded-full bg-white px-4 text-[12.5px] font-bold text-navy"
        >
          Buka tautan →
        </button>
      )}
    </div>
  )
}
