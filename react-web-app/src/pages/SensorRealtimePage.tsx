import { useMemo, useState } from 'react'
import clsx from 'clsx'
import { useSearchParams } from 'react-router-dom'

type Param = 'pH' | 'Suhu Air' | 'TDS' | 'Suhu Udara' | 'Kelembapan' | 'Level Air'
type Range = '6 Jam' | '24 Jam' | '7 Hari'

type Row = {
  waktu: string
  ph: string
  suhu: string
  tds: string
  status: 'Normal' | 'Anomali'
}

function Pill({ active, children, onClick }: { active?: boolean; children: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'inline-flex items-center rounded-full border px-3 py-1 text-[12px] font-semibold',
        active
          ? 'border-arutmin-moss bg-activePill text-white'
          : 'border-arutmin-border bg-white text-slate-700 hover:border-arutmin-moss/60',
      )}
    >
      {children}
    </button>
  )
}

export default function SensorRealtimePage() {
  const [param, setParam] = useState<Param>('pH')
  const [range, setRange] = useState<Range>('6 Jam')

  // State variants bisa dipreview via URL (QA/debug):
  //   ?state=loading | ?state=empty | ?state=offline | (default: ok)
  const [searchParams] = useSearchParams()
  const stateVariant = searchParams.get('state') ?? 'ok'
  const isLoading = stateVariant === 'loading'
  const isEmpty = stateVariant === 'empty'
  const isOffline = stateVariant === 'offline'

  const rows = useMemo<Row[]>(
    () => [
      { waktu: '12 Okt 06:00', ph: '6.40', suhu: '26.0', tds: '1170', status: 'Normal' },
      { waktu: '12 Okt 00:00', ph: '6.44', suhu: '26.3', tds: '1180', status: 'Normal' },
      { waktu: '11 Okt 18:00', ph: '7.12', suhu: '34.2', tds: '1210', status: 'Anomali' },
    ],
    [],
  )

  return (
    <div className="mx-auto max-w-[1180px] grid gap-4 vsf-stagger">
      {/* Baris kontrol grafik */}
      <section className="vsf-card p-4">
        <div className="text-[11px] uppercase tracking-[.14em] text-slate-500 font-bold">Baris kontrol grafik</div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {(['pH', 'Suhu Air', 'TDS', 'Suhu Udara', 'Kelembapan', 'Level Air'] as Param[]).map((p) => (
            <Pill key={p} active={param === p} onClick={() => setParam(p)}>
              {p}
            </Pill>
          ))}

          <div className="w-px h-6 bg-arutmin-border mx-1" />

          {(['6 Jam', '24 Jam', '7 Hari'] as Range[]).map((r) => (
            <Pill key={r} active={range === r} onClick={() => setRange(r)}>
              {r}
            </Pill>
          ))}

          <span className="flex-1" />
          <button className="vsf-input rounded-full">Unduh CSV</button>
        </div>
      </section>

      {/* Panel grafik (chart live) */}
      <section className="vsf-card p-4">
        <div className="text-[11px] uppercase tracking-[.14em] text-slate-500 font-bold">Panel grafik (chart live)</div>
        <div className="mt-3 rounded-card border border-dashed border-arutmin-border bg-white/60 p-4">
          {isOffline ? (
            <div className="text-[13px] text-red-700">
              <b>Perangkat offline.</b> Grafik tidak dapat diperbarui.
            </div>
          ) : isLoading ? (
            <div className="mt-3 vsf-skeleton h-[250px]" />
          ) : isEmpty ? (
            <div className="h-[250px] flex items-center justify-center text-[13px] text-slate-600">
              Belum ada data pada rentang ini — coba pilih rentang lain.
            </div>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-center text-[13px] text-slate-600">
              area chart — sumbu X waktu, sumbu Y nilai parameter
              <br />
              garis anomali ditandai penanda + tooltip
              <br />
              <span className="text-[12px] text-slate-500">(aktif: {param} • {range})</span>
            </div>
          )}
        </div>
      </section>

      {/* Tarik data historis */}
      <section className="vsf-card p-4">
        <div className="text-[11px] uppercase tracking-[.14em] text-slate-500 font-bold">Tarik data historis (riwayat manual)</div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input className="vsf-input w-[220px]" placeholder="Dari (tanggal)" />
          <input className="vsf-input w-[220px]" placeholder="Sampai (tanggal)" />
          <button className="vsf-input rounded-full">Tarik</button>
          <div className="text-[12px] text-slate-500">rentang tanggal → tabel hasil → export CSV</div>
        </div>

        <div className="mt-3 overflow-auto rounded-card border border-arutmin-border bg-white vsf-table">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-arutmin-mint/25">
                {['Waktu', 'pH', 'Suhu', 'TDS', 'Status'].map((h) => (
                  <th
                    key={h}
                    className="text-left px-3 py-2 text-[11px] uppercase tracking-[.12em] text-arutmin-forest border-b-2 border-arutmin-moss"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.waktu} className="hover:bg-arutmin-mint/15">
                  <td className="px-3 py-2 font-semibold text-slate-900">{r.waktu}</td>
                  <td className="px-3 py-2 text-slate-700">{r.ph}</td>
                  <td className="px-3 py-2 text-slate-700">{r.suhu}</td>
                  <td className="px-3 py-2 text-slate-700">{r.tds}</td>
                  <td className="px-3 py-2">
                    <span
                      className={clsx(
                        'inline-flex rounded-full border px-2 py-0.5 text-[12px] font-semibold',
                        r.status === 'Normal'
                          ? 'border-arutmin-moss/50 bg-arutmin-mint/25 text-arutmin-forest'
                          : 'border-amber-500/60 bg-amber-50 text-amber-800',
                      )}
                    >
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="vsf-card p-4">
        <div className="text-[11px] uppercase tracking-[.14em] text-slate-500 font-bold">Catatan struktur & state</div>
        <ul className="mt-2 list-disc pl-5 text-[13px] text-slate-700 leading-relaxed">
          <li>State loading: skeleton chart + spinner kecil, rentang aktif tetap.</li>
          <li>State kosong: chart area “Belum ada data pada rentang ini” + saran rentang lain.</li>
          <li>Auto-refresh: data baru masuk tanpa reload halaman (polling), nilai terakhir disorot.</li>
          <li>Akses petani: lihat grafik saja, tanpa tombol tarik data.</li>
        </ul>
      </section>
    </div>
  )
}
