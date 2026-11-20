import type { KualitasSensor, ResponKualitas } from '../../lib/analisis'
import { persenTeks } from '../../lib/analisis'
import { TabelIlmiah, Temuan, angka, teksP } from './Ilmiah'

const URUTAN: { k: keyof ResponKualitas['sensor']; satuan: string; digit: number }[] = [
  { k: 'ph', satuan: '', digit: 3 },
  { k: 'tds', satuan: 'ppm', digit: 1 },
  { k: 'waterTemp', satuan: '°C', digit: 3 },
  { k: 'airTemp', satuan: '°C', digit: 3 },
  { k: 'humidity', satuan: '%', digit: 2 },
]

/** Penilaian singkat per sensor; hanya menyebut yang didukung angka. */
function catatan(s: KualitasSensor): string[] {
  const c: string[] = []
  if (s.n === 0) return ['tidak ada data']
  if (s.cakupan_persen != null && s.cakupan_persen < 90) c.push(`cakupan ${persenTeks(s.cakupan_persen)} (ada celah)`)
  if (s.di_luar_fisik > 0) c.push(`${s.di_luar_fisik} nilai mustahil secara fisik`)
  if (s.lonjakan.lonjakan > 0) c.push(`${s.lonjakan.lonjakan} lonjakan mendadak`)
  if (s.tren && s.tren.p < 0.05) c.push(`${s.tren.kemiringan_per_hari > 0 ? 'naik' : 'turun'} bermakna (p ${teksP(s.tren.p)})`)
  if (s.umur_kalibrasi_hari != null && s.umur_kalibrasi_hari > 30) c.push(`kalibrasi ${s.umur_kalibrasi_hari} hari lalu`)
  return c.length ? c : ['baik']
}

/** Kualitas data dan drift: Tabel 6 (cakupan, lonjakan, nilai mustahil, kecenderungan harian, umur kalibrasi). */
export function PanelKualitas({ data, galat, memuat }: { data: ResponKualitas | null; galat: string | null; memuat: boolean }) {
  const butir: string[] = []
  if (data) {
    for (const x of URUTAN) {
      const s = data.sensor[x.k]
      if (s.n > 0 && s.tren && s.tren.p < 0.05 && s.umur_kalibrasi_hari != null && s.umur_kalibrasi_hari > 14) {
        butir.push(`${s.nama} menunjukkan kecenderungan ${s.tren.kemiringan_per_hari > 0 ? 'naik' : 'turun'} yang bermakna (${angka(s.tren.kemiringan_per_hari, x.digit)} per hari, p ${teksP(s.tren.p)}) dan kalibrasi terakhir ${s.umur_kalibrasi_hari} hari lalu: kemungkinan drift sensor, bukan hanya perubahan nyata. Periksa dengan larutan standar.`)
      }
    }
    if (!butir.length) butir.push('Tidak ada sensor dengan kecenderungan bermakna yang juga berkalibrasi lama.')
  }
  return (
    <div className="grid gap-2">
      {galat && <div role="alert" className="vsf-banner vsf-tone-error rounded-input px-3 py-2 text-[13px]">{galat}</div>}
      {memuat && !data ? <div className="vsf-skeleton h-[260px] rounded-card" role="status" aria-label="Memuat" /> : null}
      <Temuan butir={butir} />
      {data && (
        <TabelIlmiah
          nomor={6}
          judul="Kualitas data dan kemungkinan drift tiap sensor."
          catatan={
            <>
              Cakupan = persen rentang yang punya data. Lonjakan = beda antar titik berurutan lebih dari 6 kali skala kokoh (1,4826 × MAD) beda-beda itu.
              Nilai mustahil = di luar batas fisik sensor. Kecenderungan = kemiringan Theil–Sen dari median harian dengan uji Mann–Kendall (τ = koefisien
              Kendall); dihitung bila ≥ 5 hari. <b>Kecenderungan bermakna belum tentu drift</b>: bisa juga perubahan nyata (misalnya ppm naik karena dosing);
              drift lebih patut dicurigai bila kalibrasi sudah lama dan kecenderungannya mulus. Umur kalibrasi memakai kalibrasi lulus terakhir (pH, EC).
            </>
          }
        >
          <table className="vsf-ilmiah-tabel">
            <thead>
              <tr>
                <th scope="col">Sensor</th>
                <th scope="col">n</th>
                <th scope="col">Cakupan (%)</th>
                <th scope="col">Lonjakan (n / %)</th>
                <th scope="col">Nilai mustahil</th>
                <th scope="col">Hari (n)</th>
                <th scope="col">Kemiringan / hari</th>
                <th scope="col">τ</th>
                <th scope="col">p (Mann–Kendall)</th>
                <th scope="col">Kalibrasi (hari lalu)</th>
                <th scope="col" className="teks">Penilaian</th>
              </tr>
            </thead>
            <tbody>
              {URUTAN.map((x) => {
                const s = data.sensor[x.k]
                const c = catatan(s)
                return (
                  <tr key={x.k}>
                    <th scope="row">{s.nama}{x.satuan ? ` (${x.satuan})` : ''}</th>
                    <td>{s.n.toLocaleString('id-ID')}</td>
                    <td>{persenTeks(s.cakupan_persen, 1)}</td>
                    <td>{s.lonjakan.lonjakan} / {angka(s.lonjakan.persen, 2)}</td>
                    <td className={s.di_luar_fisik ? 'peringatan' : ''}>{s.di_luar_fisik}</td>
                    <td>{s.hari_n}</td>
                    <td>{s.tren ? angka(s.tren.kemiringan_per_hari, x.digit) : 'n < 5'}</td>
                    <td>{s.tren ? angka(s.tren.tau, 2) : '—'}</td>
                    <td className={s.tren && s.tren.p < 0.05 ? 'peringatan' : ''}>{s.tren ? teksP(s.tren.p) : '—'}</td>
                    <td>{s.umur_kalibrasi_hari == null ? '—' : s.umur_kalibrasi_hari}</td>
                    <td className={`teks ${c[0] === 'baik' ? 'baik' : 'peringatan'}`}>{c.join('; ')}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </TabelIlmiah>
      )}
    </div>
  )
}
