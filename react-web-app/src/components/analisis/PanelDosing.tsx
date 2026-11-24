import type { ResponKonsumsi, ResponRespons } from '../../lib/analisis'
import { BatangRespons } from './Grafik'
import { CatatanSampel, GambarIlmiah, TabelIlmiah, Temuan, angka, teksMedianIqr } from './Ilmiah'

function temuan(respons: ResponRespons | null, konsumsi: ResponKonsumsi | null): string[] {
  const hasil: string[] = []
  const s = respons?.statistik?.sebaran
  const ci = respons?.statistik?.ci_median
  if (s && s.n > 0) {
    hasil.push(`Dosing A+B menaikkan ppm median ${angka(s.median, 0)} ppm (Q1–Q3 ${angka(s.q1, 0)}–${angka(s.q3, 0)}, n = ${s.n} dosing bersih)${ci ? `, selang 95% median ${angka(ci.bawah, 0)}–${angka(ci.atas, 0)} ppm` : ''}.`)
  }
  if (respons && respons.rendah.length > 0) hasil.push(`${respons.rendah.length} dosing menaikkan ppm kurang dari 30% median: periksa botol nutrisi A/B, selang, dan pompa.`)
  if (konsumsi?.ppm_turun_per_hari != null) {
    const sg = konsumsi.statistik?.sebaran_segmen_per_hari
    hasil.push(`Tanpa dosing, ppm turun rata-rata ${angka(konsumsi.ppm_turun_per_hari, 0)} ppm/hari${sg ? ` (median antar-selang ${angka(sg.median, 0)}, n = ${sg.n} selang)` : ''}.`)
  }
  return hasil
}

