import { useState } from 'react'
import { bacaKaca, PILIHAN_KACA, setKaca, type Kaca } from '../../lib/kaca'
import {
  ambilPerforma,
  aturPreferensiPerforma,
  bacaPreferensiPerforma,
  PILIHAN_PERFORMA,
  type PreferensiPerforma,
} from '../../lib/performa'

/** Pilihan transparansi kaca & mode hemat daya (disimpan di perangkat) + pratinjau kecil. */
export function PanelTampilan() {
  const [kaca, setKacaState] = useState<Kaca>(bacaKaca)
  const [perf, setPerfState] = useState<PreferensiPerforma>(bacaPreferensiPerforma)
  const [perfAktif, setPerfAktif] = useState(ambilPerforma)

  const pilih = (k: Kaca) => {
    setKacaState(k)
    setKaca(k)
  }

  const pilihPerf = (p: PreferensiPerforma) => {
    setPerfState(p)
    setPerfAktif(aturPreferensiPerforma(p))
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

      <div className="mt-5 border-t border-garis pt-4">
        <h3 className="vsf-judul-bagian">Mode hemat daya & performa</h3>
        <p className="mt-0.5 text-[13px] text-abu">
          Mode hemat daya mematikan efek blur latar dan animasi berat agar baterai lebih awet dan teks tetap tajam di mode siang maupun malam (aktif saat ini: <b>{perfAktif === 'ringan' ? 'Hemat daya' : 'Normal'}</b>).
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <div role="radiogroup" aria-label="Mode hemat daya" className="vsf-segmen-kaca">
            {PILIHAN_PERFORMA.map((p) => (
              <button
                key={p.nilai}
                type="button"
                role="radio"
                aria-checked={perf === p.nilai}
                onClick={() => pilihPerf(p.nilai)}
                onKeyDown={(e) => {
                  const i = PILIHAN_PERFORMA.findIndex((x) => x.nilai === perf)
                  const arah = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
                  if (!arah) return
                  e.preventDefault()
                  pilihPerf(PILIHAN_PERFORMA[(i + arah + PILIHAN_PERFORMA.length) % PILIHAN_PERFORMA.length].nilai)
                }}
              >
                <b>{p.label}</b>
                <small>{p.ket}</small>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
