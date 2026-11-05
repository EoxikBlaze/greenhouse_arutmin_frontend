import { Ikon } from './Ikon'
import { useTema } from '../lib/tema'

/** Saklar mode terang/gelap (di sebelah jam). Ikon menunjukkan mode TUJUAN; status dibaca lewat aria-pressed. */
export function SaklarTema({ className = '' }: { className?: string }) {
  const { gelap, ganti } = useTema()
  const label = gelap ? 'Ganti ke mode terang' : 'Ganti ke mode gelap'
  return (
    <button
      type="button"
      className={`vsf-saklar-tema ${className}`.trim()}
      onClick={ganti}
      aria-pressed={gelap}
      aria-label={label}
      title={label}
    >
      <Ikon nama={gelap ? 'matahari' : 'bulan'} />
    </button>
  )
}