/** Dosing: Tabel 2 (respons ppm), Gambar 2, Tabel 3 (konsumsi nutrisi, ternormalisasi bila volume diketahui), Tabel 4 (kegiatan harian). */
export function PanelDosing({ respons, konsumsi, galat, memuat }: { respons: ResponRespons | null; konsumsi: ResponKonsumsi | null; galat: string | null; memuat: boolean }) {
  const rendah = new Set(respons?.rendah ?? [])
  const sr = respons?.statistik?.sebaran ?? null
  const cr = respons?.statistik?.ci_median ?? null
  const sk = konsumsi?.statistik?.sebaran_segmen_per_hari ?? null
  const ck = konsumsi?.statistik?.ci_median ?? null
  const nm = konsumsi?.normalisasi
  return (
    <div className="grid gap-2">
      {galat && <div role="alert" className="vsf-banner vsf-tone-error rounded-input px-3 py-2 text-[13px]">{galat}</div>}
      {memuat && !respons && !konsumsi ? <div className="vsf-skeleton h-[260px] rounded-card" role="status" aria-label="Memuat" /> : null}
      <Temuan butir={temuan(respons, konsumsi)} />

      {respons && (
        respons.kejadian.length === 0 ? (
          <p className="vsf-ilmiah-blok rounded-card bg-white/55 px-4 py-6 text-center text-[13px] text-abu">
            {respons.jumlah_ab === 0 ? 'Belum ada dosing nutrisi pada rentang ini.' : 'Ada dosing, tetapi data bacaan di sekitarnya kurang untuk dinilai.'}
          </p>
        ) : (
          <>
            <TabelIlmiah
              nomor={2}
              judul="Respons ppm terhadap dosing nutrisi A+B."
              catatan={
                <>
                  Kenaikan = median ppm 10–40 menit sesudah suntikan dikurangi median 15 menit sebelumnya. Hanya dosing tanpa kegiatan lain (dosing, isi air, pengenceran)
                  dalam ±55 menit yang dinilai ("bersih"). Selang 95% median memakai peringkat urutan (tanpa asumsi sebaran) dan baru dihitung bila n ≥ 6.
                  Alat tidak melaporkan mL, jadi kenaikan <i>nyata</i> di air yang diukur, bukan kenaikan per mL. <CatatanSampel n={sr?.n ?? 0} />
                </>
              }
            >
              <table className="vsf-ilmiah-tabel">
                <thead>
                  <tr>
                    <th scope="col">Ukuran</th>
                    <th scope="col">Dosing A+B</th>
                    <th scope="col">Dinilai (bersih)</th>
                    <th scope="col">Median kenaikan (Q1–Q3), ppm</th>
                    <th scope="col">IQR (ppm)</th>
                    <th scope="col">Selang 95% median (ppm)</th>
                    <th scope="col">Terlalu kecil (&lt; 30% median)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th scope="row">Kenaikan ppm</th>
                    <td>{respons.jumlah_ab}</td>
                    <td>{respons.jumlah_bersih}</td>
                    <td>{teksMedianIqr(sr, 0)}</td>
                    <td>{angka(sr?.iqr, 1)}</td>
                    <td>{cr ? `${angka(cr.bawah, 0)}–${angka(cr.atas, 0)}` : 'n < 6'}</td>
                    <td className={respons.rendah.length ? 'peringatan' : ''}>{respons.rendah.length}</td>
                  </tr>
                </tbody>
              </table>
            </TabelIlmiah>

            <GambarIlmiah nomor={2} judul="Kenaikan ppm tiap dosing A+B berurutan menurut waktu (hijau normal, merah terlalu kecil, abu tidak dinilai karena ada kegiatan lain di dekatnya).">
              <BatangRespons data={respons.kejadian.map((k) => ({ t: k.t, naik: k.naik, rendah: rendah.has(k.t), bersih: k.bersih }))} />
            </GambarIlmiah>
          </>
        )
      )}

      {konsumsi && (
        <>
          <TabelIlmiah
            nomor={3}
            judul="Laju konsumsi nutrisi pada selang tanpa dosing, pengenceran, atau isi air."
            catatan={
              <>
                Lereng ppm dihitung per selang minimal 3 jam (setelah jeda 30 menit dari kegiatan), lalu dirata-ratakan berbobot lama selang. Nilai positif = ppm turun.
                Penurunan mencakup serapan tanaman <i>dan</i> perubahan volume air (penguapan menaikkan ppm), keduanya belum bisa dipisahkan dari data ini.
                {nm?.volume_l == null && ' Massa per hari belum dihitung: volume penampung belum diisi di Master Data → Meja Tanaman.'}
                {nm?.volume_l != null && nm.tanaman_aktif == null && ' Per tanaman belum dihitung: tidak ada batch berjalan di meja alat.'}
              </>
            }
          >
            <table className="vsf-ilmiah-tabel">
              <thead>
                <tr>
                  <th scope="col">Ukuran</th>
                  <th scope="col">Selang (n)</th>
                  <th scope="col">Total (jam)</th>
                  <th scope="col">Rata-rata berbobot (ppm/hari)</th>
                  <th scope="col">Median antar-selang (Q1–Q3)</th>
                  <th scope="col">Selang 95% median</th>
                  <th scope="col">Massa (g/hari)</th>
                  <th scope="col">g/tanaman/hari</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">Penurunan ppm</th>
                  <td>{konsumsi.segmen.length}</td>
                  <td>{angka(konsumsi.total_jam, 0)}</td>
                  <td>{angka(konsumsi.ppm_turun_per_hari, 0)}</td>
                  <td>{teksMedianIqr(sk, 0)}</td>
                  <td>{ck ? `${angka(ck.bawah, 0)}–${angka(ck.atas, 0)}` : 'n < 6'}</td>
                  <td>{angka(nm?.gram_per_hari, 1)}</td>
                  <td>{angka(nm?.gram_per_tanaman_per_hari, 2)}</td>
                </tr>
              </tbody>
            </table>
          </TabelIlmiah>

          {konsumsi.kegiatan_per_hari.length > 0 && (
            <TabelIlmiah
              nomor={4}
              judul="Jumlah kegiatan alat per hari."
              catatan="Isi air yang sering (banyak per hari) dapat berarti penguapan tinggi atau kebocoran. Hitungan berasal dari laporan harian alat."
            >
              <table className="vsf-ilmiah-tabel">
                <thead>
                  <tr>
                    <th scope="col">Tanggal</th>
                    <th scope="col">Nutrisi A+B</th>
                    <th scope="col">Koreksi pH</th>
                    <th scope="col">Pengenceran</th>
                    <th scope="col">Isi air</th>
                  </tr>
                </thead>
                <tbody>
                  {konsumsi.kegiatan_per_hari.map((h) => (
                    <tr key={h.tanggal}>
                      <th scope="row">{h.tanggal}</th>
                      <td>{h.ab}</td>
                      <td>{h.ph}</td>
                      <td>{h.encer}</td>
                      <td>{h.isi}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TabelIlmiah>
          )}
        </>
      )}
    </div>
  )
}
