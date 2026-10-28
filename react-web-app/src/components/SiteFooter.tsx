import { Link } from 'react-router-dom'
import { Monogram } from './Monogram'

/**
 * Footer seragam: bilah liquid glass di dasar halaman (ikut ter-scroll, tidak menutup konten) — dipakai di dalam
 * aplikasi (AppShell, `pekat`: tint navy lebih tebal di atas latar terang) dan di landing page publik.
 * Sengaja minimal: identitas, satu tautan (Tentang kami), dan hak cipta.
 */
const TAHUN = new Date().getFullYear()

export function SiteFooter({ className = '', pekat = false }: { className?: string; pekat?: boolean }) {
  return (
    <footer className={`mt-auto w-full px-3 pb-3 sm:pb-4 ${pekat ? "sm:px-6" : "sm:px-5"} ${className}`}>
      <div className={`vsf-bilah ${pekat ? 'vsf-bilah-app' : ''} mx-auto flex w-full max-w-[1180px] flex-nowrap items-center justify-between gap-3 py-1.5 pl-3 pr-1.5 sm:gap-6 sm:py-2 sm:pl-4 sm:pr-2`}>
        <Link to="/" className="inline-flex min-h-[44px] min-w-0 items-center gap-3">
          <Monogram className="h-8 w-11 shrink-0" />
          <span className="min-w-0">
            <span className="block truncate font-display text-[14px] font-bold leading-tight sm:text-[15px]">Vertonik Smart Farm</span>
            <span className="hidden truncate text-[12px] text-white/75 sm:block">© {TAHUN} PT Arutmin Indonesia</span>
            <span className="sr-only">, ke beranda</span>
          </span>
        </Link>
        <Link to="/" className="vsf-bilah-tombol vsf-bilah-tombol-kaca shrink-0 whitespace-nowrap !min-h-[44px] sm:!min-h-[40px] !px-4 !text-[13px]">
          Tentang kami
        </Link>
      </div>
    </footer>
  )
}
