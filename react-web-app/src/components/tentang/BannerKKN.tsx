import type { ReactNode } from 'react'

export const FONT_POSTER = "'Oswald','Anton',Impact,'Arial Narrow',sans-serif"
export const FONT_SKRIP = "'Kaushan Script','Brush Script MT',cursive"

/** Banner percikan tinta navy "KKN INDUSTRI / POLITEKNIK NEGERI TANAH LAUT" — dipakai splash dan hero. */
export function BannerKKN({ judul = false }: { judul?: boolean }) {
  const Judul = judul ? 'h1' : 'div'
  return (
    <div className="relative w-full max-w-[780px] -rotate-2">
    <svg viewBox="0 0 780 224" preserveAspectRatio="none" className="vsf-splash absolute -inset-x-3 -inset-y-4 h-[calc(100%+2rem)] w-[calc(100%+1.5rem)] drop-shadow-[0_14px_18px_rgba(7,21,39,.35)]" aria-hidden="true" focusable="false">
      <g className="vsf-splash-badan" fill="#14295E">
        <path d="M729.7 112.0 C731.1 114.7 738.8 117.5 739.0 120.2 C739.2 122.9 732.3 125.4 730.7 128.1 C729.1 130.9 723.5 132.8 729.6 136.6 C735.7 140.4 771.9 148.5 767.2 151.0 C762.6 153.5 716.6 150.7 701.7 151.8 C686.9 152.9 685.7 155.7 678.2 157.7 C670.7 159.6 662.7 161.2 656.7 163.7 C650.8 166.3 650.8 171.0 642.6 172.8 C634.4 174.5 617.5 173.0 607.7 174.4 C597.9 175.7 592.2 178.7 583.9 180.9 C575.7 183.1 565.3 183.5 558.2 187.8 C551.1 192.1 552.1 205.6 541.4 206.7 C530.7 207.9 507.8 196.8 494.0 194.9 C480.3 193.0 470.7 195.1 459.1 195.3 C447.5 195.5 436.2 196.1 424.6 196.2 C413.1 196.2 401.4 196.3 390.0 195.8 C378.6 195.2 367.4 193.5 356.1 192.9 C344.8 192.4 334.0 192.1 322.3 192.5 C310.5 192.9 296.3 196.3 285.7 195.3 C275.1 194.2 274.7 183.3 258.9 186.1 C243.1 189.0 201.6 213.3 191.1 212.5 C180.5 211.7 200.7 186.6 195.6 181.1 C190.6 175.7 169.8 181.3 160.6 179.7 C151.5 178.1 146.6 174.3 140.7 171.5 C134.9 168.8 133.2 165.1 125.6 163.1 C118.0 161.0 104.4 160.8 95.1 159.2 C85.7 157.6 74.0 155.9 69.6 153.3 C65.2 150.7 73.7 146.3 68.9 143.6 C64.1 141.0 58.0 139.3 40.7 137.5 C23.5 135.7 -31.1 135.6 -34.4 132.8 C-37.8 130.0 7.3 124.2 20.7 120.7 C34.2 117.2 44.3 114.9 46.2 112.0 C48.1 109.1 34.4 106.4 32.3 103.6 C30.3 100.8 31.4 97.8 33.9 95.0 C36.5 92.3 45.0 90.0 47.7 87.1 C50.4 84.3 52.6 81.8 50.2 78.0 C47.7 74.1 26.5 66.5 32.9 64.0 C39.2 61.6 75.5 64.6 88.3 63.3 C101.0 62.0 101.5 58.3 109.3 56.2 C117.1 54.1 125.4 51.8 135.3 50.5 C145.3 49.1 160.0 50.0 169.0 48.1 C178.0 46.2 179.2 40.2 189.3 39.2 C199.5 38.2 219.1 43.2 229.9 42.2 C240.6 41.1 246.3 37.9 253.7 32.9 C261.1 27.9 264.0 14.9 274.2 12.2 C284.5 9.5 301.8 14.3 315.2 16.4 C328.6 18.5 342.2 22.7 354.6 24.8 C367.1 26.8 378.2 28.8 390.0 28.7 C401.8 28.6 413.7 24.7 425.5 24.0 C437.4 23.3 450.0 23.2 461.1 24.6 C472.1 25.9 480.4 31.4 491.6 32.3 C502.9 33.3 514.8 31.9 528.8 30.3 C542.8 28.7 566.1 20.7 575.6 22.6 C585.2 24.5 580.8 37.3 586.1 41.8 C591.4 46.4 598.8 47.9 607.2 49.8 C615.6 51.8 627.0 52.1 636.3 53.5 C645.6 55.0 655.8 56.4 663.1 58.4 C670.4 60.5 673.7 63.6 680.2 65.9 C686.6 68.2 688.5 70.8 701.5 72.2 C714.4 73.6 751.3 71.9 757.8 74.3 C764.3 76.6 742.4 83.0 740.4 86.4 C738.3 89.9 747.2 92.1 745.5 95.1 C743.9 98.0 733.1 101.2 730.5 104.0 C727.8 106.8 728.3 109.3 729.7 112.0 Z" />
        {/* tetesan yang menetes ke bawah */}
        <path d="M214 184 C212 196 210 206 213 213 C216 220 226 220 228 212 C230 204 226 194 224 184 Z" />
        <path d="M508 186 C507 194 506 200 508 204 C510 208 516 208 517 203 C518 198 516 192 515 186 Z" />
        <path d="M618 178 C616 192 614 200 617 206 C620 212 628 211 629 205 C630 199 627 190 626 178 Z" />
      </g>
      {/* butiran cipratan di sekeliling */}
      <g className="vsf-splash-tetes" fill="#14295E">
        <circle cx="22" cy="58" r="7" /><circle cx="8" cy="84" r="3.5" /><circle cx="44" cy="30" r="4" />
        <circle cx="760" cy="62" r="6" /><circle cx="774" cy="96" r="3" /><circle cx="736" cy="196" r="5" />
        <circle cx="300" cy="8" r="4.5" /><circle cx="470" cy="12" r="3" /><circle cx="96" cy="200" r="4" />
      </g>
      <g className="vsf-splash-tetes vsf-splash-tetes-2" fill="#F5B833">
        <circle cx="58" cy="182" r="5" /><circle cx="742" cy="30" r="4.5" /><circle cx="404" cy="214" r="3.5" /><circle cx="168" cy="14" r="3" />
      </g>
    </svg>
    <Judul
      id={judul ? 'vsf-hero-title' : undefined}
      className="vsf-sp-teks relative px-8 py-9 sm:px-14 sm:py-12"
      style={{ fontFamily: FONT_POSTER }}
    >
      <span className="block -skew-x-6 text-[34px] font-bold uppercase leading-none tracking-[.01em] text-white sm:text-[56px]">
        KKN Industri
      </span>
      <span className="mt-2 block -skew-x-6 text-[22px] font-bold uppercase leading-[1.05] tracking-[.01em] text-[#F5B833] sm:text-[38px]">
        Politeknik Negeri Tanah Laut
      </span>
    </Judul>
    </div>
  )
}

/** Percikan emas di sisi judul skrip — berkedip pelan. */
export function Percikan({ kiri }: { kiri?: boolean }): ReactNode {
  return (
    <svg viewBox="0 0 40 40" className={`h-10 w-10 shrink-0 sm:h-12 sm:w-12 ${kiri ? '' : '-scale-x-100'}`} aria-hidden="true" focusable="false">
      <g stroke="#F5A81C" strokeWidth="4" strokeLinecap="round">
        <path className="vsf-kedip" style={{ ['--d' as string]: '0s' }} d="M6 20h14" />
        <path className="vsf-kedip" style={{ ['--d' as string]: '.3s' }} d="M10 9l11 6" />
        <path className="vsf-kedip" style={{ ['--d' as string]: '.6s' }} d="M10 31l11-6" />
      </g>
    </svg>
  )
}
