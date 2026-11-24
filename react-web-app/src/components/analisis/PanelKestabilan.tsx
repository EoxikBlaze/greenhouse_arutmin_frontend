import { persenTeks, type KestabilanSensor, type ResponKestabilan } from '../../lib/analisis'
import { BatangHarian } from './Grafik'
import { KartuSaranDosis } from '../analitik/KartuSaranDosis'
import { GambarIlmiah, TabelIlmiah, Temuan, angka, teksMedianIqr } from './Ilmiah'

const SENSOR: { k: keyof ResponKestabilan['sensor']; nama: string; satuan: string; digit: number }[] = [
  { k: 'ph', nama: 'pH', satuan: '', digit: 2 },
  { k: 'tds', nama: 'Nutrisi', satuan: 'ppm', digit: 0 },
  { k: 'waterTemp', nama: 'Suhu air', satuan: '°C', digit: 1 },
  { k: 'airTemp', nama: 'Suhu udara', satuan: '°C', digit: 1 },
  { k: 'humidity', nama: 'Kelembapan', satuan: '%', digit: 0 },
]

const ciTeks = (s: KestabilanSensor) =>
  s.ci_dalam_batas ? `${persenTeks(s.ci_dalam_batas.bawah)}–${persenTeks(s.ci_dalam_batas.atas)}` : '—'

/** Susun kalimat temuan dari angka (tanpa menafsirkan lebih dari yang didukung data). */
function temuan(data: ResponKestabilan): string[] {
  const hasil: string[] = []
  for (const x of SENSOR) {
    const s = data.sensor[x.k]
    if (s.n === 0 || s.dalam_batas_persen == null || !s.batas) continue
    const ci = s.ci_dalam_batas
    const rentang = ci ? ` (selang kepercayaan 95% antar hari ${persenTeks(ci.bawah)}–${persenTeks(ci.atas)}, ${s.hari_n} hari)` : s.hari_n && s.hari_n < 3 ? ' (kurang dari 3 hari data, selang belum dapat dihitung)' : ''
    hasil.push(`${x.nama} berada dalam batas aman ${persenTeks(s.dalam_batas_persen)} dari waktu${rentang}.`)
  }
  if (data.cakupan_persen != null && data.cakupan_persen < 90) hasil.push(`Cakupan data hanya ${persenTeks(data.cakupan_persen)} dari rentang; angka di atas hanya menggambarkan waktu yang tercatat.`)
  return hasil
}

/** Kestabilan: Tabel 1 (ringkasan statistik tiap sensor) dan Gambar 1 (persen dalam batas aman per hari). */
export function PanelKestabilan({ data, galat, memuat }: { data: ResponKestabilan | null; galat: string | null; memuat: boolean }) {
  const ada = data ? SENSOR.filter((x) => data.sensor[x.k].n > 0) : []
  const kecil = data ? Math.min(...SENSOR.map((x) => data.sensor[x.k].hari_n ?? 0).filter((n) => n > 0), Infinity) : Infinity
  return (
    <div className="grid gap-2">
      {galat && <div role="alert" className="vsf-banner vsf-tone-error rounded-input px-3 py-2 text-[13px]">{galat}</div>}
      {memuat && !data ? (
        <div className="vsf-skeleton h-[260px] rounded-card" role="status" aria-label="Memuat" />
      ) : data ? (
        <>
          <Temuan butir={temuan(data)} />

          <TabelIlmiah
            nomor={1}
            judul="Ringkasan statistik tiap sensor pada rentang terpilih."
            catatan={
              <>
                n = jumlah titik (rata-rata 5 menit). Median dengan kuartil bawah–atas dipakai karena data sensor jarang berdistribusi normal.
                Dalam batas aman = persen titik di dalam rentang Ambang Sensor; selang kepercayaan 95% dihitung <i>antar hari</i> (distribusi t Student,
                satu nilai per hari) karena titik berurutan saling berkaitan. Cakupan data {data.cakupan_persen == null ? '—' : persenTeks(data.cakupan_persen)}.
                {kecil < 3 && ' Kurang dari 3 hari data: selang kepercayaan belum dapat dihitung.'}
              </>
            }
          >
            <table className="vsf-ilmiah-tabel">
              <thead>
                <tr>
                  <th scope="col">Sensor</th>
                  <th scope="col">n</th>
                  <th scope="col">Median (Q1–Q3)</th>
                  <th scope="col">Rata-rata ± SD</th>
                  <th scope="col">Min–Maks</th>
                  <th scope="col">Dalam batas aman (%)</th>
                  <th scope="col">Selang 95% (%)</th>
                </tr>
              </thead>
              <tbody>
                {SENSOR.map((x) => {
                  const s = data.sensor[x.k]
                  return (
                    <tr key={x.k}>
                      <th scope="row">{x.nama}{x.satuan ? ` (${x.satuan})` : ''}</th>
                      <td>{s.n.toLocaleString('id-ID')}</td>
                      <td>{teksMedianIqr(s.sebaran, x.digit)}</td>
                      <td>{s.rata == null ? '—' : `${angka(s.rata, x.digit)} ± ${angka(s.sd, x.digit + 1)}`}</td>
                      <td>{s.min == null ? '—' : `${angka(s.min, x.digit)}–${angka(s.maks, x.digit)}`}</td>
                      <td className={s.dalam_batas_persen == null ? '' : s.dalam_batas_persen >= 80 ? 'baik' : s.dalam_batas_persen < 50 ? 'peringatan' : 'tebal'}>
                        {s.ada_batas ? persenTeks(s.dalam_batas_persen, 1) : 'batas belum diatur'}
                      </td>
                      <td>{ciTeks(s)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </TabelIlmiah>

          {ada.filter((x) => data.sensor[x.k].ada_batas && data.sensor[x.k].per_hari.length > 1).length > 0 && (
            <GambarIlmiah
              nomor={1}
              judul="Persen waktu dalam batas aman per hari (hijau ≥ 80%, kuning 50–79%, merah < 50%). Tiap batang = satu hari kalender; angka di bawah = tanggal."
            >
              <div className="grid gap-4 md:grid-cols-2">
                {ada.filter((x) => data.sensor[x.k].ada_batas && data.sensor[x.k].per_hari.length > 1).map((x) => (
                  <div key={x.k}>
                    <div className="text-[12px] font-bold text-tinta">{x.nama}</div>
                    <BatangHarian data={data.sensor[x.k].per_hari.map((h) => ({ label: h.tanggal, nilai: h.dalam_batas_persen }))} />
                  </div>
                ))}
              </div>
            </GambarIlmiah>
          )}
        </>
      ) : null}
      <div className="vsf-ilmiah-blok"><KartuSaranDosis /></div>
    </div>
  )
}
