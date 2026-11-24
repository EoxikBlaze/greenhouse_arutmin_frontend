import { useState } from 'react'
import { angkaId } from '../../lib/format'
import type { ResponPola } from '../../lib/analisis'
import { Segmen } from '../sensor/FilterBar'
import { PetaPanas, warnaSel, type Metrik } from './Grafik'

const METRIK = ['VPD', 'Suhu udara', 'Kelembapan'] as const
const KUNCI: Record<(typeof METRIK)[number], Metrik> = { VPD: 'vpd', 'Suhu udara': 'suhu', Kelembapan: 'rh' }
const SATUAN: Record<Metrik, { s: string; d: number }> = { vpd: { s: 'kPa', d: 2 }, suhu: { s: '°C', d: 1 }, rh: { s: '%', d: 0 } }
const LABEL_VPD: Record<string, string> = { terlalu_lembap: 'terlalu lembap', baik: 'baik', terlalu_kering: 'terlalu kering' }

/** Pola harian: peta panas tanggal × jam untuk VPD, suhu udara, dan kelembapan, plus rata-rata per jam. */
export function PanelPola({ data, galat, memuat }: { data: ResponPola | null; galat: string | null; memuat: boolean }) {
  const [pilih, setPilih] = useState<(typeof METRIK)[number]>('VPD')
  const metrik = KUNCI[pilih]
  return (
    <div className="grid gap-4">
      {galat && <div role="alert" className="vsf-banner vsf-tone-error rounded-input px-3 py-2 text-[13px]">{galat}</div>}
      <section className="vsf-card p-4 sm:p-5" aria-label="Pola harian">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="vsf-judul-bagian">Pola harian greenhouse</div>
          <Segmen label="Besaran" pilihan={METRIK} nilai={pilih} onPilih={setPilih} />
        </div>
        <p className="mt-1 text-[12.5px] leading-relaxed text-abu">
          <b>VPD</b> (defisit tekanan uap) dihitung dari suhu dan kelembapan udara: ukuran seberapa kering udara bagi tanaman. Di bawah 0,4 kPa udara terlalu
          lembap (tanaman sulit menguapkan air, rawan jamur); 0,4–1,2 baik; di atas 1,2 terlalu kering (tanaman menutup stomata, layu). Acuan umum sayuran daun.
        </p>
        {memuat && !data ? (
          <div className="vsf-skeleton mt-3 h-[220px] rounded-card" role="status" aria-label="Memuat" />
        ) : data && data.sel.length > 0 ? (
          <>
            <div className="mt-3">
              <PetaPanas sel={data.sel} metrik={metrik} />
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-abu">
                <span>Baris = tanggal, kolom = jam (kiri tengah malam).</span>
                {metrik === 'vpd' && (
                  <>
                    <span className="inline-flex items-center gap-1"><i className="inline-block h-3 w-4 rounded-sm" style={{ background: warnaSel('vpd', 0.2) }} />terlalu lembap</span>
                    <span className="inline-flex items-center gap-1"><i className="inline-block h-3 w-4 rounded-sm" style={{ background: warnaSel('vpd', 0.8) }} />baik</span>
                    <span className="inline-flex items-center gap-1"><i className="inline-block h-3 w-4 rounded-sm" style={{ background: warnaSel('vpd', 1.8) }} />terlalu kering</span>
                  </>
                )}
              </p>
            </div>
            <div className="mt-4 overflow-x-auto rounded-card border border-arutmin-border bg-white/70">
              <table className="w-full min-w-[520px] border-collapse text-[12.5px] tabular-nums">
                <caption className="sr-only">Rata-rata per jam seluruh rentang</caption>
                <thead>
                  <tr className="bg-[#f3f6ef] text-abu">
                    <th scope="col" className="px-3 py-2 text-left font-semibold">Jam</th>
                    <th scope="col" className="px-3 py-2 text-right font-semibold">Suhu udara (°C)</th>
                    <th scope="col" className="px-3 py-2 text-right font-semibold">Kelembapan (%)</th>
                    <th scope="col" className="px-3 py-2 text-right font-semibold">VPD (kPa)</th>
                    <th scope="col" className="px-3 py-2 text-left font-semibold">Penilaian VPD</th>
                  </tr>
                </thead>
                <tbody>
                  {data.per_jam.filter((j) => j.suhu != null || j.rh != null).filter((j) => j.jam % 2 === 0).map((j) => {
                    const kat = data.kategori_vpd.find((k) => k.jam === j.jam)?.nilai ?? null
                    return (
                      <tr key={j.jam} className="border-t border-arutmin-border/60">
                        <th scope="row" className="px-3 py-1 text-left font-normal text-tinta">{String(j.jam).padStart(2, '0')}:00</th>
                        <td className="px-3 py-1 text-right">{j.suhu == null ? '—' : angkaId(j.suhu, 1)}</td>
                        <td className="px-3 py-1 text-right">{j.rh == null ? '—' : angkaId(j.rh, 0)}</td>
                        <td className="px-3 py-1 text-right">{j.vpd == null ? '—' : angkaId(j.vpd, 2)}</td>
                        <td className={`px-3 py-1 ${kat === 'baik' ? 'text-[#3B6D11]' : kat ? 'text-[#A32D2D]' : 'text-abu'}`}>{kat ? LABEL_VPD[kat] : '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[12px] text-abu">Tabel menampilkan jam genap; peta panas memuat semua jam. Satuan {SATUAN[metrik].s}.</p>
          </>
        ) : (
          <p className="mt-3 rounded-card bg-white/55 px-4 py-8 text-center text-[13px] text-abu">Belum ada data suhu dan kelembapan udara pada rentang ini.</p>
        )}
      </section>
    </div>
  )
}
