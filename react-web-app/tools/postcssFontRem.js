/**
 * PostCSS: `font-size: Npx` → rem (16px = 1rem) untuk SEMUA CSS hasil build, termasuk kelas Tailwind
 * arbitrer seperti `text-[13px]`. Tampilan di ukuran huruf bawaan tidak berubah, tetapi teks ikut membesar
 * saat pengguna memperbesar ukuran huruf browser/HP (px tetap mengabaikan setelan itu).
 * Hanya nilai px tunggal; clamp()/calc()/em dibiarkan.
 */
const PX = /^(\d*\.?\d+)px(\s*!important)?$/

export default function postcssFontRem() {
  return {
    postcssPlugin: 'vsf-font-rem',
    Declaration: {
      'font-size': (decl) => {
        const m = PX.exec(decl.value.trim())
        if (m) decl.value = `${Number(m[1]) / 16}rem${m[2] ?? ''}`
      },
    },
  }
}
postcssFontRem.postcss = true
