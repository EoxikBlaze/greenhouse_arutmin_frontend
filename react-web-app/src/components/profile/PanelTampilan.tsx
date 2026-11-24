import { useState } from 'react'
import {
  bacaKaca,
  bacaKurangiGerak,
  bacaLatar,
  PILIHAN_KACA,
  PILIHAN_LATAR,
  setKaca,
  setKurangiGerak,
  setLatar,
  type Kaca,
  type Latar,
} from '../../lib/kaca'
import {
  ambilPerforma,
  aturPreferensiPerforma,
  bacaPreferensiPerforma,
  PILIHAN_PERFORMA,
  type PreferensiPerforma,
} from '../../lib/performa'

/** Pilihan transparansi kaca, mode tampilan HEMAT vs PEAK, latar Polos/Lanskap/Greenhouse, & Kurangi Gerakan (S62). */
export function PanelTampilan() {
  const [kaca, setKacaState] = useState<Kaca>(bacaKaca)
  const [latar, setLatarState] = useState<Latar>(bacaLatar)
  const [kurangiGerak, setKurangiGerakState] = useState<boolean>(bacaKurangiGerak)
  const [perf, setPerfState] = useState<PreferensiPerforma>(bacaPreferensiPerforma)
  const [perfAktif, setPerfAktif] = useState(ambilPerforma)

  const pilih = (k: Kaca) => {
    setKacaState(k)
    setKaca(k)
  }

  const pilihLatar = (l: Latar) => {
    setLatarState(l)
    setLatar(l)
  }

  const ubahGerak = (aktif: boolean) => {
    setKurangiGerakState(aktif)
    setKurangiGerak(aktif)
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
        <h3 className="vsf-judul-bagian">Mode tampilan (HEMAT vs PEAK)</h3>
        <p className="mt-0.5 text-[13px] text-abu">
          HEMAT: tanpa blur latar dan tanpa animasi (disarankan untuk perangkat lambat atau saat silau). PEAK: kaca ber-blur dan transisi halus (aktif saat ini: <b>{perfAktif === 'ringan' ? 'HEMAT / Hemat daya' : 'PEAK / Normal'}</b>).
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

      <div className="mt-5 border-t border-garis pt-4">
        <h3 className="vsf-judul-bagian">Latar belakang (Blue Greenhouse v2)</h3>
        <p className="mt-0.5 text-[13px] text-abu">
          Pilih latar belakang layar: warna biru langit polos (#B7E2F9), pemandangan lanskap siang/malam, atau ilustrasi Blue Greenhouse.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <div role="radiogroup" aria-label="Latar belakang" className="vsf-segmen-kaca">
            {PILIHAN_LATAR.map((p) => (
              <button
                key={p.nilai}
                type="button"
                role="radio"
                aria-checked={latar === p.nilai}
                onClick={() => pilihLatar(p.nilai)}
              >
                <b>{p.label}</b>
                <small>{p.ket}</small>
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[14px] font-semibold text-tinta">Kurangi gerakan</div>
            <div className="text-[12.5px] text-abu">
              Mematikan seluruh gerakan hias walau PEAK aktif. Pilihan tampilan tidak mengubah data, peran, izin, atau keselamatan.
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={kurangiGerak}
            aria-label="Kurangi gerakan"
            data-nyala={kurangiGerak ? 'true' : 'false'}
            className="vsf-switch-kaca"
            onClick={() => ubahGerak(!kurangiGerak)}
          >
            <span className="vsf-switch-kaca-thumb" />
          </button>
        </div>
      </div>
    </section>
  )
}
