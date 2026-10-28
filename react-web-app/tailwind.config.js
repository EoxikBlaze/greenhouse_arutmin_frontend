/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        arutmin: {
          forest: '#2D452F',
          olive: '#4C6A4B',
          moss: '#6B9D4A',
          mint: '#CFE2CE',
          page: '#F4F7F2',
          card: '#FFFFFF',
          border: '#E2E8DD',
          border2: '#D7E0D2',
          error: '#C0392B',
          warning: '#E0A42B',
        },
        // ROMBAK-A — token warna desain (disinkronkan dgn :root src/index.css)
        navy: '#0A1F38',
        navy2: '#071527',
        emas: '#E9CD53',
        moss: '#6B9D4A',
        tinta: '#0B1A2B',
        abu: '#64748B',
        garis: '#E2E8DD',
        kartu: '#FFFFFF',
      },
      borderRadius: {
        // nilai menunjuk token :root — transform in-place, nama class TETAP sama
        card: 'var(--r-lg, 20px)',
        input: 'var(--r-sm, 12px)',
        // varian netral (tak memakai awalan r/l/t/b bawaan TW agar tak bentrok)
        std: 'var(--r, 12px)',
        'std-sm': 'var(--r-sm, 12px)',
        'std-lg': 'var(--r-lg, 20px)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        heading: ['"Space Grotesk"', 'Inter', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      boxShadow: {
        focusMoss: '0 0 0 .22rem rgba(107,157,74,.35)',
        soft: 'var(--shadow-soft, 0 1px 2px rgba(10,31,56,.05), 0 14px 30px -22px rgba(10,31,56,.45))',
        deep: 'var(--shadow-deep, 0 28px 64px -30px rgba(7,21,39,.55))',
      },
      backgroundImage: {
        // chrome navy (token --navy/--navy2) — nama utilitas TETAP `bg-sidebar`
        sidebar: 'linear-gradient(180deg, #0A1F38 0%, #071527 100%)',
        topbar: 'linear-gradient(180deg, #0A1F38 0%, #071527 100%)',
        brandPanel: 'linear-gradient(150deg, #0A1F38 0%, #071527 55%, #123253 100%)',
        primary: 'linear-gradient(135deg, #2D452F 0%, #4C6A4B 100%)',
        // KONTRAS (audit): putih di moss #6B9D4A = 3.21 (GAGAL) → moss digelapkan
        // agar putih lolos ≥4.5 di SELURUH gradasi: 0% #4E7733 = 5.24, 100% #42662B = 6.63.
        activePill: 'linear-gradient(135deg, #4E7733 0%, #42662B 100%)',
      },
    },
  },
  plugins: [],
}

