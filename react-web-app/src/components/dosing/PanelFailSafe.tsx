import { useMemo, useState } from 'react'
import clsx from 'clsx'
import { cocok, kelompokFailSafe, kelompokkan, tampilNilai, URUT_FAILSAFE, type Daftar, type FailSafeRow } from '../../lib/dosing'
import { Ikon } from '../Ikon'
import { Kosong, Pesan, Rangka } from './DialogKaca'

/** Panel Keamanan: aturan fail-safe (baca saja), dikelompokkan dan bisa dicari. */
export function PanelFailSafe({ data }: { data: Daftar<FailSafeRow> }) {
  const [cari, setCari] = useState('')
  const grup = useMemo(
    () =>
      kelompokkan(
        data.rows.filter((r) => cocok(cari, r.kode, r.kondisi, r.aksi)),
        (r) => kelompokFailSafe(r.kode),
        URUT_FAILSAFE,
      ),
    [data.rows, cari],
  )
  const tampil = grup.reduce((a, [, r]) => a + r.length, 0)

  return (
    <section className="vsf-card w-full min-w-0 p-4 sm:p-5" aria-label="Keamanan">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-[240px] flex-1">
          <div className="vsf-judul-bagian">Aturan fail-safe</div>
          <p className="mt-0.5 text-[13px] text-abu">
            Perlindungan otomatis saat ada bacaan aneh, jatah dosing habis, atau perangkat bermasalah. Hanya untuk dibaca.
          </p>
        </div>
        <label className="vsf-cari">
          <Ikon nama="cari" className="h-4 w-4" />
          <input
            type="search"
            className="vsf-input"
            placeholder="Cari aturan…"
            aria-label="Cari aturan fail-safe"
            value={cari}
            onChange={(e) => setCari(e.target.value)}
          />
        </label>
      </div>

      {data.error && !data.loading && <Pesan jenis="galat">{data.error}</Pesan>}

      {data.loading && data.rows.length === 0 ? (
        <Rangka />
      ) : tampil === 0 ? (
        <Kosong>{cari ? `Tidak ada aturan yang cocok dengan “${cari}”.` : 'Server belum mengirim aturan fail-safe.'}</Kosong>
      ) : (
        <div className="mt-4">
          {grup.map(([nama, rows]) => (
            <div key={nama}>
              <div className="vsf-grup">
                {nama} <span>{rows.length}</span>
              </div>
              <div className="vsf-daftar">
                {rows.map((r) => (
                  <div
                    key={r.kode}
                    className={clsx('vsf-param', !r.aktif && 'is-mati')}
                    style={{ ['--kolom' as string]: 'minmax(0,1.3fr) minmax(0,1.3fr) minmax(90px,.6fr) 84px' }}
                  >
                    <div className="vsf-param-sel">
                      <span className="vsf-param-label">Kondisi</span>
                      <b className="font-semibold">{r.kondisi}</b>
                      <code className="vsf-param-kode">{r.kode}</code>
                    </div>
                    <div className="vsf-param-sel">
                      <span className="vsf-param-label">Tindakan sistem</span>
                      {r.aksi}
                    </div>
                    <div className="vsf-param-sel">
                      {r.ambang != null && (
                        <>
                          <span className="vsf-param-label">Ambang</span>
                          <span className="vsf-chip-nilai is-kosong">
                            {tampilNilai(r.ambang)}
                            {r.satuan ? ` ${r.satuan}` : ''}
                          </span>
                        </>
                      )}
                    </div>
                    <div className="vsf-param-sel md:text-right">
                      <span className={clsx('vsf-chip-nilai', r.aktif ? 'is-normal' : 'is-kosong')}>{r.aktif ? 'Aktif' : 'Nonaktif'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
