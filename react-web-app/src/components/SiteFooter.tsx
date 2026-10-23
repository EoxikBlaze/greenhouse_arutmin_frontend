import { Link } from 'react-router-dom'
import { Monogram } from './Monogram'

/**
 * Footer seragam, selalu tampil di dasar layar (sticky bottom-0) dan tidak ikut tergulir — dipakai di dalam aplikasi (AppShell) dan halaman publik /tentang.
 * Sengaja minimal: identitas, satu tautan (Tentang kami), dan hak cipta.
 */
const TAHUN = new Date().getFullYear()

export function SiteFooter({ className = '', kaca = false }: { className?: string; kaca?: boolean }) {
  return (
    <footer className={`sticky bottom-0 z-20 mt-auto w-full border-t text-white ${kaca ? 'vsf-kaca vsf-kaca-gelap vsf-kaca-rata' : 'border-white/10 bg-sidebar shadow-[0_-10px_28px_-18px_rgba(7,21,39,.9)]'} ${className}`}>
      <div className="mx-auto flex w-full max-w-[1180px] flex-nowrap items-center justify-between gap-3 px-4 py-2 sm:gap-6 sm:px-6 sm:py-2.5">
        <Link to="/" className="inline-flex min-w-0 items-center gap-3" aria-label="Vertonik Smart Farm — beranda">
          <Monogram className="h-8 w-11 shrink-0" />
          <span className="min-w-0">
            <span className="block truncate font-display text-[14px] font-bold leading-tight sm:text-[14.5px]">Vertonik Smart Farm</span>
            <span className="hidden truncate text-[11.5px] text-white/55 sm:block">© {TAHUN} PT Arutmin Indonesia</span>
          </span>
        </Link>

        <Link
          to="/"
          className="shrink-0 whitespace-nowrap rounded-full border border-white/20 px-4 py-1.5 text-[13px] font-semibold text-white/85 transition-colors duration-[150ms] hover:border-white/50 hover:text-white"
        >
          Tentang kami
        </Link>
      </div>
    </footer>
  )
}
