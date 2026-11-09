import { useApiObject } from '../../lib/useApiObject'
import { angkaMaks } from '../../lib/format'
import type { ResponSaran, StatusSaran } from '../../lib/analitik'
import { StatusBadge, type StatusTone } from '../StatusBadge'
import { Ikon } from '../Ikon'

const TONE: Record<StatusSaran, StatusTone> = { aman: 'online', perhatian: 'warning', di_luar: 'offline', data_kurang: 'warning' }
const LABEL: Record<StatusSaran, string> = { aman: 'Aman', perhatian: 'Perhatian', di_luar: 'Di luar batas', data_kurang: 'Data kurang' }
const SENSOR = { ph: 'pH', tds: 'TDS (ppm)' } as const

/**
 * Saran nutrisi dari tren sensor (GET /api/analitik/saran-dosis?jam=6).
 * HANYA teks saran — sengaja tanpa tombol eksekusi/kirim dosis.
 */
export function KartuSaranDosis() {
  const { data, loading, error, reload } = useApiObject<ResponSaran>('/api/analitik/saran-dosis?jam=6')

  return (
    <section className="vsf-card p-4 sm:p-5" aria-label="Saran nutrisi dari tren">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="vsf-judul-bagian">Saran nutrisi (dari tren)</div>
        {data && <span className="text-[12px] text-abu">{data.jumlah_bacaan} bacaan · {data.jendela_jam} jam terakhir</span>}
      </div>

      {loading && !data ? (
        <div className="mt-3 grid gap-2" role="status" aria-label="Memuat saran nutrisi">
          {[0, 1].map((i) => <div key={i} className="vsf-skeleton h-[56px] rounded-card" />)}
        </div>
      ) : error && !data ? (
        <div role="alert" className="vsf-tone-error mt-3 flex flex-wrap items-center gap-3 rounded-input px-3 py-2 text-[13px]">
          <span className="flex items-center gap-2"><Ikon nama="salah" className="h-4 w-4" />{error}</span>
          <button type="button" className="vsf-btn-secondary vsf-btn-kecil" onClick={reload}>Coba lagi</button>
        </div>
      ) : data ? (
        <>
          {data.saran.length === 0 ? (
            <p className="mt-3 text-[13px] text-abu">Belum ada saran untuk saat ini.</p>
          ) : (
            <ul className="mt-3 grid gap-2">
              {data.saran.map((s) => (
                <li key={s.sensor} className="rounded-card border border-arutmin-border bg-white/85 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <b className="text-[14px] text-tinta">{SENSOR[s.sensor] ?? s.sensor}</b>
                    {typeof s.nilai === 'number' && <span className="text-[13px] tabular-nums text-abu">{angkaMaks(s.nilai, 2)}</span>}
                    <span className="flex-1" />
                    <StatusBadge tone={TONE[s.status]} label={LABEL[s.status]} />
                  </div>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-slate-700">{s.saran}</p>
                  {typeof s.perkiraan_jam_ke_batas === 'number' && (
                    <p className="mt-1 text-[12px] text-abu">Perkiraan mencapai batas dalam ±{angkaMaks(s.perkiraan_jam_ke_batas, 1)} jam.</p>
                  )}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 flex items-start gap-2 text-[12px] text-abu">
            <Ikon nama="info" className="mt-[1px] h-4 w-4 shrink-0" />
            {data.catatan}
          </p>
        </>
      ) : null}
    </section>
  )
}
