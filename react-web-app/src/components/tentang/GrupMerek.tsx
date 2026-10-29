import type { CSSProperties, Ref } from 'react'
import { Monogram } from '../Monogram'
import { info } from '../../lib/info'
import { BannerKKN, FONT_SKRIP, Percikan } from './BannerKKN'

const tunda = (d: string): CSSProperties => ({ ['--d' as string]: d })

export function IkonInstagram() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.3" cy="6.7" r=".6" fill="currentColor" />
    </svg>
  )
}

export function IkonTiktok() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5" />
      <path d="M14 3c.3 2.6 2 4.4 4.5 4.8" />
    </svg>
  )
}

/** Pil kaca berisi akun IG + TikTok KKN. `interaktif` = bisa disentuh membuka tautan (tidak di splash). */
export function PilSosial({ interaktif = false, netral = false }: { interaktif?: boolean; netral?: boolean }) {
  const ig = interaktif ? info('Instagram KKN', 'Ikuti dokumentasi kegiatan KKN Industri di Instagram.', 'https://instagram.com/kkn.arutminidn2026') : {}
  const tt = interaktif ? info('TikTok KKN', 'Video singkat kegiatan dan proses pembuatan Vertonik Smart Farm.', 'https://www.tiktok.com/@kkn.arutminidn2026') : {}
  return (
    <div className={`vsf-kaca ${netral ? 'vsf-kaca-netral' : 'vsf-kaca-gelap'} inline-flex flex-wrap items-center justify-center gap-x-8 gap-y-2 rounded-full px-6 py-3 text-[14px] font-bold sm:text-[16px]`}>
      <span {...ig} className="inline-flex items-center gap-2"><IkonInstagram /> @kkn.arutminidn2026</span>
      <span {...tt} className="inline-flex items-center gap-2"><IkonTiktok /> @kkn.arutminidn2026</span>
    </div>
  )
}

/**
 * Grup merek di gambar acuan: pil logo, banner percikan, pil perusahaan, judul skrip "Our Team".
 * Dipakai dua kali: di splash (animasi masuk) dan di hero halaman (tujuan terbang splash).
 */
export function GrupMerek({
  animasi,
  interaktif = false,
  judul = false,
  className = '',
  ref,
}: {
  /** true = putar animasi masuk berurutan; false = langsung tampil statis (hero setelah splash). */
  animasi: boolean
  interaktif?: boolean
  judul?: boolean
  className?: string
  ref?: Ref<HTMLDivElement>
}) {
  const item = animasi ? 'vsf-sp-item' : ''
  const pil = interaktif
    ? info('Vertonik Smart Farm (GARAP)', 'Sistem IoT hidroponik hasil KKN Industri Arutmin Asik 2026 di PT Arutmin Indonesia. GARAP adalah nama aplikasinya.')
    : {}
  return (
    <div ref={ref} className={`${animasi ? '' : 'vsf-statis'} flex w-full max-w-[780px] flex-col items-center text-center ${className}`}>
      <div {...pil} className={`${item} vsf-kaca inline-flex max-w-full items-center gap-3 rounded-full px-5 py-2.5`} style={tunda('.1s')}>
        <Monogram className="h-10 w-16 shrink-0" />
        <span className="text-[12.5px] font-extrabold uppercase tracking-[.08em] text-navy">PT Arutmin Indonesia</span>
        <span className="hidden h-5 w-px bg-slate-300 sm:block" aria-hidden />
        <span className="hidden truncate text-[12.5px] font-semibold text-slate-600 sm:inline">Vertonik Smart Farm</span>
      </div>

      <div className="mt-8 flex w-full justify-center">
        <BannerKKN judul={judul} />
      </div>

      <div className={`${item} vsf-kaca vsf-kaca-gelap mt-2 -rotate-2 rounded-full px-7 py-2.5 text-[13px] font-extrabold uppercase tracking-[.06em] sm:text-[15px]`} style={tunda('.6s')}>
        PT. Arutmin Indonesia
      </div>

      <div className="mt-5 flex items-center gap-2">
        <Percikan kiri />
        <span className={`${animasi ? 'vsf-sp-tulis' : ''} text-[46px] leading-none text-white [text-shadow:0_3px_20px_rgba(7,21,39,.6)] sm:text-[68px]`} style={{ ...tunda('.85s'), fontFamily: FONT_SKRIP }}>
          Our Team
        </span>
        <Percikan />
      </div>
    </div>
  )
}
