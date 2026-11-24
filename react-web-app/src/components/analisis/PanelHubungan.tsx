import type { PasanganKorelasi, ResponKorelasi } from '../../lib/analisis'
import { GambarIlmiah, TabelIlmiah, Temuan, angka, teksP } from './Ilmiah'

const URUTAN = ['ph', 'tds', 'waterTemp', 'airTemp', 'humidity'] as const
const NAMA: Record<string, string> = { ph: 'pH', tds: 'Nutrisi', waterTemp: 'Suhu air', airTemp: 'Suhu udara', humidity: 'Kelembapan' }

/** rho −1…+1 → merah (negatif) · putih · hijau (positif). */
function warnaRho(rho: number | null): string {
  if (rho == null) return 'rgba(30,45,61,0.06)'
  const t = Math.min(1, Math.abs(rho))
  const [r, g, b] = rho >= 0 ? [78, 119, 51] : [192, 57, 43]
  const l = (v: number) => Math.round(255 + (v - 255) * t)
  return `rgb(${l(r)},${l(g)},${l(b)})`
}

function MatriksKorelasi({ pasangan }: { pasangan: PasanganKorelasi[] }) {
  const cari = (a: string, b: string) => pasangan.find((p) => (p.a === a && p.b === b) || (p.a === b && p.b === a))
  const sel = 62
  const kiri = 92
  const atas = 40
  const lebar = kiri + URUTAN.length * sel
  const tinggi = atas + URUTAN.length * 34
  return (
    <svg viewBox={`0 0 ${lebar} ${tinggi}`} className="block w-full max-w-[560px]" role="img" aria-label="Matriks korelasi Spearman antar sensor">
      {URUTAN.map((k, j) => (
        <text key={k} x={kiri + j * sel + sel / 2} y={26} textAnchor="middle" fontSize={11} fill="#27384c">{NAMA[k]}</text>
      ))}
      {URUTAN.map((a, i) => (
        <g key={a}>
          <text x={kiri - 8} y={atas + i * 34 + 21} textAnchor="end" fontSize={11} fill="#27384c">{NAMA[a]}</text>
          {URUTAN.map((b, j) => {
            const p = a === b ? null : cari(a, b)
            const rho = a === b ? 1 : p?.rho ?? null
            return (
              <g key={b}>
                <rect x={kiri + j * sel} y={atas + i * 34} width={sel - 2} height={32} rx={3} fill={warnaRho(rho)}>
                  <title>{a === b ? NAMA[a] : `${NAMA[a]} – ${NAMA[b]}: ρ = ${rho == null ? 'tidak dapat dihitung' : rho.toFixed(2)}`}</title>
                </rect>
                <text x={kiri + j * sel + sel / 2 - 1} y={atas + i * 34 + 21} textAnchor="middle" fontSize={12} fill={rho != null && Math.abs(rho) > 0.6 ? '#fff' : '#1e2d3d'}>
                  {rho == null ? '—' : rho.toFixed(2).replace('.', ',')}
                </text>
              </g>
            )
          })}
        </g>
      ))}
    </svg>
  )
}

/** Hubungan antar sensor: Tabel 5 (korelasi Spearman dengan n efektif) dan Gambar 3 (matriks). */
export function PanelHubungan({ data, galat, memuat }: { data: ResponKorelasi | null; galat: string | null; memuat: boolean }) {
  const m = data?.jumlah_perbandingan ?? 0
  const alfa = m > 0 ? 0.05 / m : 0.05
  const kuat = (data?.pasangan ?? []).filter((p) => p.p != null && p.p < alfa && Math.abs(p.rho ?? 0) >= 0.4)
  const butir: string[] = []
  if (data && m > 0) {
    butir.push(`${m} pasangan sensor diuji; batas signifikan setelah koreksi Bonferroni = ${teksP(alfa)} (0,05 dibagi ${m}).`)
    kuat.slice(0, 4).forEach((p) => butir.push(`${p.nama_a} dan ${p.nama_b}: korelasi ${p.kekuatan}, ρ = ${angka(p.rho, 2)} (p ${teksP(p.p).startsWith('<') ? teksP(p.p) : `= ${teksP(p.p)}`}, n efektif ≈ ${angka(p.n_efektif, 0)}).`))
    if (!kuat.length) butir.push('Tidak ada pasangan yang korelasinya sedang atau kuat DAN signifikan setelah koreksi.')
  }
  return (
    <div className="grid gap-2">
      {galat && <div role="alert" className="vsf-banner vsf-tone-error rounded-input px-3 py-2 text-[13px]">{galat}</div>}
      {memuat && !data ? <div className="vsf-skeleton h-[260px] rounded-card" role="status" aria-label="Memuat" /> : null}
      <Temuan butir={butir} />
      {data && (
        <>
          <TabelIlmiah
            nomor={5}
            judul="Korelasi peringkat Spearman (ρ) antar sensor, dari rata-rata per jam."
            catatan={
              <>
                Spearman tidak mengasumsikan hubungan lurus maupun sebaran normal. Deret waktu berautokorelasi, jadi nilai p dihitung dengan
                <b> n efektif</b> (n dikoreksi oleh autokorelasi lag-1 kedua deret), bukan n mentah; ini mencegah klaim signifikan yang berlebihan.
                Karena {m} pasangan diuji sekaligus, ambang p dikoreksi Bonferroni ({teksP(alfa)}). <b>Korelasi bukan sebab-akibat</b>: suhu air dan suhu udara
                bergerak bersama karena siklus harian yang sama, bukan karena yang satu menyebabkan yang lain.
              </>
            }
          >
            <table className="vsf-ilmiah-tabel">
              <thead>
                <tr>
                  <th scope="col">Pasangan</th>
                  <th scope="col">n (jam)</th>
                  <th scope="col">n efektif</th>
                  <th scope="col">ρ</th>
                  <th scope="col">p</th>
                  <th scope="col" className="teks">Kekuatan</th>
                  <th scope="col" className="teks">Signifikan (Bonferroni)</th>
                </tr>
              </thead>
              <tbody>
                {data.pasangan.map((p) => (
                  <tr key={`${p.a}-${p.b}`}>
                    <th scope="row">{p.nama_a} – {p.nama_b}</th>
                    <td>{p.n}</td>
                    <td>{angka(p.n_efektif, 1)}</td>
                    <td className="tebal">{angka(p.rho, 2)}</td>
                    <td>{teksP(p.p)}</td>
                    <td className="teks">{p.kekuatan ?? 'data kurang'}</td>
                    <td className={`teks ${p.p != null && p.p < alfa ? 'baik' : ''}`}>{p.p == null ? '—' : p.p < alfa ? 'ya' : 'tidak'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TabelIlmiah>
          <GambarIlmiah nomor={3} judul="Matriks korelasi Spearman (hijau = berkorelasi positif, merah = negatif; makin pekat makin kuat).">
            <MatriksKorelasi pasangan={data.pasangan} />
          </GambarIlmiah>
        </>
      )}
    </div>
  )
}
