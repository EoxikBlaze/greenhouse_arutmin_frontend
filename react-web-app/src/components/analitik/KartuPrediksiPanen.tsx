import { useApiObject } from '../../lib/useApiObject'
import { TAHAP_LABEL } from '../../lib/kebun'
import { tglPendek } from '../../lib/format'
import type { ResponPrediksi, StatusPrediksi } from '../../lib/analitik'
import { StatusBadge, type StatusTone } from '../StatusBadge'
import { Ikon } from '../Ikon'

const TONE: Record<StatusPrediksi, StatusTone> = { sesuai: 'online', segera: 'warning', terlambat: 'offline' }
const LABEL: Record<StatusPrediksi, string> = { sesuai: 'Sesuai jadwal', segera: 'Segera', terlambat: 'Terlambat' }

function sisa(hari: number): string {
  if (hari === 0) return 'hari ini'
  return hari > 0 ? `${hari} hari lagi` : `lewat ${-hari} hari`
}

/** Perkiraan panen batch berjalan (GET /api/analitik/prediksi-panen), terdekat lebih dulu. */
export function KartuPrediksiPanen({ maks = 5, className = '' }: { maks?: number; className?: string }) {
  const { data, loading, error, reload } = useApiObject<ResponPrediksi>('/api/analitik/prediksi-panen')
  const list = data?.list.slice(0, maks) ?? []

  return (
    <section className={`vsf-card p-4 sm:p-5 ${className}`} aria-label="Perkiraan panen">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="vsf-judul-bagian">Perkiraan panen</div>
        {data && data.list.length > maks && <span className="text-[12px] text-abu">{maks} dari {data.list.length} batch</span>}
      </div>

      {loading && !data ? (
        <div className="mt-3 grid gap-2" role="status" aria-label="Memuat perkiraan panen">
          {[0, 1, 2].map((i) => <div key={i} className="vsf-skeleton h-[56px] rounded-card" />)}
        </div>
      ) : error && !data ? (
        <div role="alert" className="vsf-tone-error mt-3 flex flex-wrap items-center gap-3 rounded-input px-3 py-2 text-[13px]">
          <span className="flex items-center gap-2"><Ikon nama="salah" className="h-4 w-4" />{error}</span>
          <button type="button" className="vsf-btn-secondary vsf-btn-kecil" onClick={reload}>Coba lagi</button>
        </div>
      ) : list.length === 0 ? (
        <p className="mt-3 flex items-center gap-2 text-[13px] text-abu">
          <Ikon nama="kosong" className="h-4 w-4" />Belum ada batch yang sedang berjalan.
        </p>
      ) : (
        <ul className="mt-3 grid gap-2">
          {list.map((r) => (
            <li key={`${r.tipe}-${r.id}`} className="flex flex-wrap items-center gap-3 rounded-card border border-arutmin-border bg-white/85 p-3">
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14px] font-semibold text-tinta">{r.varietas || 'Tanaman'}</div>
                <div className="text-[12px] text-abu">
                  {TAHAP_LABEL[r.tipe] ?? r.tipe} · {r.meja || 'Tanpa meja'}
                </div>
              </div>
              {r.prediksi ? (
                <div className="flex items-center gap-3">
                  <div className="text-right text-[12px]">
                    <div className="font-semibold text-tinta">{tglPendek(`${r.prediksi.tgl_prediksi}T00:00:00`) /* waktu lokal, bukan UTC */}</div>
                    <div className="text-abu">{sisa(r.prediksi.sisa_hari)}</div>
                  </div>
                  <StatusBadge tone={TONE[r.prediksi.status]} label={LABEL[r.prediksi.status]} />
                </div>
              ) : (
                <span className="text-[12px] text-abu">Durasi siklus belum diatur</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
