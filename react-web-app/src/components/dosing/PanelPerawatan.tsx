import { useMemo } from 'react'
import type { Daftar, JadwalRow } from '../../lib/dosing'
import { Kosong, Pesan, Rangka } from '../kaca/DialogKaca'

/** Panel Perawatan: jadwal kalibrasi & pembersihan berkala (baca saja), terpendek lebih dulu. */
export function PanelPerawatan({ data }: { data: Daftar<JadwalRow> }) {
  const rows = useMemo(() => [...data.rows].sort((a, b) => (a.periode_hari ?? 9999) - (b.periode_hari ?? 9999)), [data.rows])
  return (
    <section className="vsf-card w-full min-w-0 p-4 sm:p-5" aria-label="Perawatan">
      <div className="vsf-judul-bagian">Jadwal perawatan</div>
      <p className="mt-0.5 text-[13px] text-abu">Kegiatan kalibrasi dan pembersihan berkala agar bacaan dan dosing tetap akurat.</p>

      {data.error && !data.loading && <Pesan jenis="galat">{data.error}</Pesan>}

      {data.loading && rows.length === 0 ? (
        <Rangka />
      ) : rows.length === 0 ? (
        <Kosong>Server belum mengirim jadwal perawatan.</Kosong>
      ) : (
        <div className="vsf-daftar mt-4">
          {rows.map((r) => (
            <div
              key={r.kode}
              className="vsf-param"
              style={{ ['--kolom' as string]: '120px minmax(0,3fr) 90px 90px' }}
            >
              <div className="vsf-param-sel">
                <span className="vsf-chip-nilai is-normal">{r.periode}</span>
              </div>
              <div className="vsf-param-sel">{r.kegiatan}</div>
              <div className="vsf-param-sel">
                <span className="vsf-param-label">Setiap</span>
                <b className="tabular-nums">{r.periode_hari == null ? 'Saat perlu' : `${r.periode_hari} hari`}</b>
              </div>
              <div className="vsf-param-sel">
                <span className="vsf-param-label">Lama</span>
                <b className="tabular-nums">{r.lama_menit == null ? '—' : `${r.lama_menit} menit`}</b>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
