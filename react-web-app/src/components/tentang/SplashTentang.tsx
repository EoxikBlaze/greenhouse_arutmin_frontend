import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { GrupMerek, PilSosial } from './GrupMerek'

const SIAP_MAKS_MS = 1500
const TAMPIL_MS = 2600
const KELUAR_MS = 900
const KELUAR_CEPAT_MS = 450

/**
 * Splash pembuka Tentang Kami. Overlay transparan (latar foto = .vsf-latar halaman), jadi tanpa
 * backdrop-filter penuh layar. Saat keluar, grup merek diterbangkan (FLIP, transform saja) ke
 * posisi grup di hero halaman, lalu overlay dilepas dan hero asli tampil pada commit yang sama.
 */
export function SplashTentang({ target, onKeluar, onSelesai }: { target: () => HTMLElement | null; onKeluar: () => void; onSelesai: () => void }) {
  const grup = useRef<HTMLDivElement>(null)
  const tombol = useRef<HTMLButtonElement>(null)
  const [siap, setSiap] = useState(false)
  const [pergi, setPergi] = useState(false)
  const jalan = useRef(false)
  const terbaru = useRef({ target, onKeluar, onSelesai })
  useEffect(() => {
    terbaru.current = { target, onKeluar, onSelesai }
  })

  const keluar = useCallback((cepat: boolean) => {
    if (jalan.current) return
    jalan.current = true
    setPergi(true)
    const { target: ambil, onKeluar: k, onSelesai: s } = terbaru.current
    k()
    const g = grup.current
    const t = ambil()
    if (!g || !t) {
      s()
      return
    }
    const a = g.getBoundingClientRect()
    const b = t.getBoundingClientRect()
    const skala = a.width ? b.width / a.width : 1
    g.animate(
      [{ transform: 'none' }, { transform: `translate(${b.left - a.left}px, ${b.top - a.top}px) scale(${skala})` }],
      { duration: cepat ? KELUAR_CEPAT_MS : KELUAR_MS, easing: 'cubic-bezier(.65,0,.35,1)', fill: 'forwards' },
    ).onfinish = () => s()
  }, [])

  // mulai setelah latar & font siap (maks 1,5 dtk) agar animasi tidak patah oleh pemuatan
  useEffect(() => {
    let batal = false
    const bg = new Image()
    bg.src = '/bg-lanskap.jpg'
    const muat = Promise.all([bg.decode().catch(() => undefined), document.fonts?.ready])
    const batas = new Promise((r) => window.setTimeout(r, SIAP_MAKS_MS))
    void Promise.race([muat, batas]).then(() => {
      if (!batal) setSiap(true)
    })
    return () => {
      batal = true
    }
  }, [])

  useEffect(() => {
    if (!siap) return undefined
    tombol.current?.focus({ preventScroll: true })
    const t = window.setTimeout(() => keluar(false), TAMPIL_MS)
    return () => window.clearTimeout(t)
  }, [siap, keluar])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        keluar(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [keluar])

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Pembuka Tentang Kami"
      data-siap={siap ? '1' : '0'}
      data-pergi={pergi ? '1' : '0'}
      className="vsf-splash-overlay"
      onClick={() => keluar(true)}
    >
      <div className="vsf-splash-isi">
        <GrupMerek ref={grup} animasi className="origin-top-left" />
        <div className="vsf-sp-item vsf-sp-sosial mt-8" style={{ ['--d' as string]: '1.1s' }}>
          <PilSosial />
        </div>
      </div>
      <button
        ref={tombol}
        type="button"
        className="vsf-sp-item vsf-sp-lewati vsf-kaca vsf-kaca-gelap fixed bottom-5 right-5 min-h-[44px] rounded-full px-5 text-[13px] font-semibold"
        style={{ ['--d' as string]: '1.2s' }}
        onClick={(e) => {
          e.stopPropagation()
          keluar(true)
        }}
      >
        Lewati
      </button>
    </div>,
    document.body,
  )
}
