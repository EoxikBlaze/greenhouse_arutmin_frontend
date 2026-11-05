import { useState } from 'react'
import { bacaKaca, PILIHAN_KACA, setKaca, type Kaca } from '../../lib/kaca'

/** Pilihan transparansi kaca (disimpan di perangkat) + pratinjau kecil. */
export function PanelTampilan() {
  const [kaca, setKacaState] = useState<Kaca>(bacaKaca)
  const pilih = (k: Kaca) => {
    setKacaState(k)
    setKaca(k)
  }
  return (
    <section className="vsf-card p-4 sm:p-5" aria-label="Tampilan kaca">
      <h2 className="vsf-judul-bagian">Tampilan kaca</h2>
      <p className="mt-0.5 text-[13px] text-abu">
        Atur seberapa tembus pandang kartu dan menu. Pilih Pekat bila teks sulit dibaca. Tersimpan di perangkat ini.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <div role="radiogroup" aria-label="Transparansi kaca" className="vsf-segmen-kaca">
          {PILIHAN_KACA.map((p) => (
            <button
              key={p.nilai}
              type="button"
              role="radio"
              aria-checked={kaca === p.nilai}
              onClick={() => pilih(p.nilai)}
              onKeyDown={(e) => {
                const i = PILIHAN_KACA.findIndex((x) => x.nilai === kaca)
                const arah = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
                if (!arah) return
                e.preventDefault()
                pilih(PILIHAN_KACA[(i + arah + PILIHAN_KACA.length) % PILIHAN_KACA.length].nilai)
              }}
            >
              <b>{p.label}</b>
              <small>{p.ket}</small>
            </button>
          ))}
        </div>
        <div className={`vsf-pratinjau-kaca is-${kaca}`} aria-hidden>
          <span />
          <b>Contoh kartu</b>
        </div>
      </div>
    </section>
  )
}
