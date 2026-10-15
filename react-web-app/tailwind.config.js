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
      },
      borderRadius: {
        card: '18px',
        input: '12px',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        heading: ['"Space Grotesk"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      boxShadow: {
        focusMoss: '0 0 0 .22rem rgba(107,157,74,.35)',
      },
      backgroundImage: {
        sidebar: 'linear-gradient(180deg, #223A24 0%, #2D452F 100%)',
        primary: 'linear-gradient(135deg, #2D452F 0%, #4C6A4B 100%)',
        activePill: 'linear-gradient(135deg, #6B9D4A 0%, #5A8740 100%)',
      },
    },
  },
  plugins: [],
}

