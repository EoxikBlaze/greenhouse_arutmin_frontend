import { Link } from 'react-router-dom'
import { Ikon } from '../Ikon'
import {
  PARAMS,
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
import { angkaId } from '../../lib/format'

/** Urutan kolom: ppm dan EC bersebelahan (ppm = EC × 500). */
const URUTAN: readonly KunciSensor[] = ['ph', 'tds', 'ec_ms_cm', 'waterTemp', 'airTemp', 'humidity']
const KOLOM: DefParam[] = URUTAN.map((k) => PARAMS.find((p) => p.kunci === k) as DefParam)

function Sel({ p, r, ambang }: { p: DefParam; r: Titik; ambang: Ambang }) {
  const v = nilaiAngka(r[p.kunci])
  if (v === null) return <span className="text-[12px] italic text-abu">—</span>
  const s = statusNilai(v, ambang?.[p.kunci])
  const luar = s === 'rendah' || s === 'tinggi'
  return (
    <span className={luar ? 'font-bold text-[#9b1c1c]' : 'text-tinta'} title={luar ? `Di luar batas aman (${s})` : undefined}>
      {angkaId(v, p.digit)}
      {luar && <span aria-label={s} className="ml-1 text-[10px]">{s === 'rendah' ? '▼' : '▲'}</span>}
    </span>
  )
}

/**
 * Riwayat bacaan dalam SATU kartu: tabel rapi (50 atau 100 baris per halaman) dan tombol halaman di bawahnya,
 * plus Cetak laporan (xlsx berformat), Unduh CSV (data mentah), dan tautan ke menu Laporan lengkap.
 * Urutan dari yang terbaru; nilai di luar batas aman berwarna merah. Rentang waktu mengikuti pengatur di atas halaman.
 */
export function RiwayatBacaan({
  rows, total, halaman, perHalaman, opsiPerHalaman, onPerHalaman, memuat, galat, ambang, rentangTeks, onHalaman,
  bisaUnduh, mengunduh, onUnduh, mencetak, onCetak, galatUnduh, infoUnduh,
}: {
  rows: Titik[]
  total: number
  halaman: number
  perHalaman: number
  opsiPerHalaman: readonly number[]
  onPerHalaman: (n: number) => void
  memuat: boolean
  galat: string | null
  ambang: Ambang
  rentangTeks: string
  onHalaman: (h: number) => void
  bisaUnduh: boolean
  mengunduh: boolean
  onUnduh: () => void
  mencetak: boolean
  onCetak: () => void
  galatUnduh: string | null
  infoUnduh: string | null
}) {
  const jumlahHalaman = Math.max(1, Math.ceil(total / perHalaman))
  const awal = total === 0 ? 0 : (halaman - 1) * perHalaman + 1
  const akhir = Math.min(total, (halaman - 1) * perHalaman + rows.length)

  return (
    <section aria-label="Riwayat bacaan" className="vsf-card p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="vsf-judul-bagian">Riwayat bacaan</div>
          <p className="mt-0.5 text-[12px] text-abu">{rentangTeks}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="vsf-btn-primary" disabled={!bisaUnduh || mencetak || mengunduh} onClick={onCetak}>
            {mencetak && <span className="vsf-spinner" aria-hidden />}
            {mencetak ? 'Menyiapkan laporan…' : 'Cetak laporan'}
          </button>
          <button type="button" className="vsf-btn-secondary" disabled={!bisaUnduh || mengunduh || mencetak} onClick={onUnduh}>
            {mengunduh && <span className="vsf-spinner vsf-spinner-dark" aria-hidden />}
            {mengunduh ? 'Menyiapkan…' : 'Unduh CSV'}
          </button>
          <Link to="/laporan" className="text-[13px] font-semibold text-arutmin-forest underline underline-offset-2">
            Laporan lengkap →
          </Link>
        </div>
      </div>

      {galat && <div role="alert" className="vsf-banner vsf-tone-error mt-3 rounded-input px-3 py-2 text-[13px]">{galat}</div>}
      {galatUnduh && <div role="alert" className="vsf-banner vsf-tone-error mt-3 rounded-input px-3 py-2 text-[13px]">{galatUnduh}</div>}
      {infoUnduh && <div role="status" className="mt-3 text-[12px] text-amber-900">{infoUnduh}</div>}

      {memuat && rows.length === 0 ? (
        <div className="vsf-skeleton mt-3 h-[260px] rounded-card" role="status" aria-label="Memuat riwayat" />
      ) : rows.length === 0 ? (
        <div className="mt-3 flex flex-col items-center gap-2 rounded-card bg-white/55 px-4 py-8 text-center text-[13px] text-tinta">
          <Ikon nama="kosong" className="h-8 w-8 text-arutmin-olive" />
          Belum ada bacaan pada rentang ini.
        </div>
      ) : (
        <div className="mt-3 max-h-[620px] overflow-auto rounded-card border border-arutmin-border bg-white/70">
          <table className="w-full min-w-[760px] border-collapse text-[13px] tabular-nums">
            <thead>
              <tr className="sticky top-0 z-10 bg-[#f3f6ef] text-[12px] text-abu">
                <th scope="col" className="sticky left-0 bg-[#f3f6ef] px-3 py-2 text-left font-semibold">Waktu</th>
                {KOLOM.map((p) => (
                  <th key={p.kunci} scope="col" className="px-3 py-2 text-right font-semibold">
                    {p.label}
                    {p.satuan && <span className="ml-1 font-normal">({p.satuan})</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const ms = waktuMs(r)
                return (
                  <tr key={String(r.id ?? `${ms}-${i}`)} className="border-t border-arutmin-border/60 odd:bg-white/40 hover:bg-[#eef4e8]">
                    <th scope="row" className="sticky left-0 bg-inherit px-3 py-1.5 text-left font-normal">
                      {ms === null ? '—' : (
                        <>
                          <b className="text-tinta">{formatTanggal(ms)}</b>
                          <span className="ml-2 text-abu">{formatJam(ms)}</span>
                        </>
                      )}
                    </th>
                    {KOLOM.map((p) => (
                      <td key={p.kunci} className="px-3 py-1.5 text-right">
                        <Sel p={p} r={r} ambang={ambang} />
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[13px]">
        <span className="text-abu">
          {total === 0 ? 'Tidak ada bacaan' : `Menampilkan ${awal.toLocaleString('id-ID')}–${akhir.toLocaleString('id-ID')} dari ${total.toLocaleString('id-ID')} bacaan`}
        </span>
        <nav aria-label="Halaman riwayat" className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-abu">
            Baris
            <select className="vsf-input w-[76px]" value={perHalaman} onChange={(e) => onPerHalaman(Number(e.target.value))}>
              {opsiPerHalaman.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <button type="button" className="vsf-btn-secondary" disabled={halaman <= 1 || memuat} onClick={() => onHalaman(halaman - 1)}>
            ‹ Lebih baru
          </button>
          <span className="text-abu">Halaman {halaman} dari {jumlahHalaman}</span>
          <button type="button" className="vsf-btn-secondary" disabled={halaman >= jumlahHalaman || memuat} onClick={() => onHalaman(halaman + 1)}>
            Lebih lama ›
          </button>
        </nav>
      </div>
    </section>
  )
}
