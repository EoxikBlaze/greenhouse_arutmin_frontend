import { useMemo, useState } from 'react'
import clsx from 'clsx'
import { Ikon } from '../Ikon'
import {
  PARAMS,
  angkaId,
  formatJam,
  formatTanggal,
  nilaiAngka,
  statusNilai,
  waktuMs,
  type Ambang,
  type DefParam,
  type KunciSensor,
  type Titik,
} from '../../lib/sensorLaporan'

type Kolom = 'waktu' | KunciSensor
type Arah = 'asc' | 'desc'

function Nilai({ p, r, ambang }: { p: DefParam; r: Titik; ambang: Ambang }) {
  const v = nilaiAngka(r[p.kunci])
  if (v === null) return <span className="vsf-tidak-dikirim">tidak dikirim</span>
  const s = statusNilai(v, ambang?.[p.kunci])
  return (
    <span className={clsx('vsf-nilai-sel', s !== 'normal' && 'is-luar')}>
      <span className="tabular-nums">{angkaId(v, p.digit)}</span>
      {p.satuan && <small className="ml-1 font-normal text-abu">{p.satuan}</small>}
      {s !== 'normal' && <b className="vsf-lencana-luar">{s}</b>}
    </span>
  )
}

/**
 * Riwayat bacaan sebagai deretan kartu kaca tipis (bukan tabel garis kaku).
 * Desktop: kolom sejajar + header lengket yang bisa diurutkan. HP: satu kartu per bacaan, tanpa scroll samping.
 * Kartu baris hanya tint (tanpa blur sendiri) supaya 100+ baris tetap mulus.
 */
export function TabelRiwayat({
  rows,
  ambang,
  memuat,
  kosong,
  adaLagi,
  memuatLagi,
  onLagi,
}: {
  rows: Titik[]
  ambang: Ambang
  memuat: boolean
  kosong: string
  adaLagi: boolean
  memuatLagi: boolean
  onLagi: () => void
}) {
  const [urut, setUrut] = useState<{ kolom: Kolom; arah: Arah }>({ kolom: 'waktu', arah: 'desc' })

  const tersusun = useMemo(() => {
    const kunci = (r: Titik) => (urut.kolom === 'waktu' ? waktuMs(r) : nilaiAngka(r[urut.kolom]))
    const tanda = urut.arah === 'asc' ? 1 : -1
    return [...rows].sort((a, b) => {
      const ka = kunci(a)
      const kb = kunci(b)
      if (ka === null && kb === null) return 0
      if (ka === null) return 1 // kosong selalu di bawah, apa pun arahnya
      if (kb === null) return -1
      return (ka - kb) * tanda
    })
  }, [rows, urut])

  function klikKolom(kolom: Kolom) {
    setUrut((u) => (u.kolom === kolom ? { kolom, arah: u.arah === 'asc' ? 'desc' : 'asc' } : { kolom, arah: 'desc' }))
  }

  const kepala: Array<{ kolom: Kolom; teks: string }> = [
    { kolom: 'waktu', teks: 'Waktu' },
    ...PARAMS.map((p) => ({ kolom: p.kunci as Kolom, teks: p.satuan ? `${p.label} (${p.satuan})` : p.label })),
  ]

  return (
    <section className="vsf-card p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="vsf-judul-bagian">Riwayat bacaan</div>
        <span className="text-[12px] text-abu">{rows.length} baris ditampilkan</span>
      </div>

      {memuat && rows.length === 0 ? (
        <div className="mt-3 grid gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="vsf-skeleton h-[56px] rounded-card" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="mt-3 flex flex-col items-center gap-2 rounded-card bg-white/55 px-4 py-8 text-center text-[13px] text-tinta">
          <Ikon nama="kosong" className="h-8 w-8 text-arutmin-olive" />
          {kosong}
        </div>
      ) : (
        <div role="table" aria-label="Riwayat data sensor" className="vsf-riwayat mt-3">
          <div role="row" className="vsf-riwayat-kepala">
            {kepala.map((k) => {
              const aktif = urut.kolom === k.kolom
              return (
                <div
                  key={k.kolom}
                  role="columnheader"
                  aria-sort={aktif ? (urut.arah === 'asc' ? 'ascending' : 'descending') : 'none'}
                  className={k.kolom === 'waktu' ? '' : 'text-right'}
                >
                  <button type="button" className="vsf-urut" onClick={() => klikKolom(k.kolom)}>
                    {k.teks}
                    <Ikon
                      nama="bawah"
                      className={clsx('h-3.5 w-3.5 transition', aktif ? 'opacity-100' : 'opacity-30', aktif && urut.arah === 'asc' && 'rotate-180')}
                    />
                  </button>
                </div>
              )
            })}
          </div>

          {tersusun.map((r, i) => {
            const ms = waktuMs(r)
            return (
              <div role="row" key={String(r.id ?? `${ms}-${i}`)} className="vsf-baris">
                <div role="cell" className="vsf-baris-waktu">
                  {ms === null ? (
                    '—'
                  ) : (
                    <>
                      <b className="tabular-nums text-tinta">{formatTanggal(ms)}</b>
                      <span className="ml-2 tabular-nums text-abu">{formatJam(ms)}</span>
                    </>
                  )}
                </div>
                {PARAMS.map((p) => (
                  <div role="cell" key={p.kunci} className="vsf-baris-sel">
                    <span className="vsf-baris-label">{p.label}</span>
                    <Nilai p={p} r={r} ambang={ambang} />
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )}

      {adaLagi && (
        <div className="mt-3 flex justify-center">
          <button type="button" className="vsf-btn-secondary" disabled={memuatLagi} onClick={onLagi}>
            {memuatLagi && <span className="vsf-spinner vsf-spinner-dark" />}
            {memuatLagi ? 'Memuat…' : 'Muat lebih banyak'}
          </button>
        </div>
      )}
    </section>
  )
}
