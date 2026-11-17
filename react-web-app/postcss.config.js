import fontRem from './tools/postcssFontRem.js'

export default {
  plugins: [
    // urutan penting: font px → rem SETELAH Tailwind membangkitkan kelas arbitrer (text-[13px]).
    (await import('tailwindcss')).default(),
    fontRem(),
    (await import('autoprefixer')).default(),
  ],
}
